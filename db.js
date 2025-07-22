const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: 'localhost',
  user: 'root', // 默认用户名，根据实际情况修改
  password: '624135', // 默认密码，根据实际情况修改
  database: 'investment_system' // 数据库名称，稍后我们会创建
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// 测试连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('数据库连接成功');
    connection.release();
  } catch (error) {
    console.error('数据库连接失败:', error);
  }
}

testConnection();

module.exports = pool;