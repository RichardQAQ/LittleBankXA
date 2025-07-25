const pool = require('./db');

async function initDatabase() {
  try {
    console.log('尝试连接数据库...');
    // 测试连接
    const connection = await pool.getConnection();
    console.log('数据库连接成功');
    connection.release();

    // 创建数据库
    console.log('尝试创建数据库...');
    await pool.query('CREATE DATABASE IF NOT EXISTS testdb_t4');
    console.log('数据库 testdb_t4 创建成功或已存在');

    // 选择数据库
    console.log('尝试选择数据库...');
    await pool.query('USE testdb_t4');
    console.log('数据库 testdb_t4 选择成功');

    // 创建用户表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建股票表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stocks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        current_price DECIMAL(10, 2) NOT NULL,
        change_percent DECIMAL(5, 2),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 创建债券表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bonds (
        id INT AUTO_INCREMENT PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        face_value DECIMAL(10, 2) NOT NULL,
        coupon_rate DECIMAL(5, 2) NOT NULL,
        maturity_date DATE NOT NULL,
        current_price DECIMAL(10, 2) NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 创建资产表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS portfolio (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        asset_type ENUM('stock', 'bond', 'cash') NOT NULL,
        asset_id INT NOT NULL,
        quantity DECIMAL(10, 4) NOT NULL,
        purchase_price DECIMAL(10, 2) NOT NULL,
        purchase_date DATE NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE KEY unique_asset (user_id, asset_type, asset_id)
      )
    `);

    console.log('所有表创建成功');
    console.log('数据库 testdb_t4 初始化成功');
  } catch (error) {
    console.error('数据库初始化失败:', error);
  } finally {
    // 关闭连接池
    await pool.end();
  }
}

initDatabase();