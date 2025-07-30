-- 债券基础信息表
CREATE TABLE IF NOT EXISTS bonds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    face_value DECIMAL(10,2) DEFAULT 1000.00,
    coupon_rate DECIMAL(5,2) NOT NULL,
    maturity_date DATE,
    rating VARCHAR(10) DEFAULT 'AAA',
    issuer VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 债券价格历史表
CREATE TABLE IF NOT EXISTS bond_prices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bond_symbol VARCHAR(20) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    change_percent DECIMAL(5,2) DEFAULT 0.00,
    volume INTEGER DEFAULT 0,
    trade_date DATE DEFAULT (CURDATE()),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bond_symbol) REFERENCES bonds(symbol)
);

-- 用户债券持仓表
CREATE TABLE IF NOT EXISTS user_bonds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    bond_symbol VARCHAR(20) NOT NULL,
    bond_name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    purchase_price DECIMAL(10,2) NOT NULL,
    purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_cost DECIMAL(15,2) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (bond_symbol) REFERENCES bonds(symbol)
);

-- 插入测试债券数据
INSERT OR REPLACE INTO bonds (symbol, name, face_value, coupon_rate, maturity_date, rating, issuer) VALUES
('GB001', '国债001', 1000.00, 3.25, '2030-12-31', 'AAA', '中华人民共和国财政部'),
('GB002', '国债002', 1000.00, 3.50, '2028-06-30', 'AAA', '中华人民共和国财政部'),
('CB001', '建设银行债券', 1000.00, 4.20, '2027-03-15', 'AAA', '中国建设银行'),
('CB002', '工商银行债券', 1000.00, 4.10, '2029-09-20', 'AAA', '中国工商银行'),
('EB001', '企业债001', 1000.00, 5.50, '2026-12-31', 'AA+', '中石油集团');

-- 插入债券价格数据
INSERT OR REPLACE INTO bond_prices (bond_symbol, price, change_percent, volume, trade_date) VALUES
('GB001', 1025.50, 0.25, 10000, date('now')),
('GB002', 1032.80, -0.15, 8500, date('now')),
('CB001', 1018.20, 0.45, 12000, date('now')),
('CB002', 1041.60, -0.30, 9500, date('now')),
('EB001', 995.75, 1.20, 15000, date('now'));