// 股票市场页面JavaScript

// DOM元素
let singleStockInput;
let singleStockResult;
let recommendedStocksList;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('股票市场页面加载完成');
    
    // 获取DOM元素
    singleStockInput = document.getElementById('stock-symbol-input');
    singleStockResult = document.getElementById('single-stock-result');
    recommendedStocksList = document.getElementById('recommended-stocks-list');
    
    // 绑定事件
    const queryBtn = document.getElementById('query-single-stock-btn');
    if (queryBtn) {
        queryBtn.addEventListener('click', querySingleStock);
    }
    
    // 支持回车键查询
    if (singleStockInput) {
        singleStockInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                querySingleStock();
            }
        });
    }
    
    // 加载推荐股票列表
    loadRecommendedStocks();
});

// 查询单个股票 (使用数据库数据)
async function querySingleStock() {
    const symbol = singleStockInput.value.trim().toUpperCase();
    
    if (!symbol) {
        alert('请输入股票代码');
        return;
    }
    
    console.log('查询单个股票:', symbol);
    singleStockResult.innerHTML = '<div class="loading">查询中...</div>';
    
    try {
        const response = await fetch(`/api/stocks/single/${symbol}`);
        const data = await response.json();
        
        if (response.ok && data) {
            renderSingleStock(data);
        } else {
            singleStockResult.innerHTML = `<div class="error">查询失败: ${data.error || '未找到该股票'}</div>`;
        }
    } catch (error) {
        console.error('查询单个股票失败:', error);
        singleStockResult.innerHTML = '<div class="error">查询失败，请稍后重试</div>';
    }
}

// 渲染单个股票信息
function renderSingleStock(stock) {
    const changePercent = parseFloat(stock.change_percent || 0);
    const changeClass = changePercent >= 0 ? 'positive' : 'negative';
    const changeSymbol = changePercent >= 0 ? '+' : '';
    const currentPrice = parseFloat(stock.current_price || 0);
    const openPrice = parseFloat(stock.open_price || 0);
    const highPrice = parseFloat(stock.high_price || 0);
    const lowPrice = parseFloat(stock.low_price || 0);
    const volume = parseInt(stock.volume || 0);
    
    singleStockResult.innerHTML = `
        <div class="stock-card">
            <div class="stock-header">
                <h3>${stock.symbol}</h3>
                <span class="stock-name">${stock.name || stock.symbol}</span>
            </div>
            <div class="stock-price">
                <span class="current-price">¥${currentPrice.toFixed(2)}</span>
                <span class="change ${changeClass}">
                    ${changeSymbol}${changePercent.toFixed(2)}%
                </span>
            </div>
            <div class="stock-details">
                <div class="detail-item">
                    <span>开盘价:</span>
                    <span>¥${openPrice > 0 ? openPrice.toFixed(2) : 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span>最高价:</span>
                    <span>¥${highPrice > 0 ? highPrice.toFixed(2) : 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span>最低价:</span>
                    <span>¥${lowPrice > 0 ? lowPrice.toFixed(2) : 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span>成交量:</span>
                    <span>${volume > 0 ? volume.toLocaleString() : 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span>市值:</span>
                    <span>${stock.market_cap || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span>行业:</span>
                    <span>${stock.sector || 'N/A'}</span>
                </div>
            </div>
            <div class="stock-actions">
                <button class="btn btn-primary" onclick="buyStock('${stock.symbol}', ${currentPrice}, '${stock.name || stock.symbol}')">
                    购买股票
                </button>
            </div>
        </div>
    `;
}

// 加载推荐股票列表 (使用数据库中的股票数据)
async function loadRecommendedStocks() {
    console.log('加载推荐股票列表');
    recommendedStocksList.innerHTML = '<div class="loading">加载推荐股票中...</div>';
    
    try {
        const response = await fetch('/api/stocks');
        const stocks = await response.json();
        
        if (response.ok && stocks && stocks.length > 0) {
            renderRecommendedStocks(stocks.slice(0, 8)); // 显示前8个股票
        } else {
            recommendedStocksList.innerHTML = '<div class="error">暂无股票数据</div>';
        }
    } catch (error) {
        console.error('加载推荐股票失败:', error);
        recommendedStocksList.innerHTML = '<div class="error">加载失败，请稍后重试</div>';
    }
}

// 渲染推荐股票列表
function renderRecommendedStocks(stocks) {
    if (!stocks || stocks.length === 0) {
        recommendedStocksList.innerHTML = '<div class="no-data">暂无推荐股票</div>';
        return;
    }
    
    const stocksHTML = stocks.map(stock => {
        const changePercent = parseFloat(stock.change_percent || 0);
        const changeClass = changePercent >= 0 ? 'positive' : 'negative';
        const changeSymbol = changePercent >= 0 ? '+' : '';
        const currentPrice = parseFloat(stock.current_price || 0);
        
        return `
            <div class="recommended-stock-item">
                <div class="stock-info">
                    <div class="stock-symbol">${stock.symbol}</div>
                    <div class="stock-name">${stock.name}</div>
                </div>
                <div class="stock-price-info">
                    <div class="current-price">¥${currentPrice.toFixed(2)}</div>
                    <div class="change ${changeClass}">
                        ${changeSymbol}${changePercent.toFixed(2)}%
                    </div>
                </div>
                <div class="stock-actions">
                    <button class="btn btn-secondary btn-sm" onclick="queryRecommendedStock('${stock.symbol}')">
                        查询
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="buyStock('${stock.symbol}', ${currentPrice}, '${stock.name}')">
                        购买
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    recommendedStocksList.innerHTML = stocksHTML;
}

// 查询推荐股票详情
async function queryRecommendedStock(symbol) {
    console.log('查询推荐股票详情:', symbol);
    
    try {
        const response = await fetch(`/api/stocks/single/${symbol}`);
        const data = await response.json();
        
        if (data.error) {
            alert(`查询失败: ${data.error}`);
        } else {
            // 将查询结果显示在单个股票查询区域
            singleStockInput.value = symbol;
            renderSingleStock(data);
            
            // 滚动到单个股票查询区域
            document.getElementById('single-stock-query').scrollIntoView({ 
                behavior: 'smooth' 
            });
        }
    } catch (error) {
        console.error('查询推荐股票详情失败:', error);
        alert('查询失败，请稍后重试');
    }
}

// 购买股票 - 跳转到增加资产页面
async function buyStock(symbol, price, name) {
    console.log('购买股票:', symbol, price, name);
    
    // 将股票信息存储到localStorage，供增加资产页面使用
    const stockData = {
        type: 'stock',
        symbol: symbol,
        name: name,
        price: parseFloat(price)
    };
    
    localStorage.setItem('prefilledAsset', JSON.stringify(stockData));
    
    // 跳转到增加资产页面
    window.location.href = 'add_asset.html';
}

// 刷新推荐股票列表
function refreshRecommendedStocks() {
    loadRecommendedStocks();
}