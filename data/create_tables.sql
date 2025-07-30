-- 创建用户表
-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  total_assets DECIMAL(15, 2) DEFAULT 50000.00,
  stock_value DECIMAL(15, 2) DEFAULT 0.00,
  bond_value DECIMAL(15, 2) DEFAULT 0.00,
  cash_balance DECIMAL(15, 2) DEFAULT 50000.00,
  total_return_rate DECIMAL(8, 4) DEFAULT 0.00,
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
-- 创建资产表
CREATE TABLE IF NOT EXISTS portfolio (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  asset_type ENUM('stock', 'bond', 'cash') NOT NULL,
  asset_id INT NOT NULL,
  name VARCHAR(100),
  quantity DECIMAL(10, 4) NOT NULL,
  purchase_price DECIMAL(10, 2) NOT NULL,
  purchase_date DATE NOT NULL,
  status TINYINT DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
