// DOM elements
let totalAssetsElement, cashBalanceElement, portfolioTableBody;

// Initialize after page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Portfolio page loaded');
    
    // Get DOM elements
    totalAssetsElement = document.getElementById('total-assets');
    cashBalanceElement = document.getElementById('cash-balance');
    portfolioTableBody = document.getElementById('assets-table-body');
    
    if (!totalAssetsElement || !cashBalanceElement || !portfolioTableBody) {
        console.error('Required DOM elements not found', {
            totalAssetsElement: !!totalAssetsElement,
            cashBalanceElement: !!cashBalanceElement,
            portfolioTableBody: !!portfolioTableBody
        });
        return;
    }
    
    // Load portfolio data
    loadPortfolioData();
    
    // Bind recharge button event
    const rechargeBtn = document.getElementById('recharge-btn');
    if (rechargeBtn) {
        rechargeBtn.addEventListener('click', showRechargeModal);
    }
});

// Load portfolio data
function loadPortfolioData() {
    console.log('Starting to load portfolio data');
    
    fetch('/api/portfolio')
        .then(response => {
            console.log('Portfolio response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Portfolio data:', data);
            if (data.error) {
                console.error('Failed to get portfolio:', data.error);
                showError('Failed to get portfolio');
            } else {
                displayPortfolioData(data);
            }
        })
        .catch(error => {
            console.error('Error occurred while getting portfolio:', error);
            showError('Loading failed, please refresh the page');
        });
}

// Display portfolio data
function displayPortfolioData(data) {
    console.log('Displaying portfolio data:', data);
    
    // Display user asset information
    if (data.user) {
        const totalAssets = parseFloat(data.user.total_assets) || 0;
        const cashBalance = parseFloat(data.user.cash_balance) || 0;
        
        totalAssetsElement.textContent = `¥${totalAssets.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        cashBalanceElement.textContent = `¥${cashBalance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        console.log('User asset information updated:', { totalAssets, cashBalance });
    } else {
        console.warn('User data not found');
        totalAssetsElement.textContent = '¥0.00';
        cashBalanceElement.textContent = '¥0.00';
    }
    
    // Display asset list
    if (data.assets && Array.isArray(data.assets)) {
        displayAssetsList(data.assets);
    } else {
        console.warn('Asset data not found');
        portfolioTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No assets</td></tr>';
    }
}

// Display asset list
function displayAssetsList(assets) {
    console.log('Displaying asset list:', assets.length, 'items');
    
    if (assets.length === 0) {
        portfolioTableBody.innerHTML = '<tr><td colspan="10" style="text-align: center;">No assets</td></tr>';
        return;
    }
    
    portfolioTableBody.innerHTML = '';
    
    assets.forEach(asset => {
        const row = createAssetRow(asset);
        portfolioTableBody.appendChild(row);
    });
}

// Create asset row
function createAssetRow(asset) {
    const row = document.createElement('tr');
    
    // Calculate profit
    const quantity = parseFloat(asset.quantity) || 0;
    const purchasePrice = parseFloat(asset.purchase_price) || 0;
    const currentPrice = parseFloat(asset.current_price) || 0;
    const totalValue = quantity * currentPrice;
    const totalCost = quantity * purchasePrice;
    const profit = totalValue - totalCost;
    const profitRate = totalCost > 0 ? (profit / totalCost * 100) : 0;
    
    // Format date
    const purchaseDate = new Date(asset.purchase_date).toLocaleDateString('en-US');
    
    // Asset type display
    const assetTypeText = asset.type === 'stock' ? 'Stock' : asset.type === 'bond' ? 'Bond' : 'Cash';
    
    row.innerHTML = `
        <td>${asset.name || 'Unknown'}</td>
        <td>${assetTypeText}</td>
        <td>${asset.symbol || ''}</td>
        <td>${quantity.toFixed(4)}</td>
        <td>¥${purchasePrice.toFixed(2)}</td>
        <td>¥${currentPrice.toFixed(2)}</td>
        <td>${purchaseDate}</td>
        <td>¥${totalValue.toFixed(2)}</td>
        <td class="${profit >= 0 ? 'profit-positive' : 'profit-negative'}">
            ¥${profit.toFixed(2)} (${profitRate.toFixed(2)}%)
        </td>
        <td>
            <button class="action-btn sell-btn" onclick="sellAsset(${asset.id}, '${asset.name}', ${quantity})">Sell</button>
            <button class="action-btn delete-btn" onclick="deleteAsset(${asset.id}, '${asset.name}')">Delete</button>
        </td>
    `;
    
    return row;
}

// Update price
function updatePrice(type, symbol) {
    console.log('Updating price:', type, symbol);
    
    const endpoint = type === 'stock' ? `/api/stocks/${symbol}/update` : `/api/bonds/${symbol}/update`;
    
    fetch(endpoint, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Failed to update price: ' + data.error);
            } else {
                alert('Price updated successfully');
                loadPortfolioData(); // Reload data
            }
        })
        .catch(error => {
            console.error('Failed to update price:', error);
            alert('Failed to update price');
        });
}

