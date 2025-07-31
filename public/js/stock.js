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
    const updateAllPriceBtn = document.getElementById('update-all-price-btn');


    // Hide loading indicator and error message
    loadingIndicator.style.display = 'none';
    errorElement.style.display = 'none';

    // Load stock list
    loadStockList();

    // Stock search button click event
    searchStockButton.addEventListener('click', () => {
        console.log('Starting stock information query');
        const symbol = stockSymbolInput.value.trim().toUpperCase();
        if (symbol) {
            getStockData(symbol);
            console.log('Getting stock data:', symbol);
        } else {
            showError('Please enter a stock symbol');
        }
    });

    // Update price button click event
    updatePriceButton.addEventListener('click', () => {
        const symbol = stockSymbolInput.value.trim().toUpperCase();
        if (symbol) {
            updateStockPrice(symbol);
        } else {
            showError('Please enter a stock symbol');
        }
    });


    // NEW: Event listener for the "Update All Prices" button
    updateAllPricesBtn.addEventListener('click', async () => {
        showLoading();
        try {
            const response = await fetch('/api/stocks/update-all', { method: 'POST' });
            const result = await response.json();

            if (!response.ok || result.error) {
                throw new Error(result.error || 'Batch update failed');
            }
            
            showError(result.message, true); // Use showError to display success message
            loadStockList(); // Refresh the list to show new prices

        } catch (error) {
            showError(error.message);
            console.error('Batch update failed:', error);
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

    // Get stock data
    async function getStockData(symbol) {
        console.log('Starting to fetch stock information data');
        stockDataElement.innerHTML = '<p>Loading stock data...</p>';
        showLoading();
        
        try {
            const response = await fetch(`/api/stocks/single/${symbol}`);
            if (!response.ok) {
                throw new Error('Failed to get stock data');
            }
            const stockData = await response.json();
            console.log('Retrieved stock data:', stockData);
            displayStockData(stockData);
            
            // Simultaneously get and display historical chart
            displayHistoricalChart(symbol);
        } catch (error) {
            showError(error.message);
            console.error('Failed to get stock data:', error);
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

        chartContainer.innerHTML = '<p class="loading">Loading chart data...</p>';
        chartContainer.classList.add('active'); // Expand the container to show loading message

        try {
            const response = await fetch(`/api/stocks/${symbol.toUpperCase()}/history`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to get data: ${response.statusText}`);
            }
            const chartData = await response.json();
            console.log('Retrieved historical data:', chartData);
            
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
            chartContainer.innerHTML = `<p class="error-message">Unable to load chart for ${symbol}: ${error.message}</p>`;
            console.error('Chart loading error:', error);
            // Ensure the container stays active to show the error
            chartContainer.classList.add('active');
        }
    }

    // Update stock price
    async function updateStockPrice(symbol) {
        showLoading();
        try {
            const response = await fetch(`/api/stocks/${symbol}/update`, { method: 'POST' });
            if (!response.ok) {
                throw new Error('Failed to update stock price');
            }
            const result = await response.json();
            showError(result.message, true);
            // Reload stock list
            loadStockList();
            // Retrieve stock data again
            getStockData(symbol);
        } catch (error) {
            showError(error.message);
        } finally {
            hideLoading();
        }
    }

    // Update all stock prices
    async function updateAllStockPrices() {
        showLoading();
        showError('Updating all stock prices...', true);
        
        try {
            const response = await fetch('/api/stocks/update-all', { method: 'POST' });
            if (!response.ok) {
                throw new Error('Failed to update all stock prices');
            }
            const result = await response.json();
            showError(result.message || 'All stock prices updated successfully', true);
            // Reload stock list
            loadStockList();
        } catch (error) {
            showError('Failed to update all stock prices: ' + error.message);
            console.error('Failed to update all stock prices:', error);
        } finally {
            hideLoading();
        }
    }

    // Update all stock prices
    async function updateAllStockPrices() {
        showLoading();
        showError('Updating all stock prices...', true);
        
        try {
            const response = await fetch('/api/stocks/update-all', { method: 'POST' });
            if (!response.ok) {
                throw new Error('Failed to update all stock prices');
            }
            const result = await response.json();
            showError(result.message || 'All stock prices updated successfully', true);
            // Reload stock list
            loadStockList();
        } catch (error) {
            showError('Failed to update all stock prices: ' + error.message);
            console.error('Failed to update all stock prices:', error);
        } finally {
            hideLoading();
        }
    }

    // Update all stock prices
    async function  updateAllStockPricesBtn() {
        showLoading();
        showError('Updating all stock prices...', true);
        
        try {
            const response = await fetch('/api/stocks/refresh', { method: 'POST' });
            if (!response.ok) {
                throw new Error('Failed to update all stock prices');
            }
            const result = await response.json();
            showError(result.message || 'All stock prices updated successfully', true);
            // Reload stock list
            loadStockList();

            const currentSymbol = stockSymbolInput.value.trim().toUpperCase(); // Get the currently entered stock symbol
            if (currentSymbol) {
                getStockData(currentSymbol);
            }
            
        } catch (error) {
            showError('Failed to update all stock prices: ' + error.message);
            console.error('Failed to update all stock prices:', error);
        } finally {
            hideLoading();
        }
    }

    // Load stock list
    async function loadStockList() {
        console.log('Loading stock list');
        try {
            const response = await fetch('/api/stocks');
            if (!response.ok) {
                throw new Error('Failed to get stock list');
            }
            const stocks = await response.json();
            console.log('Loaded stock list:', stocks);
            displayStockList(stocks);
        } catch (error) {
            console.error('Failed to load stock list:', error);
        }
    }

    // Display stock data
    function displayStockData(stockData) {
        // Calculate change color
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
                        <div class="current-price">$${parseFloat(stockData.current_price || stockData.price).toFixed(2)}</div>
                        <div class="price-change ${changeClass}">${changeSign}${changePercent.toFixed(2)}%</div>
                    </div>
                    <div class="stock-stats">
                        <div class="stat-item">
                            <span class="stat-label">Volume:</span>
                            <span class="stat-value">${formatNumber(stockData.volume || 0)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Market Cap:</span>
                            <span class="stat-value">$${formatNumber(stockData.market_cap || 0)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Updated:</span>
                            <span class="stat-value">${new Date(stockData.updated_at || new Date()).toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="stock-actions">
                        <button class="btn btn-primary" onclick="window.location.href='add_asset.html?type=stock&symbol=${stockData.symbol}&name=${stockData.name || stockData.symbol}&price=${stockData.current_price || stockData.price}'">
                            Buy Stock
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Display stock list
    function displayStockList(stocks) {
        let html = '';
        stocks.forEach(stock => {
            const changeClass = stock.change_percent >= 0 ? 'positive' : 'negative';
            const changeSign = stock.change_percent >= 0 ? '+' : '';
            html += `
                <tr>
                    <td><a href="#" class="stock-link" data-symbol="${stock.symbol}">${stock.symbol}</a></td>
                    <td>${stock.name}</td>
                    <td>$${parseFloat(stock.current_price).toFixed(2)}</td>
                    <td class="${changeClass}">${changeSign}${parseFloat(stock.change_percent).toFixed(2)}%</td>
                    <td>${formatNumber(stock.volume)}</td>
                    <td>$${formatNumber(stock.market_cap)}</td>
                    <td>
                        <!-- FIX: Add the data-price attribute to the button -->
                        <button class="btn btn-sm btn-success buy-btn" 
                                data-symbol="${stock.symbol}" 
                                data-name="${stock.name}" 
                                data-price="${stock.current_price}">Buy</button>
                    </td>
                </tr>
            `;
        });
        stockTableBody.innerHTML = html;

        // Add event listeners to view buttons
        document.querySelectorAll('.view-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const symbol = e.target.getAttribute('data-symbol');
                stockSymbolInput.value = symbol;
                getStockData(symbol);
            });
        });

        // Add event listeners to buy buttons
        document.querySelectorAll('.buy-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const symbol = e.target.getAttribute('data-symbol');
                const name = e.target.getAttribute('data-name');
                const price = e.target.getAttribute('data-price'); // Get the price from the data attribute
                // Redirect to add asset page and pass stock information
                // FIX: Add the price to the URL query parameters
                window.location.href = `add_asset.html?type=stock&symbol=${symbol}&name=${name}&price=${price}`;
            });
        });
    }

    // Show loading indicator
    function showLoading() {
        loadingIndicator.style.display = 'block';
        errorElement.style.display = 'none';
    }

    // Hide loading indicator
    function hideLoading() {
        loadingIndicator.style.display = 'none';
    }

    // Show error message
    function showError(message, isSuccess = false) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        errorElement.className = isSuccess ? 'success' : 'error';
    }

    // Format number
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

    // Add CSS styles
    const style = document.createElement('style');
    style.textContent = `
        .action-btn {
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            border: none;
            margin: 2px;
            color: white;
            font-weight: bold;
            transition: all 0.3s ease;
        }
        
        .view-btn {
            background-color: #17a2b8; /* Teal */
        }
        
        .buy-btn {
            background-color: #28a745; /* Green */
        }
        
        .update-btn {
            background-color: #f0ad4e; /* Orange */
        }
        
        .action-btn:hover {
            opacity: 0.8;
            transform: translateY(-2px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        
        .stock-list-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .success {
            color: #28a745;
            background-color: #d4edda;
            border-color: #c3e6cb;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 15px;
        }
        
        .error {
            color: #721c24;
            background-color: #f8d7da;
            border-color: #f5c6cb;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 15px;
        }
    `;
    document.head.appendChild(style);
});
