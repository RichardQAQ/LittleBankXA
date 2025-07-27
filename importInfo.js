// importStocks.js
require('dotenv').config();
const axios = require('axios');
const mysql = require('mysql2/promise');

/* 20 支股票 */
const SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA',
  'NVDA', 'META', 'NFLX', 'ORCL', 'INTC',
  'AMD', 'CSCO', 'ADBE', 'CRM', 'PYPL',
  'UBER', 'ZM', 'COIN', 'SHOP', 'SNOW'
];


const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PWD || 'root',
  database: 'investment_system'
};

const ALPHA_KEY = 'DK81UQ20HPA8A0WU';
// const ALPHA_KEY = '9ZRZOFP1CUIWPRYQ';

/* 获取某支股票全部历史日线 */
async function fetchHistory(symbol) {
  // const url = 'https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=5min&apikey=D1G2YLAXSIE1Z2GM';
  const url = 'https://www.alphavantage.co/query';
  const { data } = await axios.get(url, {
    params: {
      function: 'TIME_SERIES_DAILY',
      symbol,
      outputsize: 'compact',   // 全部历史
      apikey: ALPHA_KEY
    }
  });

  const ts = data['Time Series (Daily)'];
  if (!ts) throw new Error(`${symbol} 无数据`);

  // 转数组并按日期升序
  return Object.entries(ts)
    .map(([date, ohlc]) => ({
      symbol,
      trade_date: date,
      open_price: parseFloat(ohlc['1. open']),
      high_price: parseFloat(ohlc['2. high']),
      low_price: parseFloat(ohlc['3. low']),
      close_price: parseFloat(ohlc['4. close']),
      volume: parseInt(ohlc['5. volume'], 10)
    }))
    .sort((a, b) => new Date(a.trade_date) - new Date(b.trade_date));
}

/* 批量插入（带 ON DUPLICATE KEY UPDATE） */
async function insertBatch(records) {
  const conn = await mysql.createConnection(DB_CONFIG);
  const sql = `
    INSERT INTO stock_history
      (symbol, trade_date, open_price, high_price, low_price, close_price, volume)
    VALUES ? 
    ON DUPLICATE KEY UPDATE
      symbol      = VALUES(symbol),
      trade_date  = VALUES(trade_date),
      open_price  = VALUES(open_price),
      high_price  = VALUES(high_price),
      low_price   = VALUES(low_price),
      close_price = VALUES(close_price),
      volume      = VALUES(volume)
  `;


  // 二维数组批量插入
  const values = records.map(r => [
    r.symbol,
    r.trade_date,
    r.open_price,
    r.high_price,
    r.low_price,
    r.close_price,
    r.volume
  ]);

  console.log(`🔄 ${values.length} 条数据准备插入`);
  console.log(`SQL: ${sql}`);
  console.log(`VALUES: ${JSON.stringify(values.slice(0, 100))}...`); // 只打印前 5 条

  await conn.query(sql, [values]);
  await conn.end();
}

/* 主流程：串行拉取，逐支插入 */
(async () => {
  for (const sym of SYMBOLS) {
    try {
      const records = await fetchHistory(sym);
      console.log(`📈 ${sym}: 拉取到 ${records.length} 条历史数据`);
      console.log(records);
      await insertBatch(records);
      console.log(`✅ ${sym}: ${records.length} 条历史已入库`);
      // 免费层限速：每支股票之间停 12 秒
      await new Promise(r => setTimeout(r, 12000));
    } catch (err) {
      console.error(`❌ ${sym}: ${err.message}`);
    }
  }
  console.log('🎉 全部完成');
})();