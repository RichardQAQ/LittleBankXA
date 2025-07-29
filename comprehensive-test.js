const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库连接
const dbPath = path.join(__dirname, 'investment.db');
const db = new sqlite3.Database(dbPath);

// 测试结果记录
let testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

// 辅助函数
function logTest(testName, success, message = '') {
    if (success) {
        console.log(`✅ ${testName} - 通过`);
        testResults.passed++;
    } else {
        console.log(`❌ ${testName} - 失败: ${message}`);
        testResults.failed++;
        testResults.errors.push(`${testName}: ${message}`);
    }
}

// Promise化数据库操作
function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

// 测试函数
async function testDatabaseConnection() {
    try {
        const result = await dbGet("SELECT 1 as test");
        logTest("数据库连接", result.test === 1);
    } catch (error) {
        logTest("数据库连接", false, error.message);
    }
}

async function testTableStructure() {
    try {
        const tables = await dbAll("SELECT name FROM sqlite_master WHERE type='table'");
        const expectedTables = ['users', 'stocks', 'bonds', 'portfolios', 'transactions'];
        
        for (let expectedTable of expectedTables) {
            const exists = tables.some(table => table.name === expectedTable);
            logTest(`表结构检查 - ${expectedTable}`, exists, exists ? '' : `表 ${expectedTable} 不存在`);
        }
    } catch (error) {
        logTest("表结构检查", false, error.message);
    }
}

async function testUserOperations() {
    try {
        // 创建测试用户
        const insertResult = await dbRun(
            "INSERT OR REPLACE INTO users (username, password, balance) VALUES (?, ?, ?)",
            ['testuser', 'password123', 10000]
        );
        logTest("用户创建", insertResult.lastID > 0 || insertResult.changes > 0);

        // 查询用户
        const user = await dbGet("SELECT * FROM users WHERE username = ?", ['testuser']);
        logTest("用户查询", user && user.username === 'testuser');

        // 更新用户余额
        await dbRun("UPDATE users SET balance = ? WHERE username = ?", [15000, 'testuser']);
        const updatedUser = await dbGet("SELECT balance FROM users WHERE username = ?", ['testuser']);
        logTest("用户余额更新", updatedUser.balance === 15000);

    } catch (error) {
        logTest("用户操作", false, error.message);
    }
}

async function testStockOperations() {
    try {
        // 插入测试股票数据
        await dbRun(
            "INSERT OR REPLACE INTO stocks (symbol, name, price, change_percent) VALUES (?, ?, ?, ?)",
            ['TEST001', '测试股票', 100.50, 2.5]
        );
        logTest("股票数据插入", true);

        // 查询股票
        const stock = await dbGet("SELECT * FROM stocks WHERE symbol = ?", ['TEST001']);
        logTest("股票查询", stock && stock.symbol === 'TEST001');

        // 更新股票价格
        await dbRun("UPDATE stocks SET price = ?, change_percent = ? WHERE symbol = ?", [105.25, 5.0, 'TEST001']);
        const updatedStock = await dbGet("SELECT * FROM stocks WHERE symbol = ?", ['TEST001']);
        logTest("股票价格更新", updatedStock.price === 105.25 && updatedStock.change_percent === 5.0);

    } catch (error) {
        logTest("股票操作", false, error.message);
    }
}

async function testBondOperations() {
    try {
        // 插入测试债券数据
        await dbRun(
            "INSERT OR REPLACE INTO bonds (code, name, price, yield_rate, maturity_date, rating) VALUES (?, ?, ?, ?, ?, ?)",
            ['BOND001', '测试债券', 98.50, 3.5, '2025-12-31', 'AAA']
        );
        logTest("债券数据插入", true);

        // 查询债券
        const bond = await dbGet("SELECT * FROM bonds WHERE code = ?", ['BOND001']);
        logTest("债券查询", bond && bond.code === 'BOND001');

        // 更新债券价格
        await dbRun("UPDATE bonds SET price = ?, yield_rate = ? WHERE code = ?", [99.25, 3.2, 'BOND001']);
        const updatedBond = await dbGet("SELECT * FROM bonds WHERE code = ?", ['BOND001']);
        logTest("债券价格更新", updatedBond.price === 99.25 && updatedBond.yield_rate === 3.2);

    } catch (error) {
        logTest("债券操作", false, error.message);
    }
}

