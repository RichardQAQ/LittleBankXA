-- 插入用户数据
INSERT INTO users (username, total_assets, stock_value, bond_value, cash_balance, total_return_rate) VALUES
('张三', 22889.70, 0.00, 0.00, 22889.70, 0.00);

-- 插入股票数据
INSERT INTO stocks (symbol, name, current_price, change_percent) VALUES
('AAPL', '苹果公司', 187.45, 2.35),
('MSFT', '微软公司', 410.23, 1.87),
('GOOG', '谷歌公司', 135.89, -0.45);

-- 插入债券数据
INSERT INTO bonds (symbol, name, face_value, coupon_rate, maturity_date, current_price) VALUES
('US10Y', '美国10年期国债', 1000.00, 3.85, '2034-07-22', 985.50),
('CN5Y', '中国5年期国债', 1000.00, 2.50, '2029-07-22', 992.30);

-- 插入资产数据
INSERT INTO portfolio (user_id, asset_type, asset_id, quantity, purchase_price, purchase_date, status) VALUES
(1, 'stock', 1, 10.00, 180.50, '2024-01-15', 1),  -- 张三持有10股苹果股票
(1, 'stock', 2, 5.00, 400.30, '2024-02-20', 1),   -- 张三持有5股微软股票
(1, 'stock', 3, 15.00, 125.40, '2024-03-05', 1),  -- 张三持有15股谷歌股票
(1, 'bond', 1, 3.00, 970.10, '2024-04-10', 1),    -- 张三持有3份美国10年期国债
(1, 'bond', 2, 4.00, 985.30, '2024-05-15', 1),    -- 张三持有4份中国5年期国债
(1, 'cash', 0, 5000.00, 1.00, '2024-05-20', 1);   -- 张三持有5000元现金
