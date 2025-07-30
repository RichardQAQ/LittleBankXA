document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const assetTypeSelect = document.getElementById('asset-type');
    const bondSpecificFields = document.getElementById('bond-specific-fields');
    const addAssetForm = document.getElementById('add-asset-form');
    const formMessage = document.getElementById('form-message');
    const purchasePriceInput = document.getElementById('purchase-price');
    const purchaseDateInput = document.getElementById('purchase-date');
    const symbolInput = document.getElementById('symbol');

    let isHistoricalEntry = true; // Assume historical entry by default

    // 设置今天为默认购买日期
    const today = new Date().toISOString().split('T')[0];
    purchaseDateInput.value = today;

    // 解析URL参数并填充表单
    function fillFormFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const assetType = urlParams.get('type');
        if (assetType === 'stock') {
            isHistoricalEntry = false; // This is a current purchase, not historical
            // 设置资产类型为股票
            document.getElementById('asset-type').value = 'stock';
            // 隐藏债券特有字段
            bondSpecificFields.style.display = 'none';
            // 填充股票代码和名称
            const symbol = urlParams.get('symbol');
            const name = urlParams.get('name');
            const price = urlParams.get('price');
            if (symbol) document.getElementById('symbol').value = symbol;
            if (name) document.getElementById('name').value = name;
            if (price) document.getElementById('purchase-price').value = price;
        }
    }

    // 从localStorage填充表单（来自股票或债券页面的跳转）
    function fillFormFromStorage() {
        const prefilledData = localStorage.getItem('prefilledAsset');
        if (prefilledData) {
            isHistoricalEntry = false; // This is a current purchase, not historical
            try {
                const assetData = JSON.parse(prefilledData);
                
                // 设置资产类型
                document.getElementById('asset-type').value = assetData.type;
                
                // 填充基本信息
                if (assetData.symbol) document.getElementById('symbol').value = assetData.symbol;
                if (assetData.name) document.getElementById('name').value = assetData.name;
                if (assetData.price) document.getElementById('purchase-price').value = assetData.price;
                
                // 根据资产类型显示/隐藏相应字段
                if (assetData.type === 'bond') {
                    bondSpecificFields.style.display = 'block';
                    document.getElementById('face-value').required = true;
                    document.getElementById('coupon-rate').required = true;
                    document.getElementById('maturity-date').required = true;
                    
                    // 填充债券特有信息
                    if (assetData.faceValue) document.getElementById('face-value').value = assetData.faceValue;
                    if (assetData.couponRate) document.getElementById('coupon-rate').value = assetData.couponRate;
                    if (assetData.maturityDate) {
                        document.getElementById('maturity-date').value = assetData.maturityDate;
                        console.log('填充到期日期:', assetData.maturityDate);
                    }
                } else {
                    bondSpecificFields.style.display = 'none';
                    document.getElementById('face-value').required = false;
                    document.getElementById('coupon-rate').required = false;
                    document.getElementById('maturity-date').required = false;
                }
                
                // 清除localStorage中的数据
                localStorage.removeItem('prefilledAsset');
                
                // 显示提示信息
                showMessage(`已自动填充${assetData.type === 'stock' ? '股票' : '债券'}信息，请确认数量后提交`, 'info');
                
            } catch (error) {
                console.error('解析预填充数据失败:', error);
            }
        }
    }

    // 页面加载时填充表单
    fillFormFromUrl();
    fillFormFromStorage();

    // If it's a historical entry, make fields editable
    if (isHistoricalEntry) {
        purchasePriceInput.readOnly = false;
        purchaseDateInput.readOnly = false;
        purchasePriceInput.placeholder = '选择日期后自动填充或手动输入';
        // Clear any default values that might be cached by the browser
        purchasePriceInput.value = ''; 
    }

    // Event listener to fetch historical price
    async function fetchHistoricalPrice() {
        const symbol = symbolInput.value.trim();
        const date = purchaseDateInput.value;
        const assetType = assetTypeSelect.value;

        if (isHistoricalEntry && symbol && date && assetType === 'stock') {
            try {
                const response = await fetch(`/api/stocks/${symbol}/price-on-date?date=${date}`);
                const data = await response.json();
                if (response.ok) {
                    purchasePriceInput.value = data.price.toFixed(2);
                    showMessage('已获取历史价格', 'info');
                } else {
                    purchasePriceInput.value = '';
                    showMessage(data.error || '无法获取该日价格', 'error');
                }
            } catch (error) {
                showMessage('获取历史价格失败', 'error');
            }
        }
    }

    // Add listeners to trigger the fetch
    symbolInput.addEventListener('blur', fetchHistoricalPrice);
    purchaseDateInput.addEventListener('change', fetchHistoricalPrice);

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
        if (type === 'error') {
            formMessage.className = 'error-message';
        } else if (type === 'success') {
            formMessage.className = 'success-message';
        } else {
            formMessage.className = 'info-message';
        }
        
        formMessage.textContent = text;
        formMessage.style.display = 'block';

        // 5秒后隐藏消息
        setTimeout(() => {
            formMessage.style.display = 'none';
        }, 5000);
    }
});