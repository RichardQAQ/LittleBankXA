/**
 * 投资组合服务 - 处理资产买卖和管理
 */

const pool = require('../db');
const priceService = require('./priceService'); // Import the price service

/**
 * 更新用户资产总值
 * @param {number} userId - 用户ID
 */
async function updateUserAssetValues(userId) {
  try {
    // 获取用户的股票资产
    const [stockAssets] = await pool.query(`
      SELECT p.*, s.current_price 
      FROM portfolio p
      JOIN stocks s ON p.asset_id = s.id
      WHERE p.user_id = ? AND p.asset_type = 'stock' AND p.status = 1
    `, [userId]);
    
    // 获取用户的债券资产
    const [bondAssets] = await pool.query(`
      SELECT p.*, b.current_price 
      FROM portfolio p
      JOIN bonds b ON p.asset_id = b.id
      WHERE p.user_id = ? AND p.asset_type = 'bond' AND p.status = 1
    `, [userId]);
    
    // 计算股票总值
    let stockValue = 0;
    for (const asset of stockAssets) {
      stockValue += parseFloat(asset.quantity) * parseFloat(asset.current_price);
    }
    
    // 计算债券总值
    let bondValue = 0;
    for (const asset of bondAssets) {
      bondValue += parseFloat(asset.quantity) * parseFloat(asset.current_price);
    }
    
    // 获取用户现金余额
    const [users] = await pool.query('SELECT cash_balance FROM users WHERE id = ?', [userId]);
    const cashBalance = parseFloat(users[0].cash_balance);
    
    // 计算总资产
    const totalAssets = stockValue + bondValue + cashBalance;
    
    // 计算总回报率（假设初始资金为50000）
    const initialInvestment = 50000;
    const totalReturnRate = ((totalAssets - initialInvestment) / initialInvestment) * 100;
    
    // 更新用户资产信息
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
    console.error('更新用户资产总值失败:', error);
    throw error;
  }
}

/**
 * 购买股票
 * @param {number} userId - 用户ID
 * @param {string} symbol - 股票代码
 * @param {string} name - 股票名称
 * @param {number} price - 购买价格
 * @param {number} quantity - 购买数量
 * @returns {Object} 购买结果
 */
async function buyStock(userId, symbol, name, price, quantity) {
  try {
    if (!symbol || !price || !quantity || quantity <= 0) {
      throw new Error('参数不完整或无效');
    }
    
    const totalCost = parseFloat(price) * parseFloat(quantity);
    
    // 检查用户现金余额
    const [users] = await pool.query('SELECT cash_balance FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      throw new Error('用户不存在');
    }
    
    const currentCash = parseFloat(users[0].cash_balance);
    
    if (currentCash < totalCost) {
      throw new Error(`现金余额不足，当前余额: ¥${currentCash.toFixed(2)}，需要: ¥${totalCost.toFixed(2)}`);
    }
    
    // 查找或创建股票记录
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
      // 更新当前价格
      await pool.query('UPDATE stocks SET current_price = ? WHERE id = ?', [price, stockId]);
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
        'INSERT INTO portfolio (user_id, asset_type, asset_id, name, quantity, purchase_price, purchase_date, status) VALUES (?, ?, ?, ?, ?, ?, NOW(), 1)',
        [userId, 'stock', stockId, name || symbol, quantity, price]
      );
    }
    
    // 更新用户现金余额
    await pool.query('UPDATE users SET cash_balance = cash_balance - ? WHERE id = ?', [totalCost, userId]);
    
    // 更新用户资产总值
    await updateUserAssetValues(userId);
    
    return { 
      success: true, 
      message: '股票购买成功！',
      totalCost: totalCost.toFixed(2),
      symbol: symbol,
      quantity: quantity
    };
  } catch (error) {
    console.error('购买股票失败:', error);
    throw error;
  }
}

/**
 * 购买债券
 * @param {number} userId - 用户ID
 * @param {string} symbol - 债券代码
 * @param {string} name - 债券名称
 * @param {number} price - 购买价格
 * @param {number} quantity - 购买数量
 * @param {number} faceValue - 面值
 * @param {number} couponRate - 票面利率
 * @param {string} maturityDate - 到期日
 * @returns {Object} 购买结果
 */
