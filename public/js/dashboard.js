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
            
            // Refresh ALL data including recent stock holdings
            if (window.fetchPortfolioOverview) await window.fetchPortfolioOverview();
            if (window.fetchRecentAssets) await window.fetchRecentAssets(); // Add this line
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

// Add this function to dashboard.js if not already present
async function ensureRealStockData() {
    try {
        const status = await apiClient.get('/debug/database-status');
        
        if (status.needs_initialization || status.stocks_count === 0) {
            console.log('No real stock data found, initializing...');
            await initializeRealData();
        }
    } catch (error) {
        console.error('Failed to check stock data:', error);
    }
}

// Add debug function
async function debugPortfolio() {
    try {
        console.log('🔍 Debugging portfolio data...');
        
        const debugData = await apiClient.get('/debug/portfolio-check');
        console.log('Debug data:', debugData);
        
        const recentData = await apiClient.get('/portfolio/recent');
        console.log('Recent assets data:', recentData);
        console.log('Recent data type:', typeof recentData);
        console.log('Is recent data array:', Array.isArray(recentData));
        
        const message = `Debug Results:
- User exists: ${debugData.user_exists}
- Stocks in DB: ${debugData.stocks_count}
- Portfolio items: ${debugData.portfolio_count}
- Recent data type: ${typeof recentData}
- Is array: ${Array.isArray(recentData)}
- Recent items count: ${recentData?.length || 'undefined'}

Check console for detailed data.`;
        
        alert(message);
    } catch (error) {
        console.error('Debug failed:', error);
        alert('Debug failed: ' + error.message);
    }
}

