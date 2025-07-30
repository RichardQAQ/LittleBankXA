const express = require('express');
const pool = require('./db');
const app = express();
const PORT = process.env.PORT || 3003;
const path = require('path');
const { getStockData, updateStockPrice, getBondData } = require('./alphaVantageService');
const priceService = require('./services/priceService'); // 价格服务模块
const portfolioService = require('./services/portfolioService'); // 投资组合服务模块

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
    
    // 直接使用用户表中的数据
    const totalValue = parseFloat(user.total_assets) || 50000.00;
    const totalReturn = parseFloat(user.total_return_rate) || 0.00;
    const stockValue = parseFloat(user.stock_value) || 0.00;
    const bondValue = parseFloat(user.bond_value) || 0.00;
    const cashBalance = parseFloat(user.cash_balance) || 50000.00;
    
    console.log('返回投资组合概览:', {
      totalValue, totalReturn, stockValue, bondValue, cashBalance
    });
    
    res.json({
      totalValue: totalValue,
      totalReturn: totalReturn,
      stockValue: stockValue,
      bondValue: bondValue,
      cashBalance: cashBalance
    });
  } catch (error) {
    console.error('获取投资组合概览错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取投资组合
apiRouter.get('/portfolio', async (req, res) => {
  try {
    console.log('调用 /api/portfolio');
    const userId = 1;
    const [userInfo] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    
    // 检查portfolio表是否有数据
    const [portfolioCount] = await pool.query('SELECT COUNT(*) as count FROM portfolio WHERE user_id = ? AND status = 1', [userId]);
    
    if (portfolioCount[0].count === 0) {
      // 如果没有资产数据，创建一些示例数据
      console.log('没有资产数据，创建示例数据');
      
      // 获取一些股票和债券
      const [stocks] = await pool.query('SELECT * FROM stocks LIMIT 3');
      const [bonds] = await pool.query('SELECT * FROM bonds LIMIT 2');
      
      if (stocks.length > 0) {
        // 添加示例股票资产
        for (const stock of stocks) {
          await pool.query(
            'INSERT INTO portfolio (user_id, asset_type, asset_id, name, quantity, purchase_price, purchase_date, status) VALUES (?, ?, ?, ?, ?, ?, CURDATE(), 1)',
            [userId, 'stock', stock.id, stock.name, 10, stock.current_price * 0.95]
          );
        }
      }
      
      if (bonds.length > 0) {
        // 添加示例债券资产
        for (const bond of bonds) {
          await pool.query(
            'INSERT INTO portfolio (user_id, asset_type, asset_id, name, quantity, purchase_price, purchase_date, status) VALUES (?, ?, ?, ?, ?, ?, CURDATE(), 1)',
            [userId, 'bond', bond.id, bond.name, 5, bond.current_price * 0.98]
          );
        }
      }
      
      // 添加示例现金资产
      await pool.query(
        'INSERT INTO portfolio (user_id, asset_type, asset_id, name, quantity, purchase_price, purchase_date, status) VALUES (?, ?, ?, ?, ?, ?, CURDATE(), 1)',
        [userId, 'cash', 0, '现金', 10000, 1]
      );
    }
    
    // 获取资产数据
    const [portfolioItems] = await pool.query(
      `SELECT * FROM (
        (SELECT p.id, p.asset_type, p.asset_id, p.quantity, p.purchase_price, p.purchase_date, 
                s.name, s.symbol, s.current_price, 'stock' as type
         FROM portfolio p
         JOIN stocks s ON p.asset_type = 'stock' AND p.asset_id = s.id
         WHERE p.user_id = ? AND p.status = 1
         )
        UNION ALL
        (SELECT p.id, p.asset_type, p.asset_id, p.quantity, p.purchase_price, p.purchase_date, 
                b.name, b.symbol, b.current_price, 'bond' as type
         FROM portfolio p
         JOIN bonds b ON p.asset_type = 'bond' AND p.asset_id = b.id
         WHERE p.user_id = ? AND p.status = 1
         )
        UNION ALL
        (SELECT p.id, p.asset_type, p.asset_id, p.quantity, p.purchase_price, p.purchase_date, 
                '现金' as name, 'CASH' as symbol, 1 as current_price, 'cash' as type
         FROM portfolio p
         WHERE p.asset_type = 'cash' AND p.user_id = ? AND p.status = 1
         )
        ) AS combined_results
        ORDER BY purchase_date DESC`, [userId, userId, userId]
    );
    
    console.log('投资组合查询结果:', portfolioItems.length);
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
    // FIX: First, trigger a background update for all stocks in the watchlist.
    // We don't need to wait for it to complete here, but this ensures data freshness over time.
    // For an immediate refresh, we await the result.
    console.log('Updating all stock prices before fetching list...');
    await priceService.updateAllStockPrices();
    console.log('Price update complete. Fetching list from database.');

    const [stocks] = await pool.query('SELECT * FROM stocks ORDER BY symbol');
    
    const formattedStocks = stocks.map(stock => {
      // The change_percent will now come from the database, so no need to randomize it.
      const changePercent = parseFloat(stock.change_percent) || 0;
      
      return {
        id: stock.id,
        symbol: stock.symbol,
        name: stock.name || stock.symbol,
        current_price: parseFloat(stock.current_price),
        price: parseFloat(stock.current_price), // FIX: Add 'price' for consistency with other endpoints.
        change_percent: changePercent,
        volume: stock.volume || Math.floor(Math.random() * 1000000) + 100000,
        market_cap: stock.market_cap || parseFloat(stock.current_price) * Math.floor(Math.random() * 1000000000),
        updated_at: stock.updated_at || new Date() // FIX: Corrected 'last_updated' to 'updated_at'.
      };
    });
    
    res.json(formattedStocks);
  } catch (error) {
    console.error('获取股票列表失败:', error);
    res.status(500).json({ error: '获取股票列表失败' });
  }
});

// NEW: API route for stock symbol search (autocomplete)
apiRouter.get('/stocks/search', async (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }
  try {
    const results = await priceService.searchSymbol(query);
    res.json(results);
  } catch (error) {
    console.error('Stock search failed:', error);
    res.status(500).json({ error: 'Failed to search for stocks' });
  }
});

// NEW: API route to get historical price for a stock on a specific date
apiRouter.get('/stocks/:symbol/price-on-date', async (req, res) => {
  const { symbol } = req.params;
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'Date parameter is required' });
  }

  try {
    const price = await priceService.fetchPriceForDate(symbol, date);
    if (price !== null) {
      res.json({ price });
    } else {
      res.status(404).json({ error: 'Price not found for the selected date.' });
    }
  } catch (error) {
    console.error('Failed to fetch historical price:', error);
    res.status(500).json({ error: 'Failed to fetch historical price.' });
  }
});

