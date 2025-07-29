const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'n3u3da!',
    database: 'investment_system'
};
 //@param {object} dbConfig

 fetchAssetData()
        .then(data => {
            // 隐藏加载状态
            console.log(`资产数据加载完成: ${data.valueData.stockPercentage}`);
        })
        .catch(error => {
            console.error('获取资产数据失败:', error);
            
        });



        


 async function fetchAssetData() {
            try {
                const response = await fetch('/api/portfolio/allocation');
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return await response.json();
            } catch (error) {
                console.error('获取资产数据失败:', error);
                throw error;
            } 
    }       
