const express = require('express');
const pool = require('./db');
const app = express();
const PORT = process.env.PORT || 3002;
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');

// ADD THIS LINE - Import the price service
const priceService = require('./services/priceService');

// 中间件
app.use(express.json());
// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// API路由
const apiRouter = express.Router();

// 测试API
apiRouter.get('/test', (req, res) => {
  res.json({
    message: 'API is working',
    timestamp: new Date(),
    database: 'testdb_t4'
  });
});

// 获取投资组合概览
apiRouter.get('/portfolio/overview', async (req, res) => {
  try {
    console.log('调用 /api/portfolio/overview');
    // 假设只有一个用户，ID为1
    const userId = 1;
    
    // 获取所有资产
    console.log('执行SQL查询获取资产');
    const [portfolioItems] = await pool.query(
      `SELECT p.*, s.current_price as stock_price, b.current_price as bond_price
       FROM portfolio p
       LEFT JOIN stocks s ON p.asset_type = 'stock' AND p.asset_id = s.id
       LEFT JOIN bonds b ON p.asset_type = 'bond' AND p.asset_id = b.id
       WHERE p.user_id = ?`,
      [userId]
    );
    
    console.log('查询结果:', portfolioItems);
    // 计算总资产价值和总收益率
    let totalValue = 0;
    let totalCost = 0;
    
    portfolioItems.forEach(item => {
      const currentPrice = item.asset_type === 'stock' ? item.stock_price : item.bond_price;
      const marketValue = currentPrice * item.quantity;
      const cost = item.purchase_price * item.quantity;
      
      totalValue += marketValue;
      totalCost += cost;
    });
    
    const totalReturn = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
    
    const responseData = {
      totalValue: totalValue,
      totalReturn: totalReturn
    };
    console.log('准备发送响应:', responseData);
    res.json(responseData);
    console.log('响应发送完成');
  } catch (error) {
    console.error('获取投资组合概览错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取最近添加的资产
apiRouter.get('/portfolio/recent', async (req, res) => {
  try {
    console.log('调用 /api/portfolio/recent');
    // 假设只有一个用户，ID为1
    const userId = 1;
    
    // 获取最近5个资产
    console.log('执行SQL查询获取最近资产');
    const [portfolioItems] = await pool.query(
        `(SELECT p.*, s.name, s.symbol, s.current_price, 'stock' as type
       FROM portfolio p
       JOIN stocks s ON p.asset_type = 'stock' AND p.asset_id = s.id
       WHERE p.user_id = ?)
       UNION ALL
       (SELECT p.*, b.name, b.symbol, b.current_price, 'bond' as type
       FROM portfolio p
       JOIN bonds b ON p.asset_type = 'bond' AND p.asset_id = b.id
       WHERE p.user_id = ?)
       ORDER BY purchase_date DESC
       LIMIT 5`,
        [userId, userId]
      );
    
    console.log('最近资产查询结果:', portfolioItems);
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
    // 这里简化处理，返回模拟数据
    // 实际应用中应该根据历史数据计算
    const dates = [];
    const values = [];
    
    // 生成过去30天的日期和模拟价值
    const today = new Date();
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
      
      // 模拟价值，起始值为10000，每天随机波动
      if (i === 30) {
        values.push(10000);
      } else {
        const lastValue = values[values.length - 1];
        const change = lastValue * (Math.random() * 0.02 - 0.01); // -1% 到 +1% 的波动
        values.push(lastValue + change);
      }
    }
    
    res.json({
      dates: dates,
      values: values
    });
  } catch (error) {
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
    // 假设只有一个用户，ID为1
    const userId = 1;
    
    // 获取所有资产，包括股票和债券的详细信息
    console.log('执行SQL查询获取投资组合资产');
    const [portfolioItems] = await pool.query(
      `SELECT * FROM (
        (SELECT p.id, p.user_id, p.asset_type, p.asset_id, p.quantity, p.purchase_price, p.purchase_date, 
                s.name, s.symbol, s.current_price, 'stock' as type
         FROM portfolio p
         JOIN stocks s ON p.asset_type = 'stock' AND p.asset_id = s.id
         WHERE p.user_id = ?)
        UNION ALL
        (SELECT p.id, p.user_id, p.asset_type, p.asset_id, p.quantity, p.purchase_price, p.purchase_date, 
                b.name, b.symbol, b.current_price, 'bond' as type
         FROM portfolio p
         JOIN bonds b ON p.asset_type = 'bond' AND p.asset_id = b.id
         WHERE p.user_id = ?)
      ) AS combined_results
      ORDER BY purchase_date DESC`,
      [userId, userId]
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
      'INSERT INTO portfolio (user_id, asset_type, asset_id, quantity, purchase_price, purchase_date) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, assetType, assetId, quantity, purchasePrice, purchaseDate]
    );
    
    res.json({ success: true, message: '资产添加成功' });
  } catch (error) {
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
    const quantity = amount;
    const purchasePrice = 1; // 现金的购买价格为1
    const purchaseDate = new Date().toISOString().split('T')[0];
    
    // 将现金添加到投资组合
    await pool.query(
      'INSERT INTO portfolio (user_id, asset_type, asset_id, quantity, purchase_price, purchase_date) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, assetType, assetId, quantity, purchasePrice, purchaseDate]
    );
    
    res.json({ success: true, message: '充值成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


dotenv.config();

const url = 'https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=5min&apikey=DK81UQ20HPA8A0WU';


app.get('/history/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { date }   = {"date":"2025-05-21"}           // 前端传 ?date=YYYY-MM-DD
    const { data } = await axios.get(url, {
      params: {
        function: 'TIME_SERIES_DAILY',
        symbol,
        outputsize: 'compact',  // 最近 100 天
        apikey: process.env.ALPHA_KEY
      }
    });

    const all = data['Time Series (Daily)'];
    if (!all) return res.status(404).json({ error: 'no data' });

    // 如果指定日期，就返回单条；否则返回全部
    const result = date ? { [date]: all[date] } : all;
    if (date && !result[date]) return res.status(404).json({ error: 'date not found' });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get user watchlist
apiRouter.get('/watchlist', async (req, res) => {
  // Return user's watched stocks
});

// Add stock to watchlist
apiRouter.post('/watchlist/add', async (req, res) => {
  const { symbol } = req.body;
  const userId = 1; // For now, hardcode user ID
  
  try {
    // Check if stock exists, if not add it
    let stockId;
    const [stockCheck] = await pool.query('SELECT id FROM stocks WHERE symbol = ?', [symbol]);
    
    if (stockCheck.length === 0) {
      // Add new stock with real-time data
      const stockData = await priceService.addNewStockToSystem(symbol);
      stockId = stockData.id;
    } else {
      stockId = stockCheck[0].id;
    }
    
    // Add to watchlist if not already there
    await pool.query(
      'INSERT IGNORE INTO watchlist (user_id, stock_id) VALUES (?, ?)',
      [userId, stockId]
    );
    
    res.json({ success: true, message: `${symbol} added to watchlist` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove stock from watchlist
apiRouter.delete('/watchlist/remove/:id', async (req, res) => {
  // Remove stock from watchlist
});

// Search for stocks to add
apiRouter.get('/stocks/search', async (req, res) => {
  const { query } = req.query;
  
  try {
    const results = await priceService.searchSymbol(query);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get historical data for a stock
apiRouter.get('/stocks/:symbol/history', async (req, res) => {
  // Return historical data for charting
});

// Verify database has updated prices
apiRouter.get('/prices/verify', async (req, res) => {
  try {
    console.log('Verifying price data in database');
    const [stocks] = await pool.query(`
      SELECT symbol, current_price, change_percent, last_updated 
      FROM stocks 
      ORDER BY last_updated DESC
    `);
    
    res.json({
      database: 'testdb_t4',
      stocks_count: stocks.length,
      latest_stocks: stocks.slice(0, 5),
      server_time: new Date()
    });
  } catch (error) {
    console.error('Database verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// *** PRICES UPDATE ENDPOINT ***
apiRouter.post('/prices/update', async (req, res) => {
  try {
    console.log('🔄 Manual price update requested');
    
    // Make sure priceService is properly imported at the top of your file
    // const priceService = require('./services/priceService');
    
    const result = await priceService.updateAllStockPrices();
    console.log('Update result:', result);
    res.json(result);
  } catch (error) {
    console.error('❌ Price update error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'Server failed to process price update request'
    });
  }
});

// Add this endpoint to check API status
apiRouter.get('/prices/status', (req, res) => {
  try {
    const status = priceService.getStatus();
    status.server_time = new Date();
    res.json(status);
  } catch (error) {
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