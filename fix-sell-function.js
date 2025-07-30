const mysql = require('mysql2/promise');
const axios = require('axios');

// 数据库配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '624135',
  database: 'investment_system'
};

const API_BASE = 'http://localhost:3015/api';

async function fixSellFunction() {
    let connection;
    
    try {
        console.log("🔧 修复卖出功能...\n");
        
        connection = await mysql.createConnection(dbConfig);
        console.log("✅ 数据库连接成功");
        
        // 1. 检查当前投资组合
        console.log("\n📋 检查当前投资组合:");
        const [portfolio] = await connection.query(`
            SELECT p.*, s.name as stock_name, s.symbol as stock_symbol, s.current_price as stock_price,
                   b.name as bond_name, b.symbol as bond_symbol, 
                   COALESCE(b.current_price, b.face_value) as bond_price
            FROM portfolio p
            LEFT JOIN stocks s ON p.asset_type = 'stock' AND p.asset_id = s.id
            LEFT JOIN bonds b ON p.asset_type = 'bond' AND p.asset_id = b.id
            WHERE p.user_id = 1 AND p.status = 1 AND p.asset_type != 'cash'
            ORDER BY p.id
        `);
        
        console.log(`   找到 ${portfolio.length} 项可卖出资产:`);
        portfolio.forEach((asset, index) => {
            const assetName = asset.stock_name || asset.bond_name || '未知';
            const assetSymbol = asset.stock_symbol || asset.bond_symbol || '未知';
            const currentPrice = asset.stock_price || asset.bond_price || asset.purchase_price;
            console.log(`   ${index + 1}. ID: ${asset.id}, ${asset.asset_type.toUpperCase()}: ${assetSymbol} - ${assetName}`);
            console.log(`      数量: ${asset.quantity}, 购买价: ¥${asset.purchase_price}, 当前价: ¥${currentPrice}`);
        });
        
        if (portfolio.length === 0) {
            console.log("   ❌ 没有可卖出的资产");
            return;
        }
        
        // 2. 测试API卖出功能
        console.log("\n🧪 测试API卖出功能:");
        
        // 选择第一个股票资产进行测试
        const testAsset = portfolio.find(asset => asset.asset_type === 'stock' && parseFloat(asset.quantity) >= 1);
        
        if (!testAsset) {
            console.log("   ⚠️  没有足够数量的股票可以测试");
            return;
        }
        
        console.log(`   测试资产: ${testAsset.stock_symbol} (ID: ${testAsset.id})`);
        console.log(`   当前数量: ${testAsset.quantity}`);
        
        // 获取用户当前现金
        const [users] = await connection.query('SELECT cash_balance FROM users WHERE id = 1');
        const originalCash = parseFloat(users[0].cash_balance);
        console.log(`   卖出前现金: ¥${originalCash.toFixed(2)}`);
        
        // 3. 通过API测试卖出
        try {
            const sellData = {
                assetId: testAsset.id,
                quantity: 0.1 // 卖出0.1股
            };
            
            console.log(`   发送卖出请求:`, sellData);
            
            const response = await axios.post(`${API_BASE}/portfolio/sell`, sellData, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            console.log(`   ✅ API响应状态: ${response.status}`);
            console.log(`   ✅ API响应数据:`, response.data);
            
            if (response.data.success) {
                console.log(`   ✅ 卖出成功！获得现金: ¥${response.data.amount.toFixed(2)}`);
                
                // 验证数据库更新
                const [updatedUsers] = await connection.query('SELECT cash_balance FROM users WHERE id = 1');
                const newCash = parseFloat(updatedUsers[0].cash_balance);
                console.log(`   ✅ 卖出后现金: ¥${newCash.toFixed(2)}`);
                
                const cashIncrease = newCash - originalCash;
                console.log(`   ✅ 现金增加: ¥${cashIncrease.toFixed(2)}`);
                
                // 检查资产数量更新
                const [updatedAsset] = await connection.query('SELECT quantity FROM portfolio WHERE id = ?', [testAsset.id]);
                if (updatedAsset.length > 0) {
                    const newQuantity = parseFloat(updatedAsset[0].quantity);
                    const originalQuantity = parseFloat(testAsset.quantity);
                    console.log(`   ✅ 资产数量: ${originalQuantity} → ${newQuantity}`);
                } else {
                    console.log(`   ✅ 资产已完全卖出（记录已删除）`);
                }
                
            } else {
                console.log(`   ❌ 卖出失败: ${response.data.error || '未知错误'}`);
            }
            
        } catch (apiError) {
            console.log(`   ❌ API调用失败:`, apiError.message);
            
            if (apiError.response) {
                console.log(`   响应状态: ${apiError.response.status}`);
                console.log(`   响应数据:`, apiError.response.data);
            }
        }
        
        // 4. 检查前端投资组合API
        console.log("\n📱 测试前端投资组合API:");
        
        try {
            const portfolioResponse = await axios.get(`${API_BASE}/portfolio`);
            console.log(`   ✅ 投资组合API状态: ${portfolioResponse.status}`);
            
            if (portfolioResponse.data.assets) {
                console.log(`   ✅ 返回资产数量: ${portfolioResponse.data.assets.length}`);
                
                // 检查资产数据结构
                const sampleAsset = portfolioResponse.data.assets[0];
                if (sampleAsset) {
                    console.log(`   ✅ 资产数据结构:`, {
                        id: sampleAsset.id,
                        name: sampleAsset.name,
                        type: sampleAsset.type,
                        symbol: sampleAsset.symbol,
                        quantity: sampleAsset.quantity,
                        current_price: sampleAsset.current_price
                    });
                }
            }
            
        } catch (portfolioError) {
            console.log(`   ❌ 投资组合API失败:`, portfolioError.message);
        }
        
        // 5. 检查可能的问题
        console.log("\n🔍 诊断可能的问题:");
        
        // 检查是否有无效的资产记录
        const [invalidAssets] = await connection.query(`
            SELECT p.* FROM portfolio p
            LEFT JOIN stocks s ON p.asset_type = 'stock' AND p.asset_id = s.id
            LEFT JOIN bonds b ON p.asset_type = 'bond' AND p.asset_id = b.id
            WHERE p.status = 1 AND p.asset_type != 'cash' 
            AND (
                (p.asset_type = 'stock' AND s.id IS NULL) OR
                (p.asset_type = 'bond' AND b.id IS NULL)
            )
        `);
        
        if (invalidAssets.length > 0) {
            console.log(`   ⚠️  发现 ${invalidAssets.length} 个无效资产记录:`);
            invalidAssets.forEach(asset => {
                console.log(`      ID: ${asset.id}, 类型: ${asset.asset_type}, 资产ID: ${asset.asset_id}`);
            });
        } else {
            console.log(`   ✅ 没有发现无效资产记录`);
        }
        
        // 检查数据类型问题
        const [dataTypeIssues] = await connection.query(`
            SELECT id, quantity, purchase_price 
            FROM portfolio 
            WHERE status = 1 AND (
                quantity IS NULL OR 
                purchase_price IS NULL OR 
                quantity <= 0 OR 
                purchase_price <= 0
            )
        `);
        
        if (dataTypeIssues.length > 0) {
            console.log(`   ⚠️  发现 ${dataTypeIssues.length} 个数据类型问题:`);
            dataTypeIssues.forEach(asset => {
                console.log(`      ID: ${asset.id}, 数量: ${asset.quantity}, 价格: ${asset.purchase_price}`);
            });
        } else {
            console.log(`   ✅ 没有发现数据类型问题`);
        }
        
        console.log("\n🎯 修复建议:");
        console.log("1. 确保服务器正在运行 (npm start)");
        console.log("2. 检查浏览器控制台是否有JavaScript错误");
        console.log("3. 确认前端发送的请求数据格式正确");
        console.log("4. 检查网络连接和API响应时间");
        
    } catch (error) {
        console.error("❌ 修复过程中发生错误:", error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// 检查服务器状态
async function checkServerStatus() {
    try {
        const response = await axios.get(`${API_BASE}/test`, { timeout: 5000 });
        console.log("✅ 服务器运行正常");
        return true;
    } catch (error) {
        console.log("❌ 服务器未运行或无法连接");
        console.log("请先启动服务器: cd LittleBankXA && npm start");
        return false;
    }
}

async function main() {
    console.log("🚀 开始修复卖出功能...\n");
    
    const serverRunning = await checkServerStatus();
    if (serverRunning) {
        await fixSellFunction();
    }
    
    console.log("\n✅ 修复完成！");
}

main().catch(console.error);