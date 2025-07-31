/**
 * Portfolio Service - Handles asset buying, selling and management
 */

const pool = require('../db');
const priceService = require('./priceService'); // Import the price service

/**
 * Update user asset values
 * @param {number} userId - User ID
 */
async function updateUserAssetValues(userId) {
  try {
    // Get user's stock assets
    const [stockAssets] = await pool.query(`
      SELECT p.*, s.current_price 
      FROM portfolio p
      JOIN stocks s ON p.asset_id = s.id
      WHERE p.user_id = ? AND p.asset_type = 'stock' AND p.status = 1
    `, [userId]);
    
    // Get user's bond assets
    const [bondAssets] = await pool.query(`
      SELECT p.*, b.current_price 
      FROM portfolio p
      JOIN bonds b ON p.asset_id = b.id
      WHERE p.user_id = ? AND p.asset_type = 'bond' AND p.status = 1
    `, [userId]);
    
    // Calculate stock value
    let stockValue = 0;
    for (const asset of stockAssets) {
      stockValue += parseFloat(asset.quantity) * parseFloat(asset.current_price);
    }
    
    // Calculate bond value
    let bondValue = 0;
    for (const asset of bondAssets) {
      bondValue += parseFloat(asset.quantity) * parseFloat(asset.current_price);
    }
    
    // Get user's cash balance
    const [users] = await pool.query('SELECT cash_balance FROM users WHERE id = ?', [userId]);
    const cashBalance = parseFloat(users[0].cash_balance);
    
    // Calculate total assets
    const totalAssets = stockValue + bondValue + cashBalance;
    
    // Calculate total return rate (assuming initial investment of 50000)
    const initialInvestment = 50000;
    const totalReturnRate = ((totalAssets - initialInvestment) / initialInvestment) * 100;
    
    // Update user asset information
    await pool.query(`
      UPDATE users 
      SET stock_value = ?, 
          bond_value = ?, 
          total_assets = ?,
          total_return_rate = ?
      WHERE id = ?
    `, [stockValue, bondValue, totalAssets, totalReturnRate, userId]);
    
    return {
      stockValue,
      bondValue,
      cashBalance,
      totalAssets,
      totalReturnRate
    };
  } catch (error) {
    console.error('Failed to update user asset values:', error);
    throw error;
  }
}

/**
 * Buy stock
 * @param {number} userId - User ID
 * @param {string} symbol - Stock symbol
 * @param {string} name - Stock name
 * @param {number} price - Purchase price
 * @param {number} quantity - Purchase quantity
 * @returns {Object} Purchase result
 */
async function buyStock(userId, symbol, name, price, quantity) {
  try {
    if (!symbol || !price || !quantity || quantity <= 0) {
      throw new Error('Incomplete or invalid parameters');
    }
    
    const totalCost = parseFloat(price) * parseFloat(quantity);
    
    // Check user's cash balance
    const [users] = await pool.query('SELECT cash_balance FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      throw new Error('User does not exist');
    }
    
    const currentCash = parseFloat(users[0].cash_balance);
    
    if (currentCash < totalCost) {
      throw new Error(`Insufficient cash balance, current balance: $${currentCash.toFixed(2)}, required: $${totalCost.toFixed(2)}`);
    }
    
    // Find or create stock record
    let [stockRecords] = await pool.query('SELECT * FROM stocks WHERE symbol = ?', [symbol]);
    let stockId;
    
    if (stockRecords.length === 0) {
      const [result] = await pool.query(
        'INSERT INTO stocks (symbol, name, current_price) VALUES (?, ?, ?)',
        [symbol, name || symbol, price]
      );
      stockId = result.insertId;
    } else {
      stockId = stockRecords[0].id;
      // Update current price
      await pool.query('UPDATE stocks SET current_price = ? WHERE id = ?', [price, stockId]);
    }
    
    // Check if there's already a holding of the same stock in portfolio table
    const [existingHoldings] = await pool.query(
      'SELECT * FROM portfolio WHERE user_id = ? AND asset_type = ? AND asset_id = ? AND status = 1',
      [userId, 'stock', stockId]
    );
    
    if (existingHoldings.length > 0) {
      // Update existing holding
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
      // Create new holding record
      await pool.query(
        'INSERT INTO portfolio (user_id, asset_type, asset_id, name, quantity, purchase_price, purchase_date, status) VALUES (?, ?, ?, ?, ?, ?, NOW(), 1)',
        [userId, 'stock', stockId, name || symbol, quantity, price]
      );
    }
    
    // Update user's cash balance
    await pool.query('UPDATE users SET cash_balance = cash_balance - ? WHERE id = ?', [totalCost, userId]);
    
    // Update user asset values
    await updateUserAssetValues(userId);
    
    return { 
      success: true, 
      message: 'Stock purchased successfully!',
      totalCost: totalCost.toFixed(2),
      symbol: symbol,
      quantity: quantity
    };
  } catch (error) {
    console.error('Failed to buy stock:', error);
    throw error;
  }
}

