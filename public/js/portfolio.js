// DOM元素
let totalAssetsElement, cashBalanceElement, portfolioTableBody;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('投资组合页面加载完成');
    
    // 获取DOM元素
    totalAssetsElement = document.getElementById('total-assets');
    cashBalanceElement = document.getElementById('cash-balance');
    portfolioTableBody = document.getElementById('assets-table-body');
    
    if (!totalAssetsElement || !cashBalanceElement || !portfolioTableBody) {
        console.error('找不到必要的DOM元素', {
            totalAssetsElement: !!totalAssetsElement,
            cashBalanceElement: !!cashBalanceElement,
            portfolioTableBody: !!portfolioTableBody
        });
        return;
    }
    
    // 加载投资组合数据
    loadPortfolioData();
    
    // 绑定充值按钮事件
    const rechargeBtn = document.getElementById('recharge-btn');
    if (rechargeBtn) {
        rechargeBtn.addEventListener('click', showRechargeModal);
    }
});

// 加载投资组合数据
function loadPortfolioData() {
    console.log('开始加载投资组合数据');
    
    fetch('/api/portfolio')
        .then(response => {
            console.log('投资组合响应状态:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('投资组合数据:', data);
            if (data.error) {
                console.error('获取投资组合失败:', data.error);
                showError('获取投资组合失败');
            } else {
                displayPortfolioData(data);
            }
        })
        .catch(error => {
            console.error('获取投资组合时发生错误:', error);
            showError('加载失败，请刷新页面重试');
        });
}

// 显示投资组合数据
function displayPortfolioData(data) {
    console.log('显示投资组合数据:', data);
    
    // 显示用户资产信息
    if (data.user) {
        const totalAssets = parseFloat(data.user.total_assets) || 0;
        const cashBalance = parseFloat(data.user.cash_balance) || 0;
        
        totalAssetsElement.textContent = `¥${totalAssets.toLocaleString('zh-CN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        cashBalanceElement.textContent = `¥${cashBalance.toLocaleString('zh-CN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        console.log('用户资产信息已更新:', { totalAssets, cashBalance });
    } else {
        console.warn('没有找到用户数据');
        totalAssetsElement.textContent = '¥0.00';
        cashBalanceElement.textContent = '¥0.00';
    }
    
    // 显示资产列表
    if (data.assets && Array.isArray(data.assets)) {
        displayAssetsList(data.assets);
    } else {
        console.warn('没有找到资产数据');
        portfolioTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">暂无资产</td></tr>';
    }
}

// 显示资产列表
function displayAssetsList(assets) {
    console.log('显示资产列表:', assets.length, '项');
    
    if (assets.length === 0) {
        portfolioTableBody.innerHTML = '<tr><td colspan="10" style="text-align: center;">暂无资产</td></tr>';
        return;
    }
    
    portfolioTableBody.innerHTML = '';
    
    assets.forEach(asset => {
        const row = createAssetRow(asset);
        portfolioTableBody.appendChild(row);
    });
}

// 创建资产行
function createAssetRow(asset) {
    const row = document.createElement('tr');
    
    // 计算收益
    const quantity = parseFloat(asset.quantity) || 0;
    const purchasePrice = parseFloat(asset.purchase_price) || 0;
    const currentPrice = parseFloat(asset.current_price) || 0;
    const totalValue = quantity * currentPrice;
    const totalCost = quantity * purchasePrice;
    const profit = totalValue - totalCost;
    const profitRate = totalCost > 0 ? (profit / totalCost * 100) : 0;
    
    // 格式化日期
    const purchaseDate = new Date(asset.purchase_date).toLocaleDateString('zh-CN');
    
    // 资产类型显示
    const assetTypeText = asset.type === 'stock' ? '股票' : asset.type === 'bond' ? '债券' : '现金';
    
    row.innerHTML = `
        <td>${asset.name || '未知'}</td>
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
            <button class="action-btn sell-btn" onclick="sellAsset(${asset.id}, '${asset.name}', ${quantity})">卖出</button>
            <button class="action-btn delete-btn" onclick="deleteAsset(${asset.id}, '${asset.name}')">删除</button>
        </td>
    `;
    
    return row;
}

// 更新价格
function updatePrice(type, symbol) {
    console.log('更新价格:', type, symbol);
    
    const endpoint = type === 'stock' ? `/api/stocks/${symbol}/update` : `/api/bonds/${symbol}/update`;
    
    fetch(endpoint, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('更新价格失败: ' + data.error);
            } else {
                alert('价格更新成功');
                loadPortfolioData(); // 重新加载数据
            }
        })
        .catch(error => {
            console.error('更新价格失败:', error);
            alert('更新价格失败');
        });
}

// 卖出资产
function sellAsset(assetId, assetName, currentQuantity) {
    // 显示卖出模态框
    showSellModal(assetId, assetName, currentQuantity);
}

// 显示卖出模态框
function showSellModal(assetId, assetName, currentQuantity) {
    const modal = document.createElement('div');
    modal.className = 'sell-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>卖出资产</h3>
                <span class="close-btn" onclick="closeSellModal()">&times;</span>
            </div>
            <div class="modal-body">
                <p><strong>资产名称:</strong> ${assetName}</p>
                <p><strong>持有数量:</strong> ${parseFloat(currentQuantity).toFixed(4)}</p>
                <label for="sell-quantity">卖出数量:</label>
                <input type="number" id="sell-quantity" min="0.0001" max="${currentQuantity}" step="0.0001" placeholder="请输入卖出数量">
                <div class="quick-sell">
                    <button onclick="setSellQuantity(${currentQuantity * 0.25})">25%</button>
                    <button onclick="setSellQuantity(${currentQuantity * 0.5})">50%</button>
                    <button onclick="setSellQuantity(${currentQuantity * 0.75})">75%</button>
                    <button onclick="setSellQuantity(${currentQuantity})">全部</button>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeSellModal()">取消</button>
                <button class="btn btn-danger" onclick="processSell(${assetId})">确认卖出</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // 聚焦到输入框
    setTimeout(() => {
        document.getElementById('sell-quantity').focus();
    }, 100);
}

// 关闭卖出模态框
function closeSellModal() {
    const modal = document.querySelector('.sell-modal');
    if (modal) {
        modal.remove();
    }
}

// 设置卖出数量
function setSellQuantity(quantity) {
    document.getElementById('sell-quantity').value = parseFloat(quantity).toFixed(4);
}

// 处理卖出
function processSell(assetId) {
    const quantityInput = document.getElementById('sell-quantity');
    const quantity = parseFloat(quantityInput.value);
    
    if (!quantity || quantity <= 0) {
        alert('请输入有效的卖出数量');
        return;
    }
    
    const maxQuantity = parseFloat(quantityInput.max);
    if (quantity > maxQuantity) {
        alert('卖出数量不能超过持有数量');
        return;
    }
    
    if (!confirm(`确定要卖出 ${quantity.toFixed(4)} 单位的资产吗？`)) {
        return;
    }
    
    console.log('开始卖出资产:', { assetId, quantity });
    
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
        console.log('卖出响应状态:', response.status);
        return response.json();
    })
    .then(data => {
        if (data.error) {
            console.error('卖出失败:', data.error);
            alert('卖出失败: ' + data.error);
        } else {
            console.log('卖出成功:', data);
            alert(`卖出成功！获得现金 ¥${data.amount.toFixed(2)}`);
            closeSellModal();
            loadPortfolioData(); // 重新加载数据
        }
    })
    .catch(error => {
        console.error('卖出时发生错误:', error);
        alert('卖出失败，请稍后重试');
    });
}