async function buyBond(userId, symbol, name, price, quantity, faceValue = 1000, couponRate = 3.5, maturityDate = '2030-12-31') {
  try {
    if (!symbol || !price || !quantity || quantity <= 0) {
      throw new Error('参数不完整或无效');
    }
    
    const totalCost = parseFloat(price) * parseFloat(quantity);
    
    // 检查用户现金余额
    const [users] = await pool.query('SELECT cash_balance FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      throw new Error('用户不存在');
    }
    
    const currentCash = parseFloat(users[0].cash_balance);
    
    if (currentCash < totalCost) {
      throw new Error(`现金余额不足，当前余额: ¥${currentCash.toFixed(2)}，需要: ¥${totalCost.toFixed(2)}`);
    }
    
    // 查找或创建债券记录
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
      // 更新当前价格
      await pool.query('UPDATE bonds SET current_price = ? WHERE id = ?', [price, bondId]);
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
        'INSERT INTO portfolio (user_id, asset_type, asset_id, name, quantity, purchase_price, purchase_date, status) VALUES (?, ?, ?, ?, ?, ?, NOW(), 1)',
        [userId, 'bond', bondId, name || symbol, quantity, price]
      );
    }
    
    // 更新用户现金余额
    await pool.query('UPDATE users SET cash_balance = cash_balance - ? WHERE id = ?', [totalCost, userId]);
    
    // 更新用户资产总值
    await updateUserAssetValues(userId);
    
    return { 
      success: true, 
      message: '债券购买成功！',
      totalCost: totalCost.toFixed(2),
      symbol: symbol,
      quantity: quantity
    };
  } catch (error) {
    console.error('购买债券失败:', error);
    throw error;
  }
}

/**
 * 卖出资产
 * @param {number} userId - 用户ID
 * @param {number} assetId - 资产ID
 * @param {number} quantity - 卖出数量
 * @returns {Object} 卖出结果
 */
async function sellAsset(userId, assetId, quantity) {
  try {
    if (!assetId || !quantity || quantity <= 0) {
      throw new Error('参数不完整或无效');
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
      throw new Error('资产不存在或已卖出');
    }
    
    const asset = assets[0];
    const currentQuantity = parseFloat(asset.quantity);
    const sellQuantity = parseFloat(quantity);
    
    if (sellQuantity > currentQuantity) {
      throw new Error('卖出数量超过持有数量');
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
      // 全部卖出
      await pool.query('UPDATE portfolio SET status = 0 WHERE id = ?', [assetId]);
    } else {
      // 部分卖出
      const remainingQuantity = currentQuantity - sellQuantity;
      await pool.query('UPDATE portfolio SET quantity = ? WHERE id = ?', [remainingQuantity, assetId]);
    }
    
    // Step 5: Update user's cash balance
    await pool.query('UPDATE users SET cash_balance = cash_balance + ? WHERE id = ?', [sellAmount, userId]);
    
    // Step 6: Update user's total asset values
    await updateUserAssetValues(userId);
    
    return {
      success: true,
      message: '卖出成功',
      amount: sellAmount,
      quantity: sellQuantity
    };
  } catch (error) {
    console.error('卖出资产失败:', error);
    throw error;
  }
}

/**
 * 充值现金
 * @param {number} userId - 用户ID
 * @param {number} amount - 充值金额
 * @returns {Object} 充值结果
 */
async function rechargeCash(userId, amount) {
  try {
    if (!amount || amount <= 0) {
      throw new Error('充值金额无效');
    }
    
    if (amount > 1000000) {
      throw new Error('单次充值金额不能超过100万元');
    }
    
    // 更新用户现金余额
    await pool.query('UPDATE users SET cash_balance = cash_balance + ? WHERE id = ?', [amount, userId]);
    
    // 更新用户资产总值
    await updateUserAssetValues(userId);
    
    return {
      success: true,
      message: '充值成功',
      amount: parseFloat(amount).toFixed(2)
    };
  } catch (error) {
    console.error('充值失败:', error);
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