const express = require('express');
const pool = require('./db');
const app = express();
const PORT = process.env.PORT || 3003;
const path = require('path');
const { getStockData, updateStockPrice, getBondData } = require('./alphaVantageService');
const priceService = require('./services/priceService'); // 假设有一个价格服务模块

// 中间件
app.use(express.json());
// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// API路由
const apiRouter = express.Router();

// 测试API
apiRouter.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// 获取用户信息
apiRouter.get('/user', async (req, res) => {
  try {
    const userId = 1;
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: '未找到用户' });
    }
    
    res.json(users[0]);
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取投资组合概览
apiRouter.get('/portfolio/overview', async (req, res) => {
  try {
    const userId = 1;
    
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      await pool.query(
        'INSERT INTO users (id, username, total_assets, stock_value, bond_value, cash_balance, total_return_rate) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [1, '张三', 50000.00, 0.00, 0.00, 50000.00, 0.00]
      );
      
      return res.json({
        totalValue: 50000.00,
        totalReturn: 0.00,
        stockValue: 0.00,
        bondValue: 0.00,
        cashBalance: 50000.00
      });
    }
    
    const user = users[0];
    await updateUserAssetValues(userId);
    
    const [updatedUsers] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    const updatedUser = updatedUsers[0];
    
    res.json({
      totalValue: parseFloat(updatedUser.total_assets),
      totalReturn: parseFloat(updatedUser.total_return_rate),
      stockValue: parseFloat(updatedUser.stock_value),
      bondValue: parseFloat(updatedUser.bond_value),
      cashBalance: parseFloat(updatedUser.cash_balance)
    });
  } catch (error) {
    console.error('获取投资组合概览错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取投资组合
apiRouter.get('/portfolio', async (req, res) => {
  try {
    const userId = 1;
    const [userInfo] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    
    const [portfolioItems] = await pool.query(
      `SELECT * FROM (
        (SELECT p.id, p.asset_type, p.asset_id, p.quantity, p.purchase_price, p.purchase_date, 
                s.name, s.symbol, s.current_price, 'stock' as type
         FROM portfolio p
         JOIN stocks s ON p.asset_type = 'stock' AND p.asset_id = s.id
         WHERE p.status = 1
         )
        UNION ALL
        (SELECT p.id, p.asset_type, p.asset_id, p.quantity, p.purchase_price, p.purchase_date, 
                b.name, b.symbol, b.current_price, 'bond' as type
         FROM portfolio p
         JOIN bonds b ON p.asset_type = 'bond' AND p.asset_id = b.id
         WHERE p.status = 1
         )
        UNION ALL
        (SELECT p.id, p.asset_type, p.asset_id, p.quantity, p.purchase_price, p.purchase_date, 
                '现金' as name, 'CASH' as symbol, 1 as current_price, 'cash' as type
         FROM portfolio p
         WHERE p.asset_type = 'cash' AND p.status = 1
         )
        ) AS combined_results
        ORDER BY purchase_date DESC`, []
    );
    
    res.json({
      user: userInfo[0],
      assets: portfolioItems
    });
  } catch (error) {
    console.error('获取投资组合错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取股票列表
apiRouter.get('/stocks', async (req, res) => {
  try {
    const [stocks] = await pool.query('SELECT * FROM stocks ORDER BY symbol');
    
    const formattedStocks = stocks.map(stock => {
      const changePercent = parseFloat(stock.change_percent) || (Math.random() - 0.5) * 10;
      
      return {
        id: stock.id,
        symbol: stock.symbol,
        name: stock.name,
        current_price: parseFloat(stock.current_price),
        change_percent: changePercent,
        volume: Math.floor(Math.random() * 1000000) + 100000,
        market_cap: parseFloat(stock.current_price) * Math.floor(Math.random() * 1000000000),
        updated_at: stock.last_updated || new Date()
      };
    });
    
    res.json(formattedStocks);
  } catch (error) {
    console.error('获取股票列表失败:', error);
    res.status(500).json({ error: '获取股票列表失败' });
  }
});

// 获取单个股票数据
apiRouter.get('/stocks/single/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const [stocks] = await pool.query('SELECT * FROM stocks WHERE symbol = ?', [symbol]);
    
    if (stocks.length === 0) {
      return res.status(404).json({ error: '股票不存在' });
    }
    
    const stock = stocks[0];
    const changePercent = parseFloat(stock.change_percent) || (Math.random() - 0.5) * 10;
    
    res.json({
      symbol: stock.symbol,
      name: stock.name,
      current_price: parseFloat(stock.current_price),
      price: parseFloat(stock.current_price),
      change_percent: changePercent,
      volume: Math.floor(Math.random() * 1000000) + 100000,
      market_cap: parseFloat(stock.current_price) * Math.floor(Math.random() * 1000000000)
    });
  } catch (error) {
    console.error('获取单个股票数据失败:', error);
    res.status(500).json({ error: '获取股票数据失败' });
  }
});

// 购买股票
apiRouter.post('/stocks/buy', async (req, res) => {
  try {
    const { symbol, name, price, quantity } = req.body;
    
    if (!symbol || !price || !quantity || quantity <= 0) {
      return res.status(400).json({ error: '参数不完整或无效' });
    }
    
    const userId = 1;
    const totalCost = parseFloat(price) * parseFloat(quantity);
    
    // 检查用户现金余额
    const [users] = await pool.query('SELECT cash_balance FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    const currentCash = parseFloat(users[0].cash_balance);
    
    if (currentCash < totalCost) {
      return res.status(400).json({ 
        error: `现金余额不足，当前余额: ¥${currentCash.toFixed(2)}，需要: ¥${totalCost.toFixed(2)}` 
      });
    }
    
    // 查找或创建股票记录
    let [stockRecords] = await pool.query('SELECT * FROM stocks WHERE symbol = ?', [symbol]);
    let stockId;
    
    if (stockRecords.length === 0) {
      const [result] = await pool.query(
        'INSERT INTO stocks (symbol, name, current_price, change_percent) VALUES (?, ?, ?, ?)',
        [symbol, name || symbol, price, 0.00]
      );
      stockId = result.insertId;
    } else {
      stockId = stockRecords[0].id;
    }
    
    // 检查portfolio表中是否已有相同股票持仓
    const [existingHoldings] = await pool.query(
      'SELECT * FROM portfolio WHERE user_id = ? AND asset_type = ? AND asset_id = ? AND status = 1',
      [userId, 'stock', stockId]
    );
    
    if (existingHoldings.length > 0) {
      // 更新现有持仓
      const existing = existingHoldings[0];
      const existingQuantity = parseFloat(existing.quantity);
      const existingPrice = parseFloat(existing.purchase_price);
      const newQuantity = existingQuantity + parseFloat(quantity);
      
      const newAvgPrice = ((existingQuantity * existingPrice) + (parseFloat(quantity) * parseFloat(price))) / newQuantity;
      
      await pool.query(
        'UPDATE portfolio SET quantity = ?, purchase_price = ? WHERE id = ?',
        [newQuantity, newAvgPrice, existing.id]
      );
    } else {
      // 创建新持仓记录
      await pool.query(
        'INSERT INTO portfolio (user_id, asset_type, asset_id, quantity, purchase_price, purchase_date, status) VALUES (?, ?, ?, ?, ?, NOW(), 1)',
        [userId, 'stock', stockId, quantity, price]
      );
    }
    
    // 更新用户现金余额
    await pool.query('UPDATE users SET cash_balance = cash_balance - ? WHERE id = ?', [totalCost, userId]);
    
    // 更新用户资产总值
    await updateUserAssetValues(userId);
    
    res.json({ 
      success: true, 
      message: '股票购买成功！',
      totalCost: totalCost.toFixed(2),
      symbol: symbol,
      quantity: quantity
    });
  } catch (error) {
    console.error('购买股票失败:', error);
    res.status(500).json({ error: '购买失败: ' + error.message });
  }
});

// 获取债券列表
apiRouter.get('/bonds', async (req, res) => {
  try {
    const [bonds] = await pool.query('SELECT * FROM bonds ORDER BY symbol');
    
    const formattedBonds = bonds.map(bond => {
      const changePercent = (Math.random() - 0.5) * 2;
      const currentPrice = parseFloat(bond.current_price) || parseFloat(bond.face_value);
      
      return {
        id: bond.id,
        symbol: bond.symbol,
        name: bond.name,
        face_value: parseFloat(bond.face_value) || 1000.00,
        coupon_rate: parseFloat(bond.coupon_rate) || 0.00,
        maturity_date: bond.maturity_date,
        current_price: currentPrice,
        change_percent: changePercent,
        rating: 'AAA',
        issuer: '政府',
        updated_at: bond.updated_at || new Date()
      };
    });
    
    res.json(formattedBonds);
  } catch (error) {
    console.error('获取债券列表失败:', error);
    res.status(500).json({ error: '获取债券列表失败' });
  }
});

// 获取单个债券数据
apiRouter.get('/bonds/single/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const [bonds] = await pool.query('SELECT * FROM bonds WHERE symbol = ?', [symbol]);
    
    if (bonds.length === 0) {
      return res.status(404).json({ error: '债券不存在' });
    }
    
    const bond = bonds[0];
    const changePercent = (Math.random() - 0.5) * 2;
    const currentPrice = parseFloat(bond.current_price) || parseFloat(bond.face_value);
    
    res.json({
      symbol: bond.symbol,
      name: bond.name,
      current_price: currentPrice,
      price: currentPrice,
      coupon_rate: parseFloat(bond.coupon_rate),
      face_value: parseFloat(bond.face_value),
      maturity_date: bond.maturity_date,
      rating: 'AAA',
      issuer: '政府',
      change_percent: changePercent
    });
  } catch (error) {
    console.error('获取单个债券数据失败:', error);
    res.status(500).json({ error: '获取债券数据失败' });
  }
});

// 购买债券
apiRouter.post('/bonds/buy', async (req, res) => {
  try {
    const { symbol, name, price, quantity } = req.body;
    
    if (!symbol || !price || !quantity || quantity <= 0) {
      return res.status(400).json({ error: '参数不完整或无效' });
    }
    
    const userId = 1;
    const totalCost = parseFloat(price) * parseFloat(quantity);
    
    // 检查用户现金余额
    const [users] = await pool.query('SELECT cash_balance FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    const currentCash = parseFloat(users[0].cash_balance);
    
    if (currentCash < totalCost) {
      return res.status(400).json({ 
        error: `现金余额不足，当前余额: ¥${currentCash.toFixed(2)}，需要: ¥${totalCost.toFixed(2)}` 
      });
    }
    
    // 查找或创建债券记录
    let [bondRecords] = await pool.query('SELECT * FROM bonds WHERE symbol = ?', [symbol]);
    let bondId;
    
    if (bondRecords.length === 0) {
      const [result] = await pool.query(
        'INSERT INTO bonds (symbol, name, face_value, coupon_rate, maturity_date) VALUES (?, ?, ?, ?, ?)',
        [symbol, name || symbol, 1000.00, 3.50, '2030-12-31']
      );
      bondId = result.insertId;
    } else {
      bondId = bondRecords[0].id;
    }
    
    // 检查portfolio表中是否已有相同债券持仓
    const [existingHoldings] = await pool.query(
      'SELECT * FROM portfolio WHERE user_id = ? AND asset_type = ? AND asset_id = ? AND status = 1',
      [userId, 'bond', bondId]
    );
    
    if (existingHoldings.length > 0) {
      // 更新现有持仓
      const existing = existingHoldings[0];
      const existingQuantity = parseFloat(existing.quantity);
      const existingPrice = parseFloat(existing.purchase_price);
      const newQuantity = existingQuantity + parseFloat(quantity);
      
      const newAvgPrice = ((existingQuantity * existingPrice) + (parseFloat(quantity) * parseFloat(price))) / newQuantity;
      
      await pool.query(
        'UPDATE portfolio SET quantity = ?, purchase_price = ? WHERE id = ?',
        [newQuantity, newAvgPrice, existing.id]
      );
    } else {
      // 创建新持仓记录
      await pool.query(
        'INSERT INTO portfolio (user_id, asset_type, asset_id, quantity, purchase_price, purchase_date, status) VALUES (?, ?, ?, ?, ?, NOW(), 1)',
        [userId, 'bond', bondId, quantity, price]
      );
    }
    
    // 更新用户现金余额
    await pool.query('UPDATE users SET cash_balance = cash_balance - ? WHERE id = ?', [totalCost, userId]);
    
    // 更新用户资产总值
    await updateUserAssetValues(userId);
    
    res.json({ 
      success: true, 
      message: '债券购买成功！',
      totalCost: totalCost.toFixed(2),
      symbol: symbol,
      quantity: quantity
    });
  } catch (error) {
    console.error('购买债券失败:', error);
    res.status(500).json({ error: '购买失败: ' + error.message });
  }
});

// 卖出资产
apiRouter.post('/portfolio/sell', async (req, res) => {
  try {
    const { assetId, quantity } = req.body;
    const userId = 1;
    
    console.log('收到卖出请求:', { assetId, quantity, userId });
    
    if (!assetId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: '参数不完整或无效' });
    }
    
    // 使用简单查询避免锁等待
    const [assets] = await pool.query(
      `SELECT p.*, s.current_price as stock_price, b.current_price as bond_price, b.face_value
       FROM portfolio p
       LEFT JOIN stocks s ON p.asset_type = 'stock' AND p.asset_id = s.id
       LEFT JOIN bonds b ON p.asset_type = 'bond' AND p.asset_id = b.id
       WHERE p.id = ? AND p.user_id = ? AND p.status = 1`,
      [assetId, userId]
    );
    
    if (assets.length === 0) {
      return res.status(404).json({ error: '资产不存在或已卖出' });
    }
    
    const asset = assets[0];
    const currentQuantity = parseFloat(asset.quantity);
    const sellQuantity = parseFloat(quantity);
    
    if (sellQuantity > currentQuantity) {
      return res.status(400).json({ error: '卖出数量超过持有数量' });
    }
    
    // 计算卖出价格
    let currentPrice = parseFloat(asset.purchase_price);
    
    if (asset.asset_type === 'stock') {
      currentPrice = parseFloat(asset.stock_price) || parseFloat(asset.purchase_price);
    } else if (asset.asset_type === 'bond') {
      currentPrice = parseFloat(asset.bond_price) || parseFloat(asset.face_value) || parseFloat(asset.purchase_price);
    }
    
    const sellAmount = sellQuantity * currentPrice;
    
    // 直接执行更新操作，不使用事务避免锁等待
    if (Math.abs(sellQuantity - currentQuantity) < 0.0001) {
      // 全部卖出
      await pool.query('UPDATE portfolio SET status = 0 WHERE id = ?', [assetId]);
    } else {
      // 部分卖出
      const remainingQuantity = currentQuantity - sellQuantity;
      await pool.query('UPDATE portfolio SET quantity = ? WHERE id = ?', [remainingQuantity, assetId]);
    }
    
    // 更新现金余额
    await pool.query('UPDATE users SET cash_balance = cash_balance + ? WHERE id = ?', [sellAmount, userId]);
    
    console.log('卖出成功:', { sellAmount, sellQuantity });
    
    res.json({
      success: true,
      message: '卖出成功',
      amount: sellAmount,
      quantity: sellQuantity
    });
    
  } catch (error) {
    console.error('卖出资产失败:', error);
    res.status(500).json({ error: '卖出失败: ' + error.message });
  }
});

// 充值现金
apiRouter.post('/portfolio/recharge', async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = 1;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: '充值金额无效' });
    }
    
    if (amount > 1000000) {
      return res.status(400).json({ error: '单次充值金额不能超过100万元' });
    }
    
    // 更新用户现金余额
    await pool.query('UPDATE users SET cash_balance = cash_balance + ? WHERE id = ?', [amount, userId]);
    
    // 更新用户资产总值
    await updateUserAssetValues(userId);
    
    res.json({
      success: true,
      message: '充值成功',
      amount: parseFloat(amount).toFixed(2)
    });
    
  } catch (error) {
    console.error('充值失败:', error);
    res.status(500).json({ error: '充值失败: ' + error.message });
  }
});

