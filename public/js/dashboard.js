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
                label: '投资组合价值',
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
                    text: '投资组合表现历史'
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: '价值 (元)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '日期'
                    }
                }
            }
        }
    });

    // 获取投资组合概览数据
    function fetchPortfolioOverview() {
        console.log('开始获取投资组合概览数据');
        fetch('/api/portfolio/overview')
            .then(response => {
                console.log('概览数据响应状态:', response.status);
                console.log('概览数据响应头:', response.headers);
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    totalValueElement.textContent = '错误';
                    totalReturnElement.textContent = '错误';
                    console.error('获取概览数据失败:', data.error);
                } else {
                    totalValueElement.textContent = '¥' + data.totalValue.toFixed(2);
                    totalReturnElement.textContent = data.totalReturn.toFixed(2) + '%';
                }
            })
            .catch(error => {
                totalValueElement.textContent = '加载失败';
                totalReturnElement.textContent = '加载失败';
                console.error('获取概览数据时发生错误:', error);
            });
    }

    // 获取最近添加的资产
    function fetchRecentAssets() {
        console.log('开始获取最近资产数据');
        fetch('/api/portfolio/recent')
            .then(response => {
                console.log('最近资产响应状态:', response.status);
                console.log('最近资产响应头:', response.headers);
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    recentAssetsList.innerHTML = '<div class="error-message">获取最近资产失败: ' + data.error + '</div>';
                    console.error('获取最近资产失败:', data.error);
                } else if (data.assets.length === 0) {
                    recentAssetsList.innerHTML = '<p>暂无资产</p>';
                } else {
                    let html = '<div class="table-container"><table>';
                    html += '<thead><tr><th>资产名称</th><th>类型</th><th>数量</th><th>购买价格</th><th>当前价格</th><th>盈亏</th></tr></thead>';
                    html += '<tbody>';
                    data.assets.forEach(asset => {
                        const currentPrice = parseFloat(asset.current_price);
                        const purchasePrice = parseFloat(asset.purchase_price);
                        const profitLoss = ((currentPrice - purchasePrice) * asset.quantity).toFixed(2);
                        const profitLossClass = profitLoss >= 0 ? 'positive' : 'negative';
                        html += `<tr>
                            <td>${asset.name}</td>
                            <td>${asset.type === 'stock' ? '股票' : '债券'}</td>
                            <td>${asset.quantity}</td>
                            <td>¥${purchasePrice.toFixed(2)}</td>
                            <td>¥${currentPrice.toFixed(2)}</td>
                            <td class="${profitLossClass}">¥${profitLoss}</td>
                        </tr>`;
                    });
                    html += '</tbody></table></div>';
                    recentAssetsList.innerHTML = html;
                }
            })
            .catch(error => {
                recentAssetsList.innerHTML = '<div class="error-message">获取最近资产时发生错误</div>';
                console.error('获取最近资产时发生错误:', error);
            });
    }

    // 获取表现数据
    function fetchPerformanceData() {
        fetch('/api/portfolio/performance')
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error('获取表现数据失败:', data.error);
                } else {
                    performanceChart.data.labels = data.dates;
                    performanceChart.data.datasets[0].data = data.values;
                    performanceChart.update();
                }
            })
            .catch(error => {
                console.error('获取表现数据时发生错误:', error);
            });
    }


    function fetchStockInfo() {
        console.log('开始获取股票信息数据');
        const recentInfoList = document.getElementById('recent-info-list');
        recentInfoList.innerHTML = '<p>加载股票数据中...</p>';

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




    // 初始化数据
    fetchPortfolioOverview();
    fetchRecentAssets();
    fetchPerformanceData();
    fetchStockInfo();

    // 设置定时刷新
    setInterval(fetchPortfolioOverview, 60000); // 每分钟刷新一次
    setInterval(fetchRecentAssets, 60000);
    setInterval(fetchPerformanceData, 300000); // 每5分钟刷新一次
    setInterval(fetchStockInfo, 300000);
});