/* ================================================
   Admin Dashboard — เรียก API ทั้งหมด
   ================================================ */
var API = window.location.origin + '/api';
var token = '';
var allProducts = [];
var allIngredients = [];

/* -----------------------------------------------
   เริ่มต้น
   ----------------------------------------------- */
function init() {
    var user = JSON.parse(sessionStorage.getItem('bb_user') || 'null');
    if (!user || user.role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }
    token = user.token;
    document.getElementById('adminName').textContent = user.name;
    document.getElementById('topbarDate').textContent = new Date().toLocaleDateString('lo-LA', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    loadDashboard();
    loadProducts();
    loadStock();
    loadOrders();
    setupReportFilters();
    loadMembers();
}

/* -----------------------------------------------
   API Helper
   ----------------------------------------------- */
function api(method, url, body) {
    var opts = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        }
    };
    if (body) opts.body = JSON.stringify(body);
    return fetch(API + url, opts).then(function (r) {
        if (!r.ok) return r.json().then(function (e) { throw new Error(e.error || 'Error'); });
        return r.json();
    });
}

/* -----------------------------------------------
   สลับหน้า
   ----------------------------------------------- */
function switchPage(page) {
    document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
    document.getElementById('page-' + page).classList.add('active');
    document.querySelectorAll('.menu-item').forEach(function (m) {
        m.classList.toggle('active', m.dataset.page === page);
    });

    var titles = {
        dashboard: 'ແດດຫຼງ',
        products: 'ຈັດການສິນຄ້າ',
        stock: 'ສະຕອກວັນດັບ',
        orders: 'ປະຫວັດຂາຍ',
        reports: 'ລາຍງານ',
        members: 'ສະມະສິກ'
    };
    document.getElementById('pageTitle').textContent = titles[page] || '';
}

function handleLogout() {
    sessionStorage.removeItem('bb_user');
    window.location.href = 'login.html';
}

/* -----------------------------------------------
   Dashboard
   ----------------------------------------------- */
function loadDashboard() {
    api('GET', '/reports/daily').then(function (data) {
        document.getElementById('statSales').textContent = formatM(data.totalSales);
        document.getElementById('statBills').textContent = data.totalBills;
        document.getElementById('statAvg').textContent = formatM(data.avgPerBill);
        renderTopProducts(data.productSales);
    }).catch(function () {
        document.getElementById('statSales').textContent = '0';
        document.getElementById('statBills').textContent = '0';
    });

    api('GET', '/stock/alerts').then(function (alerts) {
        document.getElementById('statLow').textContent = alerts.length;
        var badge = document.getElementById('stockAlertBadge');
        if (alerts.length > 0) {
            badge.style.display = 'inline-block';
            badge.textContent = alerts.length;
        } else {
            badge.style.display = 'none';
        }
    }).catch(function () {
        document.getElementById('statLow').textContent = '0';
    });

    api('GET', '/reports/hourly').then(function (data) {
        renderHourlyChart(data);
    }).catch(function () { });

    api('GET', '/reports/top-cashiers?days=7').then(function (data) { });
}

function renderTopProducts(products) {
    var el = document.getElementById('topProductsList');
    if (!products || products.length === 0) {
        el.innerHTML = '<p style="text-align:center;color:var(--fg-muted);padding:30px;">ບໍ່ຂາຍຍອກ</p>';
        return;
    }

    var ranks = ['r1', 'r2', 'r3'];
    el.innerHTML = products.slice(0, 10).map(function (p, i) {
        return '<div class="top-item">'
            + '<span class="top-rank ' + (ranks[i] || '') + '">' + (i + 1) + '</span>'
            + '<span class="top-name">' + p.product_name + '</span>'
            + '<span class="top-value">' + formatM(p.total) + '</span></div>';
    }).join('');
}

var hourlyChartInstance = null;

function renderHourlyChart(data) {
    var ctx = document.getElementById('hourlyChart').getContext('2d');
    if (hourlyChartInstance) hourlyChartInstance.destroy();

    hourlyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(function (d) { return d.label; }),
            datasets: [{
                label: 'ຍອດຂາຍ (ກີບ)',
                data: data.map(function (d) { return d.sales / 1000; }),
                backgroundColor: 'rgba(245,166,35,0.7)',
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#888', font: { size: 10 } } },
                y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#888', font: { size: 10 } } }
            }
        }
    });
}

