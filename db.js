const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root', // Default username, modify as needed
  password: 'n3u3da!', // Anaconda MySQL may not have a password set
  database: 'investment_system', // Database name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  port: 3306 // Default port, modify if using a different port
};

// Create database connection pool
const pool = mysql.createPool(dbConfig);

// Test connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection successful');
    connection.release();
  } catch (error) {
    console.error('Database connection failed:', error);
    console.log('Please ensure MySQL service is running and credentials are correct');
    console.log('If the database does not exist, will attempt to create it');
    
    // Try to create database
    try {
      // Create connection pool without specifying database
      const rootPool = mysql.createPool({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      
      // Create database
      await rootPool.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
      console.log(`Database ${dbConfig.database} created successfully`);
      
      // Close connection pool
      await rootPool.end();
    } catch (createError) {
      console.error('Failed to create database:', createError);
    }
  }
}

testConnection();

module.exports = pool;