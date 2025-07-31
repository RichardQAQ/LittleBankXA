document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const totalValueElement = document.getElementById('total-value');
    const totalReturnElement = document.getElementById('total-return');
    const recentAssetsList = document.getElementById('recent-assets-list');
    const performanceChartCanvas = document.getElementById('performance-chart');
    const assetDistributionChartCanvas = document.getElementById('asset-distribution-chart');
    const assetProfitChartCanvas = document.getElementById('asset-profit-chart');

    // Check if elements exist
    if (!totalValueElement || !totalReturnElement) {
        console.error('Required DOM elements not found');
        return;
    }

    // Initialize charts
    let performanceChart = null;
    let assetDistributionChart = null;
    let assetProfitChart = null;
    
    // Initialize line chart
    if (performanceChartCanvas) {
        performanceChart = new Chart(performanceChartCanvas, {
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
                            text: 'Value (¥)'
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
    }
    
    // Initialize pie chart (asset distribution)
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
                        text: 'Asset Type Distribution'
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
    
    // Initialize bar chart (asset returns)
    if (assetProfitChartCanvas) {
        assetProfitChart = new Chart(assetProfitChartCanvas, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Asset Returns',
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
                        text: 'Asset Return Status'
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
                            text: 'Return (¥)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Asset Name'
                        }
                    }
                }
            }
        });
    }

    // Get portfolio overview data
    function fetchPortfolioOverview() {
        console.log('Starting to fetch portfolio overview data');
        fetch('/api/portfolio/overview')
            .then(response => {
                console.log('Overview data response status:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('Received data:', data);
                if (data.error) {
                    totalValueElement.textContent = 'Error';
                    totalReturnElement.textContent = 'Error';
                    console.error('Failed to get overview data:', data.error);
                } else {
                    // Format total assets, keep 2 decimal places
                    const totalValue = parseFloat(data.totalValue) || 0;
                    const formattedValue = '¥' + totalValue.toFixed(2);
                    totalValueElement.textContent = formattedValue;
                    
                    // Format return rate, keep 2 decimal places and add percentage symbol
                    const returnRate = parseFloat(data.totalReturn) || 0;
                    const formattedReturn = returnRate.toFixed(2) + '%';
                    totalReturnElement.textContent = formattedReturn;
                    
                    // Set return rate color
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
                totalValueElement.textContent = 'Load Failed';
                totalReturnElement.textContent = 'Load Failed';
                console.error('Error occurred while getting overview data:', error);
            });
    }

    // Get recently added assets
    function fetchRecentAssets() {
        console.log('Starting to fetch recent asset data');
        if (!recentAssetsList) {
            console.log('Recent assets list element does not exist');
            return;
        }
        
        fetch('/api/portfolio/recent')
            .then(response => {
                console.log('Recent assets response status:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('Recent assets data:', data);
                if (data.error) {
                    recentAssetsList.innerHTML = '<div class="error-message">Failed to get recent assets: ' + data.error + '</div>';
                    console.error('Failed to get recent assets:', data.error);
                } else if (!data.assets || data.assets.length === 0) {
                    recentAssetsList.innerHTML = '<p>No assets yet</p>';
                } else {
                    let html = '<div class="table-container"><table>';
                    html += '<thead><tr><th>Asset Name</th><th>Type</th><th>Quantity</th><th>Purchase Price</th><th>Current Price</th><th>Profit/Loss</th></tr></thead>';
                    html += '<tbody>';
                    data.assets.forEach(asset => {
                        const currentPrice = parseFloat(asset.current_price) || 0;
                        const purchasePrice = parseFloat(asset.purchase_price) || 0;
                        const quantity = parseFloat(asset.quantity) || 0;
                        const profitLoss = ((currentPrice - purchasePrice) * quantity).toFixed(2);
                        const profitLossClass = profitLoss >= 0 ? 'positive' : 'negative';
                        
                        let assetType = 'Unknown';
                        if (asset.type === 'stock') {
                            assetType = 'Stock';
                        } else if (asset.type === 'bond') {
                            assetType = 'Bond';
                        } else if (asset.type === 'cash') {
                            assetType = 'Cash';
                        }
                        
                        html += `<tr>
                            <td>${asset.name || 'Unknown'}</td>
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
                recentAssetsList.innerHTML = '<div class="error-message">Error occurred while getting recent assets</div>';
                console.error('Error occurred while getting recent assets:', error);
            });
    }

    // Get performance data
    function fetchPerformanceData() {
        if (!performanceChart) {
            console.log('Chart not initialized');
            return;
        }
        
        fetch('/api/portfolio/performance')
            .then(response => response.json())
            .then(data => {
                console.log('Performance data:', data);
                if (data.error) {
                    console.error('Failed to get performance data:', data.error);
                } else {
                    performanceChart.data.labels = data.dates || [];
                    performanceChart.data.datasets[0].data = data.values || [];
                    performanceChart.update();
                }
            })
            .catch(error => {
                console.error('Error occurred while getting performance data:', error);
            });
    }

    // Get asset distribution data
    function fetchAssetDistribution() {
        if (!assetDistributionChart) {
            console.log('Asset distribution chart not initialized');
            return;
        }
        
        fetch('/api/portfolio')
            .then(response => response.json())
            .then(data => {
                console.log('Asset distribution data:', data);
                if (data.error) {
                    console.error('Failed to get asset distribution data:', data.error);
                } else if (data.assets && Array.isArray(data.assets)) {
                    // Group by asset type
                    const assetsByType = {};
                    data.assets.forEach(asset => {
                        const type = asset.type || 'Unknown';
                        const value = parseFloat(asset.quantity) * parseFloat(asset.current_price) || 0;
                        
                        if (!assetsByType[type]) {
                            assetsByType[type] = 0;
                        }
                        assetsByType[type] += value;
                    });
                    
                    // Convert to chart data
                    const labels = [];
                    const values = [];
                    
                    // Define type name mapping
                    const typeNames = {
                        'stock': 'Stock',
                        'bond': 'Bond',
                        'cash': 'Cash',
                        'unknown': 'Unknown'
                    };
                    
                    for (const type in assetsByType) {
                        labels.push(typeNames[type] || type);
                        values.push(assetsByType[type]);
                    }
                    
                    // Update chart
                    assetDistributionChart.data.labels = labels;
                    assetDistributionChart.data.datasets[0].data = values;
                    assetDistributionChart.update();
                }
            })
            .catch(error => {
                console.error('Error occurred while getting asset distribution data:', error);
            });
    }
    
    // Get asset profit data
    function fetchAssetProfit() {
        if (!assetProfitChart) {
            console.log('Asset profit chart not initialized');
            return;
        }
        
        fetch('/api/portfolio')
            .then(response => response.json())
            .then(data => {
                console.log('Asset profit data:', data);
                if (data.error) {
                    console.error('Failed to get asset profit data:', data.error);
                } else if (data.assets && Array.isArray(data.assets)) {
                    // Calculate profit for each non-cash asset
                    const assetProfits = data.assets
                        .filter(asset => asset.type !== 'cash') // Exclude cash assets
                        .map(asset => {
                            const name = asset.name || asset.symbol || 'Unknown Asset';
                            const currentPrice = parseFloat(asset.current_price) || 0;
                            const purchasePrice = parseFloat(asset.purchase_price) || 0;
                            const quantity = parseFloat(asset.quantity) || 0;
                            const profit = (currentPrice - purchasePrice) * quantity;
                            const type = asset.type || 'Unknown';
                            
                            return {
                                name: name,
                                profit: profit,
                                type: type
                            };
                        });
                    
                    // Sort by profit (high to low)
                    assetProfits.sort((a, b) => b.profit - a.profit);
                    
                    // Take only top 10 assets
                    const topAssets = assetProfits.slice(0, 10);
                    
                    // Convert to chart data
                    const labels = topAssets.map(asset => asset.name);
                    const values = topAssets.map(asset => asset.profit);
                    
                    // Set colors based on profit/loss
                    const backgroundColors = values.map(value => 
                        value >= 0 ? 'rgba(46, 204, 113, 0.7)' : 'rgba(231, 76, 60, 0.7)'
                    );
                    
                    const borderColors = values.map(value => 
                        value >= 0 ? 'rgba(46, 204, 113, 1)' : 'rgba(231, 76, 60, 1)'
                    );
                    
                    // Update chart
                    assetProfitChart.data.labels = labels;
                    assetProfitChart.data.datasets[0].data = values;
                    assetProfitChart.data.datasets[0].backgroundColor = backgroundColors;
                    assetProfitChart.data.datasets[0].borderColor = borderColors;
                    assetProfitChart.update();
                }
            })
            .catch(error => {
                console.error('Error occurred while getting asset profit data:', error);
            });
    }

    // Initialize data
    fetchPortfolioOverview();
    fetchRecentAssets();
    fetchPerformanceData();
    fetchAssetDistribution();
    fetchAssetProfit();

    // Set refresh intervals
    setInterval(fetchPortfolioOverview, 60000); // Refresh every minute
    setInterval(fetchRecentAssets, 60000);
    setInterval(fetchPerformanceData, 300000); // Refresh every 5 minutes
    setInterval(fetchAssetDistribution, 60000);
    setInterval(fetchAssetProfit, 60000);
});