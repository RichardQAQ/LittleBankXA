const axios = require('axios');

const API_BASE = 'http://localhost:3015/api';

async function quickSellTest() {
    try {
        console.log("🚀 快速卖出功能测试...\n");
        
        // 1. 检查服务器状态
        console.log("1. 检查服务器状态:");
        try {
            const testResponse = await axios.get(`${API_BASE}/test`);
            console.log("   ✅ 服务器运行正常");
        } catch (error) {
            console.log("   ❌ 服务器未运行，请先启动: npm start");
            return;
        }
        
        // 2. 获取投资组合
        console.log("\n2. 获取投资组合:");
        const portfolioResponse = await axios.get(`${API_BASE}/portfolio`);
        const assets = portfolioResponse.data.assets;
        
        console.log(`   找到 ${assets.length} 项资产`);
        
        // 找到可卖出的股票
        const sellableStocks = assets.filter(asset => 
            asset.type === 'stock' && 
            parseFloat(asset.quantity) > 0.1
        );
        
        if (sellableStocks.length === 0) {
            console.log("   ❌ 没有可卖出的股票");
            return;
        }
        
        const testStock = sellableStocks[0];
        console.log(`   选择测试股票: ${testStock.symbol} - ${testStock.name}`);
        console.log(`   当前数量: ${testStock.quantity}`);
        console.log(`   当前价格: ¥${testStock.current_price}`);
        
        // 3. 获取用户当前现金
        console.log("\n3. 获取用户当前现金:");
        const userResponse = await axios.get(`${API_BASE}/user`);
        const originalCash = parseFloat(userResponse.data.cash_balance);
        console.log(`   当前现金: ¥${originalCash.toFixed(2)}`);
        
        // 4. 执行卖出操作
        console.log("\n4. 执行卖出操作:");
        const sellQuantity = 0.1; // 卖出0.1股
        const sellData = {
            assetId: testStock.id,
            quantity: sellQuantity
        };
        
        console.log(`   卖出请求:`, sellData);
        
        try {
            const sellResponse = await axios.post(`${API_BASE}/portfolio/sell`, sellData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log(`   ✅ 卖出响应状态: ${sellResponse.status}`);
            console.log(`   ✅ 卖出响应数据:`, sellResponse.data);
            
            if (sellResponse.data.success) {
                console.log(`   🎉 卖出成功！`);
                console.log(`   💰 获得现金: ¥${sellResponse.data.amount.toFixed(2)}`);
                console.log(`   📊 卖出数量: ${sellResponse.data.quantity}`);
                
                // 5. 验证结果
                console.log("\n5. 验证卖出结果:");
                
                // 检查现金是否增加
                const updatedUserResponse = await axios.get(`${API_BASE}/user`);
                const newCash = parseFloat(updatedUserResponse.data.cash_balance);
                const cashIncrease = newCash - originalCash;
                
                console.log(`   更新后现金: ¥${newCash.toFixed(2)}`);
                console.log(`   现金增加: ¥${cashIncrease.toFixed(2)}`);
                
                if (Math.abs(cashIncrease - sellResponse.data.amount) < 0.01) {
                    console.log("   ✅ 现金增加正确");
                } else {
                    console.log("   ❌ 现金增加不正确");
                }
                
                // 检查投资组合是否更新
                const updatedPortfolioResponse = await axios.get(`${API_BASE}/portfolio`);
                const updatedAssets = updatedPortfolioResponse.data.assets;
                const updatedStock = updatedAssets.find(asset => asset.id === testStock.id);
                
                if (updatedStock) {
                    const originalQuantity = parseFloat(testStock.quantity);
                    const newQuantity = parseFloat(updatedStock.quantity);
                    const quantityDecrease = originalQuantity - newQuantity;
                    
                    console.log(`   原始数量: ${originalQuantity}`);
                    console.log(`   更新后数量: ${newQuantity}`);
                    console.log(`   数量减少: ${quantityDecrease.toFixed(4)}`);
                    
                    if (Math.abs(quantityDecrease - sellQuantity) < 0.0001) {
                        console.log("   ✅ 股票数量更新正确");
                    } else {
                        console.log("   ❌ 股票数量更新不正确");
                    }
                } else {
                    console.log("   ✅ 股票已完全卖出（记录已删除）");
                }
                
                console.log("\n🎯 卖出功能测试结果: ✅ 成功");
                
            } else {
                console.log(`   ❌ 卖出失败: ${sellResponse.data.error}`);
            }
            
        } catch (sellError) {
            console.log(`   ❌ 卖出请求失败:`, sellError.message);
            
            if (sellError.response) {
                console.log(`   响应状态: ${sellError.response.status}`);
                console.log(`   响应数据:`, sellError.response.data);
            }
        }
        
    } catch (error) {
        console.error("❌ 测试过程中发生错误:", error.message);
    }
}

quickSellTest();