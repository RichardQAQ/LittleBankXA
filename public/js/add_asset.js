document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const assetTypeSelect = document.getElementById('asset-type');
    const bondSpecificFields = document.getElementById('bond-specific-fields');
    const addAssetForm = document.getElementById('add-asset-form');
    const formMessage = document.getElementById('form-message');

    // 设置今天为默认购买日期
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('purchase-date').value = today;

    // 解析URL参数并填充表单
    function fillFormFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const assetType = urlParams.get('type');
        if (assetType === 'stock') {
            // 设置资产类型为股票
            document.getElementById('asset-type').value = 'stock';
            // 隐藏债券特有字段
            bondSpecificFields.style.display = 'none';
            // 填充股票代码和名称
            const symbol = urlParams.get('symbol');
            const name = urlParams.get('name');
            if (symbol) document.getElementById('symbol').value = symbol;
            if (name) document.getElementById('name').value = name;
        }
    }

    // 页面加载时填充表单
    fillFormFromUrl();

    // 监听资产类型变化
    assetTypeSelect.addEventListener('change', function() {
        if (this.value === 'bond') {
            bondSpecificFields.style.display = 'block';
            // 设置债券字段为必填
            document.getElementById('face-value').required = true;
            document.getElementById('coupon-rate').required = true;
            document.getElementById('maturity-date').required = true;
        } else {
            bondSpecificFields.style.display = 'none';
            // 移除债券字段的必填要求
            document.getElementById('face-value').required = false;
            document.getElementById('coupon-rate').required = false;
            document.getElementById('maturity-date').required = false;
        }
    });

    // 表单提交事件
    addAssetForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // 获取表单数据
        const formData = new FormData(this);
        const assetData = {};

        formData.forEach((value, key) => {
            // 转换数字类型
            if (key === 'quantity' || key === 'purchasePrice' || key === 'faceValue' || key === 'couponRate') {
                assetData[key] = parseFloat(value);
            } else {
                assetData[key] = value;
            }
        });

        // 提交数据到服务器
        fetch('/api/portfolio', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(assetData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showMessage('添加资产失败: ' + data.error, 'error');
                console.error('添加资产失败:', data.error);
            } else {
                showMessage('资产添加成功', 'success');
                // 重置表单
                addAssetForm.reset();
                document.getElementById('purchase-date').value = today;
                // 3秒后跳转到投资组合页面
                setTimeout(() => {
                    window.location.href = 'portfolio.html';
                }, 3000);
            }
        })
        .catch(error => {
            showMessage('添加资产时发生错误', 'error');
            console.error('添加资产时发生错误:', error);
        });
    });

    // 显示消息
    function showMessage(text, type = 'info') {
        formMessage.className = type === 'error' ? 'error-message' : 'success-message';
        formMessage.textContent = text;
        formMessage.style.display = 'block';

        // 5秒后隐藏消息
        setTimeout(() => {
            formMessage.style.display = 'none';
        }, 5000);
    }
});