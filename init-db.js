const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Database configuration for initialization (connects without a specific DB first)
const dbInitConfig = {
  host: 'localhost',
  user: 'root',
  password: 'n3u3da!',
  multipleStatements: true // Allow multiple SQL statements in one query
};

const DB_NAME = 'investment_system';

async function initDatabase() {
  let connection;
  try {
    console.log('Connecting to MySQL server...');
    connection = await mysql.createConnection(dbInitConfig);
    console.log('MySQL connection successful.');

    console.log(`Creating database "${DB_NAME}" if it does not exist...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
    await connection.query(`USE ${DB_NAME}`);
    console.log(`Database "${DB_NAME}" is ready.`);

    console.log('Creating tables...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS stocks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        current_price DECIMAL(10, 2) NOT NULL,
        change_percent DECIMAL(5, 2),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bonds (
        id INT AUTO_INCREMENT PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        face_value DECIMAL(10, 2) NOT NULL,
        coupon_rate DECIMAL(5, 2) NOT NULL,
        maturity_date DATE NOT NULL,
        current_price DECIMAL(10, 2) NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);
    await connection.query(`
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
      );
    `);
    console.log('Tables created successfully.');

    console.log('Clearing old test data...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
    await connection.query('TRUNCATE TABLE portfolio;');
    await connection.query('TRUNCATE TABLE stocks;');
    await connection.query('TRUNCATE TABLE bonds;');
    await connection.query('TRUNCATE TABLE users;');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('Old data cleared.');

    console.log('Inserting new test data...');
    const sqlFilePath = path.join(__dirname, 'data', 'insert_test_data.sql');
    const sql = await fs.readFile(sqlFilePath, 'utf8');
    await connection.query(sql);
    console.log('Test data inserted successfully.');

    console.log('✅ Database initialization complete.');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('MySQL connection closed.');
    }
  }
}

initDatabase();