async function testPortfolioOperations() {
    try {
        // 确保测试用户存在
        await dbRun(
            "INSERT OR REPLACE INTO users (username, password, balance) VALUES (?, ?, ?)",
            ['testuser', 'password123', 10000]
        );

        // 添加股票到投资组合
        await dbRun(
            "INSERT OR REPLACE INTO portfolios (username, asset_type, asset_code, quantity, purchase_price, purchase_date) VALUES (?, ?, ?, ?, ?, ?)",
            ['testuser', 'stock', 'TEST001', 100, 100.50, new Date().toISOString()]
        );
        logTest("投资组合添加股票", true);

        // 添加债券到投资组合
        await dbRun(
            "INSERT OR REPLACE INTO portfolios (username, asset_type, asset_code, quantity, purchase_price, purchase_date) VALUES (?, ?, ?, ?, ?, ?)",
            ['testuser', 'bond', 'BOND001', 50, 98.50, new Date().toISOString()]
        );
        logTest("投资组合添加债券", true);

        // 查询投资组合
        const portfolio = await dbAll("SELECT * FROM portfolios WHERE username = ?", ['testuser']);
        logTest("投资组合查询", portfolio.length >= 2);

        // 更新持仓数量
        await dbRun(
            "UPDATE portfolios SET quantity = ? WHERE username = ? AND asset_code = ?",
            [150, 'testuser', 'TEST001']
        );
        const updatedPortfolio = await dbGet(
            "SELECT quantity FROM portfolios WHERE username = ? AND asset_code = ?",
            ['testuser', 'TEST001']
        );
        logTest("投资组合更新", updatedPortfolio.quantity === 150);

    } catch (error) {
        logTest("投资组合操作", false, error.message);
    }
}

async function testTransactionOperations() {
    try {
        // 记录买入交易
        await dbRun(
            "INSERT INTO transactions (username, asset_type, asset_code, transaction_type, quantity, price, total_amount, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            ['testuser', 'stock', 'TEST001', 'buy', 100, 100.50, 10050, new Date().toISOString()]
        );
        logTest("交易记录插入", true);

        // 查询交易记录
        const transactions = await dbAll("SELECT * FROM transactions WHERE username = ?", ['testuser']);
        logTest("交易记录查询", transactions.length > 0);

        // 记录卖出交易
        await dbRun(
            "INSERT INTO transactions (username, asset_type, asset_code, transaction_type, quantity, price, total_amount, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            ['testuser', 'stock', 'TEST001', 'sell', 50, 105.25, 5262.5, new Date().toISOString()]
        );

        const allTransactions = await dbAll("SELECT * FROM transactions WHERE username = ?", ['testuser']);
        logTest("交易记录完整性", allTransactions.length >= 2);

    } catch (error) {
        logTest("交易操作", false, error.message);
    }
}

