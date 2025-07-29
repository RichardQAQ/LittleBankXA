const axios = require('axios');

const API_BASE = 'http://localhost:3015/api';

async function quickCheck() {
    console.log("🚀 快速功能检查...\n");
    
    try {
        // 1. 检查服务器
        console.log("1. 服务器状态:");
        const testResponse = await axios.get(`${API_BASE}/test`);
        console.log("   ✅ 服务器正常运行");
        
        // 2. 检查用户信息
        console.log("\n2. 用户信息:");
        const userResponse = await axios.get(`${API_BASE}/user`);
        const user = userResponse.data;
        console.log(`   用户: ${user.username}`);
        console.log(`   总资产: ¥${parseFloat(user.total_assets).toFixed(2)}`);
        console.log(`   现金余额: ¥${parseFloat(user.cash_balance).toFixed(2)}`);
        
        // 3. 检查投资组合
        console.log("\n3. 投资组合:");
        const portfolioResponse = await axios.get(`${API_BASE}/portfolio`);
        const assets = portfolioResponse.data.assets;
        console.log(`   资产数量: ${assets.length}项`);
        
        // 4. 测试充值功能
        console.log("\n4. 测试充值功能:");
        const originalCash = parseFloat(user.cash_balance);
        
        const rechargeResponse = await axios.post(`${API_BASE}/portfolio/recharge`, {
            amount: 50
        });
        
        if (rechargeResponse.data.success) {
            console.log("   ✅ 充值API调用成功");
            
            // 验证充值结果
            const updatedUserResponse = await axios.get(`${API_BASE}/user`);
            const newCash = parseFloat(updatedUserResponse.data.cash_balance);
            const increase = newCash - originalCash;
            
            if (Math.abs(increase - 50) < 0.01) {
                console.log(`   ✅ 充值验证成功，现金增加: ¥${increase.toFixed(2)}`);
            } else {
                console.log(`   ❌ 充值验证失败，预期增加¥50，实际增加¥${increase.toFixed(2)}`);
            }
        } else {
            console.log(`   ❌ 充值失败: ${rechargeResponse.data.error}`);
        }
        
        // 5. 测试股票市场
        console.log("\n5. 股票市场:");
        const stocksResponse = await axios.get(`${API_BASE}/stocks`);
        console.log(`   ✅ 股票列表: ${stocksResponse.data.length}只股票`);
        
        if (stocksResponse.data.length > 0) {
            const testStock = stocksResponse.data[0];
            const singleStockResponse = await axios.get(`${API_BASE}/stocks/single/${testStock.symbol}`);
            console.log(`   ✅ 单个股票查询: ${testStock.symbol} - ¥${singleStockResponse.data.current_price}`);
        }
        
        // 6. 测试卖出功能
        console.log("\n6. 卖出功能:");
        const sellableAssets = assets.filter(asset => 
            (asset.type === 'stock' || asset.type === 'bond') && 
            parseFloat(asset.quantity) > 0.1
        );
        
        if (sellableAssets.length > 0) {
            const testAsset = sellableAssets[0];
            console.log(`   测试资产: ${testAsset.symbol} - ${testAsset.name}`);
            console.log(`   当前数量: ${testAsset.quantity}`);
            
            try {
                const sellResponse = await axios.post(`${API_BASE}/portfolio/sell`, {
                    assetId: testAsset.id,
                    quantity: 0.01 // 卖出很少的数量
                });
                
                if (sellResponse.data.success) {
                    console.log(`   ✅ 卖出成功，获得: ¥${sellResponse.data.amount.toFixed(2)}`);
                } else {
                    console.log(`   ❌ 卖出失败: ${sellResponse.data.error}`);
                }
            } catch (sellError) {
                console.log(`   ❌ 卖出请求失败: ${sellError.message}`);
            }
        } else {
            console.log("   ⚠️  没有可卖出的资产");
        }
        
        // 7. 最终状态检查
        console.log("\n7. 最终状态:");
        const finalUserResponse = await axios.get(`${API_BASE}/user`);
        const finalUser = finalUserResponse.data;
        console.log(`   总资产: ¥${parseFloat(finalUser.total_assets).toFixed(2)}`);
        console.log(`   现金余额: ¥${parseFloat(finalUser.cash_balance).toFixed(2)}`);
        console.log(`   收益率: ${parseFloat(finalUser.total_return_rate).toFixed(2)}%`);
        
        console.log("\n🎉 功能检查完成！");
        
    } catch (error) {
        console.error("❌ 检查过程中发生错误:", error.message);
        if (error.response) {
            console.error("响应状态:", error.response.status);
            console.error("响应数据:", error.response.data);
        }
    }
}

quickCheck();