// assetCharts.js - 用于渲染资产占比的ECharts图表

document.addEventListener('DOMContentLoaded', function() {
    // 初始化图表
    const valueChart = echarts.init(document.getElementById('asset-value-chart'));
    const returnChart = echarts.init(document.getElementById('asset-return-chart'));
    
    // 默认加载状态
    valueChart.showLoading();
    returnChart.showLoading();
    console.log('初始化资产占比图表');

    // 数据库配置
    

    // 获取资产数据并渲染图表
    console.log('开始获取资产数据');
    let da=fetchAssetData();
    renderAssetValueChart(valueChart, da.valueData);
    renderAssetReturnChart(returnChart, da.returnData);
        
    
    // 窗口大小变化时重新调整图表大小
    window.addEventListener('resize', function() {
        valueChart.resize();
        returnChart.resize();
    });
});



 function fetchAssetData() {
        fetch('api/testjs').then(data => {
        console.log('资产数据加载完成:', data);
        return data.json();
        // 隐藏加载状态
        //valueChart.hideLoading();
        //returnChart.hideLoading();
        
        // 渲染总资产价值占比图表
        
        
        // 渲染总收益占比图表
        

    })
    .catch(error => {
        console.error('获取资产数据失败:', error);
        valueChart.hideLoading();
        returnChart.hideLoading();
        
        // 显示错误信息
        showChartError(valueChart, '数据加载失败');
        showChartError(returnChart, '数据加载失败');
    });
}






/**
 * 渲染总资产价值占比图表
 * @param {object} chart ECharts实例
 * @param {object} data 资产数据
 */
function renderAssetValueChart(chart, data) {
    const option = {
        title: {
            text: '总资产价值占比',
            subtext: `总资产: ¥${data.totalValue.toLocaleString('zh-CN')}`,
            left: 'center'
        },
        tooltip: {
            trigger: 'item',
            formatter: params => {
                const value = params.value.toLocaleString('zh-CN');
                const percent = params.percent;
                return `${params.seriesName}<br/>${params.name}: ¥${value} (${percent}%)`;
            }
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            data: ['股票', '债券']
        },
        series: [{
            name: '资产价值',
            type: 'pie',
            radius: ['50%', '70%'],
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
            data: [
                { 
                    value: data.stock, 
                    name: `股票 (${data.stockPercentage}%)`,
                    itemStyle: { color: '#4e79a7' }
                },
                { 
                    value: data.bond, 
                    name: `债券 (${data.bondPercentage}%)`,
                    itemStyle: { color: '#f28e2b' }
                }
            ]
        }]
    };
    
    chart.setOption(option);
}

/**
 * 渲染总收益占比图表
 * @param {object} chart ECharts实例
 * @param {object} data 收益数据
 */
function renderAssetReturnChart(chart, data) {
    const option = {
        title: {
            text: '总收益占比',
            subtext: `总收益: ¥${data.totalReturn.toLocaleString('zh-CN')}`,
            left: 'center'
        },
        tooltip: {
            trigger: 'item',
            formatter: params => {
                const value = params.value > 0 ? 
                    `+¥${params.value.toLocaleString('zh-CN')}` : 
                    `-¥${Math.abs(params.value).toLocaleString('zh-CN')}`;
                return `${params.seriesName}<br/>${params.name}: ${value} (${params.percent}%)`;
            }
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            data: ['股票收益', '债券收益']
        },
        series: [{
            name: '收益来源',
            type: 'pie',
            radius: '55%',
            center: ['50%', '60%'],
            roseType: 'radius',
            itemStyle: {
                borderRadius: 5
            },
            label: {
                color: '#333'
            },
            labelLine: {
                lineStyle: {
                    color: 'rgba(0, 0, 0, 0.3)'
                },
                smooth: 0.2,
                length: 10,
                length2: 20
            },
            data: [
                { 
                    value: data.stockReturn, 
                    name: `股票收益 (${data.stockReturnPercentage}%)`,
                    itemStyle: { color: '#59a14f' }
                },
                { 
                    value: data.bondReturn, 
                    name: `债券收益 (${data.bondReturnPercentage}%)`,
                    itemStyle: { color: '#e15759' }
                }
            ]
        }]
    };
    
    chart.setOption(option);
}

/**
 * 显示图表错误信息
 * @param {object} chart ECharts实例
 * @param {string} message 错误信息
 */
function showChartError(chart, message) {
    chart.setOption({
        title: {
            text: message,
            subtext: '请刷新页面重试',
            left: 'center',
            top: 'center',
            textStyle: {
                fontSize: 16,
                color: '#ff4d4f'
            }
        }
    });
}