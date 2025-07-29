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
    await pool.query('CREATE DATABASE IF NOT EXISTS ourtest');
    console.log('数据库创建成功或已存在');

    // 选择数据库
    console.log('尝试选择数据库...');
    await pool.query('USE ourtest');
    console.log('数据库选择成功');

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

    // 读取并执行测试数据SQL文件
    const fs = require('fs');
    const path = require('path');
    const sqlFilePath = path.join(__dirname, 'data', 'insert_test_data.sql');
    let sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // 清除注释和空行
    sql = sql.replace(/--.*$/gm, '').replace(/\n\s*\n/g, '\n');
    
    // 分割SQL语句
    const sqlStatements = sql.split(';').filter(statement => statement.trim() !== '');
    
    // 执行SQL语句
    const conn = await pool.getConnection();
    
    // 先清空表数据
    await conn.query('DELETE FROM portfolio');
    await conn.query('DELETE FROM stocks');
    await conn.query('DELETE FROM bonds');
    await conn.query('DELETE FROM users');
    
    // 重新设置自增ID
    await conn.query('ALTER TABLE users AUTO_INCREMENT = 1');
    await conn.query('ALTER TABLE stocks AUTO_INCREMENT = 1');
    await conn.query('ALTER TABLE bonds AUTO_INCREMENT = 1');
    await conn.query('ALTER TABLE portfolio AUTO_INCREMENT = 1');
    
    // 插入测试数据
    for (const statement of sqlStatements) {
      await conn.query(statement);
    }
    conn.release();
    console.log('测试数据插入成功');
    console.log('数据库初始化成功');
  } catch (error) {
    console.error('数据库初始化失败:', error);
  } finally {
    // 关闭连接池
    await pool.end();
  }
}

initDatabase();