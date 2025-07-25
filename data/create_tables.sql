-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建股票表
CREATE TABLE IF NOT EXISTS stocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  current_price DECIMAL(10, 2) NOT NULL,
  change_percent DECIMAL(5, 2),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 创建债券表
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

-- 创建资产表
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

-- Add to create_tables.sql
CREATE TABLE IF NOT EXISTS stock_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stock_id INT NOT NULL,
  trade_date DATE NOT NULL,
  open_price DECIMAL(10, 2) NOT NULL,
  high_price DECIMAL(10, 2) NOT NULL,
  low_price DECIMAL(10, 2) NOT NULL,
  close_price DECIMAL(10, 2) NOT NULL,
  volume BIGINT NOT NULL,
  FOREIGN KEY (stock_id) REFERENCES stocks(id),
  UNIQUE KEY unique_history (stock_id, trade_date)
);

-- Add tracking table for user stock watchlist
CREATE TABLE IF NOT EXISTS watchlist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  stock_id INT NOT NULL,
  added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (stock_id) REFERENCES stocks(id),
  UNIQUE KEY unique_watchlist_item (user_id, stock_id)
);