// 获取单个股票数据
apiRouter.get('/stocks/single/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // 首先尝试从数据库获取股票数据
    const [stocks] = await pool.query('SELECT * FROM stocks WHERE symbol = ?', [symbol]);
    
    if (stocks.length === 0) {
      // 如果数据库中没有该股票，尝试从Yahoo Finance API获取
      console.log(`数据库中没有找到股票 ${symbol}，尝试从Yahoo Finance API获取`);
      try {
        const stockDataList = await priceService.fetchRealTimePrice([symbol]);
        if (stockDataList && stockDataList.length > 0) {
          const stockData = stockDataList[0];
          // 将获取到的数据保存到数据库
          await priceService.updateStocksInDatabase([stockData]);
          
          // 返回API获取的数据
          return res.json({
            id: 0, // 临时ID
            symbol: stockData.symbol,
            name: stockData.name || stockData.symbol,
            current_price: parseFloat(stockData.current_price),
            price: parseFloat(stockData.current_price),
            change_percent: parseFloat(stockData.change_percent || 0),
            volume: Math.floor(Math.random() * 1000000) + 100000, // API可能没有提供成交量
            market_cap: parseFloat(stockData.current_price) * Math.floor(Math.random() * 1000000000), // API可能没有提供市值
            updated_at: stockData.last_updated || new Date()
          });
        }
      } catch (apiError) {
        console.error(`从Yahoo Finance API获取股票 ${symbol} 数据失败:`, apiError);
      }
      
      return res.status(404).json({ error: '股票不存在' });
    }
    
    const stock = stocks[0];
    
    // 尝试从Yahoo Finance API获取最新数据
    try {
      const stockDataList = await priceService.fetchRealTimePrice([symbol]);
      if (stockDataList && stockDataList.length > 0) {
        const stockData = stockDataList[0];
        // 更新数据库中的股票数据
        await priceService.updateStocksInDatabase([stockData]);
        
        console.log(`从Yahoo Finance API获取到股票 ${symbol} 的最新数据`);
        
        // 返回API获取的最新数据
        return res.json({
          id: stock.id,
          symbol: stockData.symbol,
          name: stockData.name || stock.name || stockData.symbol,
          current_price: parseFloat(stockData.current_price),
          price: parseFloat(stockData.current_price),
          change_percent: parseFloat(stockData.change_percent || 0),
          volume: stock.volume || Math.floor(Math.random() * 1000000) + 100000,
          market_cap: stock.market_cap || parseFloat(stockData.current_price) * Math.floor(Math.random() * 1000000000),
          updated_at: new Date()
        });
      }
    } catch (apiError) {
      console.error(`从Yahoo Finance API获取股票 ${symbol} 数据失败:`, apiError);
      // 如果API获取失败，使用数据库中的数据
    }
    
    // 如果API获取失败或没有返回数据，使用数据库中的数据
    console.log(`使用数据库中的股票 ${symbol} 数据`);
    
    // FIX: Use the change_percent from the database instead of generating a random one.
    const changePercent = parseFloat(stock.change_percent) || 0;
    
    const volume = stock.volume || Math.floor(Math.random() * 1000000) + 100000;
    const marketCap = stock.market_cap || parseFloat(stock.current_price) * Math.floor(Math.random() * 1000000000);
    
    res.json({
      id: stock.id,
      symbol: stock.symbol,
      name: stock.name || stock.symbol,
      current_price: parseFloat(stock.current_price),
      price: parseFloat(stock.current_price),
      change_percent: parseFloat(changePercent),
      volume: volume,
      market_cap: marketCap,
      updated_at: stock.last_updated || new Date()
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
    const userId = 1;
    
    const result = await portfolioService.buyStock(userId, symbol, name, price, quantity);
    res.json(result);
  } catch (error) {
    console.error('购买股票失败:', error);
    res.status(500).json({ error: '购买失败: ' + error.message });
  }
});

