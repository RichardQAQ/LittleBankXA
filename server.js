const express = require('express');
const pool = require('./db');
const app = express();
const PORT = process.env.PORT || 3002;
const path = require('path');
const priceService = require('./services/priceService');
const cron = require('node-cron');

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
    const userId = 1;
    
    // Get current portfolio value using real prices
    const [portfolioItems] = await pool.query(
      `SELECT p.*, s.current_price as stock_price, b.current_price as bond_price,
              s.symbol as stock_symbol, b.symbol as bond_symbol
       FROM portfolio p
       LEFT JOIN stocks s ON p.asset_type = 'stock' AND p.asset_id = s.id
       LEFT JOIN bonds b ON p.asset_type = 'bond' AND p.asset_id = b.id
       WHERE p.user_id = ?`,
      [userId]
    );

    // Calculate current portfolio value
    let currentValue = 0;
    portfolioItems.forEach(item => {
      if (item.asset_type === 'cash') {
        currentValue += item.quantity; // Cash at face value
      } else {
        const currentPrice = item.asset_type === 'stock' ? item.stock_price : item.bond_price;
        if (currentPrice) {
          currentValue += currentPrice * item.quantity;
        }
      }
    });

    // Generate realistic historical data
    const dates = [];
    const values = [];
    const today = new Date();
    
    // Start with a base value 30 days ago (assume 3% monthly growth)
    const baseValue = currentValue * 0.97;
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
      
      if (i === 30) {
        values.push(baseValue);
      } else if (i === 0) {
        values.push(currentValue);
      } else {
        const progress = (30 - i) / 30;
        const interpolatedValue = baseValue + (currentValue - baseValue) * progress;
        const variation = interpolatedValue * (Math.random() * 0.04 - 0.02);
        values.push(Math.max(0, interpolatedValue + variation));
      }
    }

    res.json({
      dates: dates,
      values: values,
      currentValue: currentValue,
      baseValue: baseValue,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Portfolio performance calculation error:', error);
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

// Manual price update endpoint
apiRouter.post('/prices/update', async (req, res) => {
  try {
    console.log('Manual price update requested');
    const result = await priceService.updateAllStockPrices();
    res.json(result);
  } catch (error) {
    console.error('Manual price update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get price service status
apiRouter.get('/prices/status', (req, res) => {
  try {
    const status = priceService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Price status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test external API connectivity
apiRouter.get('/prices/test', async (req, res) => {
  try {
    const testResult = await priceService.fetchSinglePrice('AAPL');
    res.json({
      success: testResult !== null,
      data: testResult,
      message: testResult ? 'API connectivity successful' : 'API connectivity failed'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Replace the existing debug endpoints with Alpha Vantage testing
apiRouter.get('/debug/api-status', async (req, res) => {
  try {
    // Test Alpha Vantage connection
    const testResult = await priceService.fetchSinglePrice('AAPL');
    
    // Test database connection
    const [dbTest] = await pool.query('SELECT COUNT(*) as count FROM stocks');
    
    res.json({
      alphavantage: {
        connected: testResult !== null,
        data: testResult,
        timestamp: new Date(),
        source: testResult?.source || 'failed'
      },
      database: {
        connected: true,
        stocks_count: dbTest[0].count
      },
      server_status: 'running',
      api_source: 'Alpha Vantage'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      alphavantage: { connected: false },
      database: { connected: false }
    });
  }
});

apiRouter.get('/debug/fetch-test', async (req, res) => {
  try {
    const ticker = req.query.ticker || 'AAPL';
    
    console.log(`Testing Alpha Vantage fetch for ${ticker}...`);
    const result = await priceService.fetchSinglePrice(ticker);
    
    res.json({
      success: result !== null,
      ticker: ticker,
      data: result,
      message: result ? 'Alpha Vantage fetch successful' : 'Alpha Vantage fetch failed',
      api_source: 'Alpha Vantage'
    });
  } catch (error) {
    console.error('Debug fetch test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add symbol search endpoint
apiRouter.get('/debug/search/:keywords', async (req, res) => {
  try {
    const keywords = req.params.keywords;
    const results = await priceService.searchSymbol(keywords);
    
    res.json({
      success: true,
      keywords: keywords,
      results: results,
      count: results.length
    });
  } catch (error) {
    console.error('Symbol search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add these after the existing debug endpoints

// Initialize testdb_t4 database with real Alpha Vantage data
apiRouter.post('/debug/init-real-data', async (req, res) => {
  try {
    console.log('testdb_t4 initialization with real data requested');
    const result = await priceService.initializeDatabaseWithRealData();
    res.json(result);
  } catch (error) {
    console.error('testdb_t4 initialization error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check if testdb_t4 database needs initialization
apiRouter.get('/debug/database-status', async (req, res) => {
  try {
    const [stockCount] = await pool.query('SELECT COUNT(*) as count FROM stocks');
    const [portfolioCount] = await pool.query('SELECT COUNT(*) as count FROM portfolio WHERE user_id = 1');
    
    const needsInitialization = stockCount[0].count === 0 || portfolioCount[0].count === 0;
    
    res.json({
      database: 'testdb_t4',
      stocks_count: stockCount[0].count,
      portfolio_items: portfolioCount[0].count,
      needs_initialization: needsInitialization,
      database_status: needsInitialization ? 'Empty - Ready for real data' : 'Contains data'
    });
  } catch (error) {
    console.error('testdb_t4 status check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 挂载API路由
app.use('/api', apiRouter);

// ONLY serve index.html for non-API routes (FIXED)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve other HTML files specifically
app.get('/portfolio', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'portfolio.html'));
});

app.get('/add_asset', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'add_asset.html'));
});

// Handle 404 for unknown routes (but not API routes)
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('数据库连接成功');
});

// Add scheduled price updates
cron.schedule('*/15 * * * *', async () => {
  const status = priceService.getStatus();
  if (status.isMarketOpen) {
    console.log('Scheduled price update starting...');
    await priceService.updateAllStockPrices();
  } else {
    console.log('Market closed, skipping scheduled price update');
  }
});

console.log('Price update scheduler started (every 15 minutes during market hours)');