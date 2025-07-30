document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const totalValueElement = document.getElementById('total-value');
    const totalReturnElement = document.getElementById('total-return');
    const recentAssetsList = document.getElementById('recent-assets-list');
    const performanceChartCanvas = document.getElementById('performance-chart');
    const assetDistributionChartCanvas = document.getElementById('asset-distribution-chart');
    const assetProfitChartCanvas = document.getElementById('asset-profit-chart');

    // 检查元素是否存在
    if (!totalValueElement || !totalReturnElement) {
        console.error('找不到必要的DOM元素');
        return;
    }

    // 初始化图表
    let performanceChart = null;
    let assetDistributionChart = null;
    let assetProfitChart = null;
    
    // 初始化折线图
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
    
    // 初始化饼图（资产分布）
    if (assetDistributionChartCanvas) {
        assetDistributionChart = new Chart(assetDistributionChartCanvas, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)',
                        'rgba(199, 199, 199, 0.7)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(199, 199, 199, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    title: {
                        display: true,
                        text: '资产类型分布'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ¥${value.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // 初始化柱状图（资产收益）
    if (assetProfitChartCanvas) {
        assetProfitChart = new Chart(assetProfitChartCanvas, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: '资产收益',
                    data: [],
                    backgroundColor: [],
                    borderColor: [],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: '各资产收益情况'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.raw || 0;
                                return `${label}: ¥${value.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '收益 (元)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '资产名称'
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

    // 获取资产分布数据
    function fetchAssetDistribution() {
        if (!assetDistributionChart) {
            console.log('资产分布图表未初始化');
            return;
        }
        
        fetch('/api/portfolio')
            .then(response => response.json())
            .then(data => {
                console.log('资产分布数据:', data);
                if (data.error) {
                    console.error('获取资产分布数据失败:', data.error);
                } else if (data.assets && Array.isArray(data.assets)) {
                    // 按资产类型分组
                    const assetsByType = {};
                    data.assets.forEach(asset => {
                        const type = asset.type || '未知';
                        const value = parseFloat(asset.quantity) * parseFloat(asset.current_price) || 0;
                        
                        if (!assetsByType[type]) {
                            assetsByType[type] = 0;
                        }
                        assetsByType[type] += value;
                    });
                    
                    // 转换为图表数据
                    const labels = [];
                    const values = [];
                    
                    // 定义类型名称映射
                    const typeNames = {
                        'stock': '股票',
                        'bond': '债券',
                        'cash': '现金',
                        'unknown': '未知'
                    };
                    
                    for (const type in assetsByType) {
                        labels.push(typeNames[type] || type);
                        values.push(assetsByType[type]);
                    }
                    
                    // 更新图表
                    assetDistributionChart.data.labels = labels;
                    assetDistributionChart.data.datasets[0].data = values;
                    assetDistributionChart.update();
                }
            })
            .catch(error => {
                console.error('获取资产分布数据时发生错误:', error);
            });
    }
    
    // 获取资产收益数据
    function fetchAssetProfit() {
        if (!assetProfitChart) {
            console.log('资产收益图表未初始化');
            return;
        }
        
        fetch('/api/portfolio')
            .then(response => response.json())
            .then(data => {
                console.log('资产收益数据:', data);
                if (data.error) {
                    console.error('获取资产收益数据失败:', data.error);
                } else if (data.assets && Array.isArray(data.assets)) {
                    // 计算每个非现金资产的收益
                    const assetProfits = data.assets
                        .filter(asset => asset.type !== 'cash') // 排除现金资产
                        .map(asset => {
                            const name = asset.name || asset.symbol || '未知资产';
                            const currentPrice = parseFloat(asset.current_price) || 0;
                            const purchasePrice = parseFloat(asset.purchase_price) || 0;
                            const quantity = parseFloat(asset.quantity) || 0;
                            const profit = (currentPrice - purchasePrice) * quantity;
                            const type = asset.type || '未知';
                            
                            return {
                                name: name,
                                profit: profit,
                                type: type
                            };
                        });
                    
                    // 按收益排序（从高到低）
                    assetProfits.sort((a, b) => b.profit - a.profit);
                    
                    // 只取前10个资产
                    const topAssets = assetProfits.slice(0, 10);
                    
                    // 转换为图表数据
                    const labels = topAssets.map(asset => asset.name);
                    const values = topAssets.map(asset => asset.profit);
                    
                    // 根据收益正负设置颜色
                    const backgroundColors = values.map(value => 
                        value >= 0 ? 'rgba(46, 204, 113, 0.7)' : 'rgba(231, 76, 60, 0.7)'
                    );
                    
                    const borderColors = values.map(value => 
                        value >= 0 ? 'rgba(46, 204, 113, 1)' : 'rgba(231, 76, 60, 1)'
                    );
                    
                    // 更新图表
                    assetProfitChart.data.labels = labels;
                    assetProfitChart.data.datasets[0].data = values;
                    assetProfitChart.data.datasets[0].backgroundColor = backgroundColors;
                    assetProfitChart.data.datasets[0].borderColor = borderColors;
                    assetProfitChart.update();
                }
            })
            .catch(error => {
                console.error('获取资产收益数据时发生错误:', error);
            });
    }

    // 初始化数据
    fetchPortfolioOverview();
    fetchRecentAssets();
    fetchPerformanceData();
    fetchAssetDistribution();
    fetchAssetProfit();

    // 设置定时刷新
    setInterval(fetchPortfolioOverview, 60000); // 每分钟刷新一次
    setInterval(fetchRecentAssets, 60000);
    setInterval(fetchPerformanceData, 300000); // 每5分钟刷新一次
    setInterval(fetchAssetDistribution, 60000);
    setInterval(fetchAssetProfit, 60000);
});