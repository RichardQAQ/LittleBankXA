document.addEventListener('DOMContentLoaded', () => {
    const stockSymbolInput = document.getElementById('stock-symbol');
    const searchStockButton = document.getElementById('search-stock');
    const updatePriceButton = document.getElementById('update-price');
    const loadingIndicator = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    const stockDataElement = document.getElementById('stock-data');
    const stockTableBody = document.getElementById('stock-table-body');
    const chartContainer = document.getElementById('historical-chart-container');


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
            // getStockData(symbol);
            console.log('获取股票数据Chart:', symbol);
            displayHistoricalChart(symbol);
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
        console.log('开始获取股票信息数据');
        stockDataElement.innerHTML = '<p>加载股票数据中...</p>';

        const API_KEY = 'DK81UQ20HPA8A0WU'; // 应从环境变量获取
        // const STOCK_SYMBOLS = ['AAPL', 'MSFT']; // 测试时先减少股票数量
        // const STOCK_SYMBOLS = symbol;

        // 顺序请求函数
        const fetchSequentially = async () => {
            console.log('調用API');
            const results = [];
            // for (const symbol of STOCK_SYMBOLS) {
            try {
                const response = await fetch(
                    `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`
                );
                const data = await response.json();

                if (data.Note) {
                    results.push({ symbol, error: 'API限制' });
                } else if (!data['Global Quote']) {
                    results.push({ symbol, error: '无效数据' });
                } else {
                    results.push({
                        symbol,
                        data: data['Global Quote']
                    });
                }
            } catch (error) {
                results.push({ symbol, error: error.message });
            }
            await new Promise(resolve => setTimeout(resolve, 15000)); // 15秒间隔
            // }
            return results;
        };

        fetchSequentially()
            .then(results => {
                console.log('获取结果:', results);

                let html = '<div class="table-container"><table>';
                html += '<thead><tr><th>股票</th><th>价格</th><th>涨跌</th><th>涨幅</th></tr></thead><tbody>';

                results.forEach(item => {
                    if (item.error) {
                        html += `<tr>
                        <td>${item.symbol}</td>
                        <td colspan="3" class="error">${item.error}</td>
                    </tr>`;
                    } else {
                        const q = item.data;
                        const changeClass = parseFloat(q['09. change']) >= 0 ? 'positive' : 'negative';
                        html += `<tr>
                        <td>${item.symbol}</td>
                        <td>$${q['05. price']}</td>
                        <td class="${changeClass}">${q['09. change']}</td>
                        <td class="${changeClass}">${q['10. change percent']}</td>
                    </tr>`;
                    }
                });

                html += '</tbody></table></div>';
                stockDataElement.innerHTML = html;
            })
            .catch(error => {
                recentInfoList.innerHTML = `<div class="error">加载失败: ${error.message}</div>`;
            });
        // showLoading();
        // try {
        //     const response = await fetch(`/api/stocks/${symbol}`);
        //     if (!response.ok) {
        //         throw new Error('获取股票数据失败');
        //     }
        //     const stockData = await response.json();
        //     displayStockData(stockData);
        // } catch (error) {
        //     showError(error.message);
        // } finally {
        //     hideLoading();
        // }
    }

    async function displayHistoricalChart(symbol) {
        
        if (!symbol) {
            chartContainer.style.height = '0px'; // Collapse the container
            // A short delay allows the collapse animation to start before content disappears
            setTimeout(() => {
                chartContainer.innerHTML = '';
                if (currentChart && currentChart.chartInstance) {
                    currentChart.chartInstance.destroy();
                    currentChart = null;
                }
            }, 400);
            return;
        }

        chartContainer.innerHTML = '<p class="loading">Loading chart data...</p>';
        chartContainer.style.height = '400px'; // Expand the container to show loading/chart

        try {
            const response = await fetch(`/api/stocks/${symbol.toUpperCase()}/history`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to fetch data: ${response.statusText}`);
            }
            const chartData = await response.json();
            // Ensure you have a global StockChart class available
            const currentChart = new StockChart('historical-chart-container', chartData);
        } catch (error) {
            chartContainer.innerHTML = `<p class="error-message">Could not load chart for ${symbol}: ${error.message}</p>`;
            console.error(error);
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
            const response = await fetch('/api/history');
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
            <td>${stock.id}</td>
            <td>${stock.symbol}</td>
            <td>${stock.trade_date}</td>
            <td>¥${stock.open_price}</td>
            <td>¥${stock.high_price}</td>
            <td>¥${stock.low_price}</td>
            <td>¥${stock.close_price}</td>
            <td>${stock.volume}</td>
            <td>${stock.stock_id}</td>
            <td>
                <button class="view-btn"    data-symbol="${stock.symbol}">查看</button>
                <button class="update-btn"  data-symbol="${stock.symbol}">更新价格</button>
                <button class="buy-btn"      data-symbol="${stock.symbol}" data-name="${stock.symbol}">购买</button>
            </td>
        `;
            stockTableBody.appendChild(row);
            console.log('添加股票行:', stock);
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