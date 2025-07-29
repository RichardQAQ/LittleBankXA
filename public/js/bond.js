// 债券市场页面JavaScript

let currentBondData = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('债券市场页面加载完成');
    initializeBondMarket();
});

// 初始化债券市场
function initializeBondMarket() {
    // 绑定查询按钮事件
    const queryBtn = document.getElementById('query-single-bond-btn');
    if (queryBtn) {
        queryBtn.addEventListener('click', querySingleBond);
    }

    // 绑定输入框回车事件
    const symbolInput = document.getElementById('bond-symbol-input');
    if (symbolInput) {
        symbolInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                querySingleBond();
            }
        });
    }

    // 绑定模态框关闭事件
    const modal = document.getElementById('buy-bond-modal');
    if (modal) {
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeBuyBondModal);
        }

        // 点击模态框外部关闭
        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeBuyBondModal();
            }
        });
    }

    // 绑定数量输入变化事件
    const quantityInput = document.getElementById('bond-quantity');
    if (quantityInput) {
        quantityInput.addEventListener('input', updateBondTotalAmount);
    }

    // 加载推荐债券列表
    loadRecommendedBonds();
}

// 查询单个债券
async function querySingleBond() {
    const symbolInput = document.getElementById('bond-symbol-input');
    const symbol = symbolInput.value.trim().toUpperCase();
    
    if (!symbol) {
        alert('请输入债券代码');
        return;
    }

    console.log('查询债券:', symbol);

    try {
        const response = await fetch(`/api/bonds/single/${symbol}`);
        const data = await response.json();
        
        if (response.ok && data) {
            displaySingleBondResult(data);
        } else {
            alert(data.error || '查询失败');
        }
    } catch (error) {
        console.error('查询债券失败:', error);
        alert('查询失败，请稍后重试');
    }
}

