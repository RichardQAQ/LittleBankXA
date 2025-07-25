// Enhanced API client with fetch
class ApiClient {
  constructor() {
    this.baseUrl = '/api';
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }

  // Generic fetch wrapper with error handling
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      console.error(`API request failed for ${url}:`, error);
      throw error;
    }
  }

  // GET request
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST request
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// Initialize API client globally
const apiClient = new ApiClient();

// Global message display function
function showMessage(text, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
    messageDiv.textContent = text;
    messageDiv.style.cssText = `
        padding: 10px;
        margin: 10px 0;
        border-radius: 4px;
        color: white;
        background: ${type === 'error' ? '#e74c3c' : '#27ae60'};
    `;
    
    const main = document.querySelector('main');
    if (main) {
        main.insertBefore(messageDiv, main.firstChild);
        setTimeout(() => messageDiv.remove(), 5000);
    } else {
        console.log(`${type.toUpperCase()}: ${text}`);
    }
}

// Update the testApiConnection function
async function testApiConnection() {
    const testBtn = document.getElementById('test-api-btn');
    const statusElement = document.getElementById('api-status');
    
    if (testBtn) {
        testBtn.textContent = 'Testing...';
        testBtn.disabled = true;
    }
    
    try {
        console.log('Testing Alpha Vantage API connection...');
        
        // Test Alpha Vantage endpoint
        const apiTest = await apiClient.get('/debug/fetch-test?ticker=AAPL');
        console.log('Alpha Vantage test response:', apiTest);
        
        if (apiTest.success && statusElement) {
            statusElement.innerHTML = `🟢 Alpha Vantage<br><small>${apiTest.data?.symbol}: $${apiTest.data?.price}</small>`;
            showMessage('Alpha Vantage API connection successful!', 'success');
        } else {
            throw new Error('Alpha Vantage API test failed');
        }
        
    } catch (error) {
        console.error('Alpha Vantage API test failed:', error);
        if (statusElement) {
            statusElement.innerHTML = '❌ Alpha Vantage Error<br><small>Connection Failed</small>';
        }
        showMessage('Alpha Vantage API test failed: ' + error.message, 'error');
    } finally {
        if (testBtn) {
            testBtn.textContent = 'Test Alpha Vantage';
            testBtn.disabled = false;
        }
    }
}

// Add symbol search function
async function searchSymbol() {
    const keywords = prompt('Enter symbol or company name to search:');
    if (!keywords) return;
    
    try {
        const results = await apiClient.get(`/debug/search/${encodeURIComponent(keywords)}`);
        
        if (results.success && results.results.length > 0) {
            let message = `Found ${results.count} results:\n`;
            results.results.slice(0, 5).forEach(result => {
                message += `${result.symbol} - ${result.name} (${result.type})\n`;
            });
            alert(message);
        } else {
            alert('No symbols found for: ' + keywords);
        }
    } catch (error) {
        console.error('Symbol search failed:', error);
        alert('Symbol search failed: ' + error.message);
    }
}

// Make new functions globally available
window.searchSymbol = searchSymbol;

// Monitor API calls with detailed logging
async function monitorApiCalls() {
    console.log('=== API MONITORING START ===');
    
    try {
        // Test each endpoint individually with error handling
        const tests = [
            { name: 'Portfolio Overview', endpoint: '/portfolio/overview' },
            { name: 'Recent Assets', endpoint: '/portfolio/recent' },
            { name: 'Performance Data', endpoint: '/portfolio/performance' },
            { name: 'Price Status', endpoint: '/prices/status' }
        ];
        
        for (const test of tests) {
            try {
                console.log(`Testing ${test.name}...`);
                const result = await apiClient.get(test.endpoint);
                console.log(`✅ ${test.name}:`, result);
            } catch (error) {
                console.error(`❌ ${test.name} failed:`, error.message);
            }
        }
        
        console.log('=== API MONITORING COMPLETE ===');
        return true;
    } catch (error) {
        console.error('❌ API Monitoring Error:', error);
        return false;
    }
}