/* -----------------------------------------------
   Products
   ----------------------------------------------- */
function loadProducts() {
    api('GET', '/products?lang=la').then(function (products) {
        allProducts = products;
        renderProductsTable(products);
    }).catch(function () { });
}

function renderProductsTable(products) {
    var el = document.getElementById('productsTable');
    if (!products || products.length === 0) {
        el.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--fg-muted);padding:30px;">ບໍ່ມສິນຄ້າ</td></tr>';
        return;
    }

    el.innerHTML = products.map(function (p) {
        return '<tr>'
            + '<td>' + p.icon + ' ' + p.name + '</td>'
            + '<td>' + (p.categoryName || '-') + '</td>'
            + '<td class="money">' + formatM(p.priceM) + '</td>'
            + '<td class="money">' + formatM(p.priceL) + '</td>'
            + '<td>' + (p.is_active !== false ? '<span class="badge badge-active">ເປີດ</span>' : '<span class="badge badge-inactive">ປັບອອກ</span>') + '</td>'
            + '<td><button class="btn-edit" onclick="editProduct(' + p.id + ')"><i class="fas fa-pen"></i></button></td>'
            + '</tr>';
    }).join('');
}

function openProductModal(id) {
    var p = id ? allProducts.find(function (x) { return x.id == id; }) : null;
    var title = p ? 'ແແບ້ແລສິນຄ້າ' : 'ເພີ່ມສິນຄ້າ';
    document.getElementById('productModalTitle').textContent = title;

    var html = '<div style="padding:20px;">'
        + '<div class="form-row">'
        + '<div class="form-group"><label>ຊື່ລາວ</label><input type="text" class="form-input" id="prodName" value="' + (p ? p.name : '') + '"></div>'
        + '<div class="form-group"><label>ລາຄາ M (ກີບ)</label><input type="number" class="form-input" id="prodPriceM" value="' + (p ? p.priceM / 1000 : '') + '"></div>'
        + '</div>'
        + '<div class="form-row">'
        + '<div class="form-group"><label>ລາຄາ L (ກີບ)</label><input type="number" class="form-input" id="prodPriceL" value="' + (p ? p.priceL / 1000 : '') + '"></div>'
        + '<div class="form-group"><label>ໝາການ</label><input type="text" class="form-input" id="prodDesc" value="' + (p ? (p.desc || '') : '') + '"></div>'
        + '</div>'
        + '<div class="form-row">'
        + '<div class="form-group"><label>ໄອກ</label><input type="text" class="form-input" id="prodIcon" value="' + (p ? p.icon : '🍰') + '" maxlength="4"></div>'
        + '<div class="form-group"><label>ສີ</label><input type="color" class="form-input" id="prodColor" value="' + (p ? p.color : '#f5d6a8') + '"></div>'
        + '</div>'
        + '<div class="form-group"><label>category_id</label><input type="number" class="form-input" id="prodCatId" value="' + (p ? p.category : '') + '"></div>'
        + '<input type="hidden" id="prodEditId" value="' + (p ? p.id : '') + '">'
        + '<button class="btn-accent" onclick="saveProduct()" style="width:100%;margin-top:10px;">'
        + '<i class="fas fa-save"></i> ບັນທັງ</button>'
        + '</div>';

    document.getElementById('productModalBody').innerHTML = html;
    openModal('productModal');
}

function editProduct(id) { openProductModal(id); }

function saveProduct() {
    var id = document.getElementById('prodEditId').value;
    var data = {
        name: document.getElementById('prodName').value,
        name_en: document.getElementById('prodName').value,
        desc_la: document.getElementById('prodDesc').value,
        desc_en: document.getElementById('prodDesc').value,
        price_m: Math.round(parseFloat(document.getElementById('prodPriceM').value) * 1000),
        price_l: Math.round(parseFloat(document.getElementById('prodPriceL').value) * 1000),
        icon: document.getElementById('prodIcon').value || '🍰',
        color: document.getElementById('prodColor').value || '#f5d6a8',
        category_id: parseInt(document.getElementById('prodCatId').value) || null
    };

    var url = id ? '/products/' + id : '/products';
    var method = id ? 'PUT' : 'POST';

    api(method, url, data).then(function () {
        closeModal('productModal');
        loadProducts();
        showToast(id ? 'ແບັບທັງສຳນເລ' : 'ເພີ່ມສິນຄ້າສຳເລ', 'success');
    }).catch(function (err) {
        showToast(err.message || 'เກີດຜກຽນ', 'error');
    });
}

