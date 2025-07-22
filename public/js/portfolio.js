document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const assetsTableBody = document.getElementById('assets-table-body');
    const portfolioMessage = document.getElementById('portfolio-message');
    const totalAssetsElement = document.getElementById('total-assets');
    const cashBalanceElement = document.getElementById('cash-balance');
    const rechargeBtn = document.getElementById('recharge-btn');

    // 充值按钮点击事件
    rechargeBtn.addEventListener('click', function() {
        const amount = prompt('请输入充值金额:');
        if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
            rechargeCash(parseFloat(amount));
        } else {
            alert('请输入有效的金额');
        }
    });

    // 加载投资组合数据
    function loadPortfolioData() {
        fetch('/api/portfolio')
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showMessage('获取投资组合数据失败: ' + data.error, 'error');
                    console.error('获取投资组合数据失败:', data.error);
                } else if (data.assets.length === 0) {
            assetsTableBody.innerHTML = '<tr><td colspan="10">暂无资产，请添加资产到投资组合</td></tr>';
            totalAssetsElement.textContent = '¥0.00';
            cashBalanceElement.textContent = '¥0.00';
        } else {
            renderAssetsTable(data.assets);
            calculateAndDisplaySummary(data.assets);
        }
            })
            .catch(error => {
                showMessage('获取投资组合数据时发生错误', 'error');
                console.error('获取投资组合数据时发生错误:', error);
            });
    }

    // 渲染资产表格
    function renderAssetsTable(assets) {
        let html = '';
        assets.forEach(asset => {
            const currentPrice = parseFloat(asset.current_price);
            const purchasePrice = parseFloat(asset.purchase_price);
            const marketValue = (currentPrice * asset.quantity).toFixed(2);
            const profitLoss = ((currentPrice - purchasePrice) * asset.quantity).toFixed(2);
            const profitLossClass = profitLoss >= 0 ? 'positive' : 'negative';
            const assetType = asset.type === 'stock' ? '股票' : '债券';

            html += `<tr data-id="${asset.id}">
                <td>${asset.name}</td>
                <td>${assetType}</td>
                <td>${asset.symbol}</td>
                <td>${asset.quantity}</td>
                <td>¥${purchasePrice.toFixed(2)}</td>
                <td>¥${currentPrice.toFixed(2)}</td>
                <td>${formatDate(asset.purchaseDate)}</td>
                <td>¥${marketValue}</td>
                <td class="${profitLossClass}">¥${profitLoss}</td>
                <td>
                    <button class="btn btn-danger delete-asset" data-id="${asset.id}">删除</button>
                </td>
            </tr>`;
        });
        assetsTableBody.innerHTML = html;

        // 添加删除按钮事件监听
        document.querySelectorAll('.delete-asset').forEach(button => {
            button.addEventListener('click', function() {
                const assetId = this.getAttribute('data-id');
                deleteAsset(assetId);
            });
        });
    }

    // 删除资产
    function deleteAsset(assetId) {
        if (confirm('确定要删除此资产吗？')) {
            fetch(`/api/portfolio/${assetId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showMessage('删除资产失败: ' + data.error, 'error');
                    console.error('删除资产失败:', data.error);
                } else {
                    showMessage('资产删除成功', 'success');
                    // 重新加载数据
                    loadPortfolioData();
                }
            })
            .catch(error => {
                showMessage('删除资产时发生错误', 'error');
                console.error('删除资产时发生错误:', error);
            });
        }
    }

    // 显示消息
    function showMessage(text, type = 'info') {
        portfolioMessage.className = type === 'error' ? 'error-message' : 'success-message';
        portfolioMessage.textContent = text;
        portfolioMessage.style.display = 'block';

        // 3秒后隐藏消息
        setTimeout(() => {
            portfolioMessage.style.display = 'none';
        }, 3000);
    }

    // 计算并显示总资产和剩余现金
    function calculateAndDisplaySummary(assets) {
        let totalAssets = 0;
        let cashBalance = 0;

        assets.forEach(asset => {
            const currentPrice = parseFloat(asset.current_price);
            const marketValue = currentPrice * asset.quantity;
            totalAssets += marketValue;

            if (asset.type === 'cash') {
                cashBalance += marketValue;
            }
        });

        totalAssetsElement.textContent = '¥' + totalAssets.toFixed(2);
        cashBalanceElement.textContent = '¥' + cashBalance.toFixed(2);
    }

    // 充值现金
    function rechargeCash(amount) {
        fetch('/api/portfolio/recharge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount: amount })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showMessage('充值失败: ' + data.error, 'error');
                console.error('充值失败:', data.error);
            } else {
                showMessage('充值成功', 'success');
                // 重新加载数据
                loadPortfolioData();
            }
        })
        .catch(error => {
            showMessage('充值时发生错误', 'error');
            console.error('充值时发生错误:', error);
        });
    }

    // 格式化日期
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN');
    }

    // 初始化加载数据
    loadPortfolioData();
});