// Manual price update function
async function updatePrices() {
    const updateButton = document.getElementById('update-prices-btn');
    if (updateButton) {
        updateButton.textContent = 'Updating...';
        updateButton.disabled = true;
    }

    try {
        const data = await apiClient.post('/prices/update', {});
        
        if (data.success) {
            console.log(`Updated ${data.updated} prices out of ${data.total} tickers`);
            showMessage(`Successfully updated ${data.updated} stock prices`, 'success');
            
            // Refresh data if functions are available
            if (window.fetchPortfolioOverview) await window.fetchPortfolioOverview();
            if (window.fetchPerformanceData) await window.fetchPerformanceData();
            if (window.fetchMarketStatus) await window.fetchMarketStatus();
        } else {
            throw new Error(data.error || 'Price update failed');
        }
    } catch (error) {
        console.error('Price update error:', error);
        showMessage('Price update failed: ' + error.message, 'error');
    } finally {
        if (updateButton) {
            updateButton.textContent = 'Update Prices';
            updateButton.disabled = false;
        }
    }
}

// Add database initialization function
async function initializeRealData() {
    const initBtn = document.getElementById('init-data-btn');
    if (initBtn) {
        initBtn.textContent = 'Initializing testdb_t4...';
        initBtn.disabled = true;
    }

    try {
        console.log('Initializing testdb_t4 with real Alpha Vantage data...');
        
        const result = await apiClient.post('/debug/init-real-data', {});
        
        if (result.success) {
            showMessage(`testdb_t4 initialized! Added ${result.stocks_added} stocks and ${result.bonds_added} bonds with real data.`, 'success');
            
            // Refresh all data
            setTimeout(async () => {
                await Promise.all([
                    window.fetchPortfolioOverview && window.fetchPortfolioOverview(),
                    window.fetchRecentAssets && window.fetchRecentAssets(),
                    window.fetchPerformanceData && window.fetchPerformanceData(),
                    window.fetchMarketStatus && window.fetchMarketStatus()
                ]);
            }, 2000);
        } else {
            throw new Error(result.error || 'testdb_t4 initialization failed');
        }
    } catch (error) {
        console.error('testdb_t4 initialization error:', error);
        showMessage('testdb_t4 initialization failed: ' + error.message, 'error');
    } finally {
        if (initBtn) {
            initBtn.textContent = 'Initialize Real Data';
            initBtn.disabled = false;
        }
    }
}

// Check testdb_t4 database status on load
async function checkDatabaseStatus() {
    try {
        const status = await apiClient.get('/debug/database-status');
        
        console.log('Database status:', status);
        
        if (status.needs_initialization) {
            showMessage(`Database ${status.database} is empty. Click "Initialize Real Data" to populate with Alpha Vantage data.`, 'info');
            
            // Show initialization button
            const apiCard = document.querySelector('#api-status').parentElement;
            if (apiCard && !document.getElementById('init-data-btn')) {
                const initButton = document.createElement('button');
                initButton.id = 'init-data-btn';
                initButton.className = 'btn';
                initButton.textContent = 'Initialize Real Data';
                initButton.onclick = initializeRealData;
                initButton.style.marginTop = '10px';
                initButton.style.width = '100%';
                
                apiCard.appendChild(initButton);
            }
        } else {
            showMessage(`Database ${status.database} contains ${status.stocks_count} stocks and ${status.portfolio_items} portfolio items.`, 'success');
        }
    } catch (error) {
        console.error('Failed to check testdb_t4 status:', error);
    }
}

// Make functions globally available
window.testApiConnection = testApiConnection;
window.monitorApiCalls = monitorApiCalls;
window.updatePrices = updatePrices;
window.showMessage = showMessage;
window.initializeRealData = initializeRealData;
window.checkDatabaseStatus = checkDatabaseStatus;

