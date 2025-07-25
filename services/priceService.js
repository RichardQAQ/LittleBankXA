const axios = require('axios');
const pool = require('../db');

class AlphaVantageService {
  constructor() {
    this.apiKey = 'DK81UQ20HPA8A0WU'; // Primary key
    this.fallbackApiKey = '9ZRZOFP1CUIWPRYQ'; // Fallback key
    this.baseUrl = 'https://www.alphavantage.co/query';
    this.availableTickers = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA',
      'NVDA', 'META', 'NFLX', 'ORCL', 'INTC'
    ];
    this.lastUpdate = new Date();
    this.requestCount = 0;
    this.maxRequestsPerMinute = 5;
    
    // Configure axios with defaults
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000
    });
  }
  
  // Real-time price fetch method
  async fetchRealTimePrice(ticker) {
    try {
      console.log(`Fetching real-time price for ${ticker}...`);
      
      // Check rate limits
      if (this.requestCount >= this.maxRequestsPerMinute) {
        console.log('Rate limit reached, using fallback key');
        this.apiKey = this.fallbackApiKey;
        this.requestCount = 0;
      }
      
      const response = await this.client.get('', {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: ticker,
          apikey: this.apiKey
        }
      });
      
      this.requestCount++;
      
      const data = response.data;
      if (data['Global Quote']) {
        const quote = data['Global Quote'];
        return {
          symbol: ticker,
          current_price: parseFloat(quote['05. price']),
          change_percent: parseFloat(quote['10. change percent'].replace('%', '')),
          last_updated: new Date()
        };
      } else {
        console.error(`Invalid response for ${ticker}:`, data);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching price for ${ticker}:`, error.message);
      return null;
    }
  }
  
  // Add this method to your priceService.js file
  async fetchSinglePrice(symbol) {
    // This is just a wrapper for the existing method
    return await this.fetchRealTimePrice(symbol);
  }
  
  // Update database with fresh price data
  async updateStockInDatabase(stockData) {
    if (!stockData) return false;
    
    try {
      console.log(`Updating ${stockData.symbol} in testdb_t4 database...`);
      
      // Check if stock exists
      const [existingStock] = await pool.query(
        'SELECT id FROM stocks WHERE symbol = ?',
        [stockData.symbol]
      );
      
      if (existingStock.length > 0) {
        // Update existing stock
        await pool.query(
          `UPDATE stocks 
           SET current_price = ?, 
               change_percent = ?, 
               last_updated = NOW() 
           WHERE symbol = ?`,
          [
            stockData.current_price,
            stockData.change_percent,
            stockData.symbol
          ]
        );
        console.log(`✅ Updated ${stockData.symbol} in database: $${stockData.current_price}`);
        return true;
      } else {
        // Insert new stock
        await pool.query(
          `INSERT INTO stocks (symbol, name, current_price, change_percent) 
           VALUES (?, ?, ?, ?)`,
          [
            stockData.symbol,
            `${stockData.symbol} Corporation`,
            stockData.current_price,
            stockData.change_percent
          ]
        );
        console.log(`✅ Inserted ${stockData.symbol} into database: $${stockData.current_price}`);
        return true;
      }
    } catch (error) {
      console.error(`Error updating database for ${stockData.symbol}:`, error.message);
      return false;
    }
  }
  
  // Update all stock prices in the database
  async updateAllStockPrices() {
    try {
      console.log('🔄 Starting batch update of all stock prices...');
      const startTime = new Date();
      let successCount = 0;
      let errorCount = 0;
      
      // Get existing stocks from database
      const [existingStocks] = await pool.query('SELECT symbol FROM stocks');
      const dbSymbols = existingStocks.map(stock => stock.symbol);
      
      // Combine database symbols with available tickers
      const allSymbols = [...new Set([...dbSymbols, ...this.availableTickers])];
      
      // Limit to 3 for demo (avoid rate limits)
      const symbolsToUpdate = allSymbols.slice(0, 3);
      
      console.log(`📊 Updating prices for: ${symbolsToUpdate.join(', ')}`);
      
      for (const symbol of symbolsToUpdate) {
        try {
          // CHANGE THIS LINE - Use fetchRealTimePrice instead of fetchSinglePrice
          const priceData = await this.fetchRealTimePrice(symbol);
          
          if (priceData) {
            // Update database with fresh data
            const [updateResult] = await pool.query(
              `UPDATE stocks 
               SET current_price = ?, 
                   change_percent = ?, 
                   last_updated = NOW() 
               WHERE symbol = ?`,
              [
                priceData.current_price,
                priceData.change_percent,
                symbol
              ]
            );
            
            if (updateResult.affectedRows > 0) {
              successCount++;
              console.log(`✅ Updated ${symbol} in database: $${priceData.current_price}`);
            } else {
              // Stock doesn't exist, insert it
              await pool.query(
                `INSERT INTO stocks (symbol, name, current_price, change_percent) 
                 VALUES (?, ?, ?, ?)`,
                [
                  symbol,
                  `${symbol} Corporation`,
                  priceData.current_price,
                  priceData.change_percent
                ]
              );
              successCount++;
              console.log(`✅ Inserted ${symbol} into database: $${priceData.current_price}`);
            }
          } else {
            errorCount++;
          }
          
          // Respect rate limits
          if (symbolsToUpdate.indexOf(symbol) < symbolsToUpdate.length - 1) {
            console.log('⏳ Waiting 15 seconds for rate limit...');
            await new Promise(resolve => setTimeout(resolve, 15000));
          }
        } catch (error) {
          console.error(`❌ Error processing ${symbol}:`, error.message);
          errorCount++;
        }
      }
      
      const endTime = new Date();
      const duration = (endTime - startTime) / 1000;
      
      this.lastUpdate = endTime;
      
      return {
        success: successCount > 0,
        updated: successCount,
        errors: errorCount,
        total: symbolsToUpdate.length,
        duration: `${duration.toFixed(1)}s`,
        timestamp: this.lastUpdate,
        database: 'testdb_t4'
      };
    } catch (error) {
      console.error('❌ Batch update error:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Get status of the price service
  getStatus() {
    return {
      lastUpdate: this.lastUpdate,
      availableTickers: this.availableTickers.length,
      apiKey: `${this.apiKey.substring(0, 5)}...`,
      database: 'testdb_t4'
    };
  }
}

module.exports = new AlphaVantageService();