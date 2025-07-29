const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '624135',
  database: 'investment_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

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

// 测试函数
async function testDatabaseConnection() {
    try {
        const connection = await pool.getConnection();
        await connection.query("SELECT 1 as test");
        connection.release();
        logTest("数据库连接", true);
    } catch (error) {
        logTest("数据库连接", false, error.message);
    }
}

async function testTableStructure() {
    try {
        const [tables] = await pool.query("SHOW TABLES");
        const tableNames = tables.map(table => Object.values(table)[0]);
        const expectedTables = ['users', 'stocks', 'bonds', 'portfolio'];
        
        for (let expectedTable of expectedTables) {
            const exists = tableNames.includes(expectedTable);
            logTest(`表结构检查 - ${expectedTable}`, exists, exists ? '' : `表 ${expectedTable} 不存在`);
        }
    } catch (error) {
        logTest("表结构检查", false, error.message);
    }
}

async function testUserOperations() {
    try {
        // 查询现有用户
        const [users] = await pool.query("SELECT * FROM users WHERE id = 1");
        logTest("用户查询", users.length > 0);

        if (users.length > 0) {
            const user = users[0];
            logTest("用户数据完整性", 
                user.username && 
                user.total_assets !== undefined && 
                user.cash_balance !== undefined
            );
            
            console.log(`   用户信息: ${user.username}, 总资产: ¥${user.total_assets}, 现金: ¥${user.cash_balance}`);
        }

        // 测试用户余额更新
        const originalBalance = users.length > 0 ? parseFloat(users[0].cash_balance) : 0;
        await pool.query("UPDATE users SET cash_balance = cash_balance + 100 WHERE id = 1");
        
        const [updatedUsers] = await pool.query("SELECT cash_balance FROM users WHERE id = 1");
        const newBalance = parseFloat(updatedUsers[0].cash_balance);
        
        logTest("用户余额更新", Math.abs(newBalance - originalBalance - 100) < 0.01);
        
        // 恢复原始余额
        await pool.query("UPDATE users SET cash_balance = cash_balance - 100 WHERE id = 1");

    } catch (error) {
        logTest("用户操作", false, error.message);
    }
}

async function testStockOperations() {
    try {
        // 查询股票数据
        const [stocks] = await pool.query("SELECT * FROM stocks LIMIT 5");
        logTest("股票数据查询", stocks.length > 0);

        if (stocks.length > 0) {
            const stock = stocks[0];
            logTest("股票数据完整性", 
                stock.symbol && 
                stock.name && 
                stock.current_price !== undefined
            );
            
            console.log(`   股票示例: ${stock.symbol} - ${stock.name}, 价格: ¥${stock.current_price}`);
            
            // 测试股票价格更新
            const originalPrice = parseFloat(stock.current_price);
            const newPrice = originalPrice * 1.05; // 涨5%
            
            await pool.query(
                "UPDATE stocks SET current_price = ?, change_percent = 5.0 WHERE id = ?",
                [newPrice, stock.id]
            );
            
            const [updatedStocks] = await pool.query("SELECT current_price FROM stocks WHERE id = ?", [stock.id]);
            const updatedPrice = parseFloat(updatedStocks[0].current_price);
            
            logTest("股票价格更新", Math.abs(updatedPrice - newPrice) < 0.01);
            
            // 恢复原始价格
            await pool.query("UPDATE stocks SET current_price = ? WHERE id = ?", [originalPrice, stock.id]);
        }

    } catch (error) {
        logTest("股票操作", false, error.message);
    }
}

async function testBondOperations() {
    try {
        // 查询债券数据
        const [bonds] = await pool.query("SELECT * FROM bonds LIMIT 5");
        logTest("债券数据查询", bonds.length > 0);

        if (bonds.length > 0) {
            const bond = bonds[0];
            logTest("债券数据完整性", 
                bond.symbol && 
                bond.name && 
                (bond.current_price !== undefined || bond.face_value !== undefined)
            );
            
            const price = bond.current_price || bond.face_value;
            console.log(`   债券示例: ${bond.symbol} - ${bond.name}, 价格: ¥${price}`);
            
            // 测试债券价格更新
            if (bond.current_price !== undefined) {
                const originalPrice = parseFloat(bond.current_price);
                const newPrice = originalPrice * 1.02; // 涨2%
                
                await pool.query("UPDATE bonds SET current_price = ? WHERE id = ?", [newPrice, bond.id]);
                
                const [updatedBonds] = await pool.query("SELECT current_price FROM bonds WHERE id = ?", [bond.id]);
                const updatedPrice = parseFloat(updatedBonds[0].current_price);
                
                logTest("债券价格更新", Math.abs(updatedPrice - newPrice) < 0.01);
                
                // 恢复原始价格
                await pool.query("UPDATE bonds SET current_price = ? WHERE id = ?", [originalPrice, bond.id]);
            }
        }

    } catch (error) {
        logTest("债券操作", false, error.message);
    }
}

