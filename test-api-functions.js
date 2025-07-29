const axios = require('axios');

const BASE_URL = 'http://localhost:3015/api';

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

// 测试API连接
async function testAPIConnection() {
    try {
        const response = await axios.get(`${BASE_URL}/test`);
        logTest("API连接测试", response.status === 200 && response.data.message);
    } catch (error) {
        logTest("API连接测试", false, error.message);
    }
}

// 测试用户API
async function testUserAPI() {
    try {
        const response = await axios.get(`${BASE_URL}/user`);
        const user = response.data;
        
        logTest("用户信息获取", response.status === 200 && user.username);
        
        if (user) {
            console.log(`   用户: ${user.username}`);
            console.log(`   总资产: ¥${user.total_assets}`);
            console.log(`   现金余额: ¥${user.cash_balance}`);
        }
    } catch (error) {
        logTest("用户信息获取", false, error.message);
    }
}

// 测试投资组合概览API
async function testPortfolioOverviewAPI() {
    try {
        const response = await axios.get(`${BASE_URL}/portfolio/overview`);
        const overview = response.data;
        
        logTest("投资组合概览", response.status === 200 && overview.totalValue !== undefined);
        
        if (overview) {
            console.log(`   总价值: ¥${overview.totalValue}`);
            console.log(`   总收益率: ${overview.totalReturn}%`);
            console.log(`   股票价值: ¥${overview.stockValue}`);
            console.log(`   债券价值: ¥${overview.bondValue}`);
            console.log(`   现金余额: ¥${overview.cashBalance}`);
        }
    } catch (error) {
        logTest("投资组合概览", false, error.message);
    }
}

// 测试投资组合详情API
async function testPortfolioAPI() {
    try {
        const response = await axios.get(`${BASE_URL}/portfolio`);
        const portfolio = response.data;
        
        logTest("投资组合详情", response.status === 200 && portfolio.user && portfolio.assets);
        
        if (portfolio) {
            console.log(`   用户: ${portfolio.user.username}`);
            console.log(`   资产数量: ${portfolio.assets.length}项`);
            
            if (portfolio.assets.length > 0) {
                console.log(`   资产示例:`);
                portfolio.assets.slice(0, 3).forEach(asset => {
                    console.log(`   - ${asset.symbol}: ${asset.name}, 数量: ${asset.quantity}, 价格: ¥${asset.current_price}`);
                });
            }
        }
    } catch (error) {
        logTest("投资组合详情", false, error.message);
    }
}

// 测试股票API
async function testStockAPIs() {
    try {
        // 测试股票列表
        const listResponse = await axios.get(`${BASE_URL}/stocks`);
        const stocks = listResponse.data;
        
        logTest("股票列表获取", listResponse.status === 200 && Array.isArray(stocks));
        
        if (stocks && stocks.length > 0) {
            console.log(`   股票数量: ${stocks.length}只`);
            
            const stock = stocks[0];
            console.log(`   股票示例: ${stock.symbol} - ${stock.name}, 价格: ¥${stock.current_price}`);
            
            // 测试单个股票查询
            const singleResponse = await axios.get(`${BASE_URL}/stocks/single/${stock.symbol}`);
            const singleStock = singleResponse.data;
            
            logTest("单个股票查询", singleResponse.status === 200 && singleStock.symbol === stock.symbol);
            
            // 测试股票购买（小额测试）
            try {
                const buyResponse = await axios.post(`${BASE_URL}/stocks/buy`, {
                    symbol: stock.symbol,
                    name: stock.name,
                    price: stock.current_price,
                    quantity: 1
                });
                
                logTest("股票购买功能", buyResponse.status === 200 && buyResponse.data.success);
                
                if (buyResponse.data.success) {
                    console.log(`   购买成功: ${stock.symbol}, 花费: ¥${buyResponse.data.totalCost}`);
                }
            } catch (buyError) {
                if (buyError.response && buyError.response.status === 400) {
                    logTest("股票购买功能", true, "余额不足（预期行为）");
                } else {
                    logTest("股票购买功能", false, buyError.message);
                }
            }
        }
    } catch (error) {
        logTest("股票API测试", false, error.message);
    }
}

