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
    const cartSummaryList = document.getElementById('cart-summary-list'); // Reference to the selected items tbody

    // List of YAML files to fetch - Comprehensive list
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
                    console.warn(`Warning: Could not fetch ${file}. Status: ${response.status}`);
                    return null;
                }
                const text = await response.text();
                const data = jsyaml.load(text);
                return data;
            });

            const results = await Promise.all(fetchPromises);
            
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
            allItems.sort((a, b) => a.name.localeCompare(b.name));
            displayItems(allItems);
            updateSelectedItemsDisplay();
        } catch (error) {
            console.error('Error fetching or parsing YAML files:', error);
            itemListTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading items. Please ensure YAML files are correctly placed and formatted.</td></tr>';
        }
    }

    // Function to display items in the search table
    function displayItems(itemsToDisplay) {
        itemListTableBody.innerHTML = '';
        if (itemsToDisplay.length === 0) {
            itemListTableBody.innerHTML = '<tr><td colspan="4" class="text-center">No items found or matching your search.</td></tr>';
            return;
        }

        itemsToDisplay.forEach(item => {
            const row = itemListTableBody.insertRow();
            row.dataset.itemName = item.name;

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
                updateSelectedItemsDisplay();
            });
            quantityCell.appendChild(quantityInput);

            const costCell = row.insertCell();
            costCell.classList.add('item-cost');
            costCell.textContent = '0.00';

            const actionCell = row.insertCell();
            const addButton = document.createElement('button');
            addButton.classList.add('btn', 'btn-primary', 'btn-sm');
            addButton.textContent = 'Add';
            addButton.addEventListener('click', () => {
                quantityInput.value = parseInt(quantityInput.value) + 1;
                quantityInput.dispatchEvent(new Event('input'));
            });
            actionCell.appendChild(addButton);

            updateItemCost(row, item.name);
        });
    }

    // Function to update individual item cost in the table
    function updateItemCost(row, itemName) {
        const costCell = row.querySelector('.item-cost');
        const item = allItems.find(i => i.name === itemName);
        if (!item) return;

        const isBuying = buySellToggle.checked;
        const price = isBuying ? (item.buy_price || 0) : (item.sell_price || 0);

        if (cart[itemName]) {
            costCell.textContent = (price * cart[itemName].quantity).toFixed(2);
        } else {
            costCell.textContent = '0.00';
        }
    }

    // Function to update the display of selected items in the "Selected Items" box
    function updateSelectedItemsDisplay() {
        cartSummaryList.innerHTML = '';

        if (Object.keys(cart).length === 0) {
            cartSummaryList.innerHTML = '<tr><td colspan="3" class="text-center">No items added yet.</td></tr>';
            return;
        }

        const isBuying = buySellToggle.checked;

        for (const itemName in cart) {
            const item = cart[itemName];
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

    // Function to generate invoice preview
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
        previewModal.style.display = 'flex';
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
        allItems.forEach(item => {
            const row = itemListTableBody.querySelector(`tr[data-item-name="${item.name}"]`);
            if (row) {
                updateItemCost(row, item.name);
            }
        });
        updateBill();
        updateSelectedItemsDisplay();
    });

    previewButton.addEventListener('click', previewInvoice);

downloadButton.addEventListener('click', () => {
    const modalElement = document.querySelector('.modal'); // Outer modal container
    const wasHidden = modalElement.style.display === 'none';

    // If modal is hidden, temporarily show it for screenshot
    if (wasHidden) {
        modalElement.style.display = 'block';
    }

    html2canvas(modalElement, {
        scale: 3,
        backgroundColor: getComputedStyle(modalElement).backgroundColor || '#2b2b2b',
        useCORS: true
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Minecraft_${buySellToggle.checked ? 'Buying' : 'Selling'}_Invoice.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }).finally(() => {
        if (wasHidden) {
            modalElement.style.display = 'none';
        }
    });
});

    closeModalButton.addEventListener('click', () => {
        previewModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === previewModal) {
            previewModal.style.display = 'none';
        }
    });

    fetchAndParseYamlFiles();
});
