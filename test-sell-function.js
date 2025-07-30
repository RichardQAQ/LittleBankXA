const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '624135',
  database: 'investment_system'
};

async function testSellFunction() {
    let connection;
    
    try {
        console.log("🔍 诊断卖出功能问题...\n");
        
        connection = await mysql.createConnection(dbConfig);
        console.log("✅ 数据库连接成功");
        
        // 1. 查看当前投资组合
        console.log("\n📋 当前投资组合:");
        const [portfolio] = await connection.query(`
            SELECT p.*, s.name as stock_name, s.symbol as stock_symbol, s.current_price as stock_price,
                   b.name as bond_name, b.symbol as bond_symbol, 
                   COALESCE(b.current_price, b.face_value) as bond_price
            FROM portfolio p
            LEFT JOIN stocks s ON p.asset_type = 'stock' AND p.asset_id = s.id
            LEFT JOIN bonds b ON p.asset_type = 'bond' AND p.asset_id = b.id
            WHERE p.user_id = 1 AND p.status = 1
            ORDER BY p.id
        `);
        
        console.log(`   找到 ${portfolio.length} 项资产:`);
        portfolio.forEach((asset, index) => {
            const assetName = asset.stock_name || asset.bond_name || '现金';
            const assetSymbol = asset.stock_symbol || asset.bond_symbol || 'CASH';
            console.log(`   ${index + 1}. ID: ${asset.id}, 类型: ${asset.asset_type}, 代码: ${assetSymbol}, 名称: ${assetName}, 数量: ${asset.quantity}`);
        });
        
        if (portfolio.length === 0) {
            console.log("   ❌ 没有可卖出的资产");
            return;
        }
        
        // 2. 测试卖出逻辑
        const testAsset = portfolio.find(asset => asset.asset_type === 'stock' && parseFloat(asset.quantity) > 1);
        
        if (!testAsset) {
            console.log("   ⚠️  没有足够数量的股票可以测试卖出");
            return;
        }
        
        console.log(`\n🧪 测试卖出资产: ${testAsset.stock_symbol} (ID: ${testAsset.id})`);
        console.log(`   当前数量: ${testAsset.quantity}`);
        console.log(`   当前价格: ¥${testAsset.stock_price}`);
        
        // 3. 模拟卖出操作
        const sellQuantity = 1; // 卖出1股
        const currentQuantity = parseFloat(testAsset.quantity);
        const currentPrice = parseFloat(testAsset.stock_price);
        const sellAmount = sellQuantity * currentPrice;
        
        console.log(`   计划卖出数量: ${sellQuantity}`);
        console.log(`   预期获得金额: ¥${sellAmount.toFixed(2)}`);
        
        // 4. 检查用户当前现金余额
        const [users] = await connection.query('SELECT cash_balance FROM users WHERE id = 1');
        const originalCash = parseFloat(users[0].cash_balance);
        console.log(`   用户当前现金: ¥${originalCash.toFixed(2)}`);
        
        // 5. 执行卖出操作
        await connection.beginTransaction();
        
        try {
            if (sellQuantity === currentQuantity) {
                // 全部卖出，更新状态为0
                await connection.query('UPDATE portfolio SET status = 0 WHERE id = ?', [testAsset.id]);
                console.log("   ✅ 全部卖出，资产状态已更新为0");
            } else {
                // 部分卖出，更新数量
                const remainingQuantity = currentQuantity - sellQuantity;
                await connection.query('UPDATE portfolio SET quantity = ? WHERE id = ?', [remainingQuantity, testAsset.id]);
                console.log(`   ✅ 部分卖出，剩余数量: ${remainingQuantity}`);
            }
            
            // 更新用户现金余额
            await connection.query('UPDATE users SET cash_balance = cash_balance + ? WHERE id = ?', [sellAmount, 1]);
            console.log(`   ✅ 现金余额已增加 ¥${sellAmount.toFixed(2)}`);
            
            // 检查更新后的状态
            const [updatedUsers] = await connection.query('SELECT cash_balance FROM users WHERE id = 1');
            const newCash = parseFloat(updatedUsers[0].cash_balance);
            console.log(`   ✅ 更新后现金: ¥${newCash.toFixed(2)}`);
            
            // 验证计算是否正确
            const expectedCash = originalCash + sellAmount;
            if (Math.abs(newCash - expectedCash) < 0.01) {
                console.log("   ✅ 现金计算正确");
            } else {
                console.log(`   ❌ 现金计算错误，期望: ¥${expectedCash.toFixed(2)}, 实际: ¥${newCash.toFixed(2)}`);
            }
            
            // 提交事务
            await connection.commit();
            console.log("   ✅ 卖出操作成功完成");
            
        } catch (error) {
            await connection.rollback();
            console.log(`   ❌ 卖出操作失败: ${error.message}`);
        }
        
        // 6. 验证卖出后的投资组合
        console.log("\n📋 卖出后的投资组合:");
        const [updatedPortfolio] = await connection.query(`
            SELECT p.*, s.name as stock_name, s.symbol as stock_symbol
            FROM portfolio p
            LEFT JOIN stocks s ON p.asset_type = 'stock' AND p.asset_id = s.id
            WHERE p.user_id = 1 AND p.status = 1
            ORDER BY p.id
        `);
        
        console.log(`   剩余资产数量: ${updatedPortfolio.length}`);
        updatedPortfolio.forEach((asset, index) => {
            const assetName = asset.stock_name || '其他资产';
            const assetSymbol = asset.stock_symbol || '未知';
            console.log(`   ${index + 1}. ID: ${asset.id}, 代码: ${assetSymbol}, 名称: ${assetName}, 数量: ${asset.quantity}`);
        });
        
    } catch (error) {
        console.error("❌ 测试过程中发生错误:", error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testSellFunction();