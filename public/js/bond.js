// Bond Market Page JavaScript

let currentBondData = null;

// Initialize after page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Bond market page loaded');
    initializeBondMarket();
});

// Initialize bond market
function initializeBondMarket() {
    // Bind query button event
    const queryBtn = document.getElementById('query-single-bond-btn');
    if (queryBtn) {
        queryBtn.addEventListener('click', querySingleBond);
    }

    // Bind input box enter event
    const symbolInput = document.getElementById('bond-symbol-input');
    if (symbolInput) {
        symbolInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                querySingleBond();
            }
        });
    }

    // Bind modal close event
    const modal = document.getElementById('buy-bond-modal');
    if (modal) {
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeBuyBondModal);
        }

        // Close when clicking outside the modal
        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeBuyBondModal();
            }
        });
    }

    // Bind quantity input change event
    const quantityInput = document.getElementById('bond-quantity');
    if (quantityInput) {
        quantityInput.addEventListener('input', updateBondTotalAmount);
    }

    // Load recommended bonds list
    loadRecommendedBonds();
}

// Query single bond
async function querySingleBond() {
    const symbolInput = document.getElementById('bond-symbol-input');
    const symbol = symbolInput.value.trim().toUpperCase();
    
    if (!symbol) {
        alert('Please enter a bond code');
        return;
    }

    console.log('Querying bond:', symbol);

    try {
        const response = await fetch(`/api/bonds/single/${symbol}`);
        const data = await response.json();
        
        if (response.ok && data) {
            displaySingleBondResult(data);
        } else {
            alert(data.error || 'Query failed');
        }
    } catch (error) {
        console.error('Failed to query bond:', error);
        alert('Query failed, please try again later');
    }
}

// Display single bond query result
function displaySingleBondResult(bond) {
    const resultDiv = document.getElementById('single-bond-result');
    
    if (!resultDiv) {
        console.error('Cannot find single-bond-result element');
        return;
    }
    
    // Safe data conversion
    const price = parseFloat(bond.current_price || bond.price || 0);
    const couponRate = parseFloat(bond.coupon_rate || bond.yield || 0);
    const faceValue = parseFloat(bond.face_value || 1000);
    const changePercent = parseFloat(bond.change_percent || 0);
    const changeClass = changePercent >= 0 ? 'positive' : 'negative';
    const changeSign = changePercent >= 0 ? '+' : '';
    
    // Format date
    let maturityDate = 'Unknown';
    if (bond.maturity_date) {
        try {
            const date = new Date(bond.maturity_date);
            if (!isNaN(date.getTime())) {
                maturityDate = date.toLocaleDateString('en-US');
            }
        } catch (e) {
            console.error('Date parsing error:', e);
        }
    }

    resultDiv.innerHTML = `
        <div class="stock-card">
            <div class="stock-header">
                <h3>${bond.name || bond.symbol}</h3>
                <span class="stock-symbol">${bond.symbol}</span>
            </div>
            <div class="stock-details">
                <div class="price-info">
                    <div class="current-price">$${price.toFixed(2)}</div>
                    <div class="price-change ${changeClass}">${changeSign}${changePercent.toFixed(2)}%</div>
                </div>
                <div class="stock-stats">
                    <div class="stat-item">
                        <span class="stat-label">Face Value:</span>
                        <span class="stat-value">$${faceValue.toFixed(2)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Coupon Rate:</span>
                        <span class="stat-value">${couponRate.toFixed(2)}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Maturity Date:</span>
                        <span class="stat-value">${maturityDate}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Rating:</span>
                        <span class="stat-value">${bond.rating || 'AAA'}</span>
                    </div>
                </div>
                <div class="stock-actions">
                    <button class="btn btn-primary" onclick="showBuyBondModal('${bond.symbol}', '${bond.name || bond.symbol}', ${price})">
                        Buy Bond
                    </button>
                </div>
            </div>
        </div>
    `;
    
    resultDiv.style.display = 'block';
}