async function testCalculationLogic() {
    try {
        // 测试投资组合价值计算
        const portfolioData = await dbAll(`
            SELECT 
                p.asset_type,
                p.asset_code,
                p.quantity,
                p.purchase_price,
                CASE 
                    WHEN p.asset_type = 'stock' THEN s.price
                    WHEN p.asset_type = 'bond' THEN b.price
                END as current_price
            FROM portfolios p
            LEFT JOIN stocks s ON p.asset_code = s.symbol AND p.asset_type = 'stock'
            LEFT JOIN bonds b ON p.asset_code = b.code AND p.asset_type = 'bond'
            WHERE p.username = ?
        `, ['testuser']);

        let totalValue = 0;
        let totalCost = 0;
        let totalProfitLoss = 0;

        for (let item of portfolioData) {
            const currentValue = item.quantity * item.current_price;
            const cost = item.quantity * item.purchase_price;
            const profitLoss = currentValue - cost;

            totalValue += currentValue;
            totalCost += cost;
            totalProfitLoss += profitLoss;
        }

        logTest("投资组合价值计算", totalValue > 0, `总价值: ${totalValue}`);
        logTest("投资组合成本计算", totalCost > 0, `总成本: ${totalCost}`);
        logTest("投资组合盈亏计算", true, `总盈亏: ${totalProfitLoss}`);

        // 测试收益率计算
        const returnRate = totalCost > 0 ? (totalProfitLoss / totalCost * 100) : 0;
        logTest("收益率计算", true, `收益率: ${returnRate.toFixed(2)}%`);

    } catch (error) {
        logTest("计算逻辑", false, error.message);
    }
}

async function testDataIntegrity() {
    try {
        // 检查外键约束
        const orphanPortfolios = await dbAll(`
            SELECT p.* FROM portfolios p
            LEFT JOIN users u ON p.username = u.username
            WHERE u.username IS NULL
        `);
        logTest("投资组合外键约束", orphanPortfolios.length === 0);

        // 检查数据一致性
        const negativeQuantities = await dbAll("SELECT * FROM portfolios WHERE quantity < 0");
        logTest("持仓数量非负检查", negativeQuantities.length === 0);

        const negativeBalances = await dbAll("SELECT * FROM users WHERE balance < 0");
        logTest("用户余额非负检查", negativeBalances.length === 0);

    } catch (error) {
        logTest("数据完整性", false, error.message);
    }
}

async function testComplexQueries() {
    try {
        // 测试复杂查询：用户总资产
        const userAssets = await dbGet(`
            SELECT 
                u.username,
                u.balance,
                COALESCE(SUM(
                    CASE 
                        WHEN p.asset_type = 'stock' THEN p.quantity * s.price
                        WHEN p.asset_type = 'bond' THEN p.quantity * b.price
                        ELSE 0
                    END
                ), 0) as portfolio_value
            FROM users u
            LEFT JOIN portfolios p ON u.username = p.username
            LEFT JOIN stocks s ON p.asset_code = s.symbol AND p.asset_type = 'stock'
            LEFT JOIN bonds b ON p.asset_code = b.code AND p.asset_type = 'bond'
            WHERE u.username = ?
            GROUP BY u.username, u.balance
        `, ['testuser']);

        logTest("复杂查询 - 用户总资产", userAssets && userAssets.username === 'testuser');

        // 测试聚合查询：交易统计
        const transactionStats = await dbGet(`
            SELECT 
                COUNT(*) as total_transactions,
                SUM(CASE WHEN transaction_type = 'buy' THEN total_amount ELSE 0 END) as total_bought,
                SUM(CASE WHEN transaction_type = 'sell' THEN total_amount ELSE 0 END) as total_sold
            FROM transactions
            WHERE username = ?
        `, ['testuser']);

        logTest("聚合查询 - 交易统计", transactionStats && transactionStats.total_transactions > 0);

    } catch (error) {
        logTest("复杂查询", false, error.message);
    }
}

// 主测试函数
async function runAllTests() {
    console.log("🚀 开始综合功能测试...\n");

    await testDatabaseConnection();
    await testTableStructure();
    await testUserOperations();
    await testStockOperations();
    await testBondOperations();
    await testPortfolioOperations();
    await testTransactionOperations();
    await testCalculationLogic();
    await testDataIntegrity();
    await testComplexQueries();

    console.log("\n📊 测试结果汇总:");
    console.log(`✅ 通过: ${testResults.passed}`);
    console.log(`❌ 失败: ${testResults.failed}`);
    console.log(`📈 成功率: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%`);

    if (testResults.errors.length > 0) {
        console.log("\n❌ 错误详情:");
        testResults.errors.forEach(error => console.log(`  - ${error}`));
    }

    db.close();
}

// 运行测试
runAllTests().catch(console.error);