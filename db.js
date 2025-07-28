const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root', // Default username, change if needed
  password: 'n3u3da!', // Default password, change if needed
  database: 'investment_system' // CORRECTED: Standardized database name
};

// Create a connection pool
const pool = mysql.createPool(dbConfig);

// Test the connection on startup
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection successful.');
    connection.release();
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

testConnection();

module.exports = pool;