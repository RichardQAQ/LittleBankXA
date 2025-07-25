const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'n3u3da!',
  database: 'testdb_t4' // This is correct for your setup
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// 测试连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('数据库连接成功 - testdb_t4');
    connection.release();
  } catch (error) {
    console.error('数据库连接失败:', error);
  }
}

testConnection();

module.exports = pool;