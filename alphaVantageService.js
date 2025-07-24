const axios = require('axios');

// 注意：实际使用时，应该从环境变量或配置文件中获取API密钥
const apiKey = 'YOUR_API_KEY'; // 请替换为实际的Alpha Vantage API密钥

// 我们将直接使用axios调用Alpha Vantage API，而不是使用alpha-vantage-cli库

/**
 * 获取股票的实时数据
 * @param {string} symbol - 股票代码
 * @returns {Promise<Object>} 股票数据
 */
async function getStockData(symbol) {
  try {
    console.log(`获取股票 ${symbol} 数据...`);
    // 使用Alpha Vantage API获取股票数据
    // 这里使用GLOBAL_QUOTE端点获取最新报价
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
    );

    const data = response.data;
    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    if (!data['Global Quote'] || Object.keys(data['Global Quote']).length === 0) {
      throw new Error(`未找到股票 ${symbol} 的数据`);
    }

    const quote = data['Global Quote'];
    return {
      symbol: quote['01. symbol'],
      open: parseFloat(quote['02. open']),
      high: parseFloat(quote['03. high']),
      low: parseFloat(quote['04. low']),
      price: parseFloat(quote['05. price']),
      volume: parseInt(quote['06. volume']),
      latestTradingDay: quote['07. latest trading day'],
      previousClose: parseFloat(quote['08. previous close']),
      change: parseFloat(quote['09. change']),
      changePercent: quote['10. change percent']
    };
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
    const currentPrice = stockData.price;

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

/**
 * 获取债券数据
 * @param {string} symbol - 债券代码
 * @returns {Promise<Object>} 债券数据
 */
async function getBondData(symbol) {
  try {
    console.log(`获取债券 ${symbol} 数据...`);
    // 注意：Alpha Vantage主要提供股票数据，债券数据可能需要使用其他API
    // 这里使用一个模拟实现，实际应用中应该替换为合适的债券API
    // 例如，可以使用FRED API或其他债券数据源
    return {
      symbol: symbol,
      name: `模拟债券 ${symbol}`,
      currentPrice: (Math.random() * 100 + 950).toFixed(2),
      faceValue: 1000,
      couponRate: (Math.random() * 3 + 2).toFixed(2),
      maturityDate: '2030-12-31'
    };
  } catch (error) {
    console.error('获取债券数据失败:', error);
    throw error;
  }
}

module.exports = {
  getStockData,
  updateStockPrice,
  getBondData
};