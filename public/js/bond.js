document.addEventListener('DOMContentLoaded', function() {
    const bondSymbolInput = document.getElementById('bond-symbol');
    const searchBondButton = document.getElementById('search-bond');
    const updatePriceButton = document.getElementById('update-bond-price');
    const loadingIndicator = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    const bondDataElement = document.getElementById('bond-data');
    const bondTableBody = document.getElementById('bond-table-body');

    // 隐藏加载指示器和错误提示
    loadingIndicator.style.display = 'none';
    errorElement.style.display = 'none';

    // 加载债券列表
    loadBondList();

    // 查询债券按钮点击事件
    searchBondButton.addEventListener('click', () => {
        const symbol = bondSymbolInput.value.trim().toUpperCase();
        if (symbol) {
            getBondData(symbol);
        } else {
            showError('请输入债券代码');
        }
    });

    // 更新价格按钮点击事件
    updatePriceButton.addEventListener('click', () => {
        const symbol = bondSymbolInput.value.trim().toUpperCase();
        if (symbol) {
            updateBondPrice(symbol);
        } else {
            showError('请输入债券代码');
        }
    });

    // 获取债券数据
    async function getBondData(symbol) {
        showLoading();
        try {
            const response = await fetch(`/api/bonds/${symbol}`);
            if (!response.ok) {
                throw new Error('获取债券数据失败');
            }
            const bondData = await response.json();
            displayBondData(bondData);
        } catch (error) {
            showError(error.message);
        } finally {
            hideLoading();
        }
    }

    // 更新债券价格
    async function updateBondPrice(symbol) {
        showLoading();
        try {
            const response = await fetch(`/api/bonds/${symbol}/update`, { method: 'POST' });
            if (!response.ok) {
                throw new Error('更新债券价格失败');
            }
            const result = await response.json();
            showError(result.message, true);
            // 重新加载债券列表
            loadBondList();
            // 重新获取债券数据
            getBondData(symbol);
        } catch (error) {
            showError(error.message);
        } finally {
            hideLoading();
        }
    }

    // 加载债券列表
    async function loadBondList() {
        try {
            const response = await fetch('/api/bonds');
            if (!response.ok) {
                throw new Error('获取债券列表失败');
            }
            const bonds = await response.json();
            displayBondList(bonds);
        } catch (error) {
            console.error('加载债券列表失败:', error);
        }
    }

    // 显示债券数据
    function displayBondData(bondData) {
        bondDataElement.innerHTML = `
            <div class="bond-info">
                <h4>${bondData.symbol} - ${bondData.name || '未知名称'}</h4>
                <p>当前价格: <span class="price">¥${bondData.current_price || 'N/A'}</span></p>
                <p>面值: ¥${bondData.face_value || 'N/A'}</p>
                <p>票面利率: ${bondData.coupon_rate || 'N/A'}%</p>
                <p>到期日期: ${bondData.maturity_date || 'N/A'}</p>
                <p>剩余期限: ${calculateRemainingTerm(bondData.maturity_date)} 年</p>
            </div>
        `;
    }

    // 计算剩余期限
    function calculateRemainingTerm(maturityDate) {
        if (!maturityDate) return 'N/A';
        const today = new Date();
        const maturity = new Date(maturityDate);
        const diffTime = Math.abs(maturity - today);
        const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
        return diffYears.toFixed(2);
    }

    // 显示债券列表
    function displayBondList(bonds) {
        bondTableBody.innerHTML = '';
        bonds.forEach(bond => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${bond.symbol}</td>
                <td>${bond.name}</td>
                <td>¥${bond.current_price}</td>
                <td>
                    <button class="view-btn" data-symbol="${bond.symbol}">查看</button>
                    <button class="update-btn" data-symbol="${bond.symbol}">更新价格</button>
                    <button class="buy-btn" data-symbol="${bond.symbol}" data-name="${bond.name}">购买</button>
                </td>
            `;
            bondTableBody.appendChild(row);
        });

        // 为查看按钮添加事件监听
        document.querySelectorAll('.view-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const symbol = e.target.getAttribute('data-symbol');
                bondSymbolInput.value = symbol;
                getBondData(symbol);
            });
        });

        // 为更新价格按钮添加事件监听
        document.querySelectorAll('.update-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const symbol = e.target.getAttribute('data-symbol');
                bondSymbolInput.value = symbol;
                updateBondPrice(symbol);
            });
        });

        // 为购买按钮添加事件监听
        document.querySelectorAll('.buy-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const symbol = e.target.getAttribute('data-symbol');
                const name = e.target.getAttribute('data-name');
                // 跳转到添加资产页面，并传递债券信息
                window.location.href = `add_asset.html?type=bond&symbol=${symbol}&name=${name}`;
            });
        });
    }

    // 显示加载指示器
    function showLoading() {
        loadingIndicator.style.display = 'block';
        errorElement.style.display = 'none';
        bondDataElement.innerHTML = '';
    }

    // 隐藏加载指示器
    function hideLoading() {
        loadingIndicator.style.display = 'none';
    }

    // 显示错误信息
    function showError(message, isSuccess = false) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        errorElement.className = isSuccess ? 'success' : 'error';
    }

    // 格式化数字
    function formatNumber(num) {
        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(2) + 'B';
        } else if (num >= 1000000) {
            return (num / 1000000).toFixed(2) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(2) + 'K';
        }
        return num.toString();
    }
});