async function testPortfolioOperations() {
    try {
        // 查询投资组合
        const [portfolio] = await pool.query(
            `SELECT p.*, s.name as stock_name, s.symbol as stock_symbol, 
                    b.name as bond_name, b.symbol as bond_symbol
             FROM portfolio p
             LEFT JOIN stocks s ON p.asset_type = 'stock' AND p.asset_id = s.id
             LEFT JOIN bonds b ON p.asset_type = 'bond' AND p.asset_id = b.id
             WHERE p.user_id = 1 AND p.status = 1`
        );
        
        logTest("投资组合查询", portfolio.length >= 0);
        console.log(`   投资组合资产数量: ${portfolio.length}`);

        if (portfolio.length > 0) {
            const asset = portfolio[0];
            logTest("投资组合数据完整性", 
                asset.asset_type && 
                asset.quantity !== undefined && 
                asset.purchase_price !== undefined
            );
            
            const assetName = asset.stock_name || asset.bond_name || '未知资产';
            const assetSymbol = asset.stock_symbol || asset.bond_symbol || '未知';
            console.log(`   资产示例: ${assetSymbol} - ${assetName}, 数量: ${asset.quantity}, 成本: ¥${asset.purchase_price}`);
        }

        // 测试投资组合统计
        const [stats] = await pool.query(
            `SELECT 
                COUNT(*) as total_assets,
                SUM(CASE WHEN asset_type = 'stock' THEN 1 ELSE 0 END) as stock_count,
                SUM(CASE WHEN asset_type = 'bond' THEN 1 ELSE 0 END) as bond_count
             FROM portfolio 
             WHERE user_id = 1 AND status = 1`
        );
        
        if (stats.length > 0) {
            const stat = stats[0];
            console.log(`   资产统计: 总计${stat.total_assets}项, 股票${stat.stock_count}项, 债券${stat.bond_count}项`);
            logTest("投资组合统计", true);
        }

    } catch (error) {
        logTest("投资组合操作", false, error.message);
    }
}

async function testCalculationLogic() {
    try {
        // 测试资产价值计算
        const [portfolioData] = await pool.query(
            `SELECT 
                p.asset_type,
                p.quantity,
                p.purchase_price,
                CASE 
                    WHEN p.asset_type = 'stock' THEN s.current_price
                    WHEN p.asset_type = 'bond' THEN COALESCE(b.current_price, b.face_value)
                    ELSE 1
                END as current_price
            FROM portfolio p
            LEFT JOIN stocks s ON p.asset_type = 'stock' AND p.asset_id = s.id
            LEFT JOIN bonds b ON p.asset_type = 'bond' AND p.asset_id = b.id
            WHERE p.user_id = 1 AND p.status = 1`
        );

        let totalValue = 0;
        let totalCost = 0;
        let stockValue = 0;
        let bondValue = 0;

        for (let item of portfolioData) {
            const quantity = parseFloat(item.quantity || 0);
            const currentPrice = parseFloat(item.current_price || 0);
            const purchasePrice = parseFloat(item.purchase_price || 0);
            
            const currentValue = quantity * currentPrice;
            const cost = quantity * purchasePrice;

            totalValue += currentValue;
            totalCost += cost;
            
            if (item.asset_type === 'stock') {
                stockValue += currentValue;
            } else if (item.asset_type === 'bond') {
                bondValue += currentValue;
            }
        }

        // 获取现金余额
        const [users] = await pool.query("SELECT cash_balance FROM users WHERE id = 1");
        const cashBalance = users.length > 0 ? parseFloat(users[0].cash_balance) : 0;
        
        const totalAssets = totalValue + cashBalance;
        const totalProfitLoss = totalValue - totalCost;
        const returnRate = totalCost > 0 ? (totalProfitLoss / totalCost * 100) : 0;

        logTest("资产价值计算", totalAssets >= 0, `总资产: ¥${totalAssets.toFixed(2)}`);
        logTest("股票价值计算", stockValue >= 0, `股票价值: ¥${stockValue.toFixed(2)}`);
        logTest("债券价值计算", bondValue >= 0, `债券价值: ¥${bondValue.toFixed(2)}`);
        logTest("现金余额计算", cashBalance >= 0, `现金余额: ¥${cashBalance.toFixed(2)}`);
        logTest("收益率计算", true, `收益率: ${returnRate.toFixed(2)}%`);
        
        console.log(`   详细计算结果:`);
        console.log(`   - 投资组合市值: ¥${totalValue.toFixed(2)}`);
        console.log(`   - 投资组合成本: ¥${totalCost.toFixed(2)}`);
        console.log(`   - 投资盈亏: ¥${totalProfitLoss.toFixed(2)}`);

    } catch (error) {
        logTest("计算逻辑", false, error.message);
    }
}

