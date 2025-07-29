// 全局变量
let investmentsData = [];
let portfolioData = [];
let filteredData = [];

// DOM元素
const timeRangeSelect = document.getElementById('timeRange');
const assetTypeSelect = document.getElementById('assetType');
const riskLevelSelect = document.getElementById('riskLevel');
const refreshBtn = document.getElementById('refreshBtn');
const exportBtn = document.getElementById('exportBtn');

// 摘要卡片元素
const totalAssetsElement = document.getElementById('totalAssets');
const totalProfitElement = document.getElementById('totalProfit');
const stockRatioElement = document.getElementById('stockRatio');
const bondRatioElement = document.getElementById('bondRatio');
const assetsTrendElement = document.getElementById('assetsTrend');
const profitTrendElement = document.getElementById('profitTrend');
const stockTrendElement = document.getElementById('stockTrend');
const bondTrendElement = document.getElementById('bondTrend');

// 表格元素
const investmentTableBody = document.querySelector('#investmentTable tbody');

// 图表实例
const assetDistributionChart = echarts.init(document.getElementById('assetDistributionChart'));
const profitDistributionChart = echarts.init(document.getElementById('profitDistributionChart'));
const timeSeriesChart = echarts.init(document.getElementById('timeSeriesChart'));
const riskDistributionChart = echarts.init(document.getElementById('riskDistributionChart'));

// 初始化函数
async function initDashboard() {
    await loadData();
    filterData();
    updateSummaryCards();
    renderAllCharts();
    renderInvestmentTable();
    
    // 添加事件监听器
    timeRangeSelect.addEventListener('change', updateDashboard);
    assetTypeSelect.addEventListener('change', updateDashboard);
    riskLevelSelect.addEventListener('change', updateDashboard);
    refreshBtn.addEventListener('click', refreshDashboard);
    exportBtn.addEventListener('click', exportData);
    
    // 窗口大小变化时重新调整图表大小
    window.addEventListener('resize', function() {
        assetDistributionChart.resize();
        profitDistributionChart.resize();
        timeSeriesChart.resize();
        riskDistributionChart.resize();
    });
}

// 加载数据
async function loadData() {
    try {
        // 加载投资数据
        const investmentsResponse = await fetch('data/investments.json');
        investmentsData = await investmentsResponse.json();
        
        // 加载投资组合数据
        const portfolioResponse = await fetch('data/portfolio.json');
        portfolioData = await portfolioResponse.json();
        
        // 转换日期字符串为Date对象
        investmentsData.forEach(item => {
            item.purchaseDate = new Date(item.purchaseDate);
            item.currentDate = new Date(item.currentDate);
        });
        
        portfolioData.forEach(item => {
            item.date = new Date(item.date);
        });
    } catch (error) {
        console.error('加载数据失败:', error);
        showError('无法加载投资数据');
        // 使用模拟数据作为后备
        investmentsData = getMockInvestmentsData();
        portfolioData = getMockPortfolioData();
    }
}

const mysql = require('mysql2/promise');
const fs = require('fs');

// 使用mysql2框架从数据库加载数据并写入JSON文件
async function loadData1() {
    const connectionConfig = {
        host: 'localhost', // 数据库主机
        user: 'root',      // 数据库用户名
        password: 'password', // 数据库密码
        database: 'investment_db' // 数据库名称
    };

    try {
        // 创建数据库连接
        const connection = await mysql.createConnection(connectionConfig);

        // 查询股票数据
        const [rows] = await connection.execute('SELECT * FROM stocks');

        // 将数据写入JSON文件
        const jsonFilePath = 'data/stocks.json';
        fs.writeFileSync(jsonFilePath, JSON.stringify(rows, null, 2), 'utf-8');

        console.log(`数据已成功写入到 ${jsonFilePath}`);
        
        // 关闭数据库连接
        await connection.end();
    } catch (error) {
        console.error('从数据库加载数据失败:', error);
    }
}

