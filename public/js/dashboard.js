document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const totalValueElement = document.getElementById('total-value');
    const totalReturnElement = document.getElementById('total-return');
    const recentAssetsList = document.getElementById('recent-assets-list');
    const performanceChartCanvas = document.getElementById('performance-chart');

    // 检查元素是否存在
    if (!totalValueElement || !totalReturnElement) {
        console.error('找不到必要的DOM元素');
        return;
    }

    // 初始化图表
    let performanceChart = null;
    if (performanceChartCanvas) {
        performanceChart = new Chart(performanceChartCanvas, {
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
    }

    // 获取投资组合概览数据
    function fetchPortfolioOverview() {
        console.log('开始获取投资组合概览数据');
        fetch('/api/portfolio/overview')
            .then(response => {
                console.log('概览数据响应状态:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('收到的数据:', data);
                if (data.error) {
                    totalValueElement.textContent = '错误';
                    totalReturnElement.textContent = '错误';
                    console.error('获取概览数据失败:', data.error);
                } else {
                    // 格式化总资产，保留2位小数
                    const totalValue = parseFloat(data.totalValue) || 0;
                    const formattedValue = '¥' + totalValue.toFixed(2);
                    totalValueElement.textContent = formattedValue;
                    
                    // 格式化收益率，保留2位小数并添加百分比符号
                    const returnRate = parseFloat(data.totalReturn) || 0;
                    const formattedReturn = returnRate.toFixed(2) + '%';
                    totalReturnElement.textContent = formattedReturn;
                    
                    // 设置收益率颜色
                    if (returnRate >= 0) {
                        totalReturnElement.classList.add('positive');
                        totalReturnElement.classList.remove('negative');
                    } else {
                        totalReturnElement.classList.add('negative');
                        totalReturnElement.classList.remove('positive');
                    }
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
        if (!recentAssetsList) {
            console.log('最近资产列表元素不存在');
            return;
        }
        
        fetch('/api/portfolio/recent')
            .then(response => {
                console.log('最近资产响应状态:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('最近资产数据:', data);
                if (data.error) {
                    recentAssetsList.innerHTML = '<div class="error-message">获取最近资产失败: ' + data.error + '</div>';
                    console.error('获取最近资产失败:', data.error);
                } else if (!data.assets || data.assets.length === 0) {
                    recentAssetsList.innerHTML = '<p>暂无资产</p>';
                } else {
                    let html = '<div class="table-container"><table>';
                    html += '<thead><tr><th>资产名称</th><th>类型</th><th>数量</th><th>购买价格</th><th>当前价格</th><th>盈亏</th></tr></thead>';
                    html += '<tbody>';
                    data.assets.forEach(asset => {
                        const currentPrice = parseFloat(asset.current_price) || 0;
                        const purchasePrice = parseFloat(asset.purchase_price) || 0;
                        const quantity = parseFloat(asset.quantity) || 0;
                        const profitLoss = ((currentPrice - purchasePrice) * quantity).toFixed(2);
                        const profitLossClass = profitLoss >= 0 ? 'positive' : 'negative';
                        
                        let assetType = '未知';
                        if (asset.type === 'stock') {
                            assetType = '股票';
                        } else if (asset.type === 'bond') {
                            assetType = '债券';
                        } else if (asset.type === 'cash') {
                            assetType = '现金';
                        }
                        
                        html += `<tr>
                            <td>${asset.name || '未知'}</td>
                            <td>${assetType}</td>
                            <td>${quantity}</td>
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
        if (!performanceChart) {
            console.log('图表未初始化');
            return;
        }
        
        fetch('/api/portfolio/performance')
            .then(response => response.json())
            .then(data => {
                console.log('表现数据:', data);
                if (data.error) {
                    console.error('获取表现数据失败:', data.error);
                } else {
                    performanceChart.data.labels = data.dates || [];
                    performanceChart.data.datasets[0].data = data.values || [];
                    performanceChart.update();
                }
            })
            .catch(error => {
                console.error('获取表现数据时发生错误:', error);
            });
    }

    // 初始化数据
    fetchPortfolioOverview();
    fetchRecentAssets();
    fetchPerformanceData();

    // 设置定时刷新
    setInterval(fetchPortfolioOverview, 60000); // 每分钟刷新一次
    setInterval(fetchRecentAssets, 60000);
    setInterval(fetchPerformanceData, 300000); // 每5分钟刷新一次
});