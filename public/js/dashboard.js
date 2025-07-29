document.addEventListener('DOMContentLoaded', function () {
    // 获取DOM元素
    const totalValueElement = document.getElementById('total-value');
    const totalReturnElement = document.getElementById('total-return');
    const recentAssetsList = document.getElementById('recent-assets-list');
    const recentInfoList = document.getElementById('recent-info-list');
    const performanceChartCanvas = document.getElementById('performance-chart');

    // 初始化图表
    let performanceChart = new Chart(performanceChartCanvas, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Portfolio Value',
                data: [],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Portfolio Performance History'
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Value ($)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });

    // 获取投资组合概览数据
    function fetchPortfolioOverview() {
        console.log('Fetching portfolio overview data...');
        fetch('/api/portfolio/overview')
            .then(response => {
                console.log('Overview data response status:', response.status);
                console.log('概览数据响应头:', response.headers);
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    totalValueElement.textContent = 'Error';
                    totalReturnElement.textContent = 'Error';
                    console.error('Failed to fetch overview data:', data.error);
                } else {
                    totalValueElement.textContent = '$' + data.totalValue.toFixed(2);
                    totalReturnElement.textContent = data.totalReturn.toFixed(2) + '%';
                }
            })
            .catch(error => {
                totalValueElement.textContent = 'Load failed';
                totalReturnElement.textContent = 'Load failed';
                console.error('Error fetching overview data:', error);
            });
    }

    // 获取表现数据
    function fetchPerformanceData() {
        fetch('/api/portfolio/performance')
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error('Failed to fetch performance data:', data.error);
                } else {
                    performanceChart.data.labels = data.dates;
                    performanceChart.data.datasets[0].data = data.values;
                    performanceChart.update();
                }
            })
            .catch(error => {
                console.error('Error fetching performance data:', error);
            });
    }


    function fetchStockInfo() {
        console.log('Fetching stock information...');
        const recentInfoList = document.getElementById('recent-info-list');
        recentInfoList.innerHTML = '<p>Loading stock data...</p>';

        const API_KEY = 'DK81UQ20HPA8A0WU'; // 应从环境变量获取
        const STOCK_SYMBOLS = ['AAPL', 'MSFT']; // 测试时先减少股票数量

        // 顺序请求函数
        const fetchSequentially = async () => {
            const results = [];
            for (const symbol of STOCK_SYMBOLS) {
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
            }
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
                recentInfoList.innerHTML = html;
            })
            .catch(error => {
                recentInfoList.innerHTML = `<div class="error">加载失败: ${error.message}</div>`;
            });
    }

    function initializeStockSearch() {
        new StockSearch('stock-search-container', () => {
            // Callback when stock added - refresh lists
            fetchWatchlist();
            fetchRecentAssets();
        });
    }

    async function fetchWatchlist() {
        // Fetch and display user's watchlist
    }

    function displayStockDetails(symbol) {
        // Fetch and display combined real-time and historical data
        fetchRealTimeData(symbol)
            .then(realTimeData => {
                // Display current price, change, etc.
                
                // Then initialize historical chart
                new StockChart('historical-chart-container', symbol);
            });
    }

    // 初始化数据
    fetchPortfolioOverview();
    fetchHoldings(); // Replaces fetchRecentAssets()
    fetchPerformanceData();
    // fetchStockInfo(); // This should be handled by the backend price service now
    initializeStockSearch();
    fetchWatchlist();

    // 设置定时刷新
    setInterval(fetchPortfolioOverview, 60000); // 每分钟刷新一次
    setInterval(fetchHoldings, 60000); // Replaces fetchRecentAssets()
    setInterval(fetchPerformanceData, 300000); // 每5分钟刷新一次
    // setInterval(fetchStockInfo, 300000);
    setInterval(fetchWatchlist, 60000);

    // --- The historical chart code has been moved to historicalChart.js ---
    // --- It is removed from this file to prevent conflicts. ---
});

async function updatePrices() {
    try {
        console.log('🔄 Updating stock prices from API...');
        
        // Show updating status
        const statusElement = document.getElementById('api-status-text');
        if (statusElement) {
            statusElement.textContent = 'Updating prices...';
        }
        
        // Make POST request to update prices
        const response = await fetch('/api/prices/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({}) // Empty body is fine
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Price update result:', data);
        
        if (data.success) {
            console.log(`✅ Successfully updated ${data.updated} prices out of ${data.total} tickers`);
            
            // Show success message
            if (statusElement) {
                statusElement.textContent = `Updated ${data.updated} stocks at ${new Date().toLocaleTimeString()}`;
            }
            
            // Refresh all data on the page
            if (window.fetchPortfolioOverview) await window.fetchPortfolioOverview();
            if (window.fetchRecentAssets) await window.fetchRecentAssets();
            if (window.fetchPerformanceData) await window.fetchPerformanceData();
            // if (window.fetchStockInfo) await window.fetchStockInfo();
            
            alert(`Successfully updated ${data.updated} stock prices in database.`);
        } else {
            throw new Error(data.error || 'Price update failed');
        }
    } catch (error) {
        console.error('❌ Error updating prices:', error);
        
        // Show error in status
        const statusElement = document.getElementById('api-status-text');
        if (statusElement) {
            statusElement.textContent = `Update failed: ${error.message}`;
        }
        
        alert('Error updating prices: ' + error.message);
    }
}

// Make the function available globally
window.updatePrices = updatePrices;

// This new function fetches and displays the complete portfolio.
async function fetchHoldings() {
    const holdingsList = document.getElementById('holdings-list');
    try {
        const response = await fetch('/api/portfolio');
        const data = await response.json();

        if (data.error) {
            holdingsList.innerHTML = `<p class="error-message">Error: ${data.error}</p>`;
            return;
        }

        if (!data.assets || data.assets.length === 0) {
            holdingsList.innerHTML = '<p>You have no assets in your portfolio. <a href="add_asset.html">Add one now</a>.</p>';
            return;
        }

        let html = '<table><thead><tr><th>Asset Name</th><th>Type</th><th>Symbol</th><th>Quantity</th><th>Purchase Price</th><th>Current Price</th><th>Market Value</th><th>P/L</th></tr></thead><tbody>';
        data.assets.forEach(asset => {
            const currentPrice = parseFloat(asset.current_price);
            const purchasePrice = parseFloat(asset.purchase_price);
            const marketValue = (currentPrice * asset.quantity).toFixed(2);
            const profitLoss = ((currentPrice - purchasePrice) * asset.quantity).toFixed(2);
            const profitLossClass = profitLoss >= 0 ? 'positive' : 'negative';
            const assetType = asset.type === 'stock' ? 'Stock' : 'Bond';

            html += `<tr>
                <td>${asset.name}</td>
                <td>${assetType}</td>
                <td>${asset.symbol}</td>
                <td>${asset.quantity}</td>
                <td>$${purchasePrice.toFixed(2)}</td>
                <td>$${currentPrice.toFixed(2)}</td>
                <td>$${marketValue}</td>
                <td class="${profitLossClass}">$${profitLoss}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        holdingsList.innerHTML = html;

    } catch (error) {
        holdingsList.innerHTML = '<p class="error-message">Could not fetch portfolio data.</p>';
        console.error('Error fetching holdings:', error);
    }
}