document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const totalValueElement = document.getElementById('total-value');
    const totalReturnElement = document.getElementById('total-return');
    const recentAssetsList = document.getElementById('recent-assets-list');
    const performanceChartCanvas = document.getElementById('performance-chart');

    // Initialize chart
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

    // Enhanced portfolio overview fetch
    async function fetchPortfolioOverview() {
        try {
            console.log('Fetching portfolio overview...');
            const data = await apiClient.get('/portfolio/overview');
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            if (totalValueElement) {
                totalValueElement.textContent = '¥' + (data.totalValue || 0).toFixed(2);
            }
            if (totalReturnElement) {
                totalReturnElement.textContent = (data.totalReturn || 0).toFixed(2) + '%';
            }
            
            console.log('Portfolio overview updated successfully');
        } catch (error) {
            console.error('Failed to fetch portfolio overview:', error);
            if (totalValueElement) totalValueElement.textContent = '加载失败';
            if (totalReturnElement) totalReturnElement.textContent = '加载失败';
        }
    }

    // Get recent assets
    async function fetchRecentAssets() {
        try {
            console.log('Fetching recent assets...');
            const data = await apiClient.get('/portfolio/recent');
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            if (!recentAssetsList) {
                console.warn('Recent assets list element not found');
                return;
            }
            
            if (!data.assets || data.assets.length === 0) {
                recentAssetsList.innerHTML = '<p>暂无资产</p>';
                return;
            }
            
            let html = '<div class="table-container"><table>';
            html += '<thead><tr><th>资产名称</th><th>类型</th><th>数量</th><th>购买价格</th><th>当前价格</th><th>盈亏</th></tr></thead>';
            html += '<tbody>';
            
            data.assets.forEach(asset => {
                const currentPrice = parseFloat(asset.current_price || 0);
                const purchasePrice = parseFloat(asset.purchase_price || 0);
                const quantity = parseFloat(asset.quantity || 0);
                const profitLoss = ((currentPrice - purchasePrice) * quantity).toFixed(2);
                const profitLossClass = profitLoss >= 0 ? 'positive' : 'negative';
                
                html += `<tr>
                    <td>${asset.name || 'N/A'}</td>
                    <td>${asset.type === 'stock' ? '股票' : '债券'}</td>
                    <td>${quantity}</td>
                    <td>¥${purchasePrice.toFixed(2)}</td>
                    <td>¥${currentPrice.toFixed(2)}</td>
                    <td class="${profitLossClass}">¥${profitLoss}</td>
                </tr>`;
            });
            
            html += '</tbody></table></div>';
            recentAssetsList.innerHTML = html;
            
            console.log('Recent assets updated successfully');
        } catch (error) {
            console.error('Failed to fetch recent assets:', error);
            if (recentAssetsList) {
                recentAssetsList.innerHTML = '<div class="error-message">获取最近资产失败: ' + error.message + '</div>';
            }
        }
    }

    // Enhanced performance data fetch
    async function fetchPerformanceData() {
        try {
            console.log('Fetching performance data...');
            const data = await apiClient.get('/portfolio/performance');
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            if (performanceChart && data.dates && data.values) {
                performanceChart.data.labels = data.dates;
                performanceChart.data.datasets[0].data = data.values;
                performanceChart.update();
                console.log('Performance chart updated successfully');
            }
        } catch (error) {
            console.error('Failed to fetch performance data:', error);
        }
    }

    // Market status fetch
    async function fetchMarketStatus() {
        try {
            console.log('Fetching market status...');
            const data = await apiClient.get('/prices/status');
            
            const statusElement = document.getElementById('market-status');
            if (statusElement) {
                const statusText = data.isMarketOpen ? '🟢 Market Open' : '🔴 Market Closed';
                const lastUpdate = data.lastUpdate ? new Date(data.lastUpdate).toLocaleTimeString() : 'Never';
                statusElement.innerHTML = `${statusText}<br><small>Last Updated: ${lastUpdate}</small>`;
            }
            
            console.log('Market status updated successfully');
        } catch (error) {
            console.error('Failed to fetch market status:', error);
            const statusElement = document.getElementById('market-status');
            if (statusElement) {
                statusElement.innerHTML = '❌ Status Error<br><small>Connection Failed</small>';
            }
        }
    }

    // Make functions available globally
    window.fetchPortfolioOverview = fetchPortfolioOverview;
    window.fetchRecentAssets = fetchRecentAssets;
    window.fetchPerformanceData = fetchPerformanceData;
    window.fetchMarketStatus = fetchMarketStatus;

    // Initialize data loading with error handling
    console.log('Initializing dashboard...');
    
    // Load data with delays to avoid overwhelming the server
    setTimeout(fetchPortfolioOverview, 100);
    setTimeout(fetchRecentAssets, 200);
    setTimeout(fetchPerformanceData, 300);
    setTimeout(fetchMarketStatus, 400);

    // Set up intervals
    setInterval(fetchPortfolioOverview, 60000); // Every minute
    setInterval(fetchRecentAssets, 60000);
    setInterval(fetchPerformanceData, 300000); // Every 5 minutes
    setInterval(fetchMarketStatus, 60000);
    
    // Test API connection after a delay
    setTimeout(testApiConnection, 2000);
    
    // Monitor API calls for debugging
    setTimeout(monitorApiCalls, 5000);
    
    // Check database status after delay
    setTimeout(checkDatabaseStatus, 1000);
    
    console.log('Dashboard initialization complete');
});