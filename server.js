// =================================================================
// IMPORTS
// =================================================================
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const pool = require('./db');
const priceService = require('./services/priceService'); // Using Yahoo Finance Service

// Load environment variables
dotenv.config();

// =================================================================
// APP & MIDDLEWARE SETUP
// =================================================================
const app = express();
const PORT = process.env.PORT || 3002;

// JSON and URL-encoded body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for the public directory
app.use(express.static(path.join(__dirname, 'public')));

// =================================================================
// API ROUTER DEFINITION
// =================================================================
const apiRouter = express.Router();

// --- Portfolio Routes ---

// GET /api/portfolio/overview
apiRouter.get('/portfolio/overview', async (req, res) => {
  console.log('GET /api/portfolio/overview called');
  try {
    const userId = 1; // Hardcoded user ID
    const [items] = await pool.query(
      `SELECT p.asset_type, p.quantity, p.purchase_price, s.current_price as stock_price, b.current_price as bond_price
       FROM portfolio p
       LEFT JOIN stocks s ON p.asset_type = 'stock' AND p.asset_id = s.id
       LEFT JOIN bonds b ON p.asset_type = 'bond' AND p.asset_id = b.id
       WHERE p.user_id = ?`,
      [userId]
    );

    let totalValue = 0;
    let totalCost = 0;
    items.forEach(item => {
      const currentPrice = item.asset_type === 'stock' ? item.stock_price : item.bond_price;
      if (currentPrice !== null && item.quantity !== null) {
        totalValue += currentPrice * item.quantity;
        totalCost += item.purchase_price * item.quantity;
      }
    });

    const totalReturn = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
    res.json({ totalValue, totalReturn });
  } catch (error) {
    console.error('Error in /api/portfolio/overview:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/portfolio/performance
apiRouter.get('/portfolio/performance', async (req, res) => {
  console.log('GET /api/portfolio/performance called');
  try {
    // This returns simulated data for the chart.
    const dates = [];
    const values = [];
    const today = new Date();
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
      const lastValue = values.length > 0 ? values[values.length - 1] : 10000;
      const change = lastValue * (Math.random() * 0.02 - 0.01); // -1% to +1% fluctuation
      values.push(i === 30 ? 10000 : lastValue + change);
    }
    res.json({ dates, values });
  } catch (error) {
    console.error('Error in /api/portfolio/performance:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/portfolio (full portfolio)
apiRouter.get('/portfolio', async (req, res) => {
  console.log('GET /api/portfolio called');
  try {
    const userId = 1; // Hardcoded user ID
    const [items] = await pool.query(
      `(SELECT p.*, s.name, s.symbol, s.current_price, 'stock' as type FROM portfolio p JOIN stocks s ON p.asset_id = s.id WHERE p.user_id = ? AND p.asset_type = 'stock')
       UNION ALL
       (SELECT p.*, b.name, b.symbol, b.current_price, 'bond' as type FROM portfolio p JOIN bonds b ON p.asset_id = b.id WHERE p.user_id = ? AND p.asset_type = 'bond')
       ORDER BY purchase_date DESC`,
      [userId, userId]
    );
    res.json({ assets: items });
  } catch (error) {
    console.error('Error in /api/portfolio:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/portfolio (add asset)
apiRouter.post('/portfolio', async (req, res) => {
  console.log('POST /api/portfolio called with body:', req.body);
  const { assetType, symbol, name, quantity, purchasePrice, purchaseDate, faceValue, couponRate, maturityDate } = req.body;
  const userId = 1; // Hardcoded for single-user design

  // --- START: ADDED SERVER-SIDE VALIDATION ---
  if (!assetType || !symbol || typeof symbol !== 'string' || symbol.trim() === '' || !name || typeof name !== 'string' || name.trim() === '' || !quantity || !purchasePrice || !purchaseDate) {
    return res.status(400).json({ error: 'Missing or invalid required fields. Symbol and Name cannot be empty.' });
  }
  // --- END: ADDED SERVER-SIDE VALIDATION ---

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let assetId;
    // Handle stock asset
    if (assetType === 'stock') {
      // Check if stock exists, otherwise insert it
      let [rows] = await connection.query('SELECT id FROM stocks WHERE symbol = ?', [symbol]);
      if (rows.length > 0) {
        assetId = rows[0].id;
      } else {
        const [result] = await connection.query(
          'INSERT INTO stocks (symbol, name, current_price, change_percent) VALUES (?, ?, ?, ?)',
          [symbol, name, purchasePrice, 0] // Use purchase price as initial current_price
        );
        assetId = result.insertId;
      }
    } 
    // Handle bond asset
    else if (assetType === 'bond') {
      // Bond-specific validation
      if (!faceValue || !couponRate || !maturityDate) {
        return res.status(400).json({ error: 'Missing required fields for bond.' });
      }
      let [rows] = await connection.query('SELECT id FROM bonds WHERE symbol = ?', [symbol]);
      if (rows.length > 0) {
        assetId = rows[0].id;
      } else {
        const [result] = await connection.query(
          'INSERT INTO bonds (symbol, name, face_value, coupon_rate, maturity_date, current_price) VALUES (?, ?, ?, ?, ?, ?)',
          [symbol, name, faceValue, couponRate, maturityDate, purchasePrice]
        );
        assetId = result.insertId;
      }
    } else {
      throw new Error('Invalid asset type');
    }

    // Insert into portfolio
    await connection.query(
      'INSERT INTO portfolio (user_id, asset_type, asset_id, quantity, purchase_price, purchase_date) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, assetType, assetId, quantity, purchasePrice, purchaseDate]
    );

    await connection.commit();
    res.status(201).json({ success: true, message: 'Asset added successfully.' });

  } catch (error) {
    await connection.rollback();
    console.error('Error adding asset to portfolio:', error);
    res.status(500).json({ error: 'Failed to add asset. ' + error.message });
  } finally {
    connection.release();
  }
});

// DELETE /api/portfolio/:id
apiRouter.delete('/portfolio/:id', async (req, res) => {
  console.log(`DELETE /api/portfolio/${req.params.id} called`);
  try {
    await pool.query('DELETE FROM portfolio WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Asset deleted successfully' });
  } catch (error) {
    console.error(`Error deleting portfolio item ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// --- Stocks & Bonds Routes ---

// GET /api/stocks/:symbol/history
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

// GET /api/stocks/search
apiRouter.get('/stocks/search', async (req, res) => {
  const { query } = req.query;
  console.log(`GET /api/stocks/search?query=${query} called`);
  try {
    const results = await priceService.searchSymbol(query);
    res.json(results);
  } catch (error) {
    console.error(`Error searching for stock "${query}":`, error);
    res.status(500).json({ error: error.message });
  }
});


// --- Price Service & Debug Routes ---

// POST /api/prices/update
apiRouter.post('/prices/update', async (req, res) => {
  console.log('POST /api/prices/update called');
  try {
    const result = await priceService.updateAllStockPrices();
    console.log('Price update result:', result);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/prices/update:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/prices/status
apiRouter.get('/prices/status', (req, res) => {
  console.log('GET /api/prices/status called');
  try {
    const status = priceService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error in /api/prices/status:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/test
apiRouter.get('/test', (req, res) => {
  console.log('GET /api/test called');
  res.json({ message: 'API is working', timestamp: new Date() });
});


// =================================================================
// ROUTER MOUNTING
// =================================================================
app.use('/api', apiRouter);

// =================================================================
// FRONTEND FALLBACK
// =================================================================
// This should be the LAST route. It sends the main HTML file for any
// request that doesn't match an API route.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =================================================================
// SERVER LISTENER
// =================================================================
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});