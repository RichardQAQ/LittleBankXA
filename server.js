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

// 获取投资组合概览
apiRouter.get('/portfolio/overview', async (req, res) => {
  try {
    console.log('调用 /api/portfolio/overview');

    
    // 获取所有资产
    console.log('执行SQL查询获取资产');
    const [portfolioItems] = await pool.query(
      `SELECT p.*, s.current_price as stock_price, b.current_price as bond_price
       FROM portfolio p
       LEFT JOIN stocks s ON p.asset_type = 'stock' AND p.asset_id = s.id
       LEFT JOIN bonds b ON p.asset_type = 'bond' AND p.asset_id = b.id
       `
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

// 获取股票实时数据
apiRouter.get('/stocks/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const stockData = await getStockData(symbol);
    res.json(stockData);
  } catch (error) {
    console.error('获取股票数据失败:', error);
    res.status(500).json({ error: '获取股票数据失败' });
  }
});

// 获取债券实时数据
apiRouter.get('/bonds/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const bondData = await getBondData(symbol);
    res.json(bondData);
  } catch (error) {
    console.error('获取债券数据失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新债券价格
apiRouter.post('/bonds/:symbol/update', async (req, res) => {
  try {
    const { symbol } = req.params;
    const bondData = await getBondData(symbol);
    const newPrice = bondData.currentPrice;
    const now = new Date();
    
    // 检查债券是否存在
    const [bondExists] = await pool.query('SELECT id FROM bonds WHERE symbol = ?', [symbol]);
    if (bondExists.length > 0) {
      // 更新现有债券价格
      await pool.query(
        'UPDATE bonds SET current_price = ?, last_updated = ? WHERE symbol = ?',
        [newPrice, now, symbol]
      );
    } else {
      // 创建新债券
      await pool.query(
        'INSERT INTO bonds (symbol, name, face_value, coupon_rate, maturity_date, current_price, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [symbol, bondData.name, bondData.faceValue, bondData.couponRate, bondData.maturityDate, newPrice, now]
      );
    }
    
    res.json({ success: true, message: `债券 ${symbol} 价格已更新为 ¥${newPrice}` });
  } catch (error) {
    console.error('更新债券价格失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新股票价格
apiRouter.post('/stocks/:symbol/update', async (req, res) => {
  try {
    const { symbol } = req.params;
    await updateStockPrice(pool, symbol);
    res.json({ success: true, message: `股票 ${symbol} 价格已更新` });
  } catch (error) {
    console.error('更新股票价格失败:', error);
    res.status(500).json({ error: '更新股票价格失败' });
  }
});

// 获取最近添加的资产
apiRouter.get('/portfolio/recent', async (req, res) => {
  try {
    console.log('调用 /api/portfolio/recent');

    
    // 获取最近5个资产
    console.log('执行SQL查询获取最近资产');
    const [portfolioItems] = await pool.query(
        `(SELECT p.*, s.name, s.symbol, s.current_price, 'stock' as type
       FROM portfolio p
         JOIN stocks s ON p.asset_type = 'stock' AND p.asset_id = s.id
         )
         UNION ALL
         (SELECT p.*, b.name, b.symbol, b.current_price, 'bond' as type
         FROM portfolio p
         JOIN bonds b ON p.asset_type = 'bond' AND p.asset_id = b.id
         )
         ORDER BY purchase_date DESC
         LIMIT 5`
        , []
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