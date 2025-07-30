document.addEventListener('DOMContentLoaded', () => {
    const watchlistBody = document.getElementById('watchlist-body');
    const emptyWatchlist = document.getElementById('empty-watchlist');
    const loadingElement = document.getElementById('loading');
    const messageElement = document.getElementById('message');
    const stockSymbolInput = document.getElementById('stock-symbol');
    const addToWatchlistBtn = document.getElementById('add-to-watchlist');
    const updateAllPricesBtn = document.getElementById('update-all-prices');
    
    // 加载关注列表
    loadWatchlist();
    
    // 添加到关注列表按钮点击事件
    addToWatchlistBtn.addEventListener('click', () => {
        const symbol = stockSymbolInput.value.trim().toUpperCase();
        if (symbol) {
            addToWatchlist(symbol);
        } else {
            showMessage('请输入股票代码', false);
        }
    });
    
    // 更新所有价格按钮点击事件
    updateAllPricesBtn.addEventListener('click', () => {
        updateAllPrices();
    });
    
    // 加载关注列表
    async function loadWatchlist() {
        showLoading();
        try {
            const response = await fetch('/api/watchlist');
            if (!response.ok) {
                throw new Error('获取关注列表失败');
            }
            const watchlist = await response.json();
            displayWatchlist(watchlist);
        } catch (error) {
            showMessage(error.message, false);
            console.error('加载关注列表失败:', error);
        } finally {
            hideLoading();
        }
    }
    
    // 添加到关注列表
    async function addToWatchlist(symbol) {
        showLoading();
        try {
            const response = await fetch('/api/watchlist/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ symbol })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '添加到关注列表失败');
            }
            
            const result = await response.json();
            showMessage(result.message || '成功添加到关注列表', true);
            stockSymbolInput.value = '';
            
            // 重新加载关注列表
            loadWatchlist();
        } catch (error) {
            showMessage(error.message, false);
        } finally {
            hideLoading();
        }
    }
    
    // 从关注列表中移除
    async function removeFromWatchlist(id) {
        if (!confirm('确定要从关注列表中移除此股票吗？')) {
            return;
        }
        
        showLoading();
        try {
            const response = await fetch(`/api/watchlist/remove/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('从关注列表中移除失败');
            }
            
            showMessage('已从关注列表中移除', true);
            
            // 重新加载关注列表
            loadWatchlist();
        } catch (error) {
            showMessage(error.message, false);
        } finally {
            hideLoading();
        }
    }
    
    // 更新所有价格
    async function updateAllPrices() {
        showLoading();
        try {
            const response = await fetch('/api/stocks/refresh', {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error('更新价格失败');
            }
            
            const result = await response.json();
            showMessage(`成功更新了 ${result.updated || 0} 支股票的价格`, true);
            
            // 重新加载关注列表
            loadWatchlist();
        } catch (error) {
            showMessage(error.message, false);
        } finally {
            hideLoading();
        }
    }
    
    // 显示关注列表
    function displayWatchlist(watchlist) {
        watchlistBody.innerHTML = '';
        
        if (!watchlist || watchlist.length === 0) {
            emptyWatchlist.style.display = 'block';
            return;
        }
        
        emptyWatchlist.style.display = 'none';
        
        watchlist.forEach(item => {
            const row = document.createElement('tr');
            
            // 计算涨跌颜色
            const changePercent = parseFloat(item.change_percent) || 0;
            const changeClass = changePercent >= 0 ? 'positive' : 'negative';
            const changeSign = changePercent >= 0 ? '+' : '';
            
            row.innerHTML = `
                <td class="stock-symbol">${item.symbol}</td>
                <td class="stock-name">${item.name || item.symbol}</td>
                <td class="stock-price">¥${parseFloat(item.current_price).toFixed(2)}</td>
                <td class="${changeClass}">${changeSign}${changePercent.toFixed(2)}%</td>
                <td>${new Date(item.updated_at).toLocaleString()}</td>
                <td class="action-buttons">
                    <button class="view-btn" data-symbol="${item.symbol}">查看</button>
                    <button class="buy-btn" data-symbol="${item.symbol}" data-name="${item.name || item.symbol}" data-price="${item.current_price}">购买</button>
                    <button class="remove-btn" data-id="${item.id}">移除</button>
                </td>
            `;
            
            watchlistBody.appendChild(row);
        });
        
        // 为查看按钮添加事件监听
        document.querySelectorAll('.view-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const symbol = e.target.getAttribute('data-symbol');
                window.location.href = `stock.html?symbol=${symbol}`;
            });
        });
        
        // 为购买按钮添加事件监听
        document.querySelectorAll('.buy-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const symbol = e.target.getAttribute('data-symbol');
                const name = e.target.getAttribute('data-name');
                const price = e.target.getAttribute('data-price');
                window.location.href = `add_asset.html?type=stock&symbol=${symbol}&name=${name}&price=${price}`;
            });
        });
        
        // 为移除按钮添加事件监听
        document.querySelectorAll('.remove-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                removeFromWatchlist(id);
            });
        });
    }
    
    // 显示加载指示器
    function showLoading() {
        loadingElement.style.display = 'block';
        messageElement.style.display = 'none';
    }
    
    // 隐藏加载指示器
    function hideLoading() {
        loadingElement.style.display = 'none';
    }
    
    // 显示消息
    function showMessage(message, isSuccess = true) {
        messageElement.textContent = message;
        messageElement.className = isSuccess ? 'success' : 'error';
        messageElement.style.display = 'block';
        
        // 3秒后自动隐藏消息
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 3000);
    }
});