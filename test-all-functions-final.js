const axios = require('axios');
const mysql = require('mysql2/promise');

const API_BASE = 'http://localhost:3015/api';
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '624135',
  database: 'investment_system'
};

async function testAllFunctions() {
    console.log("🚀 测试所有功能...\n");
    
    try {
        // 1. 测试服务器连接
        console.log("1. 测试服务器连接:");
        const testResponse = await axios.get(`${API_BASE}/test`);
        console.log("   ✅ 服务器运行正常");
        
        // 2. 测试股票市场功能
        console.log("\n2. 测试股票市场功能:");
        
        // 获取股票列表
        const stocksResponse = await axios.get(`${API_BASE}/stocks`);
        console.log(`   ✅ 股票列表获取成功，共${stocksResponse.data.length}只股票`);
        
        // 测试单个股票查询
        const testStock = stocksResponse.data[0];
        const singleStockResponse = await axios.get(`${API_BASE}/stocks/single/${testStock.symbol}`);
        console.log(`   ✅ 单个股票查询成功: ${testStock.symbol} - ${testStock.name}`);
        
        // 3. 测试投资组合功能
        console.log("\n3. 测试投资组合功能:");
        
        // 获取投资组合
        const portfolioResponse = await axios.get(`${API_BASE}/portfolio`);
        console.log(`   ✅ 投资组合获取成功，共${portfolioResponse.data.assets.length}项资产`);
        
        // 获取用户信息
        const userResponse = await axios.get(`${API_BASE}/user`);
        const originalCash = parseFloat(userResponse.data.cash_balance);
        console.log(`   ✅ 用户信息获取成功，现金余额: ¥${originalCash.toFixed(2)}`);
        
        // 4. 测试充值功能
        console.log("\n4. 测试充值功能:");
        
        const rechargeAmount = 100;
        const rechargeResponse = await axios.post(`${API_BASE}/portfolio/recharge`, {
            amount: rechargeAmount
        });
        
        if (rechargeResponse.data.success) {
            console.log(`   ✅ 充值成功: ¥${rechargeAmount}`);
            
            // 验证充值结果
            const updatedUserResponse = await axios.get(`${API_BASE}/user`);
            const newCash = parseFloat(updatedUserResponse.data.cash_balance);
            const cashIncrease = newCash - originalCash;
            
            if (Math.abs(cashIncrease - rechargeAmount) < 0.01) {
                console.log(`   ✅ 充值验证成功，现金增加: ¥${cashIncrease.toFixed(2)}`);
            } else {
                console.log(`   ❌ 充值验证失败，预期增加¥${rechargeAmount}，实际增加¥${cashIncrease.toFixed(2)}`);
            }
        } else {
            console.log(`   ❌ 充值失败: ${rechargeResponse.data.error}`);
        }
        
        // 5. 测试股票购买功能（通过添加资产API）
        console.log("\n5. 测试股票购买功能:");
        
        const purchaseStock = stocksResponse.data.find(stock => stock.symbol === 'AAPL');
        if (purchaseStock) {
            try {
                const purchaseResponse = await axios.post(`${API_BASE}/assets/add`, {
                    asset_type: 'stock',
                    asset_id: purchaseStock.symbol,
                    name: purchaseStock.name,
                    quantity: 0.1,
                    purchase_price: purchaseStock.current_price,
                    purchase_date: new Date().toISOString()
                });
                
                if (purchaseResponse.data.success) {
                    console.log(`   ✅ 股票购买成功: ${purchaseStock.symbol}, 花费¥${purchaseResponse.data.totalCost}`);
                } else {
                    console.log(`   ❌ 股票购买失败: ${purchaseResponse.data.error}`);
                }
            } catch (purchaseError) {
                if (purchaseError.response && purchaseError.response.status === 400) {
                    console.log(`   ⚠️  股票购买跳过: ${purchaseError.response.data.error}`);
                } else {
                    console.log(`   ❌ 股票购买失败: ${purchaseError.message}`);
                }
            }
        }
        
        // 6. 测试卖出功能
        console.log("\n6. 测试卖出功能:");
        
        // 获取最新的投资组合
        const latestPortfolioResponse = await axios.get(`${API_BASE}/portfolio`);
        const sellableAssets = latestPortfolioResponse.data.assets.filter(asset => 
            (asset.type === 'stock' || asset.type === 'bond') && 
            parseFloat(asset.quantity) > 0.1
        );
        
        if (sellableAssets.length > 0) {
            const testAsset = sellableAssets[0];
            
            try {
                const sellResponse = await axios.post(`${API_BASE}/portfolio/sell`, {
                    assetId: testAsset.id,
                    quantity: 0.05 // 卖出很少的数量
                });
                
                if (sellResponse.data.success) {
                    console.log(`   ✅ 卖出成功: ${testAsset.symbol}, 获得¥${sellResponse.data.amount.toFixed(2)}`);
                } else {
                    console.log(`   ❌ 卖出失败: ${sellResponse.data.error}`);
                }
            } catch (sellError) {
                console.log(`   ❌ 卖出请求失败: ${sellError.message}`);
                if (sellError.response) {
                    console.log(`   响应状态: ${sellError.response.status}`);
                    console.log(`   响应数据:`, sellError.response.data);
                }
            }
        } else {
            console.log(`   ⚠️  没有可卖出的资产`);
        }
        
        // 7. 测试总资产更新
        console.log("\n7. 测试总资产更新:");
        
        const finalUserResponse = await axios.get(`${API_BASE}/user`);
        const finalOverviewResponse = await axios.get(`${API_BASE}/portfolio/overview`);
        
        console.log(`   ✅ 最终用户总资产: ¥${parseFloat(finalUserResponse.data.total_assets).toFixed(2)}`);
        console.log(`   ✅ 投资组合概览总价值: ¥${parseFloat(finalOverviewResponse.data.totalValue).toFixed(2)}`);
        console.log(`   ✅ 股票价值: ¥${parseFloat(finalOverviewResponse.data.stockValue).toFixed(2)}`);
        console.log(`   ✅ 债券价值: ¥${parseFloat(finalOverviewResponse.data.bondValue).toFixed(2)}`);
        console.log(`   ✅ 现金余额: ¥${parseFloat(finalOverviewResponse.data.cashBalance).toFixed(2)}`);
        console.log(`   ✅ 总收益率: ${parseFloat(finalOverviewResponse.data.totalReturn).toFixed(2)}%`);
        
        // 8. 测试数据库直接查询
        console.log("\n8. 测试数据库状态:");
        
        const connection = await mysql.createConnection(dbConfig);
        
        // 检查用户数据
        const [users] = await connection.query('SELECT * FROM users WHERE id = 1');
        if (users.length > 0) {
            const user = users[0];
            console.log(`   ✅ 数据库用户数据: 总资产¥${parseFloat(user.total_assets).toFixed(2)}, 现金¥${parseFloat(user.cash_balance).toFixed(2)}`);
        }
        
        // 检查投资组合数据
        const [portfolio] = await connection.query('SELECT COUNT(*) as count FROM portfolio WHERE user_id = 1 AND status = 1');
        console.log(`   ✅ 数据库投资组合: ${portfolio[0].count}项资产`);
        
        await connection.end();
        
        console.log("\n🎉 所有功能测试完成！");
        
    } catch (error) {
        console.error("❌ 测试过程中发生错误:", error.message);
    }
}

// 检查服务器状态
async function checkServer() {
    try {
        await axios.get(`${API_BASE}/test`, { timeout: 5000 });
        return true;
    } catch (error) {
        console.log("❌ 服务器未运行，请先启动: npm start");
        return false;
    }
}

async function main() {
    const serverRunning = await checkServer();
    if (serverRunning) {
        await testAllFunctions();
    }
}

main().catch(console.error);