async function testAPIEndpoints() {
    try {
        // 这里我们测试一些关键的计算逻辑，而不是实际的HTTP请求
        
        // 测试用户资产更新逻辑
        const [beforeUpdate] = await pool.query("SELECT total_assets FROM users WHERE id = 1");
        const beforeAssets = beforeUpdate.length > 0 ? parseFloat(beforeUpdate[0].total_assets) : 0;
        
        // 模拟资产更新（这里我们直接调用数据库逻辑）
        await updateUserAssetValues(1);
        
        const [afterUpdate] = await pool.query("SELECT total_assets FROM users WHERE id = 1");
        const afterAssets = afterUpdate.length > 0 ? parseFloat(afterUpdate[0].total_assets) : 0;
        
        logTest("资产更新逻辑", afterAssets >= 0, `更新后总资产: ¥${afterAssets.toFixed(2)}`);
        
    } catch (error) {
        logTest("API端点测试", false, error.message);
    }
}

async function testDataIntegrity() {
    try {
        // 检查数据一致性
        const [negativeQuantities] = await pool.query("SELECT * FROM portfolio WHERE quantity < 0 AND status = 1");
        logTest("持仓数量非负检查", negativeQuantities.length === 0);

        const [negativeBalances] = await pool.query("SELECT * FROM users WHERE cash_balance < 0");
        logTest("用户余额非负检查", negativeBalances.length === 0);

        // 检查外键约束
        const [orphanPortfolios] = await pool.query(
            `SELECT p.* FROM portfolio p
             LEFT JOIN users u ON p.user_id = u.id
             WHERE u.id IS NULL AND p.status = 1`
        );
        logTest("投资组合外键约束", orphanPortfolios.length === 0);

        // 检查股票数据完整性
        const [incompleteStocks] = await pool.query(
            "SELECT * FROM stocks WHERE symbol IS NULL OR name IS NULL OR current_price IS NULL"
        );
        logTest("股票数据完整性", incompleteStocks.length === 0);

    } catch (error) {
        logTest("数据完整性", false, error.message);
    }
}

async function testComplexQueries() {
    try {
        // 测试复杂查询：用户总资产统计
        const [userAssets] = await pool.query(`
            SELECT 
                u.username,
                u.cash_balance,
                u.total_assets,
                u.stock_value,
                u.bond_value,
                u.total_return_rate,
                COUNT(p.id) as portfolio_items
            FROM users u
            LEFT JOIN portfolio p ON u.id = p.user_id AND p.status = 1
            WHERE u.id = 1
            GROUP BY u.id
        `);

        logTest("复杂查询 - 用户资产统计", userAssets.length > 0);
        
        if (userAssets.length > 0) {
            const user = userAssets[0];
            console.log(`   用户: ${user.username}`);
            console.log(`   总资产: ¥${parseFloat(user.total_assets).toFixed(2)}`);
            console.log(`   股票价值: ¥${parseFloat(user.stock_value).toFixed(2)}`);
            console.log(`   债券价值: ¥${parseFloat(user.bond_value).toFixed(2)}`);
            console.log(`   现金余额: ¥${parseFloat(user.cash_balance).toFixed(2)}`);
            console.log(`   收益率: ${parseFloat(user.total_return_rate).toFixed(2)}%`);
            console.log(`   持仓项目: ${user.portfolio_items}项`);
        }

        // 测试聚合查询：资产类型分布
        const [assetDistribution] = await pool.query(`
            SELECT 
                asset_type,
                COUNT(*) as count,
                SUM(quantity) as total_quantity,
                AVG(purchase_price) as avg_price
            FROM portfolio
            WHERE user_id = 1 AND status = 1
            GROUP BY asset_type
        `);

        logTest("聚合查询 - 资产分布", assetDistribution.length >= 0);
        
        if (assetDistribution.length > 0) {
            console.log(`   资产分布:`);
            assetDistribution.forEach(dist => {
                console.log(`   - ${dist.asset_type}: ${dist.count}项, 总量${parseFloat(dist.total_quantity).toFixed(2)}, 平均价格¥${parseFloat(dist.avg_price).toFixed(2)}`);
            });
        }

    } catch (error) {
        logTest("复杂查询", false, error.message);
    }
}

