const products = [
    {
        id: 1,
        nameKey: 'prodOriginalName',
        nameThKey: 'prodOriginalName',
        descKey: 'prodOriginalDesc',
        priceM: 69000,
        priceL: 129000,
        icon: '🍰',
        color: '#f5d6a8',
        category: 'classic'
    },
    {
        id: 2,
        nameKey: 'prodDblChocName',
        nameThKey: 'prodDblChocName',
        descKey: 'prodDblChocDesc',
        priceM: 75000,
        priceL: 139000,
        icon: '🍫',
        color: '#5c3317',
        category: 'chocolate'
    },
    {
        id: 3,
        nameKey: 'prodLavaName',
        nameThKey: 'prodLavaName',
        descKey: 'prodLavaDesc',
        priceM: 79000,
        priceL: 145000,
        icon: '🧀',
        color: '#f0c75e',
        category: 'cheese'
    },
    {
        id: 4,
        nameKey: 'prodPandanName',
        nameThKey: 'prodPandanName',
        descKey: 'prodPandanDesc',
        priceM: 72000,
        priceL: 135000,
        icon: '🌿',
        color: '#7ab648',
        category: 'classic'
    },
    {
        id: 5,
        nameKey: 'prodPurpleName',
        nameThKey: 'prodPurpleName',
        descKey: 'prodPurpleDesc',
        priceM: 72000,
        priceL: 135000,
        icon: '🍠',
        color: '#9b59b6',
        category: 'classic'
    },
    {
        id: 6,
        nameKey: 'prodFoiThongName',
        nameThKey: 'prodFoiThongName',
        descKey: 'prodFoiThongDesc',
        priceM: 75000,
        priceL: 139000,
        icon: '✨',
        color: '#f39c12',
        category: 'thai'
    }
];

const categories = [
    { id: 'all', nameKey: 'catAll', icon: 'fa-th-large' },
    { id: 'classic', nameKey: 'catClassic', icon: 'fa-cake-candles' },
    { id: 'chocolate', nameKey: 'catChocolate', icon: 'fa-cookie-bite' },
    { id: 'cheese', nameKey: 'catCheese', icon: 'fa-cheese' },
    { id: 'thai', nameKey: 'catThai', icon: 'fa-star' }
];

/* ================================================
   ສະຖານະແອັບ
   ================================================ */
let cart = [];
let discount = 0;
let selectedCategory = 'all';
let orderHistory = JSON.parse(localStorage.getItem('bb_orders') || '[]');
let todayOrders = orderHistory.filter(function (o) { return isToday(o.timestamp); });
let holdingOrder = JSON.parse(localStorage.getItem('bb_holding') || 'null');

/* ================================================
   ຟອມເລດເງິນ (ຫົວໜ້ວຍ: ກີບ LAK)
   ================================================ */