// 筛选数据
function filterData() {
    const timeRange = timeRangeSelect.value;
    const assetType = assetTypeSelect.value;
    const riskLevel = riskLevelSelect.value;
    
    // 筛选时间范围
    let cutoffDate = new Date(0); // 默认全部时间
    if (timeRange !== 'all') {
        cutoffDate = new Date();
        if (timeRange === '1y') cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
        else if (timeRange === '6m') cutoffDate.setMonth(cutoffDate.getMonth() - 6);
        else if (timeRange === '3m') cutoffDate.setMonth(cutoffDate.getMonth() - 3);
        else if (timeRange === '1m') cutoffDate.setMonth(cutoffDate.getMonth() - 1);
    }
    
    filteredData = investmentsData.filter(item => {
        // 时间筛选
        const timeMatch = timeRange === 'all' || item.purchaseDate >= cutoffDate;
        
        // 资产类型筛选
        const typeMatch = assetType === 'all' || item.type === assetType;
        
        // 风险等级筛选
        const riskMatch = riskLevel === 'all' || item.riskLevel === riskLevel;
        
        return timeMatch && typeMatch && riskMatch;
    });
}

// 更新仪表板
function updateDashboard() {
    filterData();
    updateSummaryCards();
    renderAllCharts();
    renderInvestmentTable();
}

// 刷新仪表板
async function refreshDashboard() {
    refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> 加载中...';
    refreshBtn.disabled = true;
    
    await loadData();
    updateDashboard();
    
    refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> 刷新数据';
    refreshBtn.disabled = false;
}