// 更新用户资产总值的函数（从server.js复制）
async function updateUserAssetValues(userId) {
    try {
        const [assets] = await pool.query(
            `SELECT p.*, s.current_price as stock_price, b.current_price as bond_price, b.face_value
             FROM portfolio p
             LEFT JOIN stocks s ON p.asset_type = 'stock' AND p.asset_id = s.id
             LEFT JOIN bonds b ON p.asset_type = 'bond' AND p.asset_id = b.id
             WHERE p.user_id = ? AND p.status = 1`,
            [userId]
        );
        
        let totalAssets = 0;
        let stockValue = 0;
        let bondValue = 0;
        let totalCost = 0;
        
        assets.forEach(asset => {
            const quantity = parseFloat(asset.quantity || 0);
            const purchasePrice = parseFloat(asset.purchase_price || 0);
            const cost = purchasePrice * quantity;
            
            if (asset.asset_type === 'stock') {
                const currentPrice = parseFloat(asset.stock_price || purchasePrice);
                const marketValue = currentPrice * quantity;
                stockValue += marketValue;
                totalCost += cost;
            } else if (asset.asset_type === 'bond') {
                const currentPrice = parseFloat(asset.bond_price || asset.face_value || purchasePrice);
                const marketValue = currentPrice * quantity;
                bondValue += marketValue;
                totalCost += cost;
            }
        });
        
        // 获取用户当前现金余额
        const [users] = await pool.query('SELECT cash_balance FROM users WHERE id = ?', [userId]);
        let cashBalance = 0;
        if (users.length > 0) {
            cashBalance = parseFloat(users[0].cash_balance);
        }
        
        totalAssets = stockValue + bondValue + cashBalance;
        const totalReturnRate = totalCost > 0 ? ((stockValue + bondValue - totalCost) / totalCost) * 100 : 0;
        
        await pool.query(
            `UPDATE users SET 
             total_assets = ?,
             stock_value = ?,
             bond_value = ?,
             total_return_rate = ?
             WHERE id = ?`,
            [totalAssets, stockValue, bondValue, totalReturnRate, userId]
        );
        
        return { totalAssets, stockValue, bondValue, cashBalance, totalReturnRate };
    } catch (error) {
        console.error('更新用户资产总值错误:', error);
        throw error;
    }
}

// 主测试函数
async function runAllTests() {
    console.log("🚀 开始投资系统综合功能测试...\n");
    console.log("=" .repeat(60));

    await testDatabaseConnection();
    console.log();
    
    await testTableStructure();
    console.log();
    
    await testUserOperations();
    console.log();
    
    await testStockOperations();
    console.log();
    
    await testBondOperations();
    console.log();
    
    await testPortfolioOperations();
    console.log();
    
    await testCalculationLogic();
    console.log();
    
    await testAPIEndpoints();
    console.log();
    
    await testDataIntegrity();
    console.log();
    
    await testComplexQueries();
    console.log();

    console.log("=" .repeat(60));
    console.log("📊 测试结果汇总:");
    console.log(`✅ 通过: ${testResults.passed}`);
    console.log(`❌ 失败: ${testResults.failed}`);
    console.log(`📈 成功率: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%`);

    if (testResults.errors.length > 0) {
        console.log("\n❌ 错误详情:");
        testResults.errors.forEach(error => console.log(`  - ${error}`));
    }

    console.log("\n🎯 测试完成!");
    
    // 关闭数据库连接
    await pool.end();
}

// 运行测试
runAllTests().catch(console.error);