function formatMoney(amount) {
    var val = amount / 1000;
    return val.toLocaleString('lo-LA', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function formatMoneyFull(amount) {
    var val = amount / 1000;
    return val.toLocaleString('lo-LA', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/* ================================================
   ໂມງເວລາ
   ================================================ */
function updateClock() {
    var now = new Date();
    var dateOpts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    var locale = currentLang === 'en' ? 'en-US' : 'lo-LA';
    document.getElementById('currentDate').textContent = now.toLocaleDateString(locale, dateOpts);
    document.getElementById('currentTime').textContent = now.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

setInterval(updateClock, 1000);
updateClock();

/* ກວດວ່າເປັນມື້ໃດ */
function isToday(ts) {
    var d = new Date(ts);
    var now = new Date();
    return d.toDateString() === now.toDateString();
}

/* ສ້າງເລກບິນ */
function getOrderNumber() {
    return 'BB' + String(todayOrders.length + 1).padStart(4, '0');
}

/* ================================================
   ເລີ່ມຕົ້ນ — หมวดหมู่
   ================================================ */
function renderCategories() {
    var container = document.getElementById('categoryTabs');
    container.innerHTML = categories.map(function (c) {
        return '<button class="cat-tab ' + (c.id === selectedCategory ? 'active' : '') + '" '
            + 'onclick="selectCategory(\'' + c.id + '\')" '
            + 'role="tab" aria-selected="' + (c.id === selectedCategory) + '">'
            + '<i class="fas ' + c.icon + '" style="margin-right:4px;font-size:11px;"></i>'
            + t(c.nameKey)
            + '</button>';
    }).join('');
}

function selectCategory(catId) {
    selectedCategory = catId;
    renderCategories();
    filterProducts();
}

/* ================================================
   ເລີ່ມຕົ້ນ — ກະຕ່າສິນຄ້າ
   ================================================ */
function renderProducts(list) {
    var grid = document.getElementById('productGrid');
    var noRes = document.getElementById('noResults');

    if (list.length === 0) {
        grid.style.display = 'none';
        noRes.style.display = 'block';
        return;
    }

    grid.style.display = 'grid';
    noRes.style.display = 'none';

    grid.innerHTML = list.map(function (p) {
        return '<div class="product-card" '
            + 'onclick="openSizeModal(' + p.id + ')" '
            + 'tabindex="0" role="button" '
            + 'aria-label="' + t(p.nameKey) + '" '
            + 'onkeydown="if(event.key===\'Enter\')openSizeModal(' + p.id + ')">'
            + '<div class="product-card-body">'
            + '<div class="cake-icon" style="background:' + p.color + '22;color:' + p.color + ';">'
            + '<span class="cake-emoji">' + p.icon + '</span>'
            + '</div>'
            + '<h3 class="product-name">' + t(p.nameKey) + '</h3>'
            + '<p class="product-desc">' + t(p.descKey) + '</p>'
            + '<div class="product-prices">'
            + '<div class="product-price-group">'
            + '<div class="price-size-label">M</div>'
            + '<div class="price-value money">' + formatMoney(p.priceM) + '</div>'
            + '</div>'
            + '<div class="price-divider"></div>'
            + '<div class="product-price-group">'
            + '<div class="price-size-label">L</div>'
            + '<div class="price-value money">' + formatMoney(p.priceL) + '</div>'
            + '</div>'
            + '</div>'
            + '</div>'
            + '</div>';
    }).join('');
}

/* ກັ່ນກອງສິນຄ້າ */
function filterProducts() {
    var query = document.getElementById('searchInput').value.toLowerCase().trim();
    var filtered = products;

    if (selectedCategory !== 'all') {
        filtered = filtered.filter(function (p) { return p.category === selectedCategory; });
    }

    if (query) {
        filtered = filtered.filter(function (p) {
            return t(p.nameKey).toLowerCase().includes(query)
                || t(p.descKey).includes(query);
        });
    }

    renderProducts(filtered);
}

/* ================================================
   ໂມເດວເລືອກສິນຄ້າ
   ================================================ */
function openSizeModal(productId) {
    var p = products.find(function (x) { return x.id === productId; });
    if (!p) return;

    var body = document.getElementById('sizeModalBody');
    body.innerHTML = ''
        + '<div style="text-align:center;margin-bottom:20px;">'
        + '<span style="font-size:48px;">' + p.icon + '</span>'
        + '<h2 style="font-size:20px;font-weight:800;margin-top:8px;">' + t(p.nameKey) + '</h2>'
        + '<p style="font-size:13px;color:var(--fg-muted);">' + t(p.descKey) + '</p>'
        + '</div>'
        + '<p style="font-size:13px;font-weight:600;margin-bottom:10px;text-align:center;color:var(--fg-muted);">' + t('chooseSize') + '</p>'
        + '<div style="display:flex;gap:12px;margin-bottom:20px;" id="sizeOptions">'
        + '<button class="size-btn size-btn-large active" onclick="selectSize(this,\'M\')">'
        + '<div class="size-btn-small-label">' + t('sizeM') + '</div>'
        + '<div class="size-btn-price money">' + formatMoney(p.priceM) + '</div>'
        + '</button>'
        + '<button class="size-btn size-btn-large" onclick="selectSize(this,\'L\')">'
        + '<div class="size-btn-small-label">' + t('sizeL') + '</div>'
        + '<div class="size-btn-price money">' + formatMoney(p.priceL) + '</div>'
        + '</button>'
        + '</div>'
        + '<div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:20px;">'
        + '<span style="font-size:13px;color:var(--fg-muted);">' + t('quantity') + '</span>'
        + '<div style="display:flex;align-items:center;gap:10px;">'
        + '<button class="qty-btn" onclick="changeModalQty(-1)">-</button>'
        + '<span id="modalQty" style="font-size:20px;font-weight:800;min-width:30px;text-align:center;">1</span>'
        + '<button class="qty-btn" onclick="changeModalQty(1)">+</button>'
        + '</div>'
        + '</div>'
        + '<div style="display:flex;gap:10px;">'
        + '<button class="btn-outline" onclick="closeModal(\'sizeModal\')" style="flex:1;padding:14px;">' + t('cancel') + '</button>'
        + '<button class="btn-primary" onclick="addToCartFromModal(' + p.id + ')" style="flex:2;padding:14px;">'
        + '<i class="fas fa-plus" style="margin-right:6px;"></i>' + t('addToCart')
        + '</button>'
        + '</div>';

    body.dataset.size = 'M';
    body.dataset.qty = 1;
    openModal('sizeModal');
}

function selectSize(el, size) {
    el.parentElement.querySelectorAll('.size-btn').forEach(function (b) { b.classList.remove('active'); });
    el.classList.add('active');
    document.getElementById('sizeModalBody').dataset.size = size;
}

function changeModalQty(delta) {
    var body = document.getElementById('sizeModalBody');
    var q = parseInt(body.dataset.qty) + delta;
    if (q < 1) q = 1;
    if (q > 99) q = 99;
    body.dataset.qty = q;
    document.getElementById('modalQty').textContent = q;
}

function addToCartFromModal(productId) {
    var p = products.find(function (x) { return x.id === productId; });
    var body = document.getElementById('sizeModalBody');
    var size = body.dataset.size;
    var qty = parseInt(body.dataset.qty);
    var price = size === 'M' ? p.priceM : p.priceL;

    var existIdx = cart.findIndex(function (c) { return c.productId === p.id && c.size === size; });
    if (existIdx >= 0) {
        cart[existIdx].qty += qty;
    } else {
        cart.push({
            id: Date.now(),
            productId: p.id,
            nameKey: p.nameKey,
            nameThKey: p.nameThKey,
            icon: p.icon,
            size: size,
            price: price,
            qty: qty
        });
    }

    closeModal('sizeModal');
    renderCart();
    showToast(t('toastAdded') + ' ' + t(p.nameKey) + ' (' + size + ') x' + qty, 'success');
}

/* ================================================
   ກະຕ່າສິນຄ້າ
   ================================================ */
function renderCart() {
    var container = document.getElementById('cartItems');
    var summaryEl = document.getElementById('cartSummary');
    var clearBtn = document.getElementById('clearCartBtn');
    var countEl = document.getElementById('cartCount');

    var totalItems = cart.reduce(function (s, c) { return s + c.qty; }, 0);
    countEl.textContent = totalItems;

    if (cart.length === 0) {
        container.innerHTML = ''
            + '<div class="empty-cart">'
            + '<i class="fas fa-basket-shopping empty-icon"></i>'
            + '<p class="empty-text-main">' + t('emptyCartTitle') + '</p>'
            + '<p class="empty-text-sub">' + t('emptyCartSub') + '</p>'
            + '</div>';
        summaryEl.style.display = 'none';
        clearBtn.style.display = 'none';
        return;
    }

    clearBtn.style.display = 'inline-flex';
    summaryEl.style.display = 'block';

    container.innerHTML = cart.map(function (item, i) {
        return '<div class="cart-item">'
            + '<div class="cart-item-top">'
            + '<span class="cart-item-icon">' + item.icon + '</span>'
            + '<div class="cart-item-info">'
            + '<div class="cart-item-name">' + t(item.nameKey) + '</div>'
            + '<div class="cart-item-detail">' + t('size' + item.size) + '</div>'
            + '</div>'
            + '<button class="btn-remove-item" onclick="removeFromCart(' + i + ')" title="Remove">'
            + '<i class="fas fa-times"></i>'
            + '</button>'
            + '</div>'
            + '<div class="cart-item-bottom">'
            + '<div class="cart-qty-group">'
            + '<button class="qty-btn qty-btn-sm" onclick="changeQty(' + i + ',-1)">-</button>'
            + '<span class="qty-value">' + item.qty + '</span>'
            + '<button class="qty-btn qty-btn-sm" onclick="changeQty(' + i + ',1)">+</button>'
            + '</div>'
            + '<span class="cart-item-price money">' + formatMoney(item.price * item.qty) + '</span>'
            + '</div>'
            + '</div>';
    }).join('');

    updateCartSummary();
}

function changeQty(index, delta) {
    cart[index].qty += delta;
    if (cart[index].qty < 1) {
        cart.splice(index, 1);
    }
    renderCart();
}

function removeFromCart(index) {
    var item = cart[index];
    cart.splice(index, 1);
    renderCart();
    showToast(t('toastRemoved') + ' ' + t(item.nameKey) + ' ' + t('toastFromCart'), 'info');
}

function clearCart() {
    if (cart.length === 0) return;
    cart = [];
    discount = 0;
    document.getElementById('discountInput').value = '';
    renderCart();
    showToast(t('toastCartCleared'), 'info');
}

/* ================================================
   ສ່ວນຫຼຸດ
   ================================================ */
function applyDiscount() {
    var val = parseFloat(document.getElementById('discountInput').value);
    if (!val || val <= 0) {
        discount = 0;
    } else {
        discount = Math.round(val * 1000);
    }
    updateCartSummary();
}

function updateCartSummary() {
    var subtotal = cart.reduce(function (s, c) { return s + c.price * c.qty; }, 0);
    var disc = Math.min(discount, subtotal);
    var total = subtotal - disc;

    document.getElementById('subtotalLabel').textContent = t('subtotal');
    document.getElementById('subtotalText').textContent = formatMoneyFull(subtotal);
    document.getElementById('discountLabel').textContent = t('discountLabel');
    document.getElementById('discountText').textContent = '-' + formatMoneyFull(disc);
    document.getElementById('totalLabel').textContent = t('total');
    document.getElementById('totalText').textContent = formatMoneyFull(total);
    document.getElementById('discountRow').style.display = disc > 0 ? 'flex' : 'none';

    document.getElementById('holdBtnText').textContent = t('holdBill');
    document.getElementById('payBtnText').textContent = t('pay');
}

function getCartTotal() {
    var subtotal = cart.reduce(function (s, c) { return s + c.price * c.qty; }, 0);
    var disc = Math.min(discount, subtotal);
    return subtotal - disc;
}

/* ================================================
   ຊຳລະເງິນ
   ================================================ */
var payAmount = '';

function openPayment() {
    if (cart.length === 0) return;
    payAmount = '';
    renderPaymentModal();
    openModal('paymentModal');
}

function renderPaymentModal() {
    var total = getCartTotal();
    var body = document.getElementById('paymentModalBody');

    var numpadKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9, '00', 0, 'C'];
    var numpadHTML = numpadKeys.map(function (k) {
        var cls = 'numpad-btn' + (k === 'C' ? ' numpad-clear' : '');
        var label = k === 'C' ? '<i class="fas fa-delete-left"></i>' : k;
        return '<button class="' + cls + '" onclick="numpadPress(\'' + k + '\')">' + label + '</button>';
    }).join('');

    var quickValues = [500, 1000, 5000, 10000, 20000, 50000];
    var quickHTML = quickValues.map(function (v) {
        return '<button class="btn-outline quick-amount-btn" onclick="quickAmount(' + v + ')">'
            + formatMoney(v) + '</button>';
    }).join('');

    body.innerHTML = ''
        + '<div style="text-align:center;margin-bottom:20px;">'
        + '<i class="fas fa-wallet" style="font-size:36px;color:var(--accent);margin-bottom:8px;"></i>'
        + '<h2 style="font-size:20px;font-weight:800;">' + t('payment') + '</h2>'
        + '<p style="font-size:12px;color:var(--fg-muted);">' + t('amountDue') + '</p>'
        + '<div style="font-size:36px;font-weight:900;color:var(--accent-light);margin-top:4px;" class="money font-display">'
        + formatMoneyFull(total) + '</div>'
        + '</div>'
        + '<div class="payment-display-box">'
        + '<div class="payment-display-label">' + t('amountReceived') + '</div>'
        + '<div class="payment-display-value money" id="payDisplay">-</div>'
        + '<div class="payment-change" id="changeDisplay"></div>'
        + '</div>'
        + '<div class="numpad-grid">' + numpadHTML + '</div>'
        + '<div class="quick-amounts">' + quickHTML + '</div>'
        + '<div class="payment-modal-actions">'
        + '<button class="btn-outline" onclick="closeModal(\'paymentModal\')">' + t('cancel') + '</button>'
        + '<button class="btn-primary" id="confirmPayBtn" onclick="confirmPayment()" disabled>'
        + '<i class="fas fa-check-circle" style="margin-right:6px;"></i>' + t('confirmPay')
        + '</button>'
        + '</div>';
}

function numpadPress(key) {
    if (key === 'C') {
        payAmount = payAmount.slice(0, -1);
    } else {
        if (payAmount.length >= 8) return;
        payAmount += key;
    }
    updatePaymentDisplay();
}

function quickAmount(val) {
    payAmount = String(val);
    updatePaymentDisplay();
}

function updatePaymentDisplay() {
    var total = getCartTotal();
    var display = document.getElementById('payDisplay');
    var changeDisplay = document.getElementById('changeDisplay');
    var confirmBtn = document.getElementById('confirmPayBtn');

    if (!payAmount || payAmount === '0') {
        display.textContent = '-';
        changeDisplay.textContent = '';
        confirmBtn.disabled = true;
        return;
    }

    var received = parseInt(payAmount);
    display.textContent = formatMoneyFull(received);

    if (received >= total) {
        var change = received - total;
        changeDisplay.innerHTML = '<i class="fas fa-arrow-down" style="margin-right:4px;"></i>'
            + t('change') + ': ' + formatMoneyFull(change);
        changeDisplay.className = 'payment-change';
        confirmBtn.disabled = false;
    } else {
        var remain = total - received;
        changeDisplay.innerHTML = '<i class="fas fa-exclamation-triangle" style="margin-right:4px;"></i>'
            + t('short') + ' ' + formatMoneyFull(remain);
        changeDisplay.className = 'payment-change payment-short';
        confirmBtn.disabled = true;
    }
}

function confirmPayment() {
    var total = getCartTotal();
    var received = parseInt(payAmount);
    var change = received - total;

    var order = {
        id: Date.now(),
        number: getOrderNumber(),
        items: cart.map(function (c) { return Object.assign({}, c); }),
        subtotal: cart.reduce(function (s, c) { return s + c.price * c.qty; }, 0),
        discount: Math.min(discount, cart.reduce(function (s, c) { return s + c.price * c.qty; }, 0)),
        total: total,
        received: received,
        change: change,
        timestamp: new Date().toISOString(),
        paymentMethod: t('cash'),
        lang: currentLang
    };

    orderHistory.push(order);
    localStorage.setItem('bb_orders', JSON.stringify(orderHistory));
    todayOrders = orderHistory.filter(function (o) { return isToday(o.timestamp); });
    localStorage.removeItem('bb_holding');
    holdingOrder = null;

    showReceipt(order);

    cart = [];
    discount = 0;
    document.getElementById('discountInput').value = '';
    renderCart();
    updateStatus();
    closeModal('paymentModal');
}

/* ================================================
   ໃບບິນ
   ================================================ */
function showReceipt(order) {
    var body = document.getElementById('receiptModalBody');
    var date = new Date(order.timestamp);
    var locale = (order.lang || currentLang) === 'en' ? 'en-US' : 'lo-LA';
    var dateStr = date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
    var timeStr = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

    // ໃຊ້ພາສາຕາມທີ່ບັນທຶກອໍເດີ້
    var savedLang = order.lang || currentLang;
    var tt = function (key) {
        return (translations[savedLang] && translations[savedLang][key]) || t(key);
    };

    var rowsHTML = order.items.map(function (item) {
        return '<tr>'
            + '<td>' + tt(item.nameKey) + ' (' + item.size + ')<br>'
            + '<span class="receipt-item-sub">' + tt(item.nameThKey) + '</span></td>'
            + '<td>' + item.qty + '</td>'
            + '<td>' + formatMoney(item.price * item.qty) + '</td>'
            + '</tr>';
    }).join('');

    var discountRow = '';
    if (order.discount > 0) {
        discountRow = '<div class="receipt-summary-row receipt-summary-discount">'
            + '<span>' + tt('discountLabel') + '</span>'
            + '<span>-' + formatMoneyFull(order.discount) + '</span></div>';
    }

    body.innerHTML = ''
        + '<div class="receipt" id="receiptPrint">'
        + '<div class="receipt-header">'
        + '<div class="receipt-brand">Best Bake</div>'
        + '<div class="receipt-contact">WhatsApp: 55549588</div>'
        + '<div class="receipt-contact">' + dateStr + ' ' + timeStr + '</div>'
        + '</div>'
        + '<div class="receipt-line"></div>'
        + '<div style="font-size:12px;margin-bottom:4px;">'
        + '<strong>' + tt('billNo') + '</strong> ' + order.number
        + '</div>'
        + '<div class="receipt-line"></div>'
        + '<table class="receipt-table">'
        + '<thead><tr>'
        + '<th>' + tt('item') + '</th>'
        + '<th>' + tt('qty') + '</th>'
        + '<th>' + tt('price') + '</th>'
        + '</tr></thead>'
        + '<tbody>' + rowsHTML + '</tbody>'
        + '</table>'
        + '<div class="receipt-line"></div>'
        + '<div class="receipt-summary-row">'
        + '<span>' + tt('subtotal') + '</span>'
        + '<span>' + formatMoneyFull(order.subtotal) + '</span></div>'
        + discountRow
        + '<div class="receipt-total-row">'
        + '<span>' + tt('total') + '</span>'
        + '<span class="receipt-total-value">' + formatMoneyFull(order.total) + '</span></div>'
        + '<div class="receipt-line"></div>'
        + '<div class="receipt-summary-row">'
        + '<span>' + tt('received') + ' (' + tt('cash') + ')</span>'
        + '<span>' + formatMoneyFull(order.received) + '</span></div>'
        + '<div class="receipt-summary-row" style="font-weight:700;">'
        + '<span>' + tt('change') + '</span>'
        + '<span>' + formatMoneyFull(order.change) + '</span></div>'
        + '<div class="receipt-line"></div>'
        + '<div class="receipt-footer">'
        + tt('thankYou') + '<br>'
        + '<span class="receipt-footer-small">' + tt('receiptNote') + '</span>'
        + '</div></div>'
        + '<div class="receipt-actions">'
        + '<button class="btn-outline" onclick="closeModal(\'receiptModal\')">'
        + '<i class="fas fa-times" style="margin-right:4px;"></i>' + t('close')
        + '</button>'
        + '<button class="btn-primary" onclick="printReceipt()">'
        + '<i class="fas fa-print" style="margin-right:4px;"></i>' + t('print')
        + '</button>'
        + '</div>';

    openModal('receiptModal');
}

function printReceipt() {
    window.print();
}

/* ================================================
   ປະການ / ເອີ້ນບິນ
   ================================================ */
function holdOrder() {
    if (cart.length === 0) return;
    holdingOrder = {
        cart: cart.map(function (c) { return Object.assign({}, c); }),
        discount: discount,
        timestamp: new Date().toISOString()
    };
    localStorage.setItem('bb_holding', JSON.stringify(holdingOrder));
    cart = [];
    discount = 0;
    document.getElementById('discountInput').value = '';
    renderCart();
    showToast(t('toastBillHeld'), 'info');
}

function restoreHoldingOrder() {
    if (!holdingOrder) return;
    cart = holdingOrder.cart.map(function (c) { return Object.assign({}, c); });
    discount = holdingOrder.discount || 0;
    if (discount > 0) {
        document.getElementById('discountInput').value = (discount / 1000).toString();
    }
    localStorage.removeItem('bb_holding');
    holdingOrder = null;

    var holdBtn = document.getElementById('holdBtn');
    holdBtn.innerHTML = '<i class="fas fa-pause"></i> <span id="holdBtnText">' + t('holdBill') + '</span>';
    holdBtn.onclick = holdOrder;
    holdBtn.style.borderColor = '';
    holdBtn.style.color = '';

    renderCart();
    showToast(t('toastBillRecalled'), 'success');
}

/* ================================================
   ປະຫວັດການຂາຍ
   ================================================ */
function showOrderHistory() {
    var orders = orderHistory.slice().reverse().slice(0, 50);
    var body = document.getElementById('sizeModalBody');

    var listHTML = '';
    if (orders.length === 0) {
        listHTML = '<p style="text-align:center;color:var(--fg-muted);padding:30px;">' + t('toastNoHistory') + '</p>';
    } else {
        listHTML = orders.map(function (o) {
            var d = new Date(o.timestamp);
            var locale = (o.lang || currentLang) === 'en' ? 'en-US' : 'lo-LA';
            var dateStr = d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
            var timeStr = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

            var itemNames = o.items.map(function (i) {
                var savedT = function (key) {
                    return (translations[o.lang] && translations[o.lang][key]) || t(key);
                };
                return savedT(i.nameKey) + '(' + i.size + ') x' + i.qty;
            }).join(', ');

            return '<div class="cart-item" style="cursor:pointer;" onclick="showReceiptById(' + o.id + ');closeModal(\'sizeModal\');">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;">'
                + '<div>'
                + '<div style="font-size:13px;font-weight:700;">' + o.number + '</div>'
                + '<div style="font-size:11px;color:var(--fg-muted);">' + dateStr + ' ' + timeStr + '</div>'
                + '<div style="font-size:11px;color:var(--fg-muted);margin-top:2px;">' + itemNames + '</div>'
                + '</div>'
                + '<div style="text-align:right;">'
                + '<div style="font-size:15px;font-weight:800;color:var(--accent-light);" class="money">' + formatMoneyFull(o.total) + '</div>'
                + '<div style="font-size:10px;color:var(--success);">' + o.paymentMethod + '</div>'
                + '</div></div></div>';
        }).join('');
    }

    var clearBtn = orders.length > 0
        ? '<div style="margin-top:14px;">'
        + '<button class="btn-outline" style="width:100%;color:var(--danger);border-color:var(--danger);padding:10px;" onclick="clearHistory()">'
        + '<i class="fas fa-trash" style="margin-right:4px;"></i>' + t('clearAllHistory')
        + '</button></div>'
        : '';

    body.innerHTML = ''
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
        + '<h2 style="font-size:18px;font-weight:800;">'
        + '<i class="fas fa-history" style="margin-right:8px;color:var(--accent);"></i>' + t('historyTitle')
        + '</h2>'
        + '<button class="btn-remove-item" onclick="closeModal(\'sizeModal\')" style="font-size:18px;">'
        + '<i class="fas fa-times"></i></button></div>'
        + '<div style="max-height:400px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">'
        + listHTML + '</div>' + clearBtn;

    openModal('sizeModal');
}

function showReceiptById(orderId) {
    var order = orderHistory.find(function (o) { return o.id === orderId; });
    if (order) showReceipt(order);
}

function clearHistory() {
    if (!confirm(t('toastClearHistoryConfirm'))) return;
    orderHistory = [];
    todayOrders = [];
    localStorage.removeItem('bb_orders');
    closeModal('sizeModal');
    updateStatus();
    showToast(t('toastHistoryCleared'), 'info');
}

/* ================================================
   ອັບເດດສະຖານນະການຂາຍ
   ================================================ */
function updateStatus() {
    var today = orderHistory.filter(function (o) { return isToday(o.timestamp); });
    document.getElementById('todayOrders').textContent = today.length;
    var sales = today.reduce(function (s, o) { return s + o.total; }, 0);
    document.getElementById('todaySales').textContent = formatMoneyFull(sales);
}

/* ================================================
   ຈັດການໂມດັລ
   ================================================ */
function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    var anyOpen = document.querySelectorAll('.modal-overlay.active').length;
    if (!anyOpen) document.body.style.overflow = '';
}

document.querySelectorAll('.modal-overlay').forEach(function (m) {
    m.addEventListener('click', function (e) {
        if (e.target === m) closeModal(m.id);
    });
});

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(function (m) {
            closeModal(m.id);
        });
    }
});

