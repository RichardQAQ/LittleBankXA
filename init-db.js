const pool = require('./db');
const fs = require('fs');
const path = require('path');
const yahooFinanceService = require('./services/priceService');


async function initDatabase() {
  try {
    console.log('尝试连接数据库...');
    // 测试连接
    const connection = await pool.getConnection();
    console.log('数据库连接成功');
    connection.release();

    // 创建数据库
    console.log('尝试创建数据库...');
    await pool.query('CREATE DATABASE IF NOT EXISTS investment_system');
    console.log('数据库创建成功或已存在');

    // 选择数据库
    console.log('尝试选择数据库...');
    await pool.query('USE investment_system');
    console.log('数据库选择成功');

    // 创建用户表
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
    console.log('用户表创建成功');

    // 创建股票表
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
    console.log('股票表创建成功');

    // 创建债券表
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
    console.log('债券表创建成功');

    // 创建资产表
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
    console.log('资产表创建成功');

    // 创建投资组合历史表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS portfolio_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL DEFAULT 1,
        date DATE NOT NULL,
        total_value DECIMAL(15, 2) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('投资组合历史表创建成功');

    // 检查是否有默认用户
    const [users] = await pool.query('SELECT * FROM users WHERE id = 1');
    if (users.length === 0) {
      // 创建默认用户
      await pool.query(`
        INSERT INTO users (id, username, total_assets, stock_value, bond_value, cash_balance, total_return_rate)
        VALUES (1, '张三', 50000.00, 0.00, 0.00, 50000.00, 0.00)
      `);
      console.log('创建默认用户成功');
    } else {
      console.log('默认用户已存在');
    }

    // 创建示例股票数据
    const stocks = [
      { symbol: 'AAPL', name: '苹果公司', current_price: 214.05, change_percent: 0, volume: 50000000, market_cap: 2900000000000 },
      { symbol: 'MSFT', name: '微软公司', current_price: 512.50, change_percent: 0, volume: 25000000, market_cap: 3100000000000 },
      { symbol: 'GOOG', name: '谷歌公司', current_price: 135.89, change_percent: 0, volume: 30000000, market_cap: 1700000000000 },
      { symbol: 'TSLA', name: '特斯拉公司', current_price: 325.59, change_percent: 0, volume: 80000000, market_cap: 780000000000 },
      { symbol: 'AMZN', name: '亚马逊公司', current_price: 142.33, change_percent: 0, volume: 35000000, market_cap: 1500000000000 },
      { symbol: 'META', name: 'Meta', current_price: 325.78, change_percent: 0, volume: 20000000, market_cap: 850000000000 },
      { symbol: 'NVDA', name: '英伟达公司', current_price: 875.23, change_percent: 0, volume: 45000000, market_cap: 2200000000000 },
      { symbol: 'NFLX', name: '奈飞公司', current_price: 456.12, change_percent: 0, volume: 15000000, market_cap: 200000000000 },
      { symbol: 'AMD', name: 'AMD公司', current_price: 123.45, change_percent: 0, volume: 60000000, market_cap: 200000000000 },
      { symbol: 'INTC', name: '英特尔公司', current_price: 45.67, change_percent: 0, volume: 70000000, market_cap: 190000000000 }
    ];

    // 检查股票表是否为空
    const [stockCount] = await pool.query('SELECT COUNT(*) as count FROM stocks');
    if (stockCount[0].count === 0) {
      // 插入示例股票
      for (const stock of stocks) {
        await pool.query(
          'INSERT INTO stocks (symbol, name, current_price, change_percent, volume, market_cap) VALUES (?, ?, ?, ?, ?, ?)',
          [stock.symbol, stock.name, stock.current_price, stock.change_percent, stock.volume, stock.market_cap]
        );
      }
      console.log('示例股票数据插入成功');
    } else {
      console.log('股票数据已存在，跳过插入');
    }

    // 创建示例债券数据
    const bonds = [
      { symbol: 'US10Y', name: '10', face_value: 1000, coupon_rate: 3.85, maturity_date: '2034-07-21', current_price: 985.50, change_percent: 0, rating: 'AAA', issuer: '' },
      { symbol: 'CN5Y', name: '5', face_value: 1000, coupon_rate: 2.50, maturity_date: '2029-07-21', current_price: 992.30, change_percent: 0, rating: 'AAA', issuer: '' },
      { symbol: 'US30Y', name: '30', face_value: 1000, coupon_rate: 4.15, maturity_date: '2054-07-21', current_price: 975.80, change_percent: 0, rating: 'AAA', issuer: '' },
      { symbol: 'DE10Y', name: '10', face_value: 1000, coupon_rate: 2.25, maturity_date: '2034-07-21', current_price: 998.20, change_percent: 0, rating: 'AAA', issuer: '' }
    ];

    // 检查债券表是否为空
    const [bondCount] = await pool.query('SELECT COUNT(*) as count FROM bonds');
    if (bondCount[0].count === 0) {
      // 插入示例债券
      for (const bond of bonds) {
        await pool.query(
          'INSERT INTO bonds (symbol, name, face_value, coupon_rate, maturity_date, current_price, change_percent, rating, issuer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [bond.symbol, bond.name, bond.face_value, bond.coupon_rate, bond.maturity_date, bond.current_price, bond.change_percent, bond.rating, bond.issuer]
        );
      }
      console.log('示例债券数据插入成功');
    } else {
      console.log('债券数据已存在，跳过插入');
    }

    // 检查投资组合是否为空
    const [portfolioCount] = await pool.query('SELECT COUNT(*) as count FROM portfolio');
    if (portfolioCount[0].count === 0) {
      // 创建示例投资组合数据
      const portfolio = [
        { user_id: 1, asset_type: 'stock', asset_id: 2, quantity: 5, purchase_price: 400.30, purchase_date: '2024-02-19' },
        { user_id: 1, asset_type: 'stock', asset_id: 3, quantity: 15, purchase_price: 125.40, purchase_date: '2024-03-04' },
        { user_id: 1, asset_type: 'bond', asset_id: 1, quantity: 3, purchase_price: 970.10, purchase_date: '2024-04-09' },
        { user_id: 1, asset_type: 'bond', asset_id: 2, quantity: 4, purchase_price: 985.30, purchase_date: '2024-05-14' },
        { user_id: 1, asset_type: 'cash', asset_id: 0, quantity: 5000, purchase_price: 1.00, purchase_date: '2024-05-19' }
      ];

      // 插入示例投资组合
      for (const item of portfolio) {
        await pool.query(
          'INSERT INTO portfolio (user_id, asset_type, asset_id, quantity, purchase_price, purchase_date) VALUES (?, ?, ?, ?, ?, ?)',
          [item.user_id, item.asset_type, item.asset_id, item.quantity, item.purchase_price, item.purchase_date]
        );
      }
      console.log('示例投资组合数据插入成功');
    } else {
      console.log('投资组合数据已存在，跳过插入');
    }

    // 检查投资组合历史是否为空
    const [historyCount] = await pool.query('SELECT COUNT(*) as count FROM portfolio_history');
    if (historyCount[0].count === 0) {
      // 创建过去30天的投资组合历史数据
      const today = new Date();
      let value = 50000;
      const growthRate = 1.01; // 每天增长1%

      for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const historyDate = date.toISOString().split('T')[0];
        
        // 随机波动，但总体呈上升趋势
        const dailyChange = (Math.random() - 0.3) * 0.02; // -0.3%到+1.7%的随机波动
        value = value * (1 + dailyChange);
        
        await pool.query(
          'INSERT INTO portfolio_history (user_id, date, total_value) VALUES (?, ?, ?)',
          [1, historyDate, value.toFixed(2)]
        );
      }
      console.log('示例投资组合历史数据插入成功');
    } else {
      console.log('投资组合历史数据已存在，跳过插入');
    }

    // 更新用户资产总值
    await updateUserAssetValues(1);
    
    console.log('数据库初始化成功');
    
    // 尝试从Yahoo Finance获取实时股票数据
    try {
      console.log('尝试从Yahoo Finance获取实时股票数据...');
      await yahooFinanceService.updateAllStockPrices();
      console.log('实时股票数据更新成功');
    } catch (error) {
      console.error('获取实时股票数据失败:', error);
      console.log('将使用默认股票数据');
    }
    
  } catch (error) {
    console.error('数据库初始化失败:', error);
  }
}