// 导出数据
function exportData() {
    // 简化版导出功能
    const dataStr = JSON.stringify(filteredData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `投资数据_${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// 更新摘要卡片
function updateSummaryCards() {
    if (filteredData.length === 0) return;
    
    // 计算总资产
    const totalAssets = filteredData.reduce((sum, item) => sum + (item.currentPrice * item.quantity), 0);
    totalAssetsElement.textContent = `¥${totalAssets.toLocaleString('zh-CN', {maximumFractionDigits: 2})}`;
    
    // 计算总收益
    const totalCost = filteredData.reduce((sum, item) => sum + (item.purchasePrice * item.quantity), 0);
    const totalProfit = totalAssets - totalCost;
    totalProfitElement.textContent = `¥${totalProfit.toLocaleString('zh-CN', {maximumFractionDigits: 2})}`;
    
    // 计算股票和国债占比
    const stockAssets = filteredData.filter(item => item.type === 'stock')
        .reduce((sum, item) => sum + (item.currentPrice * item.quantity), 0);
    const bondAssets = filteredData.filter(item => item.type === 'bond')
        .reduce((sum, item) => sum + (item.currentPrice * item.quantity), 0);
    
    const stockRatio = totalAssets > 0 ? (stockAssets / totalAssets * 100) : 0;
    const bondRatio = totalAssets > 0 ? (bondAssets / totalAssets * 100) : 0;
    
    stockRatioElement.textContent = `${stockRatio.toFixed(1)}%`;
    bondRatioElement.textContent = `${bondRatio.toFixed(1)}%`;
    
    // 计算趋势 (简化版，实际应该与前一个周期比较)
    const randomTrend = () => (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 5 + 1);
    
    const assetsTrend = randomTrend();
    const profitTrend = randomTrend();
    const stockTrend = randomTrend();
    const bondTrend = randomTrend();
    
    assetsTrendElement.textContent = `${assetsTrend > 0 ? '+' : ''}${assetsTrend.toFixed(1)}%`;
    profitTrendElement.textContent = `${profitTrend > 0 ? '+' : ''}${profitTrend.toFixed(1)}%`;
    stockTrendElement.textContent = `${stockTrend > 0 ? '+' : ''}${stockTrend.toFixed(1)}%`;
    bondTrendElement.textContent = `${bondTrend > 0 ? '+' : ''}${bondTrend.toFixed(1)}%`;
    
    // 更新趋势样式
    assetsTrendElement.className = `trend ${assetsTrend > 0 ? 'up' : 'down'}`;
    profitTrendElement.className = `trend ${profitTrend > 0 ? 'up' : 'down'}`;
    stockTrendElement.className = `trend ${stockTrend > 0 ? 'up' : 'down'}`;
    bondTrendElement.className = `trend ${bondTrend > 0 ? 'up' : 'down'}`;
}

// 渲染所有图表
function renderAllCharts() {
    renderAssetDistributionChart();
    renderProfitDistributionChart();
    renderTimeSeriesChart();
    renderRiskDistributionChart();
}

// 资产分布图 (饼图)
function renderAssetDistributionChart() {
    // 按资产类型分组
    const typeMap = {};
    filteredData.forEach(item => {
        if (!typeMap[item.type]) {
            typeMap[item.type] = 0;
        }
        typeMap[item.type] += item.currentPrice * item.quantity;
    });
    
    const seriesData = Object.keys(typeMap).map(type => ({
        name: getTypeName(type),
        value: typeMap[type]
    }));
    
    const option = {
        title: {
            text: '资产类型分布',
            left: 'center',
            subtext: '按当前市值计算',
            subtextStyle: {
                color: '#666',
                fontSize: 12
            }
        },
        tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: ¥{c} ({d}%)',
            valueFormatter: value => `¥${value.toLocaleString('zh-CN', {maximumFractionDigits: 2})}`
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            data: Object.keys(typeMap).map(getTypeName)
        },
        series: [{
            name: '资产分布',
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: {
                borderRadius: 10,
                borderColor: '#fff',
                borderWidth: 2
            },
            label: {
                show: false,
                position: 'center'
            },
            emphasis: {
                label: {
                    show: true,
                    fontSize: '18',
                    fontWeight: 'bold',
                    formatter: '{b}\n¥{c} ({d}%)'
                }
            },
            labelLine: {
                show: false
            },
            data: seriesData
        }],
        color: ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f']
    };
    
    assetDistributionChart.setOption(option);
}

// 收益分布图 (饼图)
function renderProfitDistributionChart() {
    // 计算每种资产的收益
    const profitMap = {};
    filteredData.forEach(item => {
        const profit = (item.currentPrice - item.purchasePrice) * item.quantity;
        if (!profitMap[item.type]) {
            profitMap[item.type] = 0;
        }
        profitMap[item.type] += profit;
    });
    
    const seriesData = Object.keys(profitMap).map(type => ({
        name: getTypeName(type),
        value: profitMap[type]
    }));
    
    const option = {
        title: {
            text: '收益来源分布',
            left: 'center',
            subtext: '按收益金额计算',
            subtextStyle: {
                color: '#666',
                fontSize: 12
            }
        },
        tooltip: {
            trigger: 'item',
            formatter: params => {
                const value = params.value > 0 ? 
                    `+¥${params.value.toLocaleString('zh-CN', {maximumFractionDigits: 2})}` : 
                    `-¥${Math.abs(params.value).toLocaleString('zh-CN', {maximumFractionDigits: 2})}`;
                return `${params.seriesName}<br/>${params.name}: ${value} (${params.percent}%)`;
            }
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            data: Object.keys(profitMap).map(getTypeName)
        },
        series: [{
            name: '收益分布',
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: {
                borderRadius: 10,
                borderColor: '#fff',
                borderWidth: 2
            },
            label: {
                show: false,
                position: 'center'
            },
            emphasis: {
                label: {
                    show: true,
                    fontSize: '18',
                    fontWeight: 'bold',
                    formatter: params => {
                        const value = params.value > 0 ? 
                            `+¥${params.value.toLocaleString('zh-CN', {maximumFractionDigits: 2})}` : 
                            `-¥${Math.abs(params.value).toLocaleString('zh-CN', {maximumFractionDigits: 2})}`;
                        return `${params.name}\n${value} (${params.percent}%)`;
                    }
                }
            },
            labelLine: {
                show: false
            },
            data: seriesData
        }],
        color: ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f']
    };
    
    profitDistributionChart.setOption(option);
}

// 时间序列图 (折线图)
function renderTimeSeriesChart() {
    // 按日期分组计算总资产
    const dateMap = {};
    portfolioData.forEach(item => {
        const dateStr = moment(item.date).format('YYYY-MM-DD');
        dateMap[dateStr] = item.totalValue;
    });
    
    const dates = Object.keys(dateMap).sort();
    const values = dates.map(date => dateMap[date]);
    
    // 计算收益百分比
    const baseValue = values[0] || 1;
    const percentages = values.map(value => ((value - baseValue) / baseValue * 100));
    
    const option = {
        title: {
            text: '资产价值变化趋势',
            left: 'center'
        },
        tooltip: {
            trigger: 'axis',
            formatter: params => {
                const date = params[0].axisValue;
                const value = params[0].data;
                const percentage = percentages[params[0].dataIndex];
                return `
                    <div>日期: ${date}</div>
                    <div>总资产: ¥${value.toLocaleString('zh-CN', {maximumFractionDigits: 2})}</div>
                    <div>收益率: ${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%</div>
                `;
            }
        },
        xAxis: {
            type: 'category',
            data: dates,
            axisLabel: {
                rotate: 45
            }
        },
        yAxis: [
            {
                type: 'value',
                name: '资产价值 (¥)',
                axisLabel: {
                    formatter: '¥{value}'
                }
            },
            {
                type: 'value',
                name: '收益率 (%)',
                axisLabel: {
                    formatter: '{value}%'
                },
                min: Math.min(...percentages) - 5,
                max: Math.max(...percentages) + 5
            }
        ],
        series: [
            {
                name: '总资产',
                type: 'line',
                data: values,
                smooth: true,
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(58, 77, 233, 0.8)' },
                        { offset: 1, color: 'rgba(58, 77, 233, 0.1)' }
                    ])
                },
                itemStyle: {
                    color: '#3a4de9'
                }
            },
            {
                name: '收益率',
                type: 'line',
                yAxisIndex: 1,
                data: percentages,
                smooth: true,
                itemStyle: {
                    color: '#06d6a0'
                }
            }
        ]
    };
    
    timeSeriesChart.setOption(option);
}

// 风险分布图 (旭日图)
function renderRiskDistributionChart() {
    // 按风险等级和资产类型分组
    const riskTypeMap = {};
    filteredData.forEach(item => {
        if (!riskTypeMap[item.riskLevel]) {
            riskTypeMap[item.riskLevel] = {};
        }
        if (!riskTypeMap[item.riskLevel][item.type]) {
            riskTypeMap[item.riskLevel][item.type] = 0;
        }
        riskTypeMap[item.riskLevel][item.type] += item.currentPrice * item.quantity;
    });
    
    const seriesData = Object.keys(riskTypeMap).map(riskLevel => {
        const children = Object.keys(riskTypeMap[riskLevel]).map(type => ({
            name: getTypeName(type),
            value: riskTypeMap[riskLevel][type],
            itemStyle: {
                color: getTypeColor(type)
            }
        }));
        
        return {
            name: getRiskName(riskLevel),
            value: children.reduce((sum, child) => sum + child.value, 0),
            children: children,
            itemStyle: {
                color: getRiskColor(riskLevel)
            }
        };
    });
    
    const option = {
        title: {
            text: '风险等级与资产类型',
            left: 'center',
            subtext: '按当前市值计算',
            subtextStyle: {
                color: '#666',
                fontSize: 12
            }
        },
        tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: ¥{c} ({d}%)',
            valueFormatter: value => `¥${value.toLocaleString('zh-CN', {maximumFractionDigits: 2})}`
        },
        series: {
            name: '风险分布',
            type: 'sunburst',
            data: seriesData,
            radius: [0, '90%'],
            label: {
                rotate: 'radial'
            },
            levels: [
                {},
                {
                    r0: '15%',
                    r: '45%',
                    itemStyle: {
                        borderWidth: 2
                    },
                    label: {
                        rotate: 'tangential'
                    }
                },
                {
                    r0: '45%',
                    r: '80%',
                    label: {
                        align: 'right'
                    }
                }
            ]
        }
    };
    
    riskDistributionChart.setOption(option);
}

// 渲染投资表格
function renderInvestmentTable() {
    // 清空表格
    investmentTableBody.innerHTML = '';
    
    // 按当前价值降序排序
    const sortedData = [...filteredData].sort((a, b) => 
        (b.currentPrice * b.quantity) - (a.currentPrice * a.quantity));
    
    sortedData.forEach(item => {
        const row = document.createElement('tr');
        
        const currentValue = item.currentPrice * item.quantity;
        const profit = (item.currentPrice - item.purchasePrice) * item.quantity;
        const profitRatio = (item.currentPrice - item.purchasePrice) / item.purchasePrice * 100;
        
        row.innerHTML = `
            <td>${item.code}</td>
            <td>${item.name}</td>
            <td>${getTypeName(item.type)}</td>
            <td>${moment(item.purchaseDate).format('YYYY-MM-DD')}</td>
            <td>¥${item.purchasePrice.toLocaleString('zh-CN', {maximumFractionDigits: 2})}</td>
            <td>¥${item.currentPrice.toLocaleString('zh-CN', {maximumFractionDigits: 2})}</td>
            <td>${item.quantity.toLocaleString('zh-CN')}</td>
            <td>¥${currentValue.toLocaleString('zh-CN', {maximumFractionDigits: 2})}</td>
            <td class="${profitRatio >= 0 ? 'positive' : 'negative'}">
                ${profitRatio >= 0 ? '+' : ''}${profitRatio.toFixed(2)}%
            </td>
            <td class="risk-${item.riskLevel}">${getRiskName(item.riskLevel)}</td>
        `;
        
        investmentTableBody.appendChild(row);
    });
}

// 辅助函数
function getTypeName(type) {
    const typeNames = {
        'stock': '股票',
        'bond': '国债',
        'fund': '基金'
    };
    return typeNames[type] || type;
}

function getTypeColor(type) {
    const typeColors = {
        'stock': '#e15759',
        'bond': '#76b7b2',
        'fund': '#59a14f'
    };
    return typeColors[type] || '#999';
}

function getRiskName(riskLevel) {
    const riskNames = {
        'low': '低风险',
        'medium': '中风险',
        'high': '高风险'
    };
    return riskNames[riskLevel] || riskLevel;
}

function getRiskColor(riskLevel) {
    const riskColors = {
        'low': '#06d6a0',
        'medium': '#ffbe0b',
        'high': '#ef476f'
    };
    return riskColors[riskLevel] || '#999';
}

// 显示错误信息
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="bi bi-exclamation-triangle"></i> ${message}
    `;
    errorDiv.style.color = 'white';
    errorDiv.style.backgroundColor = '#ef476f';
    errorDiv.style.padding = '15px';
    errorDiv.style.borderRadius = '4px';
    errorDiv.style.marginBottom = '20px';
    errorDiv.style.display = 'flex';
    errorDiv.style.alignItems = 'center';
    errorDiv.style.gap = '10px';
    
    document.querySelector('.dashboard-container').prepend(errorDiv);
}

// 模拟数据生成函数
function getMockInvestmentsData() {
    const types = ['stock', 'bond', 'fund'];
    const riskLevels = ['low', 'medium', 'high'];
    const stockNames = ['腾讯控股', '阿里巴巴', '贵州茅台', '中国平安', '美团', '京东', '拼多多'];
    const bondNames = ['国债2025', '国开债2024', '地方债2023', '特别国债2026'];
    const fundNames = ['华夏成长', '易方达消费', '嘉实沪深300', '南方中证500'];
    
    const data = [];
    const today = new Date();
    
    for (let i = 0; i < 50; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        let name, code;
        
        if (type === 'stock') {
            name = stockNames[Math.floor(Math.random() * stockNames.length)];
            code = `ST${Math.floor(1000 + Math.random() * 9000)}`;
        } else if (type === 'bond') {
            name = bondNames[Math.floor(Math.random() * bondNames.length)];
            code = `BD${Math.floor(1000 + Math.random() * 9000)}`;
        } else {
            name = fundNames[Math.floor(Math.random() * fundNames.length)];
            code = `FD${Math.floor(1000 + Math.random() * 9000)}`;
        }
        
        const purchaseDate = new Date();
        purchaseDate.setMonth(purchaseDate.getMonth() - Math.floor(Math.random() * 12));
        
        const purchasePrice = type === 'bond' ? 
            (100 + (Math.random() * 5 - 2.5)) : 
            (50 + Math.random() * 150);
        
        const currentPrice = purchasePrice * (1 + (Math.random() * 0.5 - 0.2));
        const quantity = Math.floor(10 + Math.random() * 1000);
        const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];
        
        data.push({
            code,
            name,
            type,
            purchaseDate,
            currentDate: today,
            purchasePrice: parseFloat(purchasePrice.toFixed(2)),
            currentPrice: parseFloat(currentPrice.toFixed(2)),
            quantity,
            riskLevel
        });
    }
    
    return data;
}

function getMockPortfolioData() {
    const data = [];
    const today = new Date();
    let totalValue = 1000000;
    
    for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(today.getDate() - (29 - i));
        
        // 模拟每日价值变化
        totalValue *= (1 + (Math.random() * 0.02 - 0.01));
        
        data.push({
            date,
            totalValue: parseFloat(totalValue.toFixed(2))
        });
    }
    
    return data;
}

// 初始化仪表板
document.addEventListener('DOMContentLoaded', initDashboard);