// NEW: API route to update all stock prices
apiRouter.post('/stocks/update-all', async (req, res) => {
  try {
    console.log('Received request to update all stock prices.');
    const result = await priceService.updateAllStockPrices();
    if (result.success) {
      res.json({ success: true, message: `成功更新 ${result.updated} 支股票的价格。`, details: result });
    } else {
      throw new Error(result.error || 'Batch update failed.');
    }
  } catch (error) {
    console.error('批量更新股票价格失败:', error);
    res.status(500).json({ error: '批量更新失败: ' + error.message });
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
    const { symbol, name, price, quantity, faceValue, couponRate, maturityDate } = req.body;
    const userId = 1;
    
    const result = await portfolioService.buyBond(userId, symbol, name, price, quantity, faceValue, couponRate, maturityDate);
    res.json(result);
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
    
    const result = await portfolioService.sellAsset(userId, assetId, quantity);
    res.json(result);
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
    
    const result = await portfolioService.rechargeCash(userId, amount);
    res.json(result);
  } catch (error) {
    console.error('充值失败:', error);
    res.status(500).json({ error: '充值失败: ' + error.message });
  }
});

// 获取最近资产
apiRouter.get('/portfolio/recent', async (req, res) => {
  try {
    const userId = 1;
    
    // 检查portfolio表是否有数据
    const [portfolioCount] = await pool.query('SELECT COUNT(*) as count FROM portfolio WHERE user_id = ? AND status = 1', [userId]);
    
    if (portfolioCount[0].count === 0) {
      // 如果没有资产数据，创建一些示例数据
      console.log('没有资产数据，创建示例数据');
      
      // 获取一些股票和债券
      const [stocks] = await pool.query('SELECT * FROM stocks LIMIT 2');
      const [bonds] = await pool.query('SELECT * FROM bonds LIMIT 2');
      
      if (stocks.length > 0) {
        // 添加示例股票资产
        for (const stock of stocks) {
          await pool.query(
            'INSERT INTO portfolio (user_id, asset_type, asset_id, name, quantity, purchase_price, purchase_date, status) VALUES (?, ?, ?, ?, ?, ?, CURDATE(), 1)',
            [userId, 'stock', stock.id, stock.name, 10, stock.current_price * 0.95]
          );
        }
      }
      
      if (bonds.length > 0) {
        // 添加示例债券资产
        for (const bond of bonds) {
          await pool.query(
            'INSERT INTO portfolio (user_id, asset_type, asset_id, name, quantity, purchase_price, purchase_date, status) VALUES (?, ?, ?, ?, ?, ?, CURDATE(), 1)',
            [userId, 'bond', bond.id, bond.name, 5, bond.current_price * 0.98]
          );
        }
      }
      
      // 添加示例现金资产
      await pool.query(
        'INSERT INTO portfolio (user_id, asset_type, asset_id, name, quantity, purchase_price, purchase_date, status) VALUES (?, ?, ?, ?, ?, ?, CURDATE(), 1)',
        [userId, 'cash', 0, '现金', 10000, 1]
      );
    }
    
    // 获取资产数据
    const [portfolioItems] = await pool.query(
      `SELECT * FROM (
        (SELECT p.id, p.asset_type, p.asset_id, p.quantity, p.purchase_price, p.purchase_date, 
                s.name, s.symbol, s.current_price, 'stock' as type
         FROM portfolio p
         JOIN stocks s ON p.asset_type = 'stock' AND p.asset_id = s.id
         WHERE p.user_id = ? AND p.status = 1
         )
        UNION ALL
        (SELECT p.id, p.asset_type, p.asset_id, p.quantity, p.purchase_price, p.purchase_date, 
                b.name, b.symbol, b.current_price, 'bond' as type
         FROM portfolio p
         JOIN bonds b ON p.asset_type = 'bond' AND p.asset_id = b.id
         WHERE p.user_id = ? AND p.status = 1
         )
        UNION ALL
        (SELECT p.id, p.asset_type, p.asset_id, p.quantity, p.purchase_price, p.purchase_date, 
                '现金' as name, 'CASH' as symbol, 1 as current_price, 'cash' as type
         FROM portfolio p
         WHERE p.asset_type = 'cash' AND p.user_id = ? AND p.status = 1
         )
        ) AS combined_results
        ORDER BY purchase_date DESC
        LIMIT 5`, [userId, userId, userId]
    );
    
    console.log('返回最近资产:', portfolioItems.length);
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
    // 获取用户当前资产总值
    const [users] = await pool.query('SELECT total_assets FROM users WHERE id = 1');
    const currentValue = users.length > 0 ? parseFloat(users[0].total_assets) : 50000;
    
    // 生成模拟的历史表现数据
    const dates = [];
    const values = [];
    const baseValue = 50000;
    const trend = (currentValue - baseValue) / 30; // 平均每天的变化趋势
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toLocaleDateString('zh-CN'));
      
      // 模拟价值变化，基于当前资产和趋势
      const dayTrend = trend * (30 - i);
      const randomChange = (Math.random() - 0.5) * 1000;
      const value = baseValue + dayTrend + randomChange;
      values.push(Math.max(value, 30000));
    }
    
    // 确保最后一天的值与当前资产总值匹配
    if (values.length > 0) {
      values[values.length - 1] = currentValue;
    }
    
    console.log('返回投资组合表现数据');
    res.json({
      dates: dates,
      values: values
    });
  } catch (error) {
    console.error('获取表现数据错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 这个重复的端点已被删除

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
    const { assetType, symbol, quantity, purchasePrice, purchaseDate, faceValue, couponRate, maturityDate } = req.body;
    let { name } = req.body; // Make name mutable
    
    // 假设只有一个用户，ID为1
    const userId = 1;
    let assetId;
    
    // If the name is not provided, fetch it using the price service.
    if (!name && symbol) {
        console.log(`Name not provided for ${symbol}, fetching from API...`);
        const stockDataList = await priceService.fetchRealTimePrice([symbol]);
        if (stockDataList && stockDataList.length > 0 && stockDataList[0].name) {
            name = stockDataList[0].name;
            console.log(`Fetched name: ${name}`);
        } else {
            // Fallback if API fails or doesn't return a name
            name = symbol; 
            console.log(`Could not fetch name, using symbol as fallback: ${name}`);
        }
    }
    
    if (assetType === 'stock') {      // 检查股票是否已存在
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
    // FIX: Removed the 'name' column from the INSERT statement as it does not exist in the portfolio table.
    await pool.query(
      'INSERT INTO portfolio (user_id, asset_type, asset_id, quantity, purchase_price, purchase_date, status) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [userId, assetType, assetId, quantity, purchasePrice, purchaseDate]
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
    
    // 获取资产信息，用于日志记录
    const [assets] = await pool.query('SELECT * FROM portfolio WHERE id = ?', [id]);
    if (assets.length === 0) {
      return res.status(404).json({ error: '资产不存在' });
    }
    
    const asset = assets[0];
    console.log(`删除资产: ID=${id}, 类型=${asset.asset_type}, 数量=${asset.quantity}`);
    
    // 执行删除操作
    await pool.query('DELETE FROM portfolio WHERE id = ?', [id]);
    
    // 更新用户资产总值
    await updateUserAssetValues(1);
    
    res.json({ success: true, message: '资产删除成功' });
  } catch (error) {
    console.error('删除资产失败:', error);
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
          LIMIT 50
      `);
      console.log('获取历史数据:', rows.length);
      
      // 如果没有历史数据，则返回股票表中的数据
      if (rows.length === 0) {
          const [stocks] = await pool.query('SELECT * FROM stocks ORDER BY symbol');
          const formattedStocks = stocks.map(stock => {
              const basePrice = parseFloat(stock.current_price);
              const today = new Date();
              const tradeDate = today.toISOString().split('T')[0];
              
              return {
                  id: stock.id,
                  symbol: stock.symbol,
                  trade_date: tradeDate,
                  open_price: (basePrice * 0.99).toFixed(2),
                  high_price: (basePrice * 1.02).toFixed(2),
                  low_price: (basePrice * 0.98).toFixed(2),
                  close_price: basePrice.toFixed(2),
                  volume: Math.floor(Math.random() * 10000000) + 1000000,
                  stock_id: stock.id
              };
          });
          console.log('返回模拟历史数据:', formattedStocks.length);
          return res.json(formattedStocks);
      }
      
      res.json(rows);
  } catch (err) {
      console.error('获取历史数据错误:', err);
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
    // 尝试从Yahoo Finance API获取历史数据
    try {
      console.log(`尝试从Yahoo Finance API获取 ${symbol} 的历史数据`);
      const historyData = await priceService.fetchHistoricalData(symbol);
      
      if (historyData && historyData.labels && historyData.labels.length > 0) {
        console.log(`成功从Yahoo Finance API获取到 ${symbol} 的历史数据`);
        return res.json(historyData);
      } else {
        console.log(`Yahoo Finance API没有返回 ${symbol} 的有效历史数据`);
      }
    } catch (apiError) {
      console.error(`从Yahoo Finance API获取 ${symbol} 的历史数据失败:`, apiError);
    }
    
    // 如果API获取失败，尝试从数据库获取历史数据
    const [historyData] = await pool.query(`
      SELECT trade_date, open_price, high_price, low_price, close_price, volume
      FROM stock_history
      WHERE symbol = ?
      ORDER BY trade_date ASC
      LIMIT 30
    `, [symbol]);
    
    if (historyData.length === 0) {
      console.log(`没有找到 ${symbol} 的历史数据，生成模拟数据`);
      
      // 如果没有历史数据，生成模拟数据
      const [stockInfo] = await pool.query('SELECT current_price FROM stocks WHERE symbol = ?', [symbol]);
      
      if (stockInfo.length === 0) {
        return res.status(404).json({ error: '未找到该股票' });
      }
      
      const basePrice = parseFloat(stockInfo[0].current_price);
      const labels = [];
      const values = [];
      
      // 生成过去30天的模拟数据
      for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('zh-CN'));
        
        // 生成当天价格（在基础价格上下10%波动）
        const dailyChange = (Math.random() - 0.5) * 0.1;
        const price = basePrice * (1 + dailyChange * i / 30);
        values.push(price.toFixed(2));
      }
      
      return res.json({
        labels: labels,
        values: values,
        symbol: symbol
      });
    }
    
    // 格式化数据库中的历史数据
    const labels = historyData.map(item => {
      const date = new Date(item.trade_date);
      return date.toLocaleDateString('zh-CN');
    });
    
    const values = historyData.map(item => parseFloat(item.close_price));
    
    res.json({
      labels: labels,
      values: values,
      symbol: symbol
    });
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