/* -----------------------------------------------
   Stock
   ----------------------------------------------- */
function loadStock() {
    api('GET', '/stock').then(function (data) {
        allIngredients = data.items;
        renderStockTable(data.items);
        renderStockAlerts(data.items);
    }).catch(function () { });
}

function renderStockTable(items) {
    var el = document.getElementById('stockTable');
    if (!items || items.length === 0) {
        el.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--fg-muted);padding:30px;">ບໍ່ມສະຕອກ</td></tr>';
        return;
    }

    el.innerHTML = items.map(function (item) {
        return '<tr>'
            + '<td>' + item.name + '</td>'
            + '<td class="money">' + item.currentStock.toLocaleString() + '</td>'
            + '<td>' + item.unit + '</td>'
            + '<td class="money">' + item.minStock.toLocaleString() + '</td>'
            + '<td class="money">' + item.costPerUnit.toLocaleString() + '</td>'
            + '<td>' + (item.isLow ? '<span class="badge badge-inactive">ໃ່ຝາ</span>' : '<span class="badge badge-active">ປອກ</span>') + '</td>'
            + '<td><button class="btn-accent" onclick="quickAddStock(' + item.id + ')" style="padding:4px 12px;font-size:12px;"><i class="fas fa-plus"></i></button></td>'
            + '</tr>';
    }).join('');
}

function renderStockAlerts(items) {
    var el = document.getElementById('stockAlerts');
    var low = items.filter(function (i) { return i.isLow; });
    if (low.length === 0) {
        el.innerHTML = '';
        return;
    }

    el.innerHTML = low.map(function (item) {
        var isEmpty = item.currentStock === 0;
        return '<div class="stock-alert-item ' + (isEmpty ? 'empty' : '') + '">'
            + '<span class="sa-icon">' + (isEmpty ? '🔴' : '⚠️') + '</span>'
            + '<span class="sa-name">' + item.name + '</span>'
            + '<span class="sa-qty">' + (isEmpty ? 'หມອກແ້ນ' : 'ຄ້ອນ ' + item.current_stock + '/' + item.minStock) + '</span>'
            + '</div>';
    }).join('');
}

function quickAddStock(id) {
    var qty = prompt('ປຈ ຈຳນນ້ອນ:', '100');
    if (!qty) return;
    qty = parseInt(qty);
    if (isNaN(qty) || qty <= 0) return;

    api('POST', '/stock/add', { ingredient_id: id, qty: qty }).then(function () {
        loadStock();
        loadDashboard();
        showToast('ເພີ່ມສະຕອກສຳເລ', 'success');
    }).catch(function (err) {
        showToast(err.message || 'ເກີດຜກຽນ', 'error');
    });
}

function openStockModal() {
    var sel = document.getElementById('stockIngredientId');
    if (allIngredients.length === 0) {
        showToast('ບໍ່ມວັນດັບສະຕອກ', 'error');
        return;
    }
    sel.innerHTML = allIngredients.map(function (i) {
        return '<option value="' + i.id + '">' + i.name + '</option>';
    }).join('');
    document.getElementById('stockQty').value = '';
    document.getElementById('stockDesc').value = '';
    openModal('stockModal');
}

function addStock() {
    var ingredientId = parseInt(document.getElementById('stockIngredientId').value);
    var qty = parseInt(document.getElementById('stockQty').value);
    var desc = document.getElementById('stockDesc').value;

    if (!ingredientId || !qty || qty <= 0) {
        showToast('ກະລຸນາ ຈຳນນ້ອນ ໃ່ຝາການ ໃໝາ', 'error');
        return;
    }

    api('POST', '/stock/add', { ingredient_id: ingredientId, qty: qty, description: desc }).then(function () {
        closeModal('stockModal');
        loadStock();
        loadDashboard();
        showToast('ເພີ່ມສະຕອກສຳເລ', 'success');
    }).catch(function (err) {
        showToast(err.message || 'ເກີດຜກຽນ', 'error');
    });
}

/* -----------------------------------------------
   Orders
   ----------------------------------------------- */