// 显示错误信息
function showError(message) {
    totalAssetsElement.textContent = '错误';
    cashBalanceElement.textContent = '错误';
    portfolioTableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: red;">${message}</td></tr>`;
}

// 显示充值模态框
function showRechargeModal() {
    const modal = document.createElement('div');
    modal.className = 'recharge-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>充值现金</h3>
                <span class="close-btn" onclick="closeRechargeModal()">&times;</span>
            </div>
            <div class="modal-body">
                <label for="recharge-amount">充值金额 (¥):</label>
                <input type="number" id="recharge-amount" min="0.01" step="0.01" placeholder="请输入充值金额">
                <div class="quick-amounts">
                    <button onclick="setRechargeAmount(1000)">¥1,000</button>
                    <button onclick="setRechargeAmount(5000)">¥5,000</button>
                    <button onclick="setRechargeAmount(10000)">¥10,000</button>
                    <button onclick="setRechargeAmount(50000)">¥50,000</button>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeRechargeModal()">取消</button>
                <button class="btn btn-primary" onclick="processRecharge()">确认充值</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // 聚焦到输入框
    setTimeout(() => {
        document.getElementById('recharge-amount').focus();
    }, 100);
}

// 关闭充值模态框
function closeRechargeModal() {
    const modal = document.querySelector('.recharge-modal');
    if (modal) {
        modal.remove();
    }
}

