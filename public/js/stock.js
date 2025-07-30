document.addEventListener('DOMContentLoaded', () => {
    const stockSymbolInput = document.getElementById('stock-symbol');
    const searchStockButton = document.getElementById('search-stock');
    const updatePriceButton = document.getElementById('update-price');
    const updateAllPricesBtn = document.getElementById('update-all-prices-btn'); // Get the new button
    const loadingIndicator = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    const stockDataElement = document.getElementById('stock-data');
    const stockTableBody = document.getElementById('stock-table-body');
    const chartContainer = document.getElementById('historical-chart-container');
    const autocompleteResults = document.getElementById('autocomplete-results'); // Get the new container


    // 隐藏加载指示器和错误提示
    loadingIndicator.style.display = 'none';
    errorElement.style.display = 'none';

    // 加载股票列表
    loadStockList();

    // 查询股票按钮点击事件
    searchStockButton.addEventListener('click', () => {
        console.log('开始查询股票信息');
        const symbol = stockSymbolInput.value.trim().toUpperCase();
        if (symbol) {
            getStockData(symbol);
            console.log('获取股票数据:', symbol);
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

    // NEW: Event listener for the "Update All Prices" button
    updateAllPricesBtn.addEventListener('click', async () => {
        showLoading();
        try {
            const response = await fetch('/api/stocks/update-all', { method: 'POST' });
            const result = await response.json();

            if (!response.ok || result.error) {
                throw new Error(result.error || '批量更新失败');
            }
            
            showError(result.message, true); // Use showError to display success message
            loadStockList(); // Refresh the list to show new prices

        } catch (error) {
            showError(error.message);
            console.error('批量更新失败:', error);
        } finally {
            hideLoading();
        }
    });

    // NEW: Event listener for autocomplete search
    stockSymbolInput.addEventListener('input', async () => {
        const query = stockSymbolInput.value.trim();
        if (query.length < 2) {
            autocompleteResults.innerHTML = '';
            autocompleteResults.style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`/api/stocks/search?query=${query}`);
            if (!response.ok) return;
            
            const results = await response.json();
            displayAutocomplete(results);
        } catch (error) {
            console.error('Autocomplete fetch failed:', error);
        }
    });

    // NEW: Function to display autocomplete results
    function displayAutocomplete(results) {
        if (!results || results.length === 0) {
            autocompleteResults.style.display = 'none';
            return;
        }

        autocompleteResults.innerHTML = '';
        results.slice(0, 7).forEach(item => { // Show top 7 results
            const itemDiv = document.createElement('div');
            itemDiv.innerHTML = `<strong>${item.symbol}</strong> - ${item.shortname}`;
            itemDiv.addEventListener('click', () => {
                stockSymbolInput.value = item.symbol;
                autocompleteResults.innerHTML = '';
                autocompleteResults.style.display = 'none';
                getStockData(item.symbol); // Automatically search when clicked
            });
            autocompleteResults.appendChild(itemDiv);
        });
        autocompleteResults.style.display = 'block';
    }

    // Hide dropdown when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (e.target !== stockSymbolInput) {
            autocompleteResults.style.display = 'none';
        }
    });

    // 获取股票数据
    async function getStockData(symbol) {
        console.log('开始获取股票信息数据');
        stockDataElement.innerHTML = '<p>加载股票数据中...</p>';
        showLoading();
        
        try {
            const response = await fetch(`/api/stocks/single/${symbol}`);
            if (!response.ok) {
                throw new Error('获取股票数据失败');
            }
            const stockData = await response.json();
            console.log('获取到股票数据:', stockData);
            displayStockData(stockData);
            
            // 同时获取并显示历史图表
            displayHistoricalChart(symbol);
        } catch (error) {
            showError(error.message);
            console.error('获取股票数据失败:', error);
        } finally {
            hideLoading();
        }
    }

    async function displayHistoricalChart(symbol) {
        if (!symbol) {
            chartContainer.classList.remove('active'); // Collapse the container
            // Clear content after the transition finishes
            setTimeout(() => {
                chartContainer.innerHTML = '';
            }, 400);
            return;
        }

        chartContainer.innerHTML = '<p class="loading">正在加载图表数据...</p>';
        chartContainer.classList.add('active'); // Expand the container to show loading message

        try {
            const response = await fetch(`/api/stocks/${symbol.toUpperCase()}/history`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `获取数据失败: ${response.statusText}`);
            }
            const chartData = await response.json();
            console.log('获取到历史数据:', chartData);
            
            // Create the chart (existing logic)
            const ctx = document.createElement('canvas');
            chartContainer.innerHTML = ''; // Clear loading message
            chartContainer.appendChild(ctx);
            
            // FIX: Pass the canvas element 'ctx' directly to the constructor.
            new StockChart(ctx, {
                labels: chartData.labels,
                values: chartData.values,
                symbol: symbol
            });
        } catch (error) {
            chartContainer.innerHTML = `<p class="error-message">无法加载 ${symbol} 的图表: ${error.message}</p>`;
            console.error('图表加载错误:', error);
            // Ensure the container stays active to show the error
            chartContainer.classList.add('active');
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
        console.log('加载股票列表');
        try {
            const response = await fetch('/api/stocks');
            if (!response.ok) {
                throw new Error('获取股票列表失败');
            }
            const stocks = await response.json();
            console.log('加载股票列表:', stocks);
            displayStockList(stocks);
        } catch (error) {
            console.error('加载股票列表失败:', error);
        }
    }

    // 显示股票数据
    function displayStockData(stockData) {
        // 计算涨跌颜色
        const changePercent = parseFloat(stockData.change_percent) || 0;
        const changeClass = changePercent >= 0 ? 'positive' : 'negative';
        const changeSign = changePercent >= 0 ? '+' : '';
        
        stockDataElement.innerHTML = `
            <div class="stock-card">
                <div class="stock-header">
                    <h3>${stockData.name || stockData.symbol}</h3>
                    <span class="stock-symbol">${stockData.symbol}</span>
                </div>
                <div class="stock-details">
                    <div class="price-info">
                        <div class="current-price">¥${parseFloat(stockData.current_price || stockData.price).toFixed(2)}</div>
                        <div class="price-change ${changeClass}">${changeSign}${changePercent.toFixed(2)}%</div>
                    </div>
                    <div class="stock-stats">
                        <div class="stat-item">
                            <span class="stat-label">成交量:</span>
                            <span class="stat-value">${formatNumber(stockData.volume || 0)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">市值:</span>
                            <span class="stat-value">¥${formatNumber(stockData.market_cap || 0)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">更新时间:</span>
                            <span class="stat-value">${new Date(stockData.updated_at || new Date()).toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="stock-actions">
                        <button class="btn btn-primary" onclick="window.location.href='add_asset.html?type=stock&symbol=${stockData.symbol}&name=${stockData.name || stockData.symbol}&price=${stockData.current_price || stockData.price}'">
                            购买股票
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // 显示股票列表
    function displayStockList(stocks) {
        stockTableBody.innerHTML = '';
        stocks.forEach(stock => {
            const row = document.createElement('tr');
            
            // 计算涨跌颜色
            const changeClass = parseFloat(stock.change_percent) >= 0 ? 'positive' : 'negative';
            const changeSign = parseFloat(stock.change_percent) >= 0 ? '+' : '';
            
            row.innerHTML = `
            <td>${stock.id}</td>
            <td>${stock.symbol}</td>
            <td>${new Date(stock.updated_at).toLocaleDateString()}</td>
            <td>¥${parseFloat(stock.current_price).toFixed(2)}</td>
            <td>¥${(parseFloat(stock.current_price) * 0.99).toFixed(2)}</td>
            <td>¥${(parseFloat(stock.current_price) * 1.01).toFixed(2)}</td>
            <td>¥${parseFloat(stock.current_price).toFixed(2)}</td>
            <td>${stock.volume.toLocaleString()}</td>
            <td>${stock.id}</td>
            <td>
                <button class="view-btn" data-symbol="${stock.symbol}" data-name="${stock.name || stock.symbol}">查看</button>
                <button class="update-btn" data-symbol="${stock.symbol}">更新价格</button>
                <button class="buy-btn" data-symbol="${stock.symbol}" data-name="${stock.name || stock.symbol}" data-price="${stock.current_price}">购买</button>
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
