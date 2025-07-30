// Create a new file: public/js/stockChart.js
class StockChart {
  // FIX: The constructor now accepts the canvas element directly, not an ID.
  constructor(canvasElement, chartData) {
    this.canvas = canvasElement;
    if (!this.canvas) {
      console.error(`A valid canvas element was not provided.`);
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

    if (!this.chartData || !this.chartData.labels || !this.chartData.values || this.chartData.values.length === 0) {
      // If there's no data, we don't need to do anything here as the parent function handles error messages.
      return;
    }

    // --- START: Calculate Y-axis range for better zoom ---
    // CORRECTED: Filter out non-positive values to prevent erroneous '0' from skewing the axis.
    const validValues = this.chartData.values.filter(v => typeof v === 'number' && !isNaN(v) && v > 0);
    if (validValues.length === 0) {
        console.error('No valid data points to display.');
        return;
    }

    const dataMin = Math.min(...validValues);
    const dataMax = Math.max(...validValues);
    let suggestedMin, suggestedMax;

    if (dataMin === dataMax) {
        // If all values are the same, add a small absolute padding
        suggestedMin = dataMin - 1;
        suggestedMax = dataMax + 1;
    } else {
        // Add 1% padding for an even stronger zoom effect
        const range = dataMax - dataMin;
        const padding = range * 0.01; // REDUCED from 0.02 for maximum zoom
        suggestedMin = dataMin - padding;
        suggestedMax = dataMax + padding;
    }
    // --- END: Calculate Y-axis range ---

    this.chartInstance = new Chart(this.canvas, { // FIX: Use this.canvas
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
            // Use 'min' and 'max' to force the axis range, providing a better zoom.
            min: suggestedMin,
            max: suggestedMax
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