// 测试债券API
async function testBondAPIs() {
    try {
        // 测试债券列表
        const listResponse = await axios.get(`${BASE_URL}/bonds`);
        const bonds = listResponse.data;
        
        logTest("债券列表获取", listResponse.status === 200 && Array.isArray(bonds));
        
        if (bonds && bonds.length > 0) {
            console.log(`   债券数量: ${bonds.length}只`);
            
            const bond = bonds[0];
            console.log(`   债券示例: ${bond.symbol} - ${bond.name}, 价格: ¥${bond.current_price}`);
            
            // 测试单个债券查询
            const singleResponse = await axios.get(`${BASE_URL}/bonds/single/${bond.symbol}`);
            const singleBond = singleResponse.data;
            
            logTest("单个债券查询", singleResponse.status === 200 && singleBond.symbol === bond.symbol);
            
            // 测试债券购买（小额测试）
            try {
                const buyResponse = await axios.post(`${BASE_URL}/bonds/buy`, {
                    symbol: bond.symbol,
                    name: bond.name,
                    price: bond.current_price,
                    quantity: 1
                });
                
                logTest("债券购买功能", buyResponse.status === 200 && buyResponse.data.success);
                
                if (buyResponse.data.success) {
                    console.log(`   购买成功: ${bond.symbol}, 花费: ¥${buyResponse.data.totalCost}`);
                }
            } catch (buyError) {
                if (buyError.response && buyError.response.status === 400) {
                    logTest("债券购买功能", true, "余额不足（预期行为）");
                } else {
                    logTest("债券购买功能", false, buyError.message);
                }
            }
        }
    } catch (error) {
        logTest("债券API测试", false, error.message);
    }
}

// 测试交易功能API
async function testTransactionAPIs() {
    try {
        // 测试充值功能
        const rechargeResponse = await axios.post(`${BASE_URL}/portfolio/recharge`, {
            amount: 1000
        });
        
        logTest("现金充值功能", rechargeResponse.status === 200 && rechargeResponse.data.success);
        
        if (rechargeResponse.data.success) {
            console.log(`   充值成功: ¥${rechargeResponse.data.amount}`);
        }
        
        // 测试最近资产获取
        const recentResponse = await axios.get(`${BASE_URL}/portfolio/recent`);
        
        logTest("最近资产获取", recentResponse.status === 200 && recentResponse.data.assets);
        
        if (recentResponse.data.assets) {
            console.log(`   最近资产数量: ${recentResponse.data.assets.length}项`);
        }
        
        // 测试投资组合表现
        const performanceResponse = await axios.get(`${BASE_URL}/portfolio/performance`);
        
        logTest("投资组合表现", performanceResponse.status === 200 && performanceResponse.data.dates && performanceResponse.data.values);
        
        if (performanceResponse.data.dates) {
            console.log(`   表现数据点: ${performanceResponse.data.dates.length}个`);
        }
        
    } catch (error) {
        logTest("交易功能API测试", false, error.message);
    }
}

// 测试卖出功能
async function testSellFunction() {
    try {
        // 首先获取投资组合，看是否有可卖出的资产
        const portfolioResponse = await axios.get(`${BASE_URL}/portfolio`);
        const portfolio = portfolioResponse.data;
        
        if (portfolio.assets && portfolio.assets.length > 0) {
            const asset = portfolio.assets[0];
            
            // 尝试卖出少量资产
            const sellQuantity = Math.min(1, parseFloat(asset.quantity));
            
            try {
                const sellResponse = await axios.post(`${BASE_URL}/portfolio/sell`, {
                    assetId: asset.id,
                    quantity: sellQuantity
                });
                
                logTest("资产卖出功能", sellResponse.status === 200 && sellResponse.data.success);
                
                if (sellResponse.data.success) {
                    console.log(`   卖出成功: 数量${sellQuantity}, 获得¥${sellResponse.data.amount}`);
                }
            } catch (sellError) {
                if (sellError.response && sellError.response.status === 400) {
                    logTest("资产卖出功能", true, "卖出条件不满足（预期行为）");
                } else {
                    logTest("资产卖出功能", false, sellError.message);
                }
            }
        } else {
            logTest("资产卖出功能", true, "无可卖出资产（预期行为）");
        }
        
    } catch (error) {
        logTest("卖出功能测试", false, error.message);
    }
}

