const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: 'localhost',
  user: 'root', // 默认用户名，根据实际情况修改
  password: '624135', // Anaconda MySQL可能没有设置密码
  database: 'investment_system', // 数据库名称，稍后我们会创建
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  port: 3306 // 默认端口，如果Anaconda使用不同端口，请修改
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
    console.log('请确保MySQL服务已启动，并且用户名和密码正确');
    console.log('如果数据库不存在，将尝试创建数据库');
    
    // 尝试创建数据库
    try {
      // 创建不指定数据库的连接池
      const rootPool = mysql.createPool({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      
      // 创建数据库
      await rootPool.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
      console.log(`数据库 ${dbConfig.database} 创建成功`);
      
      // 关闭连接池
      await rootPool.end();
    } catch (createError) {
      console.error('创建数据库失败:', createError);
    }
  }
}

testConnection();

module.exports = pool;
