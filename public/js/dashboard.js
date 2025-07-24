document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const totalValueElement = document.getElementById('total-value');
    const totalReturnElement = document.getElementById('total-return');
    const recentAssetsList = document.getElementById('recent-assets-list');
    const recentInfoList = document.getElementById('recent-info-list');
    const performanceChartCanvas = document.getElementById('performance-chart');

    // 初始化图表
    let performanceChart = new Chart(performanceChartCanvas, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '投资组合价值',
                data: [],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: '投资组合表现历史'
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: '价值 (元)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '日期'
                    }
                }
            }
        }
    });

    // 获取投资组合概览数据
    function fetchPortfolioOverview() {
        console.log('开始获取投资组合概览数据');
        fetch('/api/portfolio/overview')
            .then(response => {
                console.log('概览数据响应状态:', response.status);
                console.log('概览数据响应头:', response.headers);
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    totalValueElement.textContent = '错误';
                    totalReturnElement.textContent = '错误';
                    console.error('获取概览数据失败:', data.error);
                } else {
                    totalValueElement.textContent = '¥' + data.totalValue.toFixed(2);
                    totalReturnElement.textContent = data.totalReturn.toFixed(2) + '%';
                }
            })
            .catch(error => {
                totalValueElement.textContent = '加载失败';
                totalReturnElement.textContent = '加载失败';
                console.error('获取概览数据时发生错误:', error);
            });
    }

    // 获取最近添加的资产
    function fetchRecentAssets() {
        console.log('开始获取最近资产数据');
        fetch('/api/portfolio/recent')
            .then(response => {
                console.log('最近资产响应状态:', response.status);
                console.log('最近资产响应头:', response.headers);
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    recentAssetsList.innerHTML = '<div class="error-message">获取最近资产失败: ' + data.error + '</div>';
                    console.error('获取最近资产失败:', data.error);
                } else if (data.assets.length === 0) {
                    recentAssetsList.innerHTML = '<p>暂无资产</p>';
                } else {
                    let html = '<div class="table-container"><table>';
                    html += '<thead><tr><th>资产名称</th><th>类型</th><th>数量</th><th>购买价格</th><th>当前价格</th><th>盈亏</th></tr></thead>';
                    html += '<tbody>';
                    data.assets.forEach(asset => {
                        const currentPrice = parseFloat(asset.current_price);
                        const purchasePrice = parseFloat(asset.purchase_price);
                        const profitLoss = ((currentPrice - purchasePrice) * asset.quantity).toFixed(2);
                        const profitLossClass = profitLoss >= 0 ? 'positive' : 'negative';
                        html += `<tr>
                            <td>${asset.name}</td>
                            <td>${asset.type === 'stock' ? '股票' : '债券'}</td>
                            <td>${asset.quantity}</td>
                            <td>¥${purchasePrice.toFixed(2)}</td>
                            <td>¥${currentPrice.toFixed(2)}</td>
                            <td class="${profitLossClass}">¥${profitLoss}</td>
                        </tr>`;
                    });
                    html += '</tbody></table></div>';
                    recentAssetsList.innerHTML = html;
                }
            })
            .catch(error => {
                recentAssetsList.innerHTML = '<div class="error-message">获取最近资产时发生错误</div>';
                console.error('获取最近资产时发生错误:', error);
            });
    }

    // 获取表现数据
    function fetchPerformanceData() {
        fetch('/api/portfolio/performance')
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error('获取表现数据失败:', data.error);
                } else {
                    performanceChart.data.labels = data.dates;
                    performanceChart.data.datasets[0].data = data.values;
                    performanceChart.update();
                }
            })
            .catch(error => {
                console.error('获取表现数据时发生错误:', error);
            });
    }


    const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const url = 'https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=5min&apikey=D1G2YLAXSIE1Z2GM';

const POOL = ['AAPL','MSFT','GOOGL','AMZN','TSLA','NVDA','META','NFLX'];
app.get('/quote/:symbol', async (req, res) => {
  const result = [];
  for (const symbol of POOL) {
    try {
      const { data } = await axios.get(url, {
        params: { function: 'GLOBAL_QUOTE', symbol, apikey: process.env.ALPHA_KEY }
      });
      const q = data['Global Quote'];
      result.push({
        symbol,
        price: q?.['05. price'] || null,
        change: q?.['09. change'] || null,
        changePercent: q?.['10. change percent'] || null
      });
    } catch {
      result.push({ symbol, error: 'fetch failed' });
    }
  }
  res.json(result);
});

// // 2. 日线历史（Daily Time Series）
// app.get('/history/:symbol', async (req, res) => {
//   try {
//     const { symbol } = req.params;
//     const { data } = await axios.get(url, {
//       params: {
//         function: 'TIME_SERIES_DAILY',
//         symbol,
//         outputsize: 'compact', // 最近 100 天
//         apikey: process.env.ALPHA_KEY
//       }
//     });
//     res.json(data['Time Series (Daily)']);
//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });

// GET /history/:symbol?date=2024-07-24
app.get('/history/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { date }   = {"date":"2025-05-21"}           // 前端传 ?date=YYYY-MM-DD
    const { data } = await axios.get(url, {
      params: {
        function: 'TIME_SERIES_DAILY',
        symbol,
        outputsize: 'compact',  // 最近 100 天
        apikey: process.env.ALPHA_KEY
      }
    });

    const all = data['Time Series (Daily)'];
    if (!all) return res.status(404).json({ error: 'no data' });

    // 如果指定日期，就返回单条；否则返回全部
    const result = date ? { [date]: all[date] } : all;
    if (date && !result[date]) return res.status(404).json({ error: 'date not found' });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

    // 初始化数据
    fetchPortfolioOverview();
    fetchRecentAssets();
    fetchPerformanceData();

    // 设置定时刷新
    setInterval(fetchPortfolioOverview, 60000); // 每分钟刷新一次
    setInterval(fetchRecentAssets, 60000);
    setInterval(fetchPerformanceData, 300000); // 每5分钟刷新一次
});