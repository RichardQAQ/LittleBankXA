const yahooFinance = require('yahoo-finance-api');

// 雅虎财经API不需要初始化，直接使用静态方法

/**
 * 获取股票的实时数据
 * @param {string} symbol - 股票代码
 * @returns {Promise<Object>} 股票数据
 */
async function getStockData(symbol) {
  try {
    // 获取股票的实时价格
    const data = await yahooFinance.getSymbol(symbol);
    return data;
  } catch (error) {
    console.error('获取股票数据失败:', error);
    throw error;
  }
}

/**
 * 更新数据库中的股票价格
 * @param {object} pool - 数据库连接池
 * @param {string} symbol - 股票代码
 * @returns {Promise<void>}
 */
async function updateStockPrice(pool, symbol) {
  try {
    const stockData = await getStockData(symbol);
    const currentPrice = stockData.regularMarketPrice;

    // 更新数据库中的股票价格
    await pool.query(
      'UPDATE stocks SET current_price = ? WHERE symbol = ?',
      [currentPrice, symbol]
    );

    console.log(`股票 ${symbol} 价格已更新为: ${currentPrice}`);
  } catch (error) {
    console.error('更新股票价格失败:', error);
    throw error;
  }
}

module.exports = {
  getStockData,
  updateStockPrice
};