/* ================================================
   ໂທສແຈ້ງເຕືອນ
   ================================================ */
function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toastContainer');
    var toast = document.createElement('div');
    toast.className = 'toast';

    var icons = {
        success: '<i class="fas fa-check-circle" style="color:var(--success);font-size:16px;"></i>',
        error: '<i class="fas fa-exclamation-circle" style="color:var(--danger);font-size:16px;"></i>',
        info: '<i class="fas fa-info-circle" style="color:var(--info);font-size:16px;"></i>'
    };

    toast.innerHTML = (icons[type] || icons.info) + '<span>' + message + '</span>';
    container.appendChild(toast);

    setTimeout(function () {
        if (toast.parentNode) toast.remove();
    }, 3000);
}

/* ================================================
   ລອຍເຄັກພື້ນຫຼັງ
   ================================================ */
function createFloatingCakes() {
    var container = document.getElementById('floatingCakes');
    var icons = ['🍰', '🎂', '🧁', '🍩', '🍫', '✨', '🧀', '🌿'];

    for (var i = 0; i < 12; i++) {
        var el = document.createElement('div');
        el.className = 'floating-cake';
        el.textContent = icons[Math.floor(Math.random() * icons.length)];
        el.style.left = Math.random() * 100 + '%';
        el.style.animationDuration = (15 + Math.random() * 25) + 's';
        el.style.animationDelay = (-Math.random() * 30) + 's';
        el.style.fontSize = (14 + Math.random() * 16) + 'px';
        container.appendChild(el);
    }
}

/* ================================================
   ເລີ່ມຕົ້ນແອັບ
   ================================================ */
function init() {
    updateUILanguage();
    renderCategories();
    filterProducts();
    renderCart();
    updateStatus();
    createFloatingCakes();

    if (holdingOrder) {
        setTimeout(function () {
            showToast(t('toastHasHeldBill'), 'info');

            var holdBtn = document.getElementById('holdBtn');
            holdBtn.innerHTML = '<i class="fas fa-play"></i> <span id="holdBtnText">' + t('recallBill') + '</span>';
            holdBtn.onclick = restoreHoldingOrder;
            holdBtn.style.borderColor = 'var(--accent)';
            holdBtn.style.color = 'var(--accent-light)';
        }, 500);
    }
}

init();