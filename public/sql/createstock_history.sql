CREATE TABLE stock_history (
  idstock_history INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(10),
  trade_date DATE,
  open_price DECIMAL(10,2),
  high_price DECIMAL(10,2),
  low_price DECIMAL(10,2),
  close_price DECIMAL(10,2),
  volume BIGINT
);