/**
 * Buy bond
 * @param {number} userId - User ID
 * @param {string} symbol - Bond symbol
 * @param {string} name - Bond name
 * @param {number} price - Purchase price
 * @param {number} quantity - Purchase quantity
 * @param {number} faceValue - Face value
 * @param {number} couponRate - Coupon rate
 * @param {string} maturityDate - Maturity date
 * @returns {Object} Purchase result
 */
async function buyBond(userId, symbol, name, price, quantity, faceValue = 1000, couponRate = 3.5, maturityDate = '2030-12-31') {
  try {
    if (!symbol || !price || !quantity || quantity <= 0) {
      throw new Error('Incomplete or invalid parameters');
    }
    
    const totalCost = parseFloat(price) * parseFloat(quantity);
    
    // Check user's cash balance
    const [users] = await pool.query('SELECT cash_balance FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      throw new Error('User does not exist');
    }
    
    const currentCash = parseFloat(users[0].cash_balance);
    
    if (currentCash < totalCost) {
      throw new Error(`Insufficient cash balance, current balance: $${currentCash.toFixed(2)}, required: $${totalCost.toFixed(2)}`);
    }
    
    // Find or create bond record
    let [bondRecords] = await pool.query('SELECT * FROM bonds WHERE symbol = ?', [symbol]);
    let bondId;
    
    if (bondRecords.length === 0) {
      const [result] = await pool.query(
        'INSERT INTO bonds (symbol, name, face_value, coupon_rate, maturity_date, current_price) VALUES (?, ?, ?, ?, ?, ?)',
        [symbol, name || symbol, faceValue, couponRate, maturityDate, price]
      );
      bondId = result.insertId;
    } else {
      bondId = bondRecords[0].id;
      // Update current price
      await pool.query('UPDATE bonds SET current_price = ? WHERE id = ?', [price, bondId]);
    }
    
    // Check if there's already a holding of the same bond in portfolio table
    const [existingHoldings] = await pool.query(
      'SELECT * FROM portfolio WHERE user_id = ? AND asset_type = ? AND asset_id = ? AND status = 1',
      [userId, 'bond', bondId]
    );
    
    if (existingHoldings.length > 0) {
      // Update existing holding
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
      // Create new holding record
      await pool.query(
        'INSERT INTO portfolio (user_id, asset_type, asset_id, name, quantity, purchase_price, purchase_date, status) VALUES (?, ?, ?, ?, ?, ?, NOW(), 1)',
        [userId, 'bond', bondId, name || symbol, quantity, price]
      );
    }
    
    // Update user's cash balance
    await pool.query('UPDATE users SET cash_balance = cash_balance - ? WHERE id = ?', [totalCost, userId]);
    
    // Update user asset values
    await updateUserAssetValues(userId);
    
    return { 
      success: true, 
      message: 'Bond purchased successfully!',
      totalCost: totalCost.toFixed(2),
      symbol: symbol,
      quantity: quantity
    };
  } catch (error) {
    console.error('Failed to buy bond:', error);
    throw error;
  }
}

/**
 * Sell asset
 * @param {number} userId - User ID
 * @param {number} assetId - Asset ID
 * @param {number} quantity - Sell quantity
 * @returns {Object} Sell result
 */