// Sell asset
function sellAsset(assetId, assetName, currentQuantity) {
    // Show sell modal
    showSellModal(assetId, assetName, currentQuantity);
}

// Show sell modal
function showSellModal(assetId, assetName, currentQuantity) {
    const modal = document.createElement('div');
    modal.className = 'sell-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Sell Asset</h3>
                <span class="close-btn" onclick="closeSellModal()">&times;</span>
            </div>
            <div class="modal-body">
                <p><strong>Asset Name:</strong> ${assetName}</p>
                <p><strong>Quantity Held:</strong> ${parseFloat(currentQuantity).toFixed(4)}</p>
                <label for="sell-quantity">Sell Quantity:</label>
                <input type="number" id="sell-quantity" min="0.0001" max="${currentQuantity}" step="0.0001" placeholder="Enter quantity to sell">
                <div class="quick-sell">
                    <button onclick="setSellQuantity(${currentQuantity * 0.25})">25%</button>
                    <button onclick="setSellQuantity(${currentQuantity * 0.5})">50%</button>
                    <button onclick="setSellQuantity(${currentQuantity * 0.75})">75%</button>
                    <button onclick="setSellQuantity(${currentQuantity})">All</button>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeSellModal()">Cancel</button>
                <button class="btn btn-danger" onclick="processSell(${assetId})">Confirm Sell</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // 聚焦到输入框
    setTimeout(() => {
        document.getElementById('sell-quantity').focus();
    }, 100);
}

// Close sell modal
function closeSellModal() {
    const modal = document.querySelector('.sell-modal');
    if (modal) {
        modal.remove();
    }
}

// Set sell quantity
function setSellQuantity(quantity) {
    document.getElementById('sell-quantity').value = parseFloat(quantity).toFixed(4);
}

// Process sell
function processSell(assetId) {
    const quantityInput = document.getElementById('sell-quantity');
    const quantity = parseFloat(quantityInput.value);
    
    if (!quantity || quantity <= 0) {
        alert('Please enter a valid sell quantity');
        return;
    }
    
    const maxQuantity = parseFloat(quantityInput.max);
    if (quantity > maxQuantity) {
        alert('Sell quantity cannot exceed held quantity');
        return;
    }
    
    if (!confirm(`Are you sure you want to sell ${quantity.toFixed(4)} units of this asset?`)) {
        return;
    }
    
    console.log('Starting to sell asset:', { assetId, quantity });
    
    fetch('/api/portfolio/sell', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            assetId: assetId, 
            quantity: quantity 
        })
    })
    .then(response => {
        console.log('Sell response status:', response.status);
        return response.json();
    })
    .then(data => {
        if (data.error) {
            console.error('Sell failed:', data.error);
            alert('Sell failed: ' + data.error);
        } else {
            console.log('Sell successful:', data);
            alert(`Sell successful! Received ¥${data.amount.toFixed(2)}`);
            closeSellModal();
            loadPortfolioData(); // Reload data
        }
    })
    .catch(error => {
        console.error('Error occurred during sell:', error);
        alert('Sell failed, please try again later');
    });
}

// Show error message
function showError(message) {
    totalAssetsElement.textContent = 'Error';
    cashBalanceElement.textContent = 'Error';
    portfolioTableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: red;">${message}</td></tr>`;
}

// Show recharge modal
function showRechargeModal() {
    const modal = document.createElement('div');
    modal.className = 'recharge-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Deposit Cash</h3>
                <span class="close-btn" onclick="closeRechargeModal()">&times;</span>
            </div>
            <div class="modal-body">
                <label for="recharge-amount">Deposit Amount (¥):</label>
                <input type="number" id="recharge-amount" min="0.01" step="0.01" placeholder="Enter deposit amount">
                <div class="quick-amounts">
                    <button onclick="setRechargeAmount(1000)">¥1,000</button>
                    <button onclick="setRechargeAmount(5000)">¥5,000</button>
                    <button onclick="setRechargeAmount(10000)">¥10,000</button>
                    <button onclick="setRechargeAmount(50000)">¥50,000</button>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeRechargeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="processRecharge()">Confirm Deposit</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // 聚焦到输入框
    setTimeout(() => {
        document.getElementById('recharge-amount').focus();
    }, 100);
}

// Close recharge modal
function closeRechargeModal() {
    const modal = document.querySelector('.recharge-modal');
    if (modal) {
        modal.remove();
    }
}

// Set recharge amount
function setRechargeAmount(amount) {
    document.getElementById('recharge-amount').value = amount;
}

