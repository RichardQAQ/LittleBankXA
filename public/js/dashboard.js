document.addEventListener('DOMContentLoaded', function() {

    // 初始化现金余额
    fetchCashBalance();

    // 初始化投资组合概览
    fetchPortfolioOverview();

    // 初始化最近资产
    fetchRecentAssets();

    // 初始化表现图表
    fetchPerformanceData();

    // 获取DOM元素
    const totalValueElement = document.getElementById('total-value');
    const totalReturnElement = document.getElementById('total-return');
    const cashBalanceElement = document.getElementById('cash-balance');
    const recentAssetsList = document.getElementById('recent-assets-list');
    const performanceChartCanvas = document.getElementById('performance-chart');
    const rechargeAmountInput = document.getElementById('recharge-amount');
    const rechargeButton = document.getElementById('recharge-button');
    const rechargeMessageElement = document.getElementById('recharge-message');

    // 添加充值按钮事件监听
    if (rechargeButton) {
        rechargeButton.addEventListener('click', handleRecharge);

        // 允许按Enter键提交充值
        rechargeAmountInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleRecharge();
            }
        });
    }

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
            return response.json();
        })
        .then(data => {
            if (data.error) {
                totalValueElement.textContent = '错误';
                totalReturnElement.textContent = '错误';
                console.error('获取概览数据失败:', data.error);
            } else {
                // 格式化总资产，保留2位小数
                const formattedValue = '¥' + data.totalValue.toFixed(2);
                totalValueElement.textContent = formattedValue;
                
                // 格式化收益率，保留2位小数并添加百分比符号
                const formattedReturn = data.totalReturn.toFixed(2) + '%';
                totalReturnElement.textContent = formattedReturn;
            }
        })
        .catch(error => {
            totalValueElement.textContent = '加载失败';
            totalReturnElement.textContent = '加载失败';
            console.error('获取概览数据时发生错误:', error);
        });
}

    // 获取现金余额
    function fetchCashBalance() {
        console.log('开始获取现金余额数据');
        fetch('/api/portfolio/cash')
            .then(response => {
                console.log('现金余额响应状态:', response.status);
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    cashBalanceElement.textContent = '错误';
                    console.error('获取现金余额失败:', data.error);
                } else {
                    cashBalanceElement.textContent = '¥' + data.balance.toFixed(2);
                }
            })
            .catch(error => {
                cashBalanceElement.textContent = '加载失败';
                console.error('获取现金余额时发生错误:', error);
            });
    }

    // 处理充值
    function handleRecharge() {
        const amount = parseFloat(rechargeAmountInput.value);
        if (isNaN(amount) || amount <= 0) {
            showRechargeMessage('请输入有效的充值金额', 'error');
            return;
        }

        fetch('/api/portfolio/recharge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount: amount })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showRechargeMessage('充值失败: ' + data.error, 'error');
                console.error('充值失败:', data.error);
            } else {
                showRechargeMessage(data.message, 'success');
                rechargeAmountInput.value = '';
                // 更新现金余额
                fetchCashBalance();
                // 更新总资产
                fetchPortfolioOverview();
            }
        })
        .catch(error => {
            showRechargeMessage('充值时发生错误', 'error');
            console.error('充值时发生错误:', error);
        });
    }

    // 显示充值消息
    function showRechargeMessage(text, type = 'info') {
        rechargeMessageElement.textContent = text;
        rechargeMessageElement.className = type === 'error' ? 'error-message' : 'success-message';
        rechargeMessageElement.style.display = 'block';

        // 5秒后隐藏消息
        setTimeout(() => {
            rechargeMessageElement.style.display = 'none';
        }, 5000);
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

    // 初始化数据
    fetchPortfolioOverview();
    fetchRecentAssets();
    fetchPerformanceData();

    // 设置定时刷新
    setInterval(fetchPortfolioOverview, 60000); // 每分钟刷新一次
    setInterval(fetchRecentAssets, 60000);
    setInterval(fetchPerformanceData, 300000); // 每5分钟刷新一次
});