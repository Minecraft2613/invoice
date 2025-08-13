document.addEventListener('DOMContentLoaded', () => {
    let shopData = {}; // Will store combined data from YAML files
    let cart = {}; // Stores items added to the cart with their quantities

    // Get DOM elements
    const searchInput = document.getElementById('searchInput');
    const itemListTableBody = document.getElementById('itemList');
    const subtotalSpan = document.getElementById('subtotal');
    const gstInput = document.getElementById('gstInput');
    const gstAmountSpan = document.getElementById('gstAmount');
    const taxInput = document.getElementById('taxInput');
    const taxAmountSpan = document.getElementById('taxAmount');
    const totalAmountSpan = document.getElementById('totalAmount');
    const previewBtn = document.getElementById('previewBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const invoicePreview = document.getElementById('invoicePreview');
    const previewModal = new bootstrap.Modal(document.getElementById('previewModal'));

    // List of YAML files to fetch
    // IMPORTANT: Ensure these files are in the same directory as index.html on your web server/GitHub Pages
    const fileList = ['Blocks.yml.old.yml']; // Add other YAML files here, e.g., 'Ores.yml'

    // Function to fetch and parse YAML files
    async function fetchAndParseYamlFiles() {
        try {
            const fetchPromises = fileList.map(async file => {
                const response = await fetch(file);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} for file: ${file}`);
                }
                const text = await response.text();
                // Use js-yaml to parse the YAML content
                const data = jsyaml.load(text);
                return data;
            });

            const results = await Promise.all(fetchPromises);
            
            // Combine data from all YAML files into shopData
            shopData = {};
            results.forEach(data => {
                if (data && data.pages) {
                    for (const pageKey in data.pages) {
                        if (data.pages.hasOwnProperty(pageKey)) {
                            if (!shopData.pages) {
                                shopData.pages = {};
                            }
                            shopData.pages[pageKey] = data.pages[pageKey];
                        }
                    }
                }
            });
            console.log('Combined Shop Data:', shopData);
            displayItems(); // Initial display after data is loaded
        } catch (error) {
            console.error('Error fetching or parsing YAML files:', error);
            itemListTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading items. Please ensure YAML files are correctly placed and formatted.</td></tr>';
        }
    }

    // Function to flatten shop data into a single array of items
    function getAllItems() {
        let allItems = [];
        if (shopData && shopData.pages) {
            for (const pageKey in shopData.pages) {
                const page = shopData.pages[pageKey];
                for (const itemKey in page.items) {
                    allItems.push(page.items[itemKey]);
                }
            }
        }
        return allItems;
    }

    // Function to display items in the table
    function displayItems(filter = '') {
        itemListTableBody.innerHTML = '';
        const allItems = getAllItems();

        const filteredItems = allItems.filter(item => 
            item.material.toLowerCase().includes(filter.toLowerCase())
        );

        filteredItems.forEach(item => {
            const row = itemListTableBody.insertRow();
            row.dataset.material = item.material; // Store material name for easy access

            const materialCell = row.insertCell();
            materialCell.textContent = item.material;

            const quantityCell = row.insertCell();
            const quantityInput = document.createElement('input');
            quantityInput.type = 'number';
            quantityInput.min = '0';
            quantityInput.value = cart[item.material] ? cart[item.material].quantity : 0;
            quantityInput.classList.add('form-control', 'form-control-sm');
            quantityInput.addEventListener('input', (event) => {
                const newQuantity = parseInt(event.target.value);
                if (newQuantity > 0) {
                    cart[item.material] = { ...item, quantity: newQuantity };
                } else {
                    delete cart[item.material];
                }
                updateBill();
                updateItemCost(row, item.material);
            });
            quantityCell.appendChild(quantityInput);

            const costCell = row.insertCell();
            costCell.textContent = (item.buy * (cart[item.material] ? cart[item.material].quantity : 0)).toFixed(2);
            costCell.classList.add('item-cost');

            const actionCell = row.insertCell();
            const addButton = document.createElement('button');
            addButton.classList.add('btn', 'btn-primary', 'btn-sm');
            addButton.textContent = 'Add';
            addButton.addEventListener('click', () => {
                quantityInput.value = parseInt(quantityInput.value) + 1;
                quantityInput.dispatchEvent(new Event('input')); // Trigger input event to update cart and bill
            });
            actionCell.appendChild(addButton);
        });
    }

    // Function to update individual item cost in the table
    function updateItemCost(row, material) {
        const costCell = row.querySelector('.item-cost');
        const item = getAllItems().find(i => i.material === material);
        if (item && cart[material]) {
            costCell.textContent = (item.buy * cart[material].quantity).toFixed(2);
        } else {
            costCell.textContent = '0.00';
        }
    }

    // Function to update bill calculations
    function updateBill() {
        let subtotal = 0;
        for (const material in cart) {
            subtotal += cart[material].buy * cart[material].quantity;
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
        let invoiceContent = `
            <h3>Invoice</h3>
            <p>Date: ${new Date().toLocaleDateString()}</p>
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Material</th>
                        <th>Quantity</th>
                        <th>Price (Buy)</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (const material in cart) {
            const item = cart[material];
            const itemTotal = item.buy * item.quantity;
            invoiceContent += `
                <tr>
                    <td>${item.material}</td>
                    <td>${item.quantity}</td>
                    <td>${item.buy.toFixed(2)}</td>
                    <td>${itemTotal.toFixed(2)}</td>
                </tr>
            `;
        }

        invoiceContent += `
                </tbody>
            </table>
            <p class="text-end">Subtotal: ${subtotalSpan.textContent}</p>
            <p class="text-end">GST (${gstInput.value}%): ${gstAmountSpan.textContent}</p>
            <p class="text-end">Tax (${taxInput.value}%): ${taxAmountSpan.textContent}</p>
            <h4 class="text-end">Total: ${totalAmountSpan.textContent}</h4>
        `;

        invoicePreview.innerHTML = invoiceContent;
        previewModal.show();
    }

    // Event Listeners
    searchInput.addEventListener('input', (event) => {
        displayItems(event.target.value);
    });

    gstInput.addEventListener('input', updateBill);
    taxInput.addEventListener('input', updateBill);

    previewBtn.addEventListener('click', previewInvoice);

    downloadBtn.addEventListener('click', () => {
        html2canvas(document.getElementById('billSummary')).then(canvas => {
            const link = document.createElement('a');
            link.download = 'bill_summary.png';
            link.href = canvas.toDataURL();
            link.click();
        });
    });

    // Initial data fetch and display
    fetchAndParseYamlFiles();
});