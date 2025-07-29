const express = require('express');
const pool = require('./db');
const app = express();
const path = require('path');

// 中间件
app.use(express.json());
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

// 更新股票价格
apiRouter.post('/stocks/:symbol/update', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // 模拟价格更新
    const [stocks] = await pool.query('SELECT * FROM stocks WHERE symbol = ?', [symbol]);
    
    if (stocks.length === 0) {
      return res.status(404).json({ error: '股票不存在' });
    }
    
    const currentPrice = parseFloat(stocks[0].current_price);
    const changePercent = (Math.random() - 0.5) * 10; // -5% 到 +5%
    const newPrice = currentPrice * (1 + changePercent / 100);
    
    await pool.query(
      'UPDATE stocks SET current_price = ?, change_percent = ?, last_updated = NOW() WHERE symbol = ?',
      [newPrice, changePercent, symbol]
    );
    
    res.json({
      success: true,
      symbol: symbol,
      oldPrice: currentPrice.toFixed(2),
      newPrice: newPrice.toFixed(2),
      changePercent: changePercent.toFixed(2)
    });
  } catch (error) {
    console.error('更新股票价格失败:', error);
    res.status(500).json({ error: '更新价格失败' });
  }
});

// 更新债券价格
apiRouter.post('/bonds/:symbol/update', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // 模拟价格更新
    const [bonds] = await pool.query('SELECT * FROM bonds WHERE symbol = ?', [symbol]);
    
    if (bonds.length === 0) {
      return res.status(404).json({ error: '债券不存在' });
    }
    
    const currentPrice = parseFloat(bonds[0].current_price);
    const changePercent = (Math.random() - 0.5) * 4; // -2% 到 +2%
    const newPrice = currentPrice * (1 + changePercent / 100);
    
    await pool.query(
      'UPDATE bonds SET current_price = ?, last_updated = NOW() WHERE symbol = ?',
      [newPrice, symbol]
    );
    
    res.json({
      success: true,
      symbol: symbol,
      oldPrice: currentPrice.toFixed(2),
      newPrice: newPrice.toFixed(2),
      changePercent: changePercent.toFixed(2)
    });
  } catch (error) {
    console.error('更新债券价格失败:', error);
    res.status(500).json({ error: '更新价格失败' });
  }
});

// 更新用户资产总值和收益率
async function updateUserAssetValues(userId) {
  try {
    console.log(`开始更新用户 ${userId} 的资产总值...`);
    
    const [assets] = await pool.query(
      `SELECT p.*, s.current_price as stock_price, b.current_price as bond_price
       FROM portfolio p
       LEFT JOIN stocks s ON p.asset_type = 'stock' AND p.asset_id = s.id
       LEFT JOIN bonds b ON p.asset_type = 'bond' AND p.asset_id = b.id
       WHERE p.user_id = ? AND p.status = 1`,
      [userId]
    );
    
    let totalAssets = 0;
    let stockValue = 0;
    let bondValue = 0;
    let cashBalance = 0;
    let totalCost = 0;
    
    console.log(`找到 ${assets.length} 项资产`);
    
    assets.forEach(asset => {
      const quantity = parseFloat(asset.quantity || 0);
      const purchasePrice = parseFloat(asset.purchase_price || 0);
      const cost = purchasePrice * quantity;
      
      console.log(`处理资产: ${asset.asset_type}, 数量: ${quantity}, 购买价: ${purchasePrice}`);
      
      if (asset.asset_type === 'stock') {
        const currentPrice = parseFloat(asset.stock_price || purchasePrice);
        const marketValue = currentPrice * quantity;
        stockValue += marketValue;
        totalAssets += marketValue;
        totalCost += cost;
        console.log(`股票市值: ${marketValue}, 成本: ${cost}`);
      } else if (asset.asset_type === 'bond') {
        const currentPrice = parseFloat(asset.bond_price || purchasePrice);
        const marketValue = currentPrice * quantity;
        bondValue += marketValue;
        totalAssets += marketValue;
        totalCost += cost;
        console.log(`债券市值: ${marketValue}, 成本: ${cost}`);
      } else if (asset.asset_type === 'cash') {
        cashBalance += quantity;
        totalAssets += quantity;
        console.log(`现金: ${quantity}`);
      }
    });
    
    // 获取用户当前现金余额
    // 获取用户当前现金余额
    const [users] = await pool.query('SELECT cash_balance FROM users WHERE id = ?', [userId]);
    if (users.length > 0) {
      cashBalance = parseFloat(users[0].cash_balance);
      totalAssets = stockValue + bondValue + cashBalance;
    }
    
    if (assets.length === 0 && users.length === 0) {
      totalAssets = 50000.00;
      cashBalance = 50000.00;
      stockValue = 0;
      bondValue = 0;
      totalCost = 0;
    }
    
    const totalReturnRate = totalCost > 0 ? ((stockValue + bondValue - totalCost) / totalCost) * 100 : 0;
    
    console.log(`计算结果: 总资产=${totalAssets}, 股票=${stockValue}, 债券=${bondValue}, 现金=${cashBalance}, 收益率=${totalReturnRate}%`);
    
    await pool.query(
      `UPDATE users SET 
       total_assets = ?,
       stock_value = ?,
       bond_value = ?,
       cash_balance = ?,
       total_return_rate = ?
       WHERE id = ?`,
      [totalAssets, stockValue, bondValue, cashBalance, totalReturnRate, userId]
    );
    
    console.log(`用户 ${userId} 资产总值更新完成`);
    return { totalAssets, stockValue, bondValue, cashBalance, totalReturnRate };
  } catch (error) {
    console.error('更新用户资产总值错误:', error);
    throw error;
  }
}