// 获取最近资产
apiRouter.get('/portfolio/recent', async (req, res) => {
  try {
    const userId = 1;
    
    const [portfolioItems] = await pool.query(
      `SELECT * FROM (
        (SELECT p.id, p.asset_type, p.asset_id, p.quantity, p.purchase_price, p.purchase_date, 
                s.name, s.symbol, s.current_price, 'stock' as type
         FROM portfolio p
         JOIN stocks s ON p.asset_type = 'stock' AND p.asset_id = s.id
         WHERE p.status = 1
         )
        UNION ALL
        (SELECT p.id, p.asset_type, p.asset_id, p.quantity, p.purchase_price, p.purchase_date, 
                b.name, b.symbol, b.current_price, 'bond' as type
         FROM portfolio p
         JOIN bonds b ON p.asset_type = 'bond' AND p.asset_id = b.id
         WHERE p.status = 1
         )
        UNION ALL
        (SELECT p.id, p.asset_type, p.asset_id, p.quantity, p.purchase_price, p.purchase_date, 
                '现金' as name, 'CASH' as symbol, 1 as current_price, 'cash' as type
         FROM portfolio p
         WHERE p.asset_type = 'cash' AND p.status = 1
         )
        ) AS combined_results
        ORDER BY purchase_date DESC
        LIMIT 5`, []
    );
    
    res.json({
      assets: portfolioItems
    });
  } catch (error) {
    console.error('获取最近资产错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取投资组合表现数据
apiRouter.get('/portfolio/performance', async (req, res) => {
  try {
    // 生成模拟的历史表现数据
    const dates = [];
    const values = [];
    const baseValue = 50000;
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toLocaleDateString('zh-CN'));
      
      // 模拟价值变化
      const randomChange = (Math.random() - 0.5) * 2000;
      const value = baseValue + (30 - i) * 1000 + randomChange;
      values.push(Math.max(value, 30000));
    }
    
    res.json({
      dates: dates,
      values: values
    });
  } catch (error) {
    console.error('获取表现数据错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取股票列表
apiRouter.get('/stocks', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM stocks');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取债券列表
apiRouter.get('/bonds', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM bonds');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取投资组合
apiRouter.get('/portfolio', async (req, res) => {
  try {
    console.log('调用 /api/portfolio');

    
    // 获取所有资产，包括股票和债券的详细信息
    console.log('执行SQL查询获取投资组合资产');
    const [portfolioItems] = await pool.query(
      `SELECT * FROM (
        (SELECT p.id, p.asset_type, p.asset_id, p.quantity, p.purchase_price, p.purchase_date, 
                s.name, s.symbol, s.current_price, 'stock' as type
         FROM portfolio p
         JOIN stocks s ON p.asset_type = 'stock' AND p.asset_id = s.id
         )
        UNION ALL
        (SELECT p.id, p.asset_type, p.asset_id, p.quantity, p.purchase_price, p.purchase_date, 
                b.name, b.symbol, b.current_price, 'bond' as type
         FROM portfolio p
         JOIN bonds b ON p.asset_type = 'bond' AND p.asset_id = b.id
         )
        ) AS combined_results
        ORDER BY purchase_date DESC`, []
    );
    
    console.log('投资组合查询结果:', portfolioItems);
    res.json({
      assets: portfolioItems
    });
  } catch (error) {
    console.error('获取投资组合错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 添加资产到投资组合
apiRouter.post('/portfolio', async (req, res) => {
  try {
    const { assetType, symbol, name, quantity, purchasePrice, purchaseDate, faceValue, couponRate, maturityDate } = req.body;
    
    // 假设只有一个用户，ID为1
    const userId = 1;
    let assetId;
    
    if (assetType === 'stock') {
      // 检查股票是否已存在
      const [stockExists] = await pool.query('SELECT id FROM stocks WHERE symbol = ?', [symbol]);
      
      if (stockExists.length > 0) {
        // 股票已存在，使用现有ID
        assetId = stockExists[0].id;
      } else {
        // 股票不存在，创建新股票
        const [result] = await pool.query(
          'INSERT INTO stocks (symbol, name, current_price) VALUES (?, ?, ?)',
          [symbol, name, purchasePrice] // 假设当前价格等于购买价格
        );
        assetId = result.insertId;
      }
    } else if (assetType === 'bond') {
      // 检查债券是否已存在
      const [bondExists] = await pool.query('SELECT id FROM bonds WHERE symbol = ?', [symbol]);
      
      if (bondExists.length > 0) {
        // 债券已存在，使用现有ID
        assetId = bondExists[0].id;
      } else {
        // 债券不存在，创建新债券
        const [result] = await pool.query(
          'INSERT INTO bonds (symbol, name, face_value, coupon_rate, maturity_date, current_price) VALUES (?, ?, ?, ?, ?, ?)',
          [symbol, name, faceValue, couponRate, maturityDate, purchasePrice] // 假设当前价格等于购买价格
        );
        assetId = result.insertId;
      }
    } else {
      return res.status(400).json({ error: '无效的资产类型' });
    }
    
    // 将资产添加到投资组合
    await pool.query(
      'INSERT INTO portfolio (asset_type, asset_id, quantity, purchase_price, purchase_date) VALUES (?, ?, ?, ?, ?)',
      [assetType, assetId, quantity, purchasePrice, purchaseDate]
      );
    
    res.json({ success: true, message: '资产添加成功' });
  }
  catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 从投资组合中删除资产
apiRouter.delete('/portfolio/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM portfolio WHERE id = ?', [id]);
    
    res.json({ success: true, message: '资产删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 卖出资产
apiRouter.post('/portfolio/sell', async (req, res) => {
  try {
    const { assetId, quantity } = req.body;
    
    // 验证参数
    if (!assetId || !quantity || isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ error: '无效的卖出参数' });
    }
    
    // 获取资产信息
    const [assets] = await pool.query(
      'SELECT p.*, s.current_price as stock_price, b.current_price as bond_price, '
      + 's.symbol as stock_symbol, b.symbol as bond_symbol, '
      + 's.name as stock_name, b.name as bond_name '
      + 'FROM portfolio p '
      + 'LEFT JOIN stocks s ON p.asset_type = \'stock\' AND p.asset_id = s.id '
      + 'LEFT JOIN bonds b ON p.asset_type = \'bond\' AND p.asset_id = b.id '
      + 'WHERE p.id = ?',
      [assetId]
    );
    
    if (assets.length === 0) {
      return res.status(404).json({ error: '未找到该资产' });
    }
    
    const asset = assets[0];
    const sellQuantity = parseFloat(quantity);
    const currentQuantity = parseFloat(asset.quantity);
    
    if (sellQuantity > currentQuantity) {
      return res.status(400).json({ error: '卖出数量超过持有数量' });
    }
    
    // 获取当前价格
    let currentPrice;
    if (asset.asset_type === 'stock') {
      currentPrice = parseFloat(asset.stock_price);
    } else if (asset.asset_type === 'bond') {
      currentPrice = parseFloat(asset.bond_price);
    } else {
      return res.status(400).json({ error: '不支持的资产类型' });
    }
    
    // 计算卖出金额
    const sellAmount = currentPrice * sellQuantity;
    
    // 更新投资组合
    if (sellQuantity === currentQuantity) {
      // 全部卖出，删除资产
      await pool.query('DELETE FROM portfolio WHERE id = ?', [assetId]);
    } else {
      // 部分卖出，更新数量
      const newQuantity = currentQuantity - sellQuantity;
      await pool.query('UPDATE portfolio SET quantity = ? WHERE id = ?', [newQuantity, assetId]);
    }
    
    // 增加现金余额
    const userId = 1; // 假设只有一个用户
    const cashAssetType = 'cash';
    const cashAssetId = 0;
    
    // 检查是否已有现金资产
    const [cashExists] = await pool.query(
      'SELECT id, quantity FROM portfolio WHERE user_id = ? AND asset_type = ? AND asset_id = ?',
      [userId, cashAssetType, cashAssetId]
    );
    
    if (cashExists.length > 0) {
      // 已有现金资产，更新数量
      const newCashQuantity = parseFloat(cashExists[0].quantity) + sellAmount;
      await pool.query(
        'UPDATE portfolio SET quantity = ? WHERE id = ?',
        [newCashQuantity, cashExists[0].id]
      );
    } else {
      // 没有现金资产，创建新记录
      const purchasePrice = 1; // 现金的购买价格为1
      const purchaseDate = new Date().toISOString().split('T')[0];
      
      await pool.query(
        'INSERT INTO portfolio (asset_type, asset_id, quantity, purchase_price, purchase_date) VALUES (?, ?, ?, ?, ?)',
        [cashAssetType, cashAssetId, sellAmount, purchasePrice, purchaseDate]
      );
    }
    
    res.json({ success: true, message: '资产卖出成功', amount: sellAmount });
  } catch (error) {
    console.error('卖出资产错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 充值现金到投资组合
apiRouter.post('/portfolio/recharge', async (req, res) => {
  try {
    const { amount } = req.body;
    
    // 验证金额
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: '无效的充值金额' });
    }
    
    // 假设只有一个用户，ID为1
    const userId = 1;
    const assetType = 'cash';
    const assetId = 0;
    
    // 检查是否已有现金资产
    const [cashExists] = await pool.query(
      'SELECT id, quantity FROM portfolio WHERE user_id = ? AND asset_type = ? AND asset_id = ?',
      [userId, assetType, assetId]
    );
    
    if (cashExists.length > 0) {
      // 已有现金资产，更新数量
      const newQuantity = parseFloat(cashExists[0].quantity) + parseFloat(amount);
      await pool.query(
        'UPDATE portfolio SET quantity = ? WHERE id = ?',
        [newQuantity, cashExists[0].id]
      );
    } else {
      // 没有现金资产，创建新记录
      const quantity = amount;
      const purchasePrice = 1; // 现金的购买价格为1
      const purchaseDate = new Date().toISOString().split('T')[0];
      
      await pool.query(
        'INSERT INTO portfolio (asset_type, asset_id, quantity, purchase_price, purchase_date) VALUES (?, ?, ?, ?, ?)',
        [assetType, assetId, quantity, purchasePrice, purchaseDate]
      );
    }
    
    res.json({ success: true, message: '充值成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/history', async (req, res) => {
  try {
      const [rows] = await pool.query(`
          SELECT idstock_history AS id,
                 symbol,
                 trade_date,
                 open_price,
                 high_price,
                 low_price,
                 close_price,
                 volume,
                 stock_id
          FROM stock_history
          ORDER BY trade_date DESC
      `);
      console.log('获取历史数据:', rows);
      res.json(rows);
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: '服务器错误' });
  }
});

apiRouter.get('/stocks/:symbol/history', async (req, res) => {
  const { symbol } = req.params;
  if (!/^[A-Z]{1,10}$/i.test(symbol)) {
    return res.status(400).json({ error: 'Invalid symbol' });
  }
  console.log(`GET /api/stocks/${symbol}/history called`);
  try {
    // This uses the Yahoo Finance service to get historical data
    const historyData = await priceService.fetchHistoricalData(symbol);
    if (!historyData || historyData.labels.length === 0) {
      return res.status(404).json({ error: 'No historical data found for symbol' });
    }
    res.json(historyData);
  } catch (error) {
    console.error(`Error fetching history for ${symbol}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// 挂载API路由
app.use('/api', apiRouter);

// 前端路由 - 使用try-catch包装
app.get('*', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } catch (error) {
    console.error('前端路由错误:', error);
    res.status(404).send('Not Found');
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('数据库连接成功');
});
