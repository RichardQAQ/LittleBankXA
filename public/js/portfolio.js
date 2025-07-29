document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const assetsTableBody = document.getElementById('assets-table-body');
    const portfolioMessage = document.getElementById('portfolio-message');
    const totalAssetsElement = document.getElementById('total-assets');
    const cashBalanceElement = document.getElementById('cash-balance');
    const rechargeBtn = document.getElementById('recharge-btn');

    // Recharge button click event
    rechargeBtn.addEventListener('click', function() {
        const amount = prompt('Please enter the amount to recharge:');
        if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
            rechargeCash(parseFloat(amount));
        } else {
            alert('Please enter a valid amount.');
        }
    });

    // Load portfolio data
    function loadPortfolioData() {
        fetch('/api/portfolio')
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showMessage('Failed to fetch portfolio data: ' + data.error, 'error');
                    console.error('Failed to fetch portfolio data:', data.error);
                } else if (data.assets.length === 0) {
                    assetsTableBody.innerHTML = '<tr><td colspan="10">No assets found. Please add assets to your portfolio.</td></tr>';
                    totalAssetsElement.textContent = '$0.00';
                    cashBalanceElement.textContent = '$0.00';
                } else {
                    renderAssetsTable(data.assets);
                    calculateAndDisplaySummary(data.assets);
                }
            })
            .catch(error => {
                showMessage('An error occurred while fetching portfolio data.', 'error');
                console.error('An error occurred while fetching portfolio data:', error);
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
            const assetType = asset.type === 'stock' ? 'Stock' : 'Bond';

            html += `<tr data-id="${asset.id}">
                <td>${asset.name}</td>
                <td>${assetType}</td>
                <td>${asset.symbol}</td>
                <td>${asset.quantity}</td>
                <td>$${purchasePrice.toFixed(2)}</td>
                <td>$${currentPrice.toFixed(2)}</td>
                <td>${asset.purchase_date.split('T')[0]}</td>
                <td>$${marketValue}</td>
                <td class="${profitLossClass}">$${profitLoss}</td>
                <td>
                    <button class="btn btn-danger delete-asset" data-id="${asset.id}">Delete</button>
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
        if (confirm('Are you sure you want to delete this asset?')) {
            fetch(`/api/portfolio/${assetId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showMessage('Failed to delete asset: ' + data.error, 'error');
                    console.error('Failed to delete asset:', data.error);
                } else {
                    showMessage('Asset deleted successfully.', 'success');
                    // 重新加载数据
                    loadPortfolioData();
                }
            })
            .catch(error => {
                showMessage('An error occurred while deleting the asset.', 'error');
                console.error('An error occurred while deleting the asset:', error);
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

        totalAssetsElement.textContent = '$' + totalAssets.toFixed(2);
        cashBalanceElement.textContent = '$' + cashBalance.toFixed(2);
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
                showMessage('Recharge failed: ' + data.error, 'error');
                console.error('Recharge failed:', data.error);
            } else {
                showMessage('Recharge successful.', 'success');
                // 重新加载数据
                loadPortfolioData();
            }
        })
        .catch(error => {
            showMessage('An error occurred during recharge.', 'error');
            console.error('An error occurred during recharge:', error);
        });
    }

    // 初始化加载数据
    loadPortfolioData();
});