document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const assetTypeSelect = document.getElementById('asset-type');
    const bondSpecificFields = document.getElementById('bond-specific-fields');
    const addAssetForm = document.getElementById('add-asset-form');
    const formMessage = document.getElementById('form-message');
    const purchasePriceInput = document.getElementById('purchase-price');
    const purchaseDateInput = document.getElementById('purchase-date');
    const symbolInput = document.getElementById('symbol');

    let isHistoricalEntry = true; // Assume historical entry by default

    // Set today as default purchase date
    const today = new Date().toISOString().split('T')[0];
    purchaseDateInput.value = today;

    // Parse URL parameters and fill form
    function fillFormFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const assetType = urlParams.get('type');
        if (assetType === 'stock') {
            isHistoricalEntry = false; // This is a current purchase, not historical
            // Set asset type to stock
            document.getElementById('asset-type').value = 'stock';
            // Hide bond-specific fields
            bondSpecificFields.style.display = 'none';
            // Fill stock symbol and name
            const symbol = urlParams.get('symbol');
            const price = urlParams.get('price');
            if (symbol) document.getElementById('symbol').value = symbol;
            if (price) document.getElementById('purchase-price').value = price;
        }
    }

    // Fill form from localStorage (from stock or bond page redirect)
    function fillFormFromStorage() {
        const prefilledData = localStorage.getItem('prefilledAsset');
        if (prefilledData) {
            isHistoricalEntry = false; // This is a current purchase, not historical
            try {
                const assetData = JSON.parse(prefilledData);
                
                // Set asset type
                document.getElementById('asset-type').value = assetData.type;
                
                // Fill basic information
                if (assetData.symbol) document.getElementById('symbol').value = assetData.symbol;
                if (assetData.price) document.getElementById('purchase-price').value = assetData.price;
                
                // Show/hide fields based on asset type
                if (assetData.type === 'bond') {
                    bondSpecificFields.style.display = 'block';
                    document.getElementById('face-value').required = true;
                    document.getElementById('coupon-rate').required = true;
                    document.getElementById('maturity-date').required = true;
                    
                    // Fill bond-specific information
                    if (assetData.faceValue) document.getElementById('face-value').value = assetData.faceValue;
                    if (assetData.couponRate) document.getElementById('coupon-rate').value = assetData.couponRate;
                    if (assetData.maturityDate) {
                        document.getElementById('maturity-date').value = assetData.maturityDate;
                        console.log('Filling maturity date:', assetData.maturityDate);
                    }
                } else {
                    bondSpecificFields.style.display = 'none';
                    document.getElementById('face-value').required = false;
                    document.getElementById('coupon-rate').required = false;
                    document.getElementById('maturity-date').required = false;
                }
                
                // Clear data from localStorage
                localStorage.removeItem('prefilledAsset');
                
                // Show notification message
                showMessage(`${assetData.type === 'stock' ? 'Stock' : 'Bond'} information auto-filled, please confirm quantity before submitting`, 'info');
                
            } catch (error) {
                console.error('Failed to parse prefilled data:', error);
            }
        }
    }

    // Fill form when page loads
    fillFormFromUrl();
    fillFormFromStorage();

    // If it's a historical entry, make fields editable
    if (isHistoricalEntry) {
        purchasePriceInput.readOnly = false;
        purchaseDateInput.readOnly = false;
        purchasePriceInput.placeholder = 'Auto-filled after date selection or enter manually';
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
                    showMessage('Historical price retrieved', 'info');
                } else {
                    purchasePriceInput.value = '';
                    showMessage(data.error || 'Unable to get price for this date', 'error');
                }
            } catch (error) {
                showMessage('Failed to get historical price', 'error');
            }
        }
    }

    // Add listeners to trigger the fetch
    symbolInput.addEventListener('blur', fetchHistoricalPrice);
    purchaseDateInput.addEventListener('change', fetchHistoricalPrice);

    // Listen for asset type changes
    assetTypeSelect.addEventListener('change', function() {
        if (this.value === 'bond') {
            bondSpecificFields.style.display = 'block';
            // Set bond fields as required
            document.getElementById('face-value').required = true;
            document.getElementById('coupon-rate').required = true;
            document.getElementById('maturity-date').required = true;
        } else {
            bondSpecificFields.style.display = 'none';
            // Remove required attribute from bond fields
            document.getElementById('face-value').required = false;
            document.getElementById('coupon-rate').required = false;
            document.getElementById('maturity-date').required = false;
        }
    });

    // Form submission event
    addAssetForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Get form data
        const formData = new FormData(this);
        const assetData = {};

        formData.forEach((value, key) => {
            // Convert numeric types
            if (key === 'quantity' || key === 'purchasePrice' || key === 'faceValue' || key === 'couponRate') {
                assetData[key] = parseFloat(value);
            } else {
                assetData[key] = value;
            }
        });

        // Submit data to server
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
                showMessage('Failed to add asset: ' + data.error, 'error');
                console.error('Failed to add asset:', data.error);
            } else {
                showMessage('Asset added successfully', 'success');
                // Reset form
                addAssetForm.reset();
                document.getElementById('purchase-date').value = today;
                // Redirect to portfolio page after 3 seconds
                setTimeout(() => {
                    window.location.href = 'portfolio.html';
                }, 3000);
            }
        })
        .catch(error => {
            showMessage('Error occurred while adding asset', 'error');
            console.error('Error occurred while adding asset:', error);
        });
    });

    // Show message
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

        // Hide message after 5 seconds
        setTimeout(() => {
            formMessage.style.display = 'none';
        }, 5000);
    }
});