// 更新用户资产总值
async function updateUserAssetValues(userId) {
  try {
    // 获取用户的股票资产总值
    const [stockResult] = await pool.query(`
      SELECT COALESCE(SUM(p.quantity * s.current_price), 0) as total_stock_value
      FROM portfolio p
      JOIN stocks s ON p.asset_type = 'stock' AND p.asset_id = s.id
      WHERE p.user_id = ? AND p.status = 1
    `, [userId]);
    
    // 获取用户的债券资产总值
    const [bondResult] = await pool.query(`
      SELECT COALESCE(SUM(p.quantity * b.current_price), 0) as total_bond_value
      FROM portfolio p
      JOIN bonds b ON p.asset_type = 'bond' AND p.asset_id = b.id
      WHERE p.user_id = ? AND p.status = 1
    `, [userId]);
    
    // 获取用户的现金余额
    const [cashResult] = await pool.query(`
      SELECT COALESCE(SUM(quantity * purchase_price), 0) as total_cash
      FROM portfolio
      WHERE user_id = ? AND asset_type = 'cash' AND status = 1
    `, [userId]);
    
    // 获取用户的当前现金余额
    const [userResult] = await pool.query(`
      SELECT cash_balance FROM users WHERE id = ?
    `, [userId]);
    
    const stockValue = parseFloat(stockResult[0].total_stock_value || 0);
    const bondValue = parseFloat(bondResult[0].total_bond_value || 0);
    const portfolioCash = parseFloat(cashResult[0].total_cash || 0);
    const cashBalance = parseFloat(userResult[0].cash_balance || 0);
    
    // 计算总资产
    const totalAssets = stockValue + bondValue + cashBalance;
    
    // 计算总回报率（假设初始资产为50000）
    const initialAssets = 50000;
    const totalReturn = totalAssets - initialAssets;
    const totalReturnRate = (totalReturn / initialAssets) * 100;
    
    // 更新用户资产信息
    await pool.query(`
      UPDATE users
      SET stock_value = ?,
          bond_value = ?,
          cash_balance = ?,
          total_assets = ?,
          total_return_rate = ?
      WHERE id = ?
    `, [stockValue, bondValue, cashBalance, totalAssets, totalReturnRate, userId]);
    
    console.log('用户资产总值更新成功');
    console.log(`股票价值: ${stockValue}, 债券价值: ${bondValue}, 现金余额: ${cashBalance}, 总资产: ${totalAssets}, 总回报率: ${totalReturnRate}%`);
    
    // 更新今天的投资组合历史
    const today = new Date().toISOString().split('T')[0];
    
    // 检查今天是否已有记录
    const [existingRecord] = await pool.query(
      'SELECT id FROM portfolio_history WHERE user_id = ? AND date = ?',
      [userId, today]
    );
    
    if (existingRecord.length > 0) {
      // 更新今天的记录
      await pool.query(
        'UPDATE portfolio_history SET total_value = ? WHERE id = ?',
        [totalAssets, existingRecord[0].id]
      );
    } else {
      // 插入今天的记录
      await pool.query(
        'INSERT INTO portfolio_history (user_id, date, total_value) VALUES (?, ?, ?)',
        [userId, today, totalAssets]
      );
    }
    
    console.log('投资组合历史更新成功');
    
  } catch (error) {
    console.error('更新用户资产总值失败:', error);
  }
}

// 执行初始化
initDatabase().then(() => {
  console.log('数据库初始化完成，程序将退出');
  process.exit(0);
}).catch(err => {
  console.error('数据库初始化过程中发生错误:', err);
  process.exit(1);
});