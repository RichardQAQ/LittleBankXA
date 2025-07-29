document.addEventListener('DOMContentLoaded', function() {
    // const chartContainer = document.getElementById('historical-chart-container');
    // const stockInput = document.getElementById('historical-stock-input');
    // const stockButton = document.getElementById('historical-stock-button');
    // let currentChart = null;

    // // Only run this script if the necessary elements are on the page
    // if (!stockInput || !stockButton || !chartContainer) {
    //     return;
    // }

    // async function displayHistoricalChart(symbol) {
    //     if (!symbol) {
    //         chartContainer.innerHTML = ''; // Clear chart if no stock is selected
    //         if (currentChart && currentChart.chartInstance) {
    //             currentChart.chartInstance.destroy();
    //             currentChart = null;
    //         }
    //         return;
    //     }

    //     chartContainer.innerHTML = '<p class="loading">Loading chart data...</p>';
    //     try {
    //         const response = await fetch(`/api/stocks/${symbol.toUpperCase()}/history`);
    //         if (!response.ok) {
    //             const errorData = await response.json();
    //             throw new Error(errorData.error || `Failed to fetch data: ${response.statusText}`);
    //         }
    //         const chartData = await response.json();
    //         // Ensure you have a global StockChart class available
    //         currentChart = new StockChart('historical-chart-container', chartData);
    //     } catch (error) {
    //         chartContainer.innerHTML = `<p class="error-message">Could not load chart for ${symbol}: ${error.message}</p>`;
    //         console.error(error);
    //     }
    // }

    // function handleHistorySearch() {
    //     const symbol = stockInput.value.trim();
    //     if (symbol) {
    //         displayHistoricalChart(symbol);
    //     }
    // }

    // stockButton.addEventListener('click', handleHistorySearch);
    // stockInput.addEventListener('keypress', (e) => {
    //     if (e.key === 'Enter') {
    //         handleHistorySearch();
    //     }
    // });
});