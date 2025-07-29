// Create a new file: public/js/stockChart.js
class StockChart {
  constructor(containerId, chartData) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Chart container with id "${containerId}" not found.`);
      return;
    }
    this.chartData = chartData;
    this.chartInstance = null;
    this.renderChart();
  }

  renderChart() {
    // Clear previous chart if it exists
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }
    // Add a canvas element for the chart
    this.container.innerHTML = '<canvas></canvas>';
    const canvas = this.container.querySelector('canvas');

    if (!this.chartData || !this.chartData.labels || !this.chartData.values || this.chartData.values.length === 0) {
      this.container.innerHTML = '<p class="error-message">Could not load chart data.</p>';
      return;
    }

    // --- START: Calculate Y-axis range for better zoom ---
    const dataMin = Math.min(...this.chartData.values);
    const dataMax = Math.max(...this.chartData.values);
    let suggestedMin, suggestedMax;

    if (dataMin === dataMax) {
        // If all values are the same, add a small absolute padding
        suggestedMin = dataMin - 1;
        suggestedMax = dataMax + 1;
    } else {
        // Add 2% padding for a stronger zoom effect
        const range = dataMax - dataMin;
        const padding = range * 0.02; // REDUCED from 0.1 for a stronger zoom
        suggestedMin = dataMin - padding;
        suggestedMax = dataMax + padding;
    }
    // --- END: Calculate Y-axis range ---

    this.chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: this.chartData.labels,
        datasets: [{
          label: `${this.chartData.symbol} Closing Price`,
          data: this.chartData.values,
          borderColor: '#2980b9',
          backgroundColor: 'rgba(41, 128, 185, 0.1)',
          borderWidth: 1.5,
          pointRadius: 0,
          fill: true,
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
          title: {
            display: true,
            text: `Historical Performance for ${this.chartData.symbol}`
          }
        },
        scales: {
          y: {
            title: {
              display: true,
              text: 'Price (USD)'
            },
            // --- START: Apply calculated min/max ---
            suggestedMin: suggestedMin,
            suggestedMax: suggestedMax
            // --- END: Apply calculated min/max ---
          },
          x: {
            title: {
              display: true,
              text: 'Date'
            }
          }
        }
      }
    });
  }
}

window.StockChart = StockChart;