// 测试价格更新功能
async function testPriceUpdateAPIs() {
    try {
        // 获取一个股票进行价格更新测试
        const stocksResponse = await axios.get(`${BASE_URL}/stocks`);
        const stocks = stocksResponse.data;
        
        if (stocks && stocks.length > 0) {
            const stock = stocks[0];
            
            try {
                const updateResponse = await axios.post(`${BASE_URL}/stocks/${stock.symbol}/update`);
                
                logTest("股票价格更新", updateResponse.status === 200 && updateResponse.data.success);
                
                if (updateResponse.data.success) {
                    console.log(`   ${stock.symbol} 价格更新: ¥${updateResponse.data.oldPrice} → ¥${updateResponse.data.newPrice}`);
                }
            } catch (updateError) {
                logTest("股票价格更新", false, updateError.message);
            }
        }
        
        // 获取一个债券进行价格更新测试
        const bondsResponse = await axios.get(`${BASE_URL}/bonds`);
        const bonds = bondsResponse.data;
        
        if (bonds && bonds.length > 0) {
            const bond = bonds[0];
            
            try {
                const updateResponse = await axios.post(`${BASE_URL}/bonds/${bond.symbol}/update`);
                
                logTest("债券价格更新", updateResponse.status === 200 && updateResponse.data.success);
                
                if (updateResponse.data.success) {
                    console.log(`   ${bond.symbol} 价格更新: ¥${updateResponse.data.oldPrice} → ¥${updateResponse.data.newPrice}`);
                }
            } catch (updateError) {
                logTest("债券价格更新", false, updateError.message);
            }
        }
        
    } catch (error) {
        logTest("价格更新API测试", false, error.message);
    }
}

// 测试资产添加API
async function testAssetAddAPI() {
    try {
        // 获取股票列表
        const stocksResponse = await axios.get(`${BASE_URL}/stocks`);
        const stocks = stocksResponse.data;
        
        if (stocks && stocks.length > 0) {
            const stock = stocks[0];
            
            try {
                const addResponse = await axios.post(`${BASE_URL}/assets/add`, {
                    asset_type: 'stock',
                    asset_id: stock.symbol,
                    name: stock.name,
                    quantity: 1,
                    purchase_price: stock.current_price,
                    purchase_date: new Date().toISOString()
                });
                
                logTest("资产添加API", addResponse.status === 200 && addResponse.data.success);
                
                if (addResponse.data.success) {
                    console.log(`   添加资产成功: ${stock.symbol}, 花费¥${addResponse.data.totalCost}`);
                }
            } catch (addError) {
                if (addError.response && addError.response.status === 400) {
                    logTest("资产添加API", true, "余额不足或其他限制（预期行为）");
                } else {
                    logTest("资产添加API", false, addError.message);
                }
            }
        }
        
    } catch (error) {
        logTest("资产添加API测试", false, error.message);
    }
}

// 主测试函数
async function runAllAPITests() {
    console.log("🚀 开始API功能测试...\n");
    console.log("=" .repeat(60));

    await testAPIConnection();
    console.log();
    
    await testUserAPI();
    console.log();
    
    await testPortfolioOverviewAPI();
    console.log();
    
    await testPortfolioAPI();
    console.log();
    
    await testStockAPIs();
    console.log();
    
    await testBondAPIs();
    console.log();
    
    await testTransactionAPIs();
    console.log();
    
    await testSellFunction();
    console.log();
    
    await testPriceUpdateAPIs();
    console.log();
    
    await testAssetAddAPI();
    console.log();

    console.log("=" .repeat(60));
    console.log("📊 API测试结果汇总:");
    console.log(`✅ 通过: ${testResults.passed}`);
    console.log(`❌ 失败: ${testResults.failed}`);
    console.log(`📈 成功率: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%`);

    if (testResults.errors.length > 0) {
        console.log("\n❌ 错误详情:");
        testResults.errors.forEach(error => console.log(`  - ${error}`));
    }

    console.log("\n🎯 API测试完成!");
}

// 检查服务器是否运行
async function checkServerStatus() {
    try {
        const response = await axios.get(`${BASE_URL}/test`);
        console.log("✅ 服务器运行正常，开始API测试...\n");
        return true;
    } catch (error) {
        console.log("❌ 服务器未运行或无法连接");
        console.log("请确保服务器已启动: npm start");
        return false;
    }
}

// 启动测试
async function startTests() {
    const serverRunning = await checkServerStatus();
    if (serverRunning) {
        await runAllAPITests();
    }
}

startTests().catch(console.error);
