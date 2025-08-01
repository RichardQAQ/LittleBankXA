const axios = require('axios');
const pool = require('../db');

class YahooFinanceService {
  constructor() {
    // UPDATED: Replaced the old API key with the new one.
    this.apiKey = 'd4f6235c03msh857522afeb6c241p16d58cjsn5e81c917d601';
    this.apiHost = 'yahoo-finance15.p.rapidapi.com';
    this.baseUrl = `https://${this.apiHost}/api/v1/markets`;
    
    this.availableTickers = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA',
      'NVDA', 'META', 'NFLX', 'ORCL', 'INTC'
    ].filter(t => t && typeof t === 'string');

    this.lastUpdate = new Date();
  }

  parseFloatFromString(value) {
    if (typeof value !== 'string') return null;
    const cleanedValue = value.replace(/[\$,\+%]/g, '');
    const number = parseFloat(cleanedValue);
    return isNaN(number) ? null : number;
  }

  /**
   * Fetches real-time price data by making individual API calls for each ticker.
   * This is more robust against APIs that don't support batch requests.
   */
  async fetchRealTimePrice(tickers) {
    const cleanTickers = (Array.isArray(tickers) ? tickers : [tickers])
      .filter(t => t && typeof t === 'string' && t.trim() !== '');

    if (cleanTickers.length === 0) {
      console.warn('fetchRealTimePrice was called, but no valid tickers remained after cleaning.');
      return [];
    }

    console.log(`Fetching prices for ${cleanTickers.length} tickers individually...`);

    // Create an array of promises, one for each API call
    const promises = cleanTickers.map(ticker => {
      const options = {
        method: 'GET',
        url: `${this.baseUrl}/quote`,
        params: { ticker: ticker, type: 'STOCKS' }, // Single ticker per request
        headers: {
          'x-rapidapi-key': this.apiKey,
          'x-rapidapi-host': this.apiHost,
        },
        timeout: 15000,
      };
      return axios.request(options);
    });

    try {
      // Use Promise.allSettled to wait for all requests, even if some fail
      const responses = await Promise.allSettled(promises);
      const allParsedData = [];

      responses.forEach((response, index) => {
        const ticker = cleanTickers[index];
        if (response.status === 'fulfilled') {
          const responseData = response.value.data;
          let results = responseData.body || responseData;
          if (!Array.isArray(results)) {
            results = [results];
          }

          if (results && results.length > 0) {
            const parsedData = results.map(quote => {
              if (quote && quote.primaryData && quote.primaryData.lastSalePrice) {
                return {
                  symbol: quote.symbol,
                  name: quote.companyName || quote.shortName || quote.symbol,
                  current_price: this.parseFloatFromString(quote.primaryData.lastSalePrice),
                  change_percent: this.parseFloatFromString(quote.primaryData.percentageChange),
                  last_updated: new Date(),
                };
              }
              return null;
            }).filter(item => item && item.current_price !== null);
            
            if (parsedData.length > 0) {
              console.log(`✅ Successfully fetched data for ${ticker}`);
              allParsedData.push(...parsedData);
            } else {
              console.warn(`⚠️ No valid data parsed for ${ticker}. Response:`, JSON.stringify(responseData));
            }
          } else {
            console.warn(`⚠️ API returned empty body for ${ticker}.`);
          }
        } else {
          const errorMessage = response.reason.response ? JSON.stringify(response.reason.response.data) : response.reason.message;
          console.error(`❌ Error fetching price for ${ticker}:`, errorMessage);
        }
      });

      return allParsedData;
    } catch (error) {
      console.error('A critical error occurred during batch API fetching:', error);
      return [];
    }
  }

  /**
   * Fetches historical price data for a single stock symbol.
   * @param {string} symbol - The stock ticker (e.g., 'AAPL').
   * @returns {Promise<object>} A promise that resolves to chart data.
   */
  async fetchHistoricalData(symbol) {
    if (!symbol) throw new Error('Symbol is required to fetch historical data.');

    const options = {
      method: 'GET',
      url: `${this.baseUrl}/stock/history`,
      params: {
        symbol: symbol,
        interval: '5m',
        diffandsplits: 'false'
      },
      headers: {
        'x-rapidapi-key': this.apiKey,
        'x-rapidapi-host': this.apiHost,
      }
    };

    try {
      console.log(`Fetching historical data for ${symbol} with interval 5m...`);
      const response = await axios.request(options);

      // Log the raw response for debugging
      console.log(`Raw historical data response for ${symbol}:`, JSON.stringify(response.data, null, 2));

      // --- START: REWRITTEN PARSING LOGIC ---
      const historicalData = response.data.body;

      if (!historicalData || typeof historicalData !== 'object' || Object.keys(historicalData).length === 0) {
        console.warn(`No valid historical data found for ${symbol} in API response. The structure might have changed.`);
        return { labels: [], values: [], symbol };
      }

      // Get the timestamps (which are the keys) and sort them chronologically.
      const timestamps = Object.keys(historicalData).sort((a, b) => a - b);

      const labels = [];
      const values = [];

      // Iterate over the sorted timestamps to build the chart data.
      for (const ts of timestamps) {
        const entry = historicalData[ts];
        // Ensure the entry has a valid close price and a UTC timestamp for the label.
        if (entry && entry.close !== null && entry.date_utc) {
          // For 5m interval, use a more detailed time format.
          labels.push(new Date(entry.date_utc * 1000).toLocaleString());
          values.push(entry.close);
        }
      }

      if (labels.length === 0) {
        console.warn(`Parsed data for ${symbol} resulted in empty chart arrays.`);
        return { labels: [], values: [], symbol };
      }

      return { labels: labels, values: values, symbol };
      // --- END: REWRITTEN PARSING LOGIC ---

    } catch (error) {
      const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
      console.error(`❌ Error fetching historical data for ${symbol}:`, errorMessage);
      throw new Error(`Failed to fetch historical data for ${symbol}.`);
    }
  }

  /**
   * Updates the database with a list of stock data.
   * This function now correctly handles both updating existing stocks and inserting new ones.
   * @param {Array<object>} stockDataList - A list of stock data objects from the API.
   * @returns {Promise<number>} The total number of stocks processed (updated + inserted).
   */
  async updateStocksInDatabase(stockDataList) {
    if (!stockDataList || stockDataList.length === 0) {
      console.log('No valid stock data was parsed to update the database.');
      return 0;
    }

    // Get all existing stock symbols from the database for an efficient lookup.
    const [existingStocks] = await pool.query('SELECT symbol FROM stocks');
    const existingSymbols = new Set(existingStocks.map(s => s.symbol));

    const stocksToUpdate = [];
    const stocksToInsert = [];

    // Separate the fetched stocks into two groups: those to update and those to insert.
    for (const stockData of stockDataList) {
      if (!stockData.symbol || stockData.current_price === undefined) {
        console.warn('Skipping invalid stock data:', stockData);
        continue;
      }

      if (existingSymbols.has(stockData.symbol)) {
        stocksToUpdate.push(stockData);
      } else {
        stocksToInsert.push([
          stockData.symbol,
          stockData.name,
          stockData.current_price,
          stockData.change_percent
        ]);
      }
    }

    let updatedCount = 0;
    let insertedCount = 0;

    // Perform a single bulk insert for all new stocks for better performance.
    if (stocksToInsert.length > 0) {
      try {
        const insertQuery = `INSERT INTO stocks (symbol, name, current_price, change_percent) VALUES ?`;
        const [insertResult] = await pool.query(insertQuery, [stocksToInsert]);
        insertedCount = insertResult.affectedRows;
        console.log(`Bulk inserted ${insertedCount} new stocks.`);
      } catch (error) {
        console.error('Error during bulk insert of new stocks:', error.message);
      }
    }

    // Update existing stocks individually.
    if (stocksToUpdate.length > 0) {
        for (const stockData of stocksToUpdate) {
            try {
                // FIX: Changed column name from 'last_updated' to 'updated_at' to match the database schema.
                await pool.query(
                    `UPDATE stocks SET current_price = ?, change_percent = ?, name = ?, updated_at = NOW() WHERE symbol = ?`,
                    [stockData.current_price, stockData.change_percent, stockData.name, stockData.symbol]
                );
            } catch (error) {
                console.error(`Error updating stock ${stockData.symbol}:`, error.message);
            }
        }
        updatedCount = stocksToUpdate.length;
    }
    
    // Return the total count of stocks processed.
    return updatedCount + insertedCount;
  }

  async updateAllStockPrices() {
    console.log('🔄 Starting batch update of all stock prices from Yahoo Finance...');
    const startTime = new Date();

    try {
      const [existingStocks] = await pool.query('SELECT symbol FROM stocks');
      const dbSymbols = existingStocks.map(stock => stock.symbol);
      const allSymbols = [...new Set([...dbSymbols, ...this.availableTickers])];
      const validSymbols = allSymbols.filter(symbol => symbol && typeof symbol === 'string');

      if (validSymbols.length === 0) {
        return { success: true, updated: 0, total: 0, message: 'No valid stocks to update.' };
      }

      const priceDataList = await this.fetchRealTimePrice(validSymbols);
      const updatedCount = await this.updateStocksInDatabase(priceDataList);

      const duration = (new Date() - startTime) / 1000;
      this.lastUpdate = new Date();

      console.log(`Batch update finished. Updated ${updatedCount} of ${validSymbols.length} stocks.`);
      return {
        success: true,
        updated: updatedCount,
        total: validSymbols.length,
        duration: `${duration.toFixed(1)}s`,
        timestamp: this.lastUpdate,
        database: 'investment_system',
      };
    } catch (error) {
      console.error('❌ Batch update process failed:', error);
      return { success: false, error: error.message, updated: 0 };
    }
  }

  async searchSymbol(query) {
    try {
      const response = await axios.request({
        method: 'GET',
        url: `${this.baseUrl}/search`,
        // FIX: The API parameter is 'search', not 'query'.
        params: { search: query, type: 'STOCKS' },
        headers: {
          'x-rapidapi-key': this.apiKey,
          'x-rapidapi-host': this.apiHost,
        },
      });
      return response.data.body || [];
    } catch (error) {
      console.error(`Error searching for ${query}:`, error.message);
      return [];
    }
  }

  /**
   * Fetches the closing price for a given stock on a specific date.
   * @param {string} symbol - The stock ticker (e.g., 'AAPL').
   * @param {string} dateString - The date in 'YYYY-MM-DD' format.
   * @returns {Promise<number|null>} A promise that resolves to the price or null if not found.
   */
  async fetchPriceForDate(symbol, dateString) {
    try {
      // fetchHistoricalData gets daily data for the last month by default.
      const history = await this.fetchHistoricalData(symbol, '1d');
      if (!history || !history.labels || history.labels.length === 0) {
        return null;
      }

      // Find the index of the requested date in the returned labels.
      const targetDate = new Date(dateString).toLocaleDateString('zh-CN');
      const dateIndex = history.labels.findIndex(label => new Date(label).toLocaleDateString('zh-CN') === targetDate);

      if (dateIndex !== -1) {
        return history.values[dateIndex];
      }
      return null; // Date not found in the historical data range.
    } catch (error) {
      console.error(`Error fetching price for ${symbol} on ${dateString}:`, error);
      return null;
    }
  }

  getStatus() {
    return {
      lastUpdate: this.lastUpdate,
      apiProvider: 'Yahoo Finance (RapidAPI)',
      apiKey: `${this.apiKey.substring(0, 5)}...`,
      database: 'investment_system',
    };
  }
}

module.exports = new YahooFinanceService();