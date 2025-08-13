document.addEventListener('DOMContentLoaded', () => {
    const itemListBody = document.getElementById('item-list');
    const searchInput = document.getElementById('item-search');
    const taxInput = document.getElementById('tax-input');
    const gstInput = document.getElementById('gst-input');
    const totalTaxSpan = document.getElementById('total-tax');
    const totalGstSpan = document.getElementById('total-gst');
    const finalTotalSpan = document.getElementById('final-total');
    const buySellToggle = document.getElementById('buy-sell-toggle');
    const invoiceTitleDisplay = document.getElementById('invoice-title-display');
    const downloadButton = document.getElementById('download-button');
    const downloadArea = document.getElementById('invoice-download-area');

    let allItems = [];
    
    // --- FIX: The file paths have been corrected to be relative to the current directory. ---
    // This assumes your YAML files are in the same folder as index.html.
    const fileList = ['Blocks.yml', 'Ores.yml'];

    async function fetchItems() {
        try {
            const fetchPromises = fileList.map(file => fetch(file));
            const responses = await Promise.all(fetchPromises);

            // Check if any fetch requests failed with a 404 or other status code.
            for (const response of responses) {
                if (!response.ok) {
                    throw new Error(`Failed to load: ${response.url} with status ${response.status}`);
                }
            }

            const texts = await Promise.all(responses.map(res => res.text()));
            const allItemsData = texts.map(text => {
                const data = jsyaml.load(text);
                return Object.values(data)[0];
            });

            allItems = allItemsData.flat();
            displayItems(allItems);

        } catch (error) {
            console.error('Error fetching or parsing YAML files:', error);
            // Display a user-friendly error message on the page.
            itemListBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Error loading items. Please check if your YAML files exist at the correct path.</td></tr>`;
        }
    }

    function displayItems(items) {
        itemListBody.innerHTML = '';
        if (items.length === 0) {
            itemListBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No items found.</td></tr>';
            return;
        }
        items.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td><input type="number" class="quantity-input" data-item-name="${item.name}" value="0" min="0"></td>
                <td class="item-cost" data-item-name="${item.name}">0</td>
            `;
            itemListBody.appendChild(row);
        });
        attachEventListeners();
        calculateTotals();
    }

    function attachEventListeners() {
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('input', updateItemCost);
        });
        taxInput.addEventListener('input', calculateTotals);
        gstInput.addEventListener('input', calculateTotals);
    }

    function updateItemCost(event) {
        const input = event.target;
        const itemName = input.dataset.itemName;
        const quantity = parseInt(input.value) || 0;
        const item = allItems.find(i => i.name === itemName);
        if (!item) return;
        const isBuying = buySellToggle.checked;
        const price = isBuying ? item.buy_price : item.sell_price;
        const cost = price * quantity;
        document.querySelector(`.item-cost[data-item-name="${itemName}"]`).textContent = cost;
        calculateTotals();
    }

    function calculateTotals() {
        let subtotal = 0;
        document.querySelectorAll('.item-cost').forEach(costSpan => {
            subtotal += parseFloat(costSpan.textContent) || 0;
        });

        const taxRate = parseFloat(taxInput.value) || 0;
        const gstRate = parseFloat(gstInput.value) || 0;
        const totalTax = subtotal * (taxRate / 100);
        const totalGst = subtotal * (gstRate / 100);
        const finalTotal = subtotal + totalTax + totalGst;
        totalTaxSpan.textContent = totalTax.toFixed(2);
        totalGstSpan.textContent = totalGst.toFixed(2);
        finalTotalSpan.textContent = finalTotal.toFixed(2);
    }

    searchInput.addEventListener('input', (event) => {
        const query = event.target.value.toLowerCase();
        const filteredItems = allItems.filter(item => item.name.toLowerCase().includes(query));
        displayItems(filteredItems);
    });

    buySellToggle.addEventListener('change', () => {
        invoiceTitleDisplay.textContent = buySellToggle.checked ? 'Buying Invoice' : 'Selling Invoice';
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.dispatchEvent(new Event('input'));
        });
    });

    downloadButton.addEventListener('click', () => {
        const selectedItems = [];
        document.querySelectorAll('.quantity-input').forEach(input => {
            const quantity = parseInt(input.value);
            if (quantity > 0) {
                const itemName = input.dataset.itemName;
                const cost = document.querySelector(`.item-cost[data-item-name="${itemName}"]`).textContent;
                selectedItems.push({ name: itemName, quantity: quantity, cost: cost });
            }
        });

        const tableBodyHTML = selectedItems.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${item.cost}</td>
            </tr>
        `).join('');

        const taxValue = taxInput.value;
        const gstValue = gstInput.value;
        const totalTax = totalTaxSpan.textContent;
        const totalGst = totalGstSpan.textContent;
        const finalTotal = finalTotalSpan.textContent;
        const invoiceTitleText = buySellToggle.checked ? 'Buying Invoice' : 'Selling Invoice';

        downloadArea.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Material Name</th>
                        <th>Quantity</th>
                        <th>Cost</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableBodyHTML || '<tr><td colspan="3" style="text-align: center;">No items added.</td></tr>'}
                </tbody>
            </table>
            <div class="summary">
                <div class="tax-row"><span>Tax (${taxValue}%):</span><span>${totalTax}</span></div>
                <div class="tax-row"><span>GST (${gstValue}%):</span><span>${totalGst}</span></div>
                <div class="total-row"><strong>Total Amount:</strong><span>${finalTotal}</span></div>
            </div>
            <h2>${invoiceTitleText}</h2>
        `;
        
        html2canvas(downloadArea, {
            scale: 2,
            backgroundColor: '#1e1e1e'
        }).then(canvas => {
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            link.download = `Minecraft_${invoiceTitleText.replace(' ', '')}_Invoice.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });

        downloadArea.innerHTML = '';
    });
    
    fetchItems();
});