// 设置充值金额
function setRechargeAmount(amount) {
    document.getElementById('recharge-amount').value = amount;
}

// 处理充值
function processRecharge() {
    const amountInput = document.getElementById('recharge-amount');
    const amount = parseFloat(amountInput.value);
    
    if (!amount || amount <= 0) {
        alert('请输入有效的充值金额');
        return;
    }
    
    if (amount > 1000000) {
        alert('单次充值金额不能超过100万元');
        return;
    }
    
    if (!confirm(`确认充值 ¥${amount.toFixed(2)} 吗？`)) {
        return;
    }
    
    console.log('开始充值:', amount);
    
    // 显示加载状态
    const confirmBtn = document.querySelector('.modal-footer .btn-primary');
    const originalText = confirmBtn.textContent;
    confirmBtn.textContent = '充值中...';
    confirmBtn.disabled = true;
    
    fetch('/api/portfolio/recharge', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: amount })
    })
    .then(response => {
        console.log('充值响应状态:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('充值响应数据:', data);
        if (data.error) {
            console.error('充值失败:', data.error);
            alert('充值失败: ' + data.error);
        } else if (data.success) {
            console.log('充值成功:', data);
            alert(`充值成功！已充值 ¥${parseFloat(data.amount).toFixed(2)}`);
            closeRechargeModal();
            // 延迟重新加载数据，确保服务器端更新完成
            setTimeout(() => {
                loadPortfolioData();
            }, 500);
        } else {
            alert('充值失败：服务器响应异常');
        }
    })
    .catch(error => {
        console.error('充值时发生错误:', error);
        alert('充值失败，请检查网络连接后重试');
    })
    .finally(() => {
        // 恢复按钮状态
        if (confirmBtn) {
            confirmBtn.textContent = originalText;
            confirmBtn.disabled = false;
        }
    });
}

// 添加CSS样式
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
    
    /* 操作按钮样式 */
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
        background-color: #007bff; /* 蓝色 */
    }
    
    .delete-btn {
        background-color: #dc3545; /* 红色 */
    }
    
    .action-btn:hover {
        opacity: 0.8;
        transform: translateY(-2px);
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    
    /* 充值模态框样式 */
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

// 删除资产
function deleteAsset(assetId, assetName) {
    if (!confirm(`确定要删除 ${assetName} 这项资产吗？此操作不可恢复。`)) {
        return;
    }
    
    console.log('开始删除资产:', { assetId, assetName });
    
    fetch(`/api/portfolio/${assetId}`, {
        method: 'DELETE'
    })
    .then(response => {
        console.log('删除响应状态:', response.status);
        return response.json();
    })
    .then(data => {
        if (data.error) {
            console.error('删除失败:', data.error);
            alert('删除失败: ' + data.error);
        } else {
            console.log('删除成功:', data);
            alert('资产删除成功');
            loadPortfolioData(); // 重新加载数据
        }
    })
    .catch(error => {
        console.error('删除时发生错误:', error);
        alert('删除失败，请稍后重试');
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
