-- 插入用户数据
INSERT INTO users (username) VALUES
('张三'),
('李四'),
('王五');

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
INSERT INTO portfolio (user_id, asset_type, asset_id, quantity, purchase_price, purchase_date) VALUES
(1, 'stock', 1, 10.00, 180.50, '2024-01-15'),  -- 张三持有10股苹果股票
(1, 'stock', 2, 5.00, 400.30, '2024-02-20'),   -- 张三持有5股微软股票
(1, 'stock', 3, 15.00, 125.40, '2024-03-05'),  -- 张三持有15股谷歌股票
(1, 'bond', 1, 3.00, 970.10, '2024-04-10'),    -- 张三持有3份美国10年期国债
(1, 'bond', 2, 4.00, 985.30, '2024-05-15'),    -- 张三持有4份中国5年期国债
(2, 'stock', 3, 20.00, 130.75, '2024-03-10'),  -- 李四持有20股谷歌股票
(2, 'bond', 1, 2.00, 975.20, '2024-04-05'),    -- 李四持有2份美国10年期国债
(3, 'bond', 2, 5.00, 988.60, '2024-05-12');    -- 王五持有5份中国5年期国债