// 添加资产API
apiRouter.post('/assets/add', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { asset_type, asset_id, name, quantity, purchase_price, purchase_date } = req.body;
    const userId = 1; // 假设用户ID为1
    
    console.log('收到添加资产请求:', req.body);
    
    // 验证输入
    if (!asset_type || !asset_id || !quantity || !purchase_price) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    const qty = parseFloat(quantity);
    const price = parseFloat(purchase_price);
    const totalCost = qty * price;
    
    // 检查用户现金余额
    const [users] = await connection.query('SELECT cash_balance FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    const currentCash = parseFloat(users[0].cash_balance);
    if (currentCash < totalCost) {
      return res.status(400).json({ 
        error: `现金余额不足，当前余额: ¥${currentCash.toFixed(2)}，需要: ¥${totalCost.toFixed(2)}` 
      });
    }
    
    // 获取资产的数据库ID
    let dbAssetId = null;
    if (asset_type === 'stock') {
      const [stocks] = await connection.query('SELECT id FROM stocks WHERE symbol = ?', [asset_id]);
      if (stocks.length > 0) {
        dbAssetId = stocks[0].id;
      }
    } else if (asset_type === 'bond') {
      const [bonds] = await connection.query('SELECT id FROM bonds WHERE symbol = ?', [asset_id]);
      if (bonds.length > 0) {
        dbAssetId = bonds[0].id;
      }
    }
    
    if (!dbAssetId) {
      return res.status(400).json({ error: '找不到对应的资产' });
    }
    
    // 检查是否已有相同资产的持仓
    const [existingHoldings] = await connection.query(
      'SELECT * FROM portfolio WHERE user_id = ? AND asset_type = ? AND asset_id = ? AND status = 1',
      [userId, asset_type, dbAssetId]
    );
    
    if (existingHoldings.length > 0) {
      // 更新现有持仓（平均成本法）
      const existing = existingHoldings[0];
      const existingQty = parseFloat(existing.quantity);
      const existingPrice = parseFloat(existing.purchase_price);
      const existingCost = existingQty * existingPrice;
      
      const newTotalQty = existingQty + qty;
      const newTotalCost = existingCost + totalCost;
      const newAvgPrice = newTotalCost / newTotalQty;
      
      await connection.query(
        'UPDATE portfolio SET quantity = ?, purchase_price = ? WHERE id = ?',
        [newTotalQty, newAvgPrice, existing.id]
      );
    } else {
      // 添加新的持仓记录
      await connection.query(
        'INSERT INTO portfolio (user_id, asset_type, asset_id, name, quantity, purchase_price, purchase_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
        [userId, asset_type, dbAssetId, name, qty, price, purchase_date || new Date()]
      );
    }
    
    // 更新用户现金余额
    const newCashBalance = currentCash - totalCost;
    await connection.query('UPDATE users SET cash_balance = ? WHERE id = ?', [newCashBalance, userId]);
    
    // 重新计算用户资产
    await updateUserAssetValues(userId);
    
    await connection.commit();
    
    res.json({
      success: true,
      message: '资产添加成功',
      totalCost: totalCost.toFixed(2),
      newCashBalance: newCashBalance.toFixed(2)
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('添加资产失败:', error);
    res.status(500).json({ error: '添加资产失败: ' + error.message });
  } finally {
    connection.release();
  }
});

// 挂载API路由
app.use('/api', apiRouter);

// 前端路由
app.get('*', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } catch (error) {
    console.error('前端路由错误:', error);
    res.status(404).send('Not Found');
  }
});

const PORT = process.env.PORT || 3015;

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