function loadOrders() {
    var date = document.getElementById('orderDate').value || new Date().toISOString().split('T')[0];
    document.getElementById('orderDate').value = date;

    api('GET', '/orders?date=' + date).then(function (orders) {
        var el = document.getElementById('ordersTable');
        if (!orders || orders.length === 0) {
            el.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--fg-muted);padding:30px;">ບໍ່ມປະຫວັດ</td></tr>';
            return;
        }

        el.innerHTML = orders.map(function (o) {
            return '<tr>'
                + '<td><strong>' + o.bill_number + '</strong></td>'
                + '<td>' + (o.cashier_name || '-') + '</td>'
                + '<td class="money">' + formatM(o.total) + '</td>'
                + '<td>' + new Date(o.created_at).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' }) + '</td>'
                + '<td>' + o.payment_method + '</td>'
                + '</tr>';
        }).join('');
    }).catch(function () {
        document.getElementById('ordersTable').innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--fg-muted);padding:30px;">ເກີດດຜກຽນ</td></tr>';
    });
}

/* -----------------------------------------------
   Reports
   ----------------------------------------------- */
function setupReportFilters() {
    var yearSel = document.getElementById('reportYear');
    var monthSel = document.getElementById('reportMonth');
    var now = new Date();
    var year = now.getFullYear();

    for (var y = year - 2; y <= year + 1; y++) {
        var opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y + (y === year ? ' (ປັນປະຈອນ)' : '');
        yearSel.appendChild(opt);
    }
    yearSel.value = year;

    for (var m = 1; m <= 12; m++) {
        var opt2 = document.createElement('option');
        opt2.value = m;
        opt2.textContent = ['ມັນນວັດ', 'ກຸມບັນ', 'ມີມາ', 'ເມີນເດືອນ', 'ມິຖນທັນ', 'ກະລອນ', 'ສິກທັນ', 'ຕິດທອນ', 'ພະນັກງານ', 'ທັນວດັດ'][m - 1];
        monthSel.appendChild(opt2);
    }
    monthSel.value = now.getMonth() + 1;
}

function loadMonthlyReport() {
    var year = document.getElementById('reportYear').value;
    var month = document.getElementById('reportMonth').value;

    api('GET', '/reports/monthly?year=' + year + '&month=' + month).then(function (data) {
        document.getElementById('monthSales').textContent = formatM(data.totalSales);
        document.getElementById('monthBills').textContent = data.totalBills;
        document.getElementById('monthGrowth').textContent = data.growth + '%';
        renderDailyChart(data.dailySummary);
        renderTopProducts(data.topProducts);
    }).catch(function () { });
}

var dailyChartInstance = null;

function renderDailyChart(daily) {
    var ctx = document.getElementById('dailyChart').getContext('2d');
    if (dailyChartInstance) dailyChartInstance.destroy();

    dailyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: daily.map(function (d) {
                var date = new Date(d.date);
                return date.getDate() + '/' + (date.getMonth() + 1);
            }),
            datasets: [{
                label: 'ຍອດຂາຍ (ກີບ)',
                data: daily.map(function (d) { return d.sales / 1000; }),
                backgroundColor: 'rgba(245,166,35,0.7)',
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#888', font: { size: 10 } } },
                y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#888', font: { size: 10 } } }
            }
        }
    });
}

function renderTopProducts(products) {
    var el = document.getElementById('monthTopProducts');
    if (!products || products.length === 0) {
        el.innerHTML = '<p style="text-align:center;color:var(--fg-muted);padding:30px;">ບໍ່ຂາຍ</p>';
        return;
    }

    var ranks = ['r1', 'r2', 'r3'];
    el.innerHTML = products.slice(0, 10).map(function (p, i) {
        return '<div class="top-item>'
            + '<span class="top-rank ' + (ranks[i] || '') + '">' + (i + 1) + '</span>'
            + '<span class="top-name">' + p.product_name + '</span>'
            + '<span class="top-value">' + formatM(p.total) + '</span></div>';
    }).join('');
}

/* -----------------------------------------------
   Members
   ----------------------------------------------- */
var allMembers = [];

function loadMembers() {
    api('GET', '/members').then(function (members) {
        allMembers = members;
        renderMembersTable(members);
    }).catch(function () { });
}