async function sellAsset(userId, assetId, quantity) {
  try {
    if (!assetId || !quantity || quantity <= 0) {
      throw new Error('Incomplete or invalid parameters');
    }
    
    // Step 1: Get asset details from the database
    const [assets] = await pool.query(
      `SELECT p.*, 
              s.current_price as stock_price, s.symbol as stock_symbol, 
              b.current_price as bond_price, b.symbol as bond_symbol, b.face_value
       FROM portfolio p
       LEFT JOIN stocks s ON p.asset_type = 'stock' AND p.asset_id = s.id
       LEFT JOIN bonds b ON p.asset_type = 'bond' AND p.asset_id = b.id
       WHERE p.id = ? AND p.user_id = ? AND p.status = 1`,
      [assetId, userId]
    );
    
    if (assets.length === 0) {
      throw new Error('Asset does not exist or has already been sold');
    }
    
    const asset = assets[0];
    const currentQuantity = parseFloat(asset.quantity);
    const sellQuantity = parseFloat(quantity);
    
    if (sellQuantity > currentQuantity) {
      throw new Error('Sell quantity exceeds held quantity');
    }
    
    // Step 2: NEW - Update price before selling
    const symbol = asset.asset_type === 'stock' ? asset.stock_symbol : asset.bond_symbol;
    let currentPrice;

    if (symbol) {
        console.log(`🔄 Updating price for ${symbol} before selling...`);
        const priceData = await priceService.fetchRealTimePrice([symbol]);
        if (priceData && priceData.length > 0 && priceData[0].current_price) {
            currentPrice = priceData[0].current_price;
            // Update the price in the corresponding table for consistency
            if (asset.asset_type === 'stock') {
                await pool.query('UPDATE stocks SET current_price = ? WHERE id = ?', [currentPrice, asset.asset_id]);
            } else if (asset.asset_type === 'bond') {
                await pool.query('UPDATE bonds SET current_price = ? WHERE id = ?', [currentPrice, asset.asset_id]);
            }
            console.log(`✅ Price for ${symbol} updated to ${currentPrice}`);
        }
    }

    // Fallback to DB price if API fails or symbol doesn't exist
    if (!currentPrice) {
        console.log(`⚠️ Could not fetch live price. Using stored price.`);
        if (asset.asset_type === 'stock') {
            currentPrice = parseFloat(asset.stock_price) || parseFloat(asset.purchase_price);
        } else if (asset.asset_type === 'bond') {
            currentPrice = parseFloat(asset.bond_price) || parseFloat(asset.face_value) || parseFloat(asset.purchase_price);
        }
    }
    
    // Step 3: Calculate sell amount with the most up-to-date price
    const sellAmount = sellQuantity * currentPrice;
    
    // Step 4: Update portfolio table
    if (Math.abs(sellQuantity - currentQuantity) < 0.0001) {
      // Sell all
      await pool.query('UPDATE portfolio SET status = 0 WHERE id = ?', [assetId]);
    } else {
      // Partial sell
      const remainingQuantity = currentQuantity - sellQuantity;
      await pool.query('UPDATE portfolio SET quantity = ? WHERE id = ?', [remainingQuantity, assetId]);
    }
    
    // Step 5: Update user's cash balance
    await pool.query('UPDATE users SET cash_balance = cash_balance + ? WHERE id = ?', [sellAmount, userId]);
    
    // Step 6: Update user's total asset values
    await updateUserAssetValues(userId);
    
    return {
      success: true,
      message: 'Sold successfully',
      amount: sellAmount,
      quantity: sellQuantity
    };
  } catch (error) {
    console.error('Failed to sell asset:', error);
    throw error;
  }
}

/**
 * Deposit cash
 * @param {number} userId - User ID
 * @param {number} amount - Deposit amount
 * @returns {Object} Deposit result
 */
async function rechargeCash(userId, amount) {
  try {
    if (!amount || amount <= 0) {
      throw new Error('Invalid deposit amount');
    }
    
    if (amount > 1000000) {
      throw new Error('Single deposit amount cannot exceed 1 million yuan');
    }
    
    // Update user's cash balance
    await pool.query('UPDATE users SET cash_balance = cash_balance + ? WHERE id = ?', [amount, userId]);
    
    // Update user asset values
    await updateUserAssetValues(userId);
    
    return {
      success: true,
      message: 'Deposit successful',
      amount: parseFloat(amount).toFixed(2)
    };
  } catch (error) {
    console.error('Deposit failed:', error);
    throw error;
  }
}

module.exports = {
  updateUserAssetValues,
  buyStock,
  buyBond,
  sellAsset,
  rechargeCash
};