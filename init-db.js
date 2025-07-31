const pool = require('./db');
const fs = require('fs');
const path = require('path');
const yahooFinanceService = require('./services/priceService');


async function initDatabase() {
  try {
    console.log('Connecting to database...');
    // Test connection
    const connection = await pool.getConnection();
    console.log('Database connection successful');
    connection.release();

    // Create database
    console.log('Creating database...');
    await pool.query('CREATE DATABASE IF NOT EXISTS investment_system');
    console.log('Database created or already exists');

    // Select database
    console.log('Selecting database...');
    await pool.query('USE investment_system');
    console.log('Database selected');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        total_assets DECIMAL(15, 2) DEFAULT 50000.00,
        stock_value DECIMAL(15, 2) DEFAULT 0.00,
        bond_value DECIMAL(15, 2) DEFAULT 0.00,
        cash_balance DECIMAL(15, 2) DEFAULT 50000.00,
        total_return_rate DECIMAL(8, 4) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table created');

    // Create stocks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stocks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100),
        current_price DECIMAL(10, 2) NOT NULL,
        change_percent DECIMAL(5, 2),
        volume BIGINT DEFAULT 0,
        market_cap BIGINT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Stocks table created');

    // Create bonds table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bonds (
        id INT AUTO_INCREMENT PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100),
        face_value DECIMAL(10, 2) NOT NULL,
        coupon_rate DECIMAL(5, 2) NOT NULL,
        maturity_date DATE NOT NULL,
        current_price DECIMAL(10, 2) NOT NULL,
        change_percent DECIMAL(5, 4) DEFAULT 0,
        rating VARCHAR(10) DEFAULT 'AAA',
        issuer VARCHAR(100),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Bonds table created');

    // Create portfolio table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS portfolio (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL DEFAULT 1,
        asset_type ENUM('stock', 'bond', 'cash') NOT NULL,
        asset_id INT NOT NULL,
        quantity DECIMAL(10, 4) NOT NULL,
        purchase_price DECIMAL(10, 2) NOT NULL,
        purchase_date DATE NOT NULL,
        status TINYINT DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('Portfolio table created');

    // Create portfolio history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS portfolio_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL DEFAULT 1,
        date DATE NOT NULL,
        total_value DECIMAL(15, 2) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('Portfolio history table created');

    // Check for default user
    const [users] = await pool.query('SELECT * FROM users WHERE id = 1');
    if (users.length === 0) {
      // Create default user
      await pool.query(`
        INSERT INTO users (id, username, total_assets, stock_value, bond_value, cash_balance, total_return_rate)
        VALUES (1, 'User', 50000.00, 0.00, 0.00, 50000.00, 0.00)
      `);
      console.log('Default user created');
    } else {
      console.log('Default user already exists');
    }

    // Create sample stock data
    const stocks = [
      { symbol: 'AAPL', name: 'Apple Inc.', current_price: 214.05, change_percent: 0, volume: 50000000, market_cap: 2900000000000 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', current_price: 512.50, change_percent: 0, volume: 25000000, market_cap: 3100000000000 },
      { symbol: 'GOOG', name: 'Google Inc.', current_price: 135.89, change_percent: 0, volume: 30000000, market_cap: 1700000000000 },
      { symbol: 'TSLA', name: 'Tesla Inc.', current_price: 325.59, change_percent: 0, volume: 80000000, market_cap: 780000000000 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', current_price: 142.33, change_percent: 0, volume: 35000000, market_cap: 1500000000000 },
      { symbol: 'META', name: 'Meta Platforms Inc.', current_price: 325.78, change_percent: 0, volume: 20000000, market_cap: 850000000000 },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', current_price: 875.23, change_percent: 0, volume: 45000000, market_cap: 2200000000000 },
      { symbol: 'NFLX', name: 'Netflix Inc.', current_price: 456.12, change_percent: 0, volume: 15000000, market_cap: 200000000000 },
      { symbol: 'AMD', name: 'Advanced Micro Devices Inc.', current_price: 123.45, change_percent: 0, volume: 60000000, market_cap: 200000000000 },
      { symbol: 'INTC', name: 'Intel Corporation', current_price: 45.67, change_percent: 0, volume: 70000000, market_cap: 190000000000 }
    ];

    // Check if stocks table is empty
    const [stockCount] = await pool.query('SELECT COUNT(*) as count FROM stocks');
    if (stockCount[0].count === 0) {
      // Insert sample stocks
      for (const stock of stocks) {
        await pool.query(
          'INSERT INTO stocks (symbol, name, current_price, change_percent, volume, market_cap) VALUES (?, ?, ?, ?, ?, ?)',
          [stock.symbol, stock.name, stock.current_price, stock.change_percent, stock.volume, stock.market_cap]
        );
      }
      console.log('Sample stock data inserted');
    } else {
      console.log('Stock data already exists, skipping insertion');
    }

    // Create sample bond data
    const bonds = [
      { symbol: 'US10Y', name: '10-Year Treasury', face_value: 1000, coupon_rate: 3.85, maturity_date: '2034-07-21', current_price: 985.50, change_percent: 0, rating: 'AAA', issuer: 'U.S. Treasury' },
      { symbol: 'CN5Y', name: '5-Year Treasury', face_value: 1000, coupon_rate: 2.50, maturity_date: '2029-07-21', current_price: 992.30, change_percent: 0, rating: 'AAA', issuer: 'Chinese Treasury' },
      { symbol: 'US30Y', name: '30-Year Treasury', face_value: 1000, coupon_rate: 4.15, maturity_date: '2054-07-21', current_price: 975.80, change_percent: 0, rating: 'AAA', issuer: 'U.S. Treasury' },
      { symbol: 'DE10Y', name: '10-Year German Bond', face_value: 1000, coupon_rate: 2.25, maturity_date: '2034-07-21', current_price: 998.20, change_percent: 0, rating: 'AAA', issuer: 'German Government' }
    ];

    // Check if bonds table is empty
    const [bondCount] = await pool.query('SELECT COUNT(*) as count FROM bonds');
    if (bondCount[0].count === 0) {
      // Insert sample bonds
      for (const bond of bonds) {
        await pool.query(
          'INSERT INTO bonds (symbol, name, face_value, coupon_rate, maturity_date, current_price, change_percent, rating, issuer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [bond.symbol, bond.name, bond.face_value, bond.coupon_rate, bond.maturity_date, bond.current_price, bond.change_percent, bond.rating, bond.issuer]
        );
      }
      console.log('Sample bond data inserted');
    } else {
      console.log('Bond data already exists, skipping insertion');
    }

    // Check if portfolio is empty
    const [portfolioCount] = await pool.query('SELECT COUNT(*) as count FROM portfolio');
    if (portfolioCount[0].count === 0) {
      // Create sample portfolio data
      const portfolio = [
        { user_id: 1, asset_type: 'stock', asset_id: 2, quantity: 5, purchase_price: 400.30, purchase_date: '2024-02-19' },
        { user_id: 1, asset_type: 'stock', asset_id: 3, quantity: 15, purchase_price: 125.40, purchase_date: '2024-03-04' },
        { user_id: 1, asset_type: 'bond', asset_id: 1, quantity: 3, purchase_price: 970.10, purchase_date: '2024-04-09' },
        { user_id: 1, asset_type: 'bond', asset_id: 2, quantity: 4, purchase_price: 985.30, purchase_date: '2024-05-14' },
        { user_id: 1, asset_type: 'cash', asset_id: 0, quantity: 5000, purchase_price: 1.00, purchase_date: '2024-05-19' }
      ];

      // Insert sample portfolio
      for (const item of portfolio) {
        await pool.query(
          'INSERT INTO portfolio (user_id, asset_type, asset_id, quantity, purchase_price, purchase_date) VALUES (?, ?, ?, ?, ?, ?)',
          [item.user_id, item.asset_type, item.asset_id, item.quantity, item.purchase_price, item.purchase_date]
        );
      }
      console.log('Sample portfolio data inserted');
    } else {
      console.log('Portfolio data already exists, skipping insertion');
    }

    // Check if portfolio history is empty
    const [historyCount] = await pool.query('SELECT COUNT(*) as count FROM portfolio_history');
    if (historyCount[0].count === 0) {
      // Create portfolio history data for the past 30 days
      const today = new Date();
      let value = 50000;
      const growthRate = 1.01; // 1% daily growth

      for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const historyDate = date.toISOString().split('T')[0];
        
        // Random fluctuation with upward trend
        const dailyChange = (Math.random() - 0.3) * 0.02; // -0.3% to +1.7% random fluctuation
        value = value * (1 + dailyChange);
        
        await pool.query(
          'INSERT INTO portfolio_history (user_id, date, total_value) VALUES (?, ?, ?)',
          [1, historyDate, value.toFixed(2)]
        );
      }
      console.log('Sample portfolio history data inserted');
    } else {
      console.log('Portfolio history data already exists, skipping insertion');
    }

    // Update user asset values
    await updateUserAssetValues(1);
    
    console.log('Database initialization successful');
    
    // Try to get real-time stock data from Yahoo Finance
    try {
      console.log('Fetching real-time stock data from Yahoo Finance...');
      await yahooFinanceService.updateAllStockPrices();
      console.log('Real-time stock data updated successfully');
    } catch (error) {
      console.error('Failed to get real-time stock data:', error);
      console.log('Using default stock data');
    }
    
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
}

// Update user asset values
async function updateUserAssetValues(userId) {
  try {
    // Get user's stock asset value
    const [stockResult] = await pool.query(`
      SELECT COALESCE(SUM(p.quantity * s.current_price), 0) as total_stock_value
      FROM portfolio p
      JOIN stocks s ON p.asset_type = 'stock' AND p.asset_id = s.id
      WHERE p.user_id = ? AND p.status = 1
    `, [userId]);
    
    // Get user's bond asset value
    const [bondResult] = await pool.query(`
      SELECT COALESCE(SUM(p.quantity * b.current_price), 0) as total_bond_value
      FROM portfolio p
      JOIN bonds b ON p.asset_type = 'bond' AND p.asset_id = b.id
      WHERE p.user_id = ? AND p.status = 1
    `, [userId]);
    
    // Get user's cash balance
    const [cashResult] = await pool.query(`
      SELECT COALESCE(SUM(quantity * purchase_price), 0) as total_cash
      FROM portfolio
      WHERE user_id = ? AND asset_type = 'cash' AND status = 1
    `, [userId]);
    
    // Get user's current cash balance
    const [userResult] = await pool.query(`
      SELECT cash_balance FROM users WHERE id = ?
    `, [userId]);
    
    const stockValue = parseFloat(stockResult[0].total_stock_value || 0);
    const bondValue = parseFloat(bondResult[0].total_bond_value || 0);
    const portfolioCash = parseFloat(cashResult[0].total_cash || 0);
    const cashBalance = parseFloat(userResult[0].cash_balance || 0);
    
    // Calculate total assets
    const totalAssets = stockValue + bondValue + cashBalance;
    
    // Calculate total return rate (assuming initial assets of 50000)
    const initialAssets = 50000;
    const totalReturn = totalAssets - initialAssets;
    const totalReturnRate = (totalReturn / initialAssets) * 100;
    
    // Update user asset information
    await pool.query(`
      UPDATE users
      SET stock_value = ?,
          bond_value = ?,
          cash_balance = ?,
          total_assets = ?,
          total_return_rate = ?
      WHERE id = ?
    `, [stockValue, bondValue, cashBalance, totalAssets, totalReturnRate, userId]);
    
    console.log('User asset values updated successfully');
    console.log(`Stock value: ${stockValue}, Bond value: ${bondValue}, Cash balance: ${cashBalance}, Total assets: ${totalAssets}, Total return rate: ${totalReturnRate}%`);
    
    // Update today's portfolio history
    const today = new Date().toISOString().split('T')[0];
    
    // Check if today's record already exists
    const [existingRecord] = await pool.query(
      'SELECT id FROM portfolio_history WHERE user_id = ? AND date = ?',
      [userId, today]
    );
    
    if (existingRecord.length > 0) {
      // Update today's record
      await pool.query(
        'UPDATE portfolio_history SET total_value = ? WHERE id = ?',
        [totalAssets, existingRecord[0].id]
      );
    } else {
      // Insert today's record
      await pool.query(
        'INSERT INTO portfolio_history (user_id, date, total_value) VALUES (?, ?, ?)',
        [userId, today, totalAssets]
      );
    }
    
    console.log('Portfolio history updated successfully');
    
  } catch (error) {
    console.error('Failed to update user asset values:', error);
  }
}

// Execute initialization
initDatabase().then(() => {
  console.log('Database initialization complete, program will exit');
  process.exit(0);
}).catch(err => {
  console.error('Error during database initialization:', err);
  process.exit(1);
});