function renderMembersTable(members) {
    var el = document.getElementById('membersTable');
    if (!members || members.length === 0) {
        el.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--fg-muted);padding:30px;">ບໍ່ມສະມະສິກ</td></tr>';
        return;
    }

    el.innerHTML = members.map(function (m) {
        return '<tr>'
            + '<td>' + m.phone + '</td>'
            + '<td>' + (m.display_name || '-') + '</td>'
            + '<td class="money">' + formatM(m.total_spent) + '</td>'
            + '<td>' + m.visit_count + ' ຄຄ້ອນ</td>'
            + '<td style="color:var(--accent-light);font-weight:700;">' + m.total_points + '</td>'
            + '<td>' + new Date(m.created_at).toLocaleDateString('lo-LA') + '</td>'
            + '<td>'
            + '<button class="btn-edit" onclick="viewMember(' + m.id + ')"><i class="fas fa-eye"></i></button> '
            + '<button class="btn-del" onclick="addPointsModal(' + m.id + ')"><i class="fas fa-star"></i></button>'
            + '</td>'
            + '</tr>';
    }).join('');
}

function searchMembers() {
    var q = document.getElementById('memberSearch').value.trim();
    if (!q) {
        renderMembersTable(allMembers);
        return;
    }
    var filtered = allMembers.filter(function (m) {
        return m.phone.includes(q) || (m.display_name || '').includes(q);
    });
    renderMembersTable(filtered);
}

function viewMember(id) {
    showToast('ກຳ ສະແອນສະມະ', 'info');
}

function addPointsModal(id) {
    var m = allMembers.find(function (x) { return x.id == id; });
    if (!m) return;

    var pts = prompt('ເພິນ ແລິກ:', '10');
    if (!pts) return;
    pts = parseInt(pts);
    if (isNaN(pts) || pts <= 0) { showToast('ກະລຸນາ ແລິກແລ', 'error'); return; }

    api('POST', '/members/earn-points', {
        member_id: id,
        total_spent: pts * 100
    }).then(function () {
        loadMembers();
        loadDashboard();
        showToast('ໄອນຮັບ ' + pts + ' ແລິກແລ', 'success');
    }).catch(function (err) {
        showToast(err.message || 'ເກີດຜກຽນ', 'error');
    });
}

function openMemberModal() {
    document.getElementById('memberPhone').value = '';
    document.getElementById('memberName').value = '';
    openModal('memberModal');
    document.getElementById('memberPhone').focus();
}

function createMember() {
    var phone = document.getElementById('memberPhone').value.trim();
    var name = document.getElementById('memberName').value.trim();

    if (!phone) {
        showToast('ກະລຸນາເບື່ນໂທລະ', 'error');
        return;
    }

    api('POST', '/members', { phone: phone, display_name: name }).then(function (data) {
        closeModal('memberModal');
        loadMembers();
        showToast(data.message, 'success');
    }).catch(function (err) {
        if (err.message === 'เบอรโทรศัพท์นี้ลงทะเบียนแล้ว') {
            var member = err.member;
            if (member) {
                loadMembers();
                showToast('ສະມະສິກອນຢູ້ຈ້ງ: ' + (member.display_name || member.phone), 'info');
            } else {
                showToast(err.message, 'error');
            }
        } else {
            showToast(err.message || 'ເກີດຜກຽນ', 'error');
        }
    });
}

/* -----------------------------------------------
   Utility
   ----------------------------------------------- */
function formatM(amount) {
    return (amount / 1000).toLocaleString('lo-LA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toastContainer');
    var toast = document.createElement('div');
    toast.className = 'toast';
    var icons = {
        success: '<i class="fas fa-check-circle" style="color:var(--success);font-size:16px;"></i>',
        error: '<i class="fas fa-exclamation-circle" style="color:">var(--danger);font-size:16px;"></i>',
        info: '<i class="fas fa-info-circle" style="color:var(--info);font-size:16px;"></i>'
    };
    toast.innerHTML = (icons[type] || icons.info) + '<span>' + message + '</span>';
    container.appendChild(toast);
    setTimeout(function () { if (toast.parentNode) toast.remove(); }, 3000);
}

/* เปิด modal ด้วย ESC */
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(function (m) { closeModal(m.id); });
    }
});

document.querySelectorAll('.modal-overlay').forEach(function (m) {
    m.addEventListener('click', function (e) { if (e.target === m) closeModal(m.id); });
});

/* เรัน */
init();