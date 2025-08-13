document.addEventListener('DOMContentLoaded', () => {
    let allItems = []; // Stores combined data from YAML files
    let cart = {}; // Stores items added to the cart with their quantities

    // Get DOM elements
    const invoiceTitleDisplay = document.getElementById('invoice-title');
    const buySellToggle = document.getElementById('buySellToggle');
    const searchInput = document.getElementById('item-search');
    const itemListTableBody = document.getElementById('item-list');
    const subtotalSpan = document.getElementById('subtotal');
    const gstInput = document.getElementById('gstInput');
    const gstAmountSpan = document.getElementById('gstAmount');
    const taxInput = document.getElementById('taxInput');
    const taxAmountSpan = document.getElementById('taxAmount');
    const totalAmountSpan = document.getElementById('totalAmount');
    const previewButton = document.getElementById('preview-button');
    const downloadButton = document.getElementById('download-button');
    const invoicePreview = document.getElementById('invoicePreview');
    const previewModal = document.getElementById('previewModal');
    const closeModalButton = previewModal.querySelector('.close-button');
    const cartSummaryList = document.getElementById('cart-summary-list'); // New: Selected items display tbody

    // List of YAML files to fetch - UPDATED!
    const fileList = [
        'Blocks.yml.old.yml',
        'Ores.yml',
        'Decoration.yml',
        'Dyes.yml',
        'Enchanting.yml',
        'Farming.yml',
        'Food.yml',
        'Miscellaneous.yml',
        'Mobs.yml',
        'Music.yml',
        'Potions.yml',
        'Redstone.yml',
        'SpawnEggs.yml',
        'Workstations.yml',
        'Z_EverythingElse.yml'
    ];

    // Function to fetch and parse YAML files
    async function fetchAndParseYamlFiles() {
        try {
            const fetchPromises = fileList.map(async file => {
                const response = await fetch(file);
                if (!response.ok) {
                    // Log a warning instead of throwing an error for missing files
                    console.warn(`Warning: Could not fetch ${file}. Status: ${response.status}`);
                    return null; // Return null for files that couldn't be fetched
                }
                const text = await response.text();
                // Use js-yaml to parse the YAML content
                const data = jsyaml.load(text);
                return data;
            });

            const results = await Promise.all(fetchPromises);
            
            // Combine data from all YAML files into allItems array
            allItems = [];
            results.forEach(data => {
                if (data && data.pages) {
                    for (const pageKey in data.pages) {
                        if (data.pages.hasOwnProperty(pageKey)) {
                            const page = data.pages[pageKey];
                            if (page.items) {
                                for (const itemKey in page.items) {
                                    if (page.items.hasOwnProperty(itemKey)) {
                                        const item = page.items[itemKey];
                                        // Ensure buy/sell prices exist, default to 0 if not
                                        allItems.push({
                                            name: item.material,
                                            buy_price: item.buy || 0,
                                            sell_price: item.sell || 0
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            });
            console.log('Combined All Items:', allItems);
            // After loading all items, sort them alphabetically by name
            allItems.sort((a, b) => a.name.localeCompare(b.name));
            displayItems(allItems); // Initial display after data is loaded
        } catch (error) {
            console.error('Error fetching or parsing YAML files:', error);
            itemListTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading items. Please ensure YAML files are correctly placed and formatted.</td></tr>';
        }
    }

    // Function to display items in the table
    function displayItems(itemsToDisplay) {
        itemListTableBody.innerHTML = '';
        if (itemsToDisplay.length === 0) {
            itemListTableBody.innerHTML = '<tr><td colspan="4" class="text-center">No items found or matching your search.</td></tr>';
            return;
        }

        itemsToDisplay.forEach(item => {
            const row = itemListTableBody.insertRow();
            row.dataset.itemName = item.name; // Store item name for easy access

            const materialCell = row.insertCell();
            materialCell.textContent = item.name;

            const quantityCell = row.insertCell();
            const quantityInput = document.createElement('input');
            quantityInput.type = 'number';
            quantityInput.min = '0';
            quantityInput.value = cart[item.name] ? cart[item.name].quantity : 0;
            quantityInput.classList.add('quantity-input');
            quantityInput.addEventListener('input', (event) => {
                const newQuantity = parseInt(event.target.value) || 0;
                if (newQuantity > 0) {
                    cart[item.name] = { ...item, quantity: newQuantity };
                } else {
                    delete cart[item.name];
                }
                updateBill();
                updateItemCost(row, item.name);
                updateSelectedItemsDisplay(); // Update the selected items section
            });
            quantityCell.appendChild(quantityInput);

            const costCell = row.insertCell();
            costCell.classList.add('item-cost');
            costCell.textContent = '0.00'; // Initial cost

            const actionCell = row.insertCell();
            const addButton = document.createElement('button');
            addButton.classList.add('btn', 'btn-primary', 'btn-sm');
            addButton.textContent = 'Add';
            addButton.addEventListener('click', () => {
                quantityInput.value = parseInt(quantityInput.value) + 1;
                quantityInput.dispatchEvent(new Event('input')); // Trigger input event to update cart and bill
            });
            actionCell.appendChild(addButton);

            updateItemCost(row, item.name); // Update cost for initial display
        });
    }

    // Function to update individual item cost in the table
    function updateItemCost(row, itemName) {
        const costCell = row.querySelector('.item-cost');
        const item = allItems.find(i => i.name === itemName);
        if (!item) return;

        const isBuying = buySellToggle.checked; // true for Buy, false for Sell
        const price = isBuying ? item.buy_price : item.sell_price;

        if (cart[itemName]) {
            costCell.textContent = (price * cart[itemName].quantity).toFixed(2);
        } else {
            costCell.textContent = '0.00';
        }
    }

    // Function to update the display of selected items above subtotal
    function updateSelectedItemsDisplay() {
        cartSummaryList.innerHTML = ''; // Clear current display

        if (Object.keys(cart).length === 0) {
            cartSummaryList.innerHTML = '<tr><td colspan="3" class="text-center">No items added yet.</td></tr>';
            return;
        }

        const isBuying = buySellToggle.checked;

        for (const itemName in cart) {
            const item = cart[itemName];
            // Ensure price is a number, default to 0 if undefined
            const price = isBuying ? (item.buy_price || 0) : (item.sell_price || 0);
            const itemCost = price * item.quantity;

            const row = cartSummaryList.insertRow();
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${itemCost.toFixed(2)}</td>
            `;
        }
    }

    // Function to update bill calculations
    function updateBill() {
        let subtotal = 0;
        const isBuying = buySellToggle.checked;

        for (const itemName in cart) {
            const item = cart[itemName];
            // Ensure price is a number, default to 0 if undefined
            const price = isBuying ? (item.buy_price || 0) : (item.sell_price || 0);
            subtotal += price * item.quantity;
        }
        subtotalSpan.textContent = subtotal.toFixed(2);

        const gstRate = parseFloat(gstInput.value) || 0;
        const gstAmount = subtotal * (gstRate / 100);
        gstAmountSpan.textContent = gstAmount.toFixed(2);

        const taxRate = parseFloat(taxInput.value) || 0;
        const taxAmount = subtotal * (taxRate / 100);
        taxAmountSpan.textContent = taxAmount.toFixed(2);

        const totalAmount = subtotal + gstAmount + taxAmount;
        totalAmountSpan.textContent = totalAmount.toFixed(2);
    }

    // Function to generate invoice preview (now including dynamic cart items)
    function previewInvoice() {
        let previewContent = `
            <h1 style="color: #4CAF50; text-align: center; margin-bottom: 20px;">${buySellToggle.checked ? 'Buying' : 'Selling'} Invoice</h1>
            <table>
                <thead>
                    <tr>
                        <th>Material Name</th>
                        <th>Quantity</th>
                        <th>Cost</th>
                    </tr>
                </thead>
                <tbody>
        `;

        let currentSubtotal = 0;
        const isBuying = buySellToggle.checked;

        for (const itemName in cart) {
            const item = cart[itemName];
            const price = isBuying ? (item.buy_price || 0) : (item.sell_price || 0);
            const itemCost = price * item.quantity;
            currentSubtotal += itemCost;
            previewContent += `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>${itemCost.toFixed(2)}</td>
                </tr>
            `;
        }

        if (Object.keys(cart).length === 0) {
            previewContent += `<tr><td colspan="3" class="text-center">No items in cart.</td></tr>`;
        }

        previewContent += `
                </tbody>
            </table>
            <div class="summary">
                <div class="tax-row">
                    <span>Subtotal:</span>
                    <span>${currentSubtotal.toFixed(2)}</span>
                </div>
        `;

        const gstRate = parseFloat(gstInput.value) || 0;
        const gstAmount = currentSubtotal * (gstRate / 100);
        
        const taxRate = parseFloat(taxInput.value) || 0;
        const taxAmount = currentSubtotal * (taxRate / 100);
        
        const totalAmount = currentSubtotal + gstAmount + taxAmount;

        previewContent += `
                <div class="tax-row">
                    <span>GST (${gstRate}%):</span>
                    <span>${gstAmount.toFixed(2)}</span>
                </div>
                <div class="tax-row">
                    <span>Tax (${taxRate}%):</span>
                    <span>${taxAmount.toFixed(2)}</span>
                </div>
                <div class="total-row">
                    <strong>Total Amount:</strong>
                    <span>${totalAmount.toFixed(2)}</span>
                </div>
            </div>
        `;

        invoicePreview.innerHTML = `
            <div class="preview-container">
                ${previewContent}
            </div>
        `;
        previewModal.style.display = 'flex'; // Show the modal
    }

    // Event Listeners
    searchInput.addEventListener('input', (event) => {
        const query = event.target.value.toLowerCase();
        const filteredItems = allItems.filter(item => item.name.toLowerCase().includes(query));
        displayItems(filteredItems);
    });

    gstInput.addEventListener('input', updateBill);
    taxInput.addEventListener('input', updateBill);

    buySellToggle.addEventListener('change', () => {
        invoiceTitleDisplay.textContent = buySellToggle.checked ? 'Buying Invoice' : 'Selling Invoice';
        // Re-calculate all item costs and total bill based on new toggle state
        allItems.forEach(item => {
            const row = itemListTableBody.querySelector(`tr[data-item-name="${item.name}"]`);
            if (row) {
                updateItemCost(row, item.name);
            }
        });
        updateBill();
        updateSelectedItemsDisplay(); // Update the selected items section
    });

    previewButton.addEventListener('click', previewInvoice);

    downloadButton.addEventListener('click', () => {
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '-9999px';
        document.body.appendChild(tempDiv);

        // Generate the same content as previewInvoice, but with download-specific styles
        let downloadContent = `
            <div class="download-invoice-container">
                <h1 style="text-align: center;">${buySellToggle.checked ? 'Buying' : 'Selling'} Invoice</h1>
                <table>
                    <thead>
                        <tr>
                            <th>Material Name</th>
                            <th>Quantity</th>
                            <th>Cost</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

        let currentSubtotal = 0;
        const isBuying = buySellToggle.checked;

        for (const itemName in cart) {
            const item = cart[itemName];
            const price = isBuying ? (item.buy_price || 0) : (item.sell_price || 0);
            const itemCost = price * item.quantity;
            currentSubtotal += itemCost;
            downloadContent += `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.quantity}</td>
                        <td>${itemCost.toFixed(2)}</td>
                    </tr>
                `;
        }

        if (Object.keys(cart).length === 0) {
            downloadContent += `<tr><td colspan="3" style="text-align: center;">No items in cart.</td></tr>`;
        }

        downloadContent += `
                    </tbody>
                </table>
                <div class="summary">
                    <div class="tax-row">
                        <span>Subtotal:</span>
                        <span>${currentSubtotal.toFixed(2)}</span>
                    </div>
            `;

        const gstRate = parseFloat(gstInput.value) || 0;
        const gstAmount = currentSubtotal * (gstRate / 100);
        
        const taxRate = parseFloat(taxInput.value) || 0;
        const taxAmount = currentSubtotal * (taxRate / 100);
        
        const totalAmount = currentSubtotal + gstAmount + taxAmount;

        downloadContent += `
                    <div class="tax-row">
                        <span>GST (${gstRate}%):</span>
                        <span>${gstAmount.toFixed(2)}</span>
                    </div>
                    <div class="tax-row">
                        <span>Tax (${taxRate}%):</span>
                        <span>${taxAmount.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <strong>Total Amount:</strong>
                        <span>${totalAmount.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;

        tempDiv.innerHTML = downloadContent;

        html2canvas(tempDiv, {
            scale: 2, // Higher scale for better image quality
            backgroundColor: '#ffffff' // Explicitly set white background for the image
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `Minecraft_${buySellToggle.checked ? 'Buying' : 'Selling'}_Invoice.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }).finally(() => {
            document.body.removeChild(tempDiv); // Clean up the temporary div
        });
    });

    // Close modal event listener
    closeModalButton.addEventListener('click', () => {
        previewModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === previewModal) {
            previewModal.style.display = 'none';
        }
    });

    // Initial data fetch and display
    fetchAndParseYamlFiles();
    updateSelectedItemsDisplay(); // Initial call to display selected items (if any from previous session)
});