// Process recharge
function processRecharge() {
    const amountInput = document.getElementById('recharge-amount');
    const amount = parseFloat(amountInput.value);
    
    if (!amount || amount <= 0) {
        alert('Please enter a valid deposit amount');
        return;
    }
    
    if (amount > 1000000) {
        alert('Single deposit amount cannot exceed 1 million yuan');
        return;
    }
    
    if (!confirm(`Confirm deposit of ¥${amount.toFixed(2)}?`)) {
        return;
    }
    
    console.log('Starting deposit:', amount);
    
    // Show loading status
    const confirmBtn = document.querySelector('.modal-footer .btn-primary');
    const originalText = confirmBtn.textContent;
    confirmBtn.textContent = 'Processing...';
    confirmBtn.disabled = true;
    
    fetch('/api/portfolio/recharge', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: amount })
    })
    .then(response => {
        console.log('Deposit response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Deposit response data:', data);
        if (data.error) {
            console.error('Deposit failed:', data.error);
            alert('Deposit failed: ' + data.error);
        } else if (data.success) {
            console.log('Deposit successful:', data);
            alert(`Deposit successful! Deposited ¥${parseFloat(data.amount).toFixed(2)}`);
            closeRechargeModal();
            // Delay reloading data to ensure server-side update is complete
            setTimeout(() => {
                loadPortfolioData();
            }, 500);
        } else {
            alert('Deposit failed: Server response abnormal');
        }
    })
    .catch(error => {
        console.error('Error occurred during deposit:', error);
        alert('Deposit failed, please check your network connection and try again');
    })
    .finally(() => {
        // Restore button status
        if (confirmBtn) {
            confirmBtn.textContent = originalText;
            confirmBtn.disabled = false;
        }
    });
}

// Add CSS styles
const style = document.createElement('style');
style.textContent = `
    .profit-positive {
        color: #28a745;
        font-weight: bold;
    }
    .profit-negative {
        color: #dc3545;
        font-weight: bold;
    }
    .btn {
        padding: 4px 8px;
        margin: 2px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    }
    .btn-sm {
        padding: 2px 6px;
        font-size: 11px;
    }
    .btn-secondary {
        background-color: #6c757d;
        color: white;
    }
    .btn-danger {
        background-color: #dc3545;
        color: white;
    }
    .btn-warning {
        background-color: #ffc107;
        color: #212529;
    }
    .btn-primary {
        background-color: #007bff;
        color: white;
    }
    .btn:hover {
        opacity: 0.8;
    }
    
    /* Action button styles */
    .action-btn {
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        border: none;
        margin: 2px;
        color: white;
        font-weight: bold;
        transition: all 0.3s ease;
    }
    
    .sell-btn {
        background-color: #007bff; /* Blue */
    }
    
    .delete-btn {
        background-color: #dc3545; /* Red */
    }
    
    .action-btn:hover {
        opacity: 0.8;
        transform: translateY(-2px);
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    
    /* Recharge modal styles */
    .recharge-modal, .sell-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }
    
    .modal-content {
        background: white;
        border-radius: 8px;
        width: 90%;
        max-width: 500px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .modal-header {
        padding: 20px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .modal-header h3 {
        margin: 0;
        color: #333;
    }
    
    .close-btn {
        font-size: 24px;
        cursor: pointer;
        color: #999;
    }
    
    .close-btn:hover {
        color: #333;
    }
    
    .modal-body {
        padding: 20px;
    }
    
    .modal-body label {
        display: block;
        margin-bottom: 8px;
        font-weight: bold;
        color: #333;
    }
    
    .modal-body input {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 16px;
        margin-bottom: 15px;
        box-sizing: border-box;
    }
    
    .quick-amounts {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
    }
    
    .quick-amounts button {
        padding: 8px 16px;
        border: 1px solid #007bff;
        background: white;
        color: #007bff;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
    }
    
    .quick-amounts button:hover, .quick-sell button:hover {
        background: #007bff;
        color: white;
    }
    
    .quick-sell {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 10px;
    }
    
    .quick-sell button {
        padding: 8px 16px;
        border: 1px solid #dc3545;
        background: white;
        color: #dc3545;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
    }
    
    .quick-sell button:hover {
        background: #dc3545;
        color: white;
    }
    
    .modal-footer {
        padding: 20px;
        border-top: 1px solid #eee;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    }
    
    .modal-footer .btn {
        padding: 10px 20px;
        font-size: 14px;
    }
`;
document.head.appendChild(style);

// Delete asset
function deleteAsset(assetId, assetName) {
    if (!confirm(`Are you sure you want to delete the asset ${assetName}? This action cannot be undone.`)) {
        return;
    }
    
    console.log('Starting to delete asset:', { assetId, assetName });
    
    fetch(`/api/portfolio/${assetId}`, {
        method: 'DELETE'
    })
    .then(response => {
        console.log('Delete response status:', response.status);
        return response.json();
    })
    .then(data => {
        if (data.error) {
            console.error('Delete failed:', data.error);
            alert('Delete failed: ' + data.error);
        } else {
            console.log('Delete successful:', data);
            alert('Asset deleted successfully');
            loadPortfolioData(); // Reload data
        }
    })
    .catch(error => {
        console.error('Error occurred during delete:', error);
        alert('Delete failed, please try again later');
    });
}

// 将函数添加到全局作用域，以便HTML中的onclick可以访问
window.closeRechargeModal = closeRechargeModal;
window.setRechargeAmount = setRechargeAmount;
window.processRecharge = processRecharge;
window.sellAsset = sellAsset;
window.closeSellModal = closeSellModal;
window.setSellQuantity = setSellQuantity;
window.processSell = processSell;
window.updatePrice = updatePrice;
window.deleteAsset = deleteAsset;