// 显示单个债券查询结果
function displaySingleBondResult(bond) {
    const resultDiv = document.getElementById('single-bond-result');
    
    if (!resultDiv) {
        console.error('找不到single-bond-result元素');
        return;
    }
    
    // 安全的数据转换
    const price = parseFloat(bond.current_price || bond.price || 0);
    const couponRate = parseFloat(bond.coupon_rate || bond.yield || 0);
    const faceValue = parseFloat(bond.face_value || 1000);
    const changePercent = parseFloat(bond.change_percent || 0);
    const changeClass = changePercent >= 0 ? 'positive' : 'negative';
    const changeSign = changePercent >= 0 ? '+' : '';
    
    // 格式化日期
    let maturityDate = '未知';
    if (bond.maturity_date) {
        try {
            const date = new Date(bond.maturity_date);
            if (!isNaN(date.getTime())) {
                maturityDate = date.toLocaleDateString('zh-CN');
            }
        } catch (e) {
            console.error('日期解析错误:', e);
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
                    <div class="current-price">¥${price.toFixed(2)}</div>
                    <div class="price-change ${changeClass}">${changeSign}${changePercent.toFixed(2)}%</div>
                </div>
                <div class="stock-stats">
                    <div class="stat-item">
                        <span class="stat-label">面值:</span>
                        <span class="stat-value">¥${faceValue.toFixed(2)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">票面利率:</span>
                        <span class="stat-value">${couponRate.toFixed(2)}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">到期日:</span>
                        <span class="stat-value">${maturityDate}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">评级:</span>
                        <span class="stat-value">${bond.rating || 'AAA'}</span>
                    </div>
                </div>
                <div class="stock-actions">
                    <button class="btn btn-primary" onclick="showBuyBondModal('${bond.symbol}', '${bond.name || bond.symbol}', ${price})">
                        购买债券
                    </button>
                </div>
            </div>
        </div>
    `;
    
    resultDiv.style.display = 'block';
}

// 加载推荐债券列表
async function loadRecommendedBonds() {
    console.log('开始加载推荐债券列表');
    
    const container = document.getElementById('recommended-bonds-list');
    if (!container) {
        console.error('找不到recommended-bonds-list元素');
        return;
    }
    
    container.innerHTML = '<div class="loading">加载债券数据中...</div>';
    
    try {
        const response = await fetch('/api/bonds');
        console.log('债券API响应状态:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const bonds = await response.json();
        console.log('获取到债券数据:', bonds);
        
        if (bonds && bonds.length > 0) {
            displayRecommendedBonds(bonds.slice(0, 5)); // 只显示前5个
        } else {
            container.innerHTML = '<div class="no-data">暂无债券数据</div>';
        }
    } catch (error) {
        console.error('获取债券列表失败:', error);
        container.innerHTML = '<div class="error-message">加载失败: ' + error.message + '</div>';
    }
}

// 显示推荐债券列表
function displayRecommendedBonds(bonds) {
    const container = document.getElementById('recommended-bonds-list');
    
    if (!container) {
        console.error('找不到recommended-bonds-list元素');
        return;
    }
    
    if (!bonds || bonds.length === 0) {
        container.innerHTML = '<div class="no-data">暂无债券数据</div>';
        return;
    }

    console.log('显示债券数量:', bonds.length);

    const bondsHtml = bonds.map(bond => {
        // 安全的数据转换
        const price = parseFloat(bond.current_price || 0);
        const couponRate = parseFloat(bond.coupon_rate || 0);
        const changePercent = parseFloat(bond.change_percent || 0);
        const changeClass = changePercent >= 0 ? 'positive' : 'negative';
        const changeSign = changePercent >= 0 ? '+' : '';
        const rating = bond.rating || 'AAA';
        const issuer = bond.issuer || '政府';

        return `
            <div class="stock-card bond-card">
                <div class="stock-header">
                    <h4>${bond.name || bond.symbol}</h4>
                    <span class="stock-symbol">${bond.symbol}</span>
                </div>
                <div class="stock-details">
                    <div class="price-info">
                        <div class="current-price">¥${price.toFixed(2)}</div>
                        <div class="price-change ${changeClass}">${changeSign}${changePercent.toFixed(2)}%</div>
                    </div>
                    <div class="stock-stats">
                        <div class="stat-item">
                            <span class="stat-label">票面利率:</span>
                            <span class="stat-value">${couponRate.toFixed(2)}%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">评级:</span>
                            <span class="stat-value">${rating}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">发行方:</span>
                            <span class="stat-value">${issuer}</span>
                        </div>
                    </div>
                    <div class="stock-actions">
                        <button class="btn btn-primary btn-sm buy-bond-btn" onclick="showBuyBondModal('${bond.symbol}', '${bond.name || bond.symbol}', ${price})">
                            立即购买
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = bondsHtml;
    console.log('债券列表显示完成');
}

// 刷新推荐债券列表
function refreshRecommendedBonds() {
    loadRecommendedBonds();
}

// 显示购买债券模态框 - 直接跳转到增加资产页面
function showBuyBondModal(symbol, name, price) {
    console.log('购买债券:', symbol, name, price);
    
    // 显示加载提示
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
    loadingDiv.innerHTML = '<div>正在获取债券信息...</div>';
    document.body.appendChild(loadingDiv);
    
    // 获取完整的债券信息
    fetch(`/api/bonds/single/${symbol}`)
        .then(response => response.json())
        .then(data => {
            document.body.removeChild(loadingDiv);
            
            if (data && !data.error) {
                // 格式化到期日期
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
                    issuer: data.issuer || '政府'
                };
                
                localStorage.setItem('prefilledAsset', JSON.stringify(bondData));
                console.log('债券信息已存储到localStorage:', bondData);
                
                // 跳转到增加资产页面
                window.location.href = 'add_asset.html';
            } else {
                alert('获取债券信息失败: ' + (data.error || '未知错误'));
            }
        })
        .catch(error => {
            document.body.removeChild(loadingDiv);
            console.error('获取债券详情失败:', error);
            
            // 使用基本信息跳转
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

// 关闭购买债券模态框
function closeBuyBondModal() {
    const modal = document.getElementById('buy-bond-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentBondData = null;
}

// 设置债券购买数量
function setBondQuantity(quantity) {
    const quantityInput = document.getElementById('bond-quantity');
    if (quantityInput) {
        quantityInput.value = quantity;
        updateBondTotalAmount();
    }
}

// 更新债券总金额
function updateBondTotalAmount() {
    if (!currentBondData) return;
    
    const quantityInput = document.getElementById('bond-quantity');
    const totalAmountElement = document.getElementById('bond-total-amount');
    
    if (quantityInput && totalAmountElement) {
        const quantity = parseInt(quantityInput.value) || 1;
        const totalAmount = currentBondData.price * quantity;
        totalAmountElement.textContent = `¥${totalAmount.toFixed(2)}`;
    }
}

// 确认购买债券
async function confirmBuyBond() {
    if (!currentBondData) return;
    
    const quantityInput = document.getElementById('bond-quantity');
    if (!quantityInput) return;
    
    const quantity = parseInt(quantityInput.value) || 1;
    
    if (quantity <= 0) {
        alert('请输入有效的购买数量');
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
            alert(`债券购买成功！\n债券: ${currentBondData.name}\n数量: ${quantity}份\n总金额: ¥${result.totalCost}`);
            closeBuyBondModal();
            
            // 询问是否跳转到投资组合页面
            if (confirm('购买成功！是否查看您的投资组合？')) {
                window.location.href = 'portfolio.html';
            }
        } else {
            alert(result.error || '购买失败');
        }
    } catch (error) {
        console.error('购买债券失败:', error);
        alert('购买失败，请稍后重试');
    }
}