// Load recommended bonds list
async function loadRecommendedBonds() {
    console.log('Starting to load recommended bonds list');
    
    const container = document.getElementById('recommended-bonds-list');
    if (!container) {
        console.error('Cannot find recommended-bonds-list element');
        return;
    }
    
    container.innerHTML = '<div class="loading">Loading bond data...</div>';
    
    try {
        const response = await fetch('/api/bonds');
        console.log('Bond API response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const bonds = await response.json();
        console.log('Retrieved bond data:', bonds);
        
        if (bonds && bonds.length > 0) {
            displayRecommendedBonds(bonds.slice(0, 5)); // 只显示前5个
        } else {
            container.innerHTML = '<div class="no-data">No bond data available</div>';
        }
    } catch (error) {
        console.error('Failed to get bond list:', error);
        container.innerHTML = '<div class="error-message">Loading failed: ' + error.message + '</div>';
    }
}

// Display recommended bonds list
function displayRecommendedBonds(bonds) {
    const container = document.getElementById('recommended-bonds-list');
    
    if (!container) {
        console.error('Cannot find recommended-bonds-list element');
        return;
    }
    
    if (!bonds || bonds.length === 0) {
        container.innerHTML = '<div class="no-data">No bond data available</div>';
        return;
    }

    console.log('Displaying bond count:', bonds.length);

    const bondsHtml = bonds.map(bond => {
        // 安全的数据转换
        const price = parseFloat(bond.current_price || 0);
        const couponRate = parseFloat(bond.coupon_rate || 0);
        const changePercent = parseFloat(bond.change_percent || 0);
        const changeClass = changePercent >= 0 ? 'positive' : 'negative';
        const changeSign = changePercent >= 0 ? '+' : '';
        const rating = bond.rating || 'AAA';
        const issuer = bond.issuer || 'Government';

        return `
            <div class="stock-card bond-card">
                <div class="stock-header">
                    <h4>${bond.name || bond.symbol}</h4>
                    <span class="stock-symbol">${bond.symbol}</span>
                </div>
                <div class="stock-details">
                    <div class="price-info">
                        <div class="current-price">$${price.toFixed(2)}</div>
                        <div class="price-change ${changeClass}">${changeSign}${changePercent.toFixed(2)}%</div>
                    </div>
                    <div class="stock-stats">
                        <div class="stat-item">
                            <span class="stat-label">Coupon Rate:</span>
                            <span class="stat-value">${couponRate.toFixed(2)}%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Rating:</span>
                            <span class="stat-value">${rating}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Issuer:</span>
                            <span class="stat-value">${issuer}</span>
                        </div>
                    </div>
                    <div class="stock-actions">
                        <button class="btn btn-primary btn-sm buy-bond-btn" onclick="showBuyBondModal('${bond.symbol}', '${bond.name || bond.symbol}', ${price})">
                            Buy Now
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = bondsHtml;
    console.log('Bond list display completed');
}

// Refresh recommended bonds list
function refreshRecommendedBonds() {
    loadRecommendedBonds();
}

// Show buy bond modal - directly redirect to add asset page
function showBuyBondModal(symbol, name, price) {
    console.log('Buying bond:', symbol, name, price);
    
    // Show loading hint
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000;
        text-align: center;
    `;
    loadingDiv.innerHTML = '<div>Getting bond information...</div>';
    document.body.appendChild(loadingDiv);
    
    // Get complete bond information
    fetch(`/api/bonds/single/${symbol}`)
        .then(response => response.json())
        .then(data => {
            document.body.removeChild(loadingDiv);
            
            if (data && !data.error) {
                // Format maturity date
                let maturityDate = '';
                if (data.maturity_date) {
                    const date = new Date(data.maturity_date);
                    maturityDate = date.toISOString().split('T')[0]; // YYYY-MM-DD格式
                }
                
                const bondData = {
                    type: 'bond',
                    symbol: symbol,
                    name: name,
                    price: parseFloat(price),
                    couponRate: data.coupon_rate || 0,
                    faceValue: data.face_value || 1000,
                    maturityDate: maturityDate,
                    rating: data.rating || 'AAA',
                    issuer: data.issuer || 'Government'
                };
                
                localStorage.setItem('prefilledAsset', JSON.stringify(bondData));
                console.log('Bond information stored in localStorage:', bondData);
                
                // Redirect to add asset page
                window.location.href = 'add_asset.html';
            } else {
                alert('Failed to get bond information: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            document.body.removeChild(loadingDiv);
            console.error('Failed to get bond details:', error);
            
            // Redirect with basic information
            const bondData = {
                type: 'bond',
                symbol: symbol,
                name: name,
                price: parseFloat(price),
                couponRate: 0,
                faceValue: 1000,
                maturityDate: ''
            };
            
            localStorage.setItem('prefilledAsset', JSON.stringify(bondData));
            window.location.href = 'add_asset.html';
        });
}

// Close buy bond modal
function closeBuyBondModal() {
    const modal = document.getElementById('buy-bond-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentBondData = null;
}

// Set bond purchase quantity
function setBondQuantity(quantity) {
    const quantityInput = document.getElementById('bond-quantity');
    if (quantityInput) {
        quantityInput.value = quantity;
        updateBondTotalAmount();
    }
}

// Update bond total amount
function updateBondTotalAmount() {
    if (!currentBondData) return;
    
    const quantityInput = document.getElementById('bond-quantity');
    const totalAmountElement = document.getElementById('bond-total-amount');
    
    if (quantityInput && totalAmountElement) {
        const quantity = parseInt(quantityInput.value) || 1;
        const totalAmount = currentBondData.price * quantity;
        totalAmountElement.textContent = `$${totalAmount.toFixed(2)}`;
    }
}

// Confirm bond purchase
async function confirmBuyBond() {
    if (!currentBondData) return;
    
    const quantityInput = document.getElementById('bond-quantity');
    if (!quantityInput) return;
    
    const quantity = parseInt(quantityInput.value) || 1;
    
    if (quantity <= 0) {
        alert('Please enter a valid purchase quantity');
        return;
    }
    
    try {
        const response = await fetch('/api/bonds/buy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                symbol: currentBondData.symbol,
                name: currentBondData.name,
                price: currentBondData.price,
                quantity: quantity
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            alert(`Bond purchase successful!\nBond: ${currentBondData.name}\nQuantity: ${quantity} units\nTotal Amount: $${result.totalCost}`);
            closeBuyBondModal();
            
            // Ask whether to redirect to portfolio page
            if (confirm('Purchase successful! Would you like to view your portfolio?')) {
                window.location.href = 'portfolio.html';
            }
        } else {
            alert(result.error || 'Purchase failed');
        }
    } catch (error) {
        console.error('Failed to purchase bond:', error);
        alert('Purchase failed, please try again later');
    }
}