// Make debug function available globally
window.debugPortfolio = debugPortfolio;

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

    // Update the fetchRecentAssets function with better debugging
    async function fetchRecentAssets() {
        try {
            console.log('🔍 Fetching recent stock assets...');
            
            // First test if API is reachable
            const testResponse = await fetch('/api/test');
            if (!testResponse.ok) {
                throw new Error('API server not responding');
            }
            
            // Now try the actual portfolio endpoint
            const response = await fetch('/api/portfolio/recent');
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Received data:', data);
            console.log('Data type:', typeof data);
            console.log('Is array:', Array.isArray(data));
            
            const recentAssetsList = document.getElementById('recent-assets-list');
            if (!recentAssetsList) {
                console.error('Recent assets list element not found');
                return;
            }

            // Check if data is valid array
            if (!data || !Array.isArray(data)) {
                console.error('Invalid data format received:', data);
                recentAssetsList.innerHTML = `
                    <div class="asset-item error">
                        <p>Invalid data format received from server.</p>
                        <p><small>Received: ${typeof data} - ${JSON.stringify(data).substring(0, 100)}...</small></p>
                        <button onclick="debugApiResponse()" class="btn">Debug API</button>
                        <button onclick="initializeRealData()" class="btn">Initialize Real Data</button>
                    </div>
                `;
                return;
            }

            if (data.length === 0) {
                recentAssetsList.innerHTML = `
                    <div class="asset-item">
                        <p>No stock holdings found in testdb_t4.</p>
                        <button onclick="initializeRealData()" class="btn">Add Real Stock Data</button>
                    </div>
                `;
                return;
            }

            // Create HTML for recent stock assets
            const assetsHtml = data.map(asset => {
                // Add safety checks for all properties
                const symbol = asset.symbol || 'Unknown';
                const quantity = asset.quantity || 0;
                const currentPrice = asset.current_price || 0;
                const purchasePrice = asset.purchase_price || 0;
                const currentValue = asset.current_value || 0;
                const profitLoss = asset.profit_loss || 0;
                const returnPercent = asset.return_percent || 0;
                const changePercent = asset.change_percent || 0;
                const purchaseDate = asset.purchase_date || new Date().toISOString();
                
                const profitClass = profitLoss >= 0 ? 'profit' : 'loss';
                const changeClass = changePercent >= 0 ? 'positive' : 'negative';
                const changeSymbol = changePercent >= 0 ? '+' : '';
                
                return `
                    <div class="asset-item">
                        <div class="asset-header">
                            <h4>${symbol}</h4>
                            <span class="asset-type">Stock</span>
                        </div>
                        <div class="asset-details">
                            <div class="asset-info">
                                <p><strong>Quantity:</strong> ${quantity} shares</p>
                                <p><strong>Current Price:</strong> $${currentPrice.toFixed(2)}</p>
                                <p><strong>Purchase Price:</strong> $${purchasePrice.toFixed(2)}</p>
                                <p><strong>Current Value:</strong> $${currentValue.toFixed(2)}</p>
                            </div>
                            <div class="asset-performance">
                                <p class="${profitClass}">
                                    <strong>P&L:</strong> $${profitLoss.toFixed(2)} 
                                    (${returnPercent.toFixed(2)}%)
                                </p>
                                <p class="${changeClass}">
                                    <strong>Today:</strong> ${changeSymbol}${changePercent.toFixed(2)}%
                                </p>
                                <p><strong>Purchased:</strong> ${new Date(purchaseDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            recentAssetsList.innerHTML = assetsHtml;
            console.log(`✅ Loaded ${data.length} recent stock assets`);
        } catch (error) {
            console.error('Failed to fetch recent assets:', error);
            const recentAssetsList = document.getElementById('recent-assets-list');
            if (recentAssetsList) {
                recentAssetsList.innerHTML = `
                    <div class="asset-item error">
                        <p>Failed to load recent assets: ${error.message}</p>
                        <button onclick="fetchRecentAssets()" class="btn">Retry</button>
                        <button onclick="debugApiResponse()" class="btn">Debug API</button>
                        <button onclick="initializeRealData()" class="btn">Initialize Data</button>
                    </div>
                `;
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
    setTimeout(ensureRealStockData, 500);
    setTimeout(fetchRecentAssets, 2000);

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

// Enhanced debug function
async function debugApiResponse() {
    try {
        console.log('🔍 Complete API test starting...');
        
        // Test each critical endpoint
        const endpoints = [
            '/api/test',
            '/api/debug/database-status',
            '/api/portfolio/recent',
            '/api/portfolio/overview',
            '/api/debug/portfolio-check'
        ];
        
        console.log('Testing all endpoints...');
        
        for (const endpoint of endpoints) {
            try {
                console.log(`Testing endpoint: ${endpoint}`);
                const response = await fetch(endpoint);
                console.log(`Status for ${endpoint}: ${response.status} ${response.statusText}`);
                
                if (response.ok) {
                    try {
                        const text = await response.text();
                        console.log(`Raw response from ${endpoint}:`, text.substring(0, 200) + '...');
                        
                        try {
                            const json = JSON.parse(text);
                            console.log(`Parsed JSON from ${endpoint}:`, json);
                            console.log(`Type: ${typeof json}, Is array: ${Array.isArray(json)}`);
                            
                            if (endpoint === '/api/portfolio/recent') {
                                // Special handling for the problematic endpoint
                                if (Array.isArray(json)) {
                                    console.log('✅ Recent endpoint returns array directly - GOOD');
                                } else if (json && Array.isArray(json.assets)) {
                                    console.log('⚠️ Recent endpoint returns {assets:[...]} - needs modification');
                                } else {
                                    console.log('❌ Recent endpoint returns invalid format');
                                }
                            }
                        } catch (parseError) {
                            console.error(`JSON parse error for ${endpoint}:`, parseError);
                        }
                    } catch (textError) {
                        console.error(`Text parse error for ${endpoint}:`, textError);
                    }
                } else {
                    console.error(`Endpoint ${endpoint} failed with status: ${response.status}`);
                }
            } catch (endpointError) {
                console.error(`Request to ${endpoint} failed:`, endpointError);
            }
            
            // Brief pause between requests
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        alert('API debugging complete - check console for details');
    } catch (error) {
        console.error('Debug API test failed:', error);
        alert('Debug failed: ' + error.message);
    }
}

// Make it globally available
window.debugApiResponse = debugApiResponse;