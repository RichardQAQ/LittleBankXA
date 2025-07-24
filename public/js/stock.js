document.addEventListener('DOMContentLoaded', () => {
    const stockSymbolInput = document.getElementById('stock-symbol');
    const searchStockButton = document.getElementById('search-stock');
    const updatePriceButton = document.getElementById('update-price');
    const loadingIndicator = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    const stockDataElement = document.getElementById('stock-data');
    const stockTableBody = document.getElementById('stock-table-body');

    // 隐藏加载指示器和错误提示
    loadingIndicator.style.display = 'none';
    errorElement.style.display = 'none';

    // 加载股票列表
    loadStockList();

    // 查询股票按钮点击事件
    searchStockButton.addEventListener('click', () => {
        const symbol = stockSymbolInput.value.trim().toUpperCase();
        if (symbol) {
            getStockData(symbol);
        } else {
            showError('请输入股票代码');
        }
    });

    // 更新价格按钮点击事件
    updatePriceButton.addEventListener('click', () => {
        const symbol = stockSymbolInput.value.trim().toUpperCase();
        if (symbol) {
            updateStockPrice(symbol);
        } else {
            showError('请输入股票代码');
        }
    });

    // 获取股票数据
    async function getStockData(symbol) {
        showLoading();
        try {
            const response = await fetch(`/api/stocks/${symbol}`);
            if (!response.ok) {
                throw new Error('获取股票数据失败');
            }
            const stockData = await response.json();
            displayStockData(stockData);
        } catch (error) {
            showError(error.message);
        } finally {
            hideLoading();
        }
    }

    // 更新股票价格
    async function updateStockPrice(symbol) {
        showLoading();
        try {
            const response = await fetch(`/api/stocks/${symbol}/update`, { method: 'POST' });
            if (!response.ok) {
                throw new Error('更新股票价格失败');
            }
            const result = await response.json();
            showError(result.message, true);
            // 重新加载股票列表
            loadStockList();
            // 重新获取股票数据
            getStockData(symbol);
        } catch (error) {
            showError(error.message);
        } finally {
            hideLoading();
        }
    }

    // 加载股票列表
    async function loadStockList() {
        try {
            const response = await fetch('/api/stocks');
            if (!response.ok) {
                throw new Error('获取股票列表失败');
            }
            const stocks = await response.json();
            displayStockList(stocks);
        } catch (error) {
            console.error('加载股票列表失败:', error);
        }
    }

    // 显示股票数据
    function displayStockData(stockData) {
        stockDataElement.innerHTML = `
            <div class="stock-info">
                <h4>${stockData.symbol} - ${stockData.shortName || '未知名称'}</h4>
                <p>当前价格: <span class="price">¥${stockData.regularMarketPrice || 'N/A'}</span></p>
                <p>开盘价: ¥${stockData.regularMarketOpen || 'N/A'}</p>
                <p>最高价: ¥${stockData.regularMarketDayHigh || 'N/A'}</p>
                <p>最低价: ¥${stockData.regularMarketDayLow || 'N/A'}</p>
                <p>成交量: ${stockData.regularMarketVolume ? formatNumber(stockData.regularMarketVolume) : 'N/A'}</p>
                <p>市值: ¥${stockData.marketCap ? formatNumber(stockData.marketCap) : 'N/A'}</p>
            </div>
        `;
    }

    // 显示股票列表
    function displayStockList(stocks) {
        stockTableBody.innerHTML = '';
        stocks.forEach(stock => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${stock.symbol}</td>
                <td>${stock.name}</td>
                <td>¥${stock.current_price}</td>
                <td>
                    <button class="view-btn" data-symbol="${stock.symbol}">查看</button>
                    <button class="update-btn" data-symbol="${stock.symbol}">更新价格</button>
                    <button class="buy-btn" data-symbol="${stock.symbol}" data-name="${stock.name}">购买</button>
                </td>
            `;
            stockTableBody.appendChild(row);
        });

        // 为查看按钮添加事件监听
        document.querySelectorAll('.view-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const symbol = e.target.getAttribute('data-symbol');
                stockSymbolInput.value = symbol;
                getStockData(symbol);
            });
        });

        // 为更新价格按钮添加事件监听
        document.querySelectorAll('.update-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const symbol = e.target.getAttribute('data-symbol');
                stockSymbolInput.value = symbol;
                updateStockPrice(symbol);
            });
        });

        // 为购买按钮添加事件监听
        document.querySelectorAll('.buy-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const symbol = e.target.getAttribute('data-symbol');
                const name = e.target.getAttribute('data-name');
                // 跳转到添加资产页面，并传递股票信息
                window.location.href = `add_asset.html?type=stock&symbol=${symbol}&name=${name}`;
            });
        });
    }

    // 显示加载指示器
    function showLoading() {
        loadingIndicator.style.display = 'block';
        errorElement.style.display = 'none';
        stockDataElement.innerHTML = '';
    }

    // 隐藏加载指示器
    function hideLoading() {
        loadingIndicator.style.display = 'none';
    }

    // 显示错误信息
    function showError(message, isSuccess = false) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        errorElement.className = isSuccess ? 'success' : 'error';
    }

    // 格式化数字
    function formatNumber(num) {
        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(2) + 'B';
        } else if (num >= 1000000) {
            return (num / 1000000).toFixed(2) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(2) + 'K';
        }
        return num.toString();
    }
});