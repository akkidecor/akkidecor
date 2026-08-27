// ============================================
//  Dashboard Script (Supabase Version)
// ============================================

// --- Algerian Wilayas (58) ---
const WILAYAS = [
    "أدرار", "الشلف", "الأغواط", "أم البواقي", "باتنة",
    "بجاية", "بسكرة", "بشار", "البليدة", "البويرة",
    "تمنراست", "تبسة", "تلمسان", "تيارت", "تيزي وزو",
    "الجزائر", "الجلفة", "جيجل", "سطيف", "سعيدة",
    "سكيكدة", "سيدي بلعباس", "عنابة", "قالمة", "قسنطينة",
    "المدية", "مستغانم", "المسيلة", "معسكر", "ورقلة",
    "وهران", "البيض", "إليزي", "برج بوعريريج", "بومرداس",
    "الطارف", "تندوف", "تيسمسيلت", "الوادي", "خنشلة",
    "سوق أهراس", "تيبازة", "ميلة", "عين الدفلى", "النعامة",
    "عين تموشنت", "غرداية", "غليزان", "تيميمون", "برج باجي مختار",
    "أولاد جلال", "بني عباس", "عين صالح", "عين قزام", "تقرت",
    "جانت", "المغير", "المنيعة"
];

// --- State ---
let productData = {
    id: null,
    name: 'المنتج الرائع',
    price: 5500,
    description: 'وصف المنتج يكتب هنا',
    models: [],
    images: []
};

let deliveryPrices = {};
let orders = [];

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
    await initDeliveryPrices();
    await loadData();
    setupNavigation();
    setupProductForm();
    setupImageUpload();
    setupDeliveryTable();
    renderDeliveryTable();

    await fetchOrders();
    renderOrdersTable();
    updateDashboardStats();

    // Set interval to check for new orders from Supabase (polling)
    setInterval(async () => {
        await fetchOrders();
    }, 10000);
});

// --- Data Management ---
async function initDeliveryPrices() {
    try {
        const { data, error } = await supabaseClient.from('delivery_prices').select('*');
        if (!error && data) {
            data.forEach(item => {
                deliveryPrices[item.wilaya_name] = {
                    home: item.price_home !== undefined && item.price_home !== null ? Number(item.price_home) : (Number(item.price) || 0),
                    office: item.price_office !== undefined && item.price_office !== null ? Number(item.price_office) : 0
                };
            });
        }
    } catch (e) { }

    // Ensure all 58 wilayas exist in the object
    WILAYAS.forEach(wilaya => {
        if (!deliveryPrices[wilaya] || typeof deliveryPrices[wilaya] !== 'object') {
            deliveryPrices[wilaya] = { home: 0, office: 0 };
        }
    });
}

async function loadData() {
    try {
        const { data: products, error } = await supabaseClient.from('products').select('*').order('created_at', { ascending: false }).limit(1);

        if (products && products.length > 0) {
            const product = products[0];

            // Fetch models
            const { data: models, error: mErr } = await supabaseClient.from('product_models').select('*').eq('product_id', product.id);
            if (mErr) console.error("Dashboard models load error", mErr);

            // Fetch images
            const { data: images, error: iErr } = await supabaseClient.from('product_images').select('*').eq('product_id', product.id).order('display_order', { ascending: true });
            if (iErr) console.error("Dashboard images load error", iErr);

            productData = {
                id: product.id,
                name: product.name,
                price: product.price,
                description: product.description || '',
                models: models || [],
                images: images ? images.map(img => img.image_url) : []
            };
        }
    } catch (err) { console.error("Fatal loadData error:", err); }

    // Populate UI
    if (document.getElementById('product-name')) document.getElementById('product-name').value = productData.name;
    if (document.getElementById('product-price')) document.getElementById('product-price').value = productData.price;
    if (document.getElementById('product-desc')) document.getElementById('product-desc').value = productData.description;

    renderModels();
    renderImagePreviews();
}

async function fetchOrders() {
    try {
        const { data, error } = await supabaseClient.from('orders').select('*').order('created_at', { ascending: false });
        if (!error && data) {
            const oldLength = orders.length;
            orders = data;

            if (orders.length !== oldLength) {
                renderOrdersTable();
                updateDashboardStats();
            }
        }
    } catch (e) { }
}

// --- Navigation ---
function setupNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const sections = document.querySelectorAll('.page-section');
    const mobileToggle = document.getElementById('mobile-toggle');
    const sidebar = document.getElementById('sidebar');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            const target = item.getAttribute('data-target');
            sections.forEach(sec => {
                sec.classList.remove('active');
                if (sec.id === target) {
                    sec.classList.add('active');
                }
            });

            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
            }
        });
    });

    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
}

// --- Product Form ---
function setupProductForm() {
    const nameInput = document.getElementById('product-name');
    const priceInput = document.getElementById('product-price');
    const descInput = document.getElementById('product-desc');
    const saveBtn = document.getElementById('save-product-btn');
    const addModelBtn = document.getElementById('add-model-btn');

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            productData.name = nameInput.value;
            productData.price = Number(priceInput.value);
            productData.description = descInput.value;

            // Save to DB
            const originalText = saveBtn.innerText;
            saveBtn.innerText = 'جاري الحفظ...';
            saveBtn.disabled = true;

            try {
                let pid = productData.id;

                // 1. Upsert product
                if (!pid) {
                    const { data, error } = await supabaseClient.from('products').insert([{
                        name: productData.name,
                        price: productData.price,
                        description: productData.description
                    }]).select();
                    if (data && data.length > 0) {
                        pid = data[0].id;
                        productData.id = pid;
                    }
                } else {
                    await supabaseClient.from('products').update({
                        name: productData.name,
                        price: productData.price,
                        description: productData.description
                    }).eq('id', pid);
                }

                if (pid) {
                    // 2. Synchronize Models - clear and insert
                    await supabaseClient.from('product_models').delete().eq('product_id', pid);
                    if (productData.models.length > 0) {
                        const modelsToInsert = productData.models.map(m => ({
                            product_id: pid,
                            name: m.name,
                            image_url: m.image || ''
                        }));
                        await supabaseClient.from('product_models').insert(modelsToInsert);
                    }

                    // 3. Synchronize Images - clear and insert
                    await supabaseClient.from('product_images').delete().eq('product_id', pid);
                    if (productData.images.length > 0) {
                        const imagesToInsert = productData.images.map((img, idx) => ({
                            product_id: pid,
                            image_url: img,
                            display_order: idx
                        }));
                        await supabaseClient.from('product_images').insert(imagesToInsert);
                    }
                }

                showToast('تم حفظ تغييرات المنتج بنجاح');
            } catch (err) {
                showToast('حدث خطأ أثناء الحفظ', 'error');
                console.error(err);
            } finally {
                saveBtn.innerText = originalText;
                saveBtn.disabled = false;
            }
        });
    }

    if (addModelBtn) {
        addModelBtn.addEventListener('click', () => {
            const inputName = document.getElementById('model-input');
            const inputImg = document.getElementById('model-image-input');
            const valName = inputName.value.trim();
            const file = inputImg.files[0];

            if (valName) {
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        productData.models.push({ name: valName, image: ev.target.result });
                        renderModels();
                        inputImg.value = '';
                        const previewImg = document.getElementById('model-img-preview');
                        if (previewImg) { previewImg.src = ''; previewImg.style.display = 'none'; }
                    };
                    reader.readAsDataURL(file);
                } else {
                    productData.models.push({ name: valName, image: null });
                    renderModels();
                }
                inputName.value = '';
            } else {
                showToast('الرجاء كتابة اسم الموديل/المقاس أولاً', 'error');
            }
        });
    }

    // Modal Image Preview Update dynamically
    const inputImg = document.getElementById('model-image-input');
    const previewImg = document.getElementById('model-img-preview');
    if (inputImg && previewImg) {
        inputImg.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    previewImg.src = ev.target.result;
                    previewImg.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                previewImg.src = '';
            }
        });
    }
}

function renderModels() {
    const list = document.getElementById('models-list');
    if (!list) return;

    list.innerHTML = '';
    productData.models.forEach((model, index) => {
        const mName = typeof model === 'string' ? model : model.name;
        const mImg = (typeof model !== 'string' && (model.image_url || model.image)) ? (model.image_url || model.image) : '';

        const tag = document.createElement('div');
        tag.className = 'tag';
        tag.style.display = 'flex';
        tag.style.alignItems = 'center';
        tag.style.gap = '8px';
        tag.style.padding = '6px 12px';
        tag.style.background = 'var(--dash-bg)';
        tag.style.border = '1px solid var(--dash-border)';
        tag.style.borderRadius = 'var(--radius)';

        let imgHtml = '';
        if (mImg) {
            imgHtml = `<img src="${mImg}" style="width: 24px; height: 24px; object-fit: cover; border-radius: 4px;">`;
        }

        tag.innerHTML = `
      ${imgHtml}
      <span style="color: var(--dash-text-primary); font-weight: 500;">${mName}</span>
      <button onclick="removeModel(${index})" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.1rem; padding: 0 4px;">&times;</button>
    `;
        list.appendChild(tag);
    });
}

function removeModel(index) {
    productData.models.splice(index, 1);
    renderModels();
}

// --- Image Upload (Base64) ---
function setupImageUpload() {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');

    if (!dropArea || !fileInput) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('dragover'), false);
    });

    dropArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    });

    dropArea.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', function () {
        handleFiles(this.files);
    });
}

function handleFiles(files) {
    const fileArray = Array.from(files);

    if (productData.images.length + fileArray.length > 20) {
        showToast('الحد الأقصى هو 20 صور للمنتج', 'error');
        return;
    }

    fileArray.forEach(file => {
        if (!file.type.match('image.*')) return;

        const reader = new FileReader();

        reader.onload = (e) => {
            productData.images.push(e.target.result);
            renderImagePreviews();
        };

        reader.readAsDataURL(file);
    });
}

function renderImagePreviews() {
    const previewGrid = document.getElementById('image-preview');
    if (!previewGrid) return;

    previewGrid.innerHTML = '';

    productData.images.forEach((src, index) => {
        const item = document.createElement('div');
        item.className = 'preview-item';
        item.innerHTML = `
      <img src="${src}" alt="صورة ${index + 1}">
      <button class="remove-btn" onclick="removeImage(${index})">&times;</button>
    `;
        previewGrid.appendChild(item);
    });
}

function removeImage(index) {
    productData.images.splice(index, 1);
    renderImagePreviews();
}

// --- Delivery Prices ---
function setupDeliveryTable() {
    const searchInput = document.getElementById('search-wilaya');
    const saveBtn = document.getElementById('save-delivery-btn');
    const applyBulkBtn = document.getElementById('apply-bulk-price');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderDeliveryTable(e.target.value);
        });
    }

    if (applyBulkBtn) {
        applyBulkBtn.addEventListener('click', () => {
            const hVal = document.getElementById('bulk-price-home-input') ? document.getElementById('bulk-price-home-input').value : '';
            const oVal = document.getElementById('bulk-price-office-input') ? document.getElementById('bulk-price-office-input').value : '';
            WILAYAS.forEach(wilaya => {
                if (!deliveryPrices[wilaya]) deliveryPrices[wilaya] = { home: 0, office: 0 };
                if (hVal !== '') deliveryPrices[wilaya].home = Number(hVal);
                if (oVal !== '') deliveryPrices[wilaya].office = Number(oVal);
            });
            renderDeliveryTable(searchInput ? searchInput.value : '');
            showToast('تم تطبيق الأسعار، لا تنس الحفظ');
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            // Read all home/office inputs from rendered table
            WILAYAS.forEach(wilaya => {
                const hInput = document.querySelector(`input[data-wilaya="${wilaya}"][data-type="home"]`);
                const oInput = document.querySelector(`input[data-wilaya="${wilaya}"][data-type="office"]`);
                if (!deliveryPrices[wilaya]) deliveryPrices[wilaya] = { home: 0, office: 0 };
                if (hInput) deliveryPrices[wilaya].home = Number(hInput.value) || 0;
                if (oInput) deliveryPrices[wilaya].office = Number(oInput.value) || 0;
            });

            const originalText = saveBtn.innerText;
            saveBtn.innerText = 'جاري الحفظ...';
            saveBtn.disabled = true;

            try {
                const records = WILAYAS.map(w => ({
                    wilaya_name: w,
                    price_home: deliveryPrices[w] ? deliveryPrices[w].home : 0,
                    price_office: deliveryPrices[w] ? deliveryPrices[w].office : 0
                }));
                const { error } = await supabaseClient.from('delivery_prices').upsert(records, { onConflict: 'wilaya_name' });
                if (error) throw error;

                showToast('تم حفظ أسعار التوصيل بنجاح');
            } catch (err) {
                showToast('حدث خطأ أثناء حفظ الأسعار', 'error');
                console.error(err);
            } finally {
                saveBtn.innerText = originalText;
                saveBtn.disabled = false;
            }
        });
    }
}

function renderDeliveryTable(filterTerm = '') {
    const tbody = document.getElementById('delivery-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const term = filterTerm.toLowerCase();

    WILAYAS.forEach((wilaya, index) => {
        if (wilaya.toLowerCase().includes(term)) {
            const num = String(index + 1).padStart(2, '0');
            const pHome = deliveryPrices[wilaya] ? deliveryPrices[wilaya].home : 0;
            const pOffice = deliveryPrices[wilaya] ? deliveryPrices[wilaya].office : 0;

            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td style="font-weight: bold; color: var(--dash-text-secondary);">${num}</td>
        <td style="font-weight: 600;">${wilaya}</td>
        <td>
          <input type="number" class="form-control" value="${pHome}" data-wilaya="${wilaya}" data-type="home" style="width: 120px; font-weight: 600;">
        </td>
        <td>
          <input type="number" class="form-control" value="${pOffice}" data-wilaya="${wilaya}" data-type="office" style="width: 120px; font-weight: 600;">
        </td>
      `;
            tbody.appendChild(tr);
        }
    });
}

// --- Orders ---
function renderOrdersTable() {
    const tbody = document.getElementById('orders-tbody');
    const recentTbody = document.getElementById('recent-orders-tbody');
    const emptyState = document.getElementById('orders-empty-state');
    const searchTerm = document.getElementById('search-order') ? document.getElementById('search-order').value.toLowerCase() : '';
    const statusFilter = document.getElementById('filter-status') ? document.getElementById('filter-status').value : 'الكل';

    if (!tbody && !recentTbody) return;

    let filteredOrders = orders.filter(order => {
        const matchesSearch = (order.customer_name || '').toLowerCase().includes(searchTerm) ||
            (order.order_number || '').toLowerCase().includes(searchTerm) ||
            (order.phone_number || '').includes(searchTerm);
        const matchesStatus = statusFilter === 'الكل' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (tbody) {
        tbody.innerHTML = '';
        if (filteredOrders.length === 0) {
            tbody.parentElement.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
        } else {
            tbody.parentElement.style.display = 'table';
            if (emptyState) emptyState.style.display = 'none';

            filteredOrders.forEach((order, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = getRowHTML(order, index, false);
                tbody.appendChild(tr);
            });
        }
    }

    if (recentTbody) {
        recentTbody.innerHTML = '';
        const recent = orders.slice(0, 5);
        if (recent.length === 0) {
            recentTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--dash-text-secondary);">لا توجد طلبات حديثة</td></tr>';
        } else {
            recent.forEach((order, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = getRowHTML(order, index, true);
                recentTbody.appendChild(tr);
            });
        }
    }
}

// Row HTML
function getRowHTML(order, index, isRecent = false) {
    const id = order.id;
    const date = new Date(order.created_at).toLocaleString('ar-DZ', {
        year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const statusOptions = ['جديد', 'مؤكد', 'تم الشحن', 'مستلم', 'مرفوض', 'ملغى'].map(s =>
        `<option value="${s}" ${order.status === s ? 'selected' : ''}>${s}</option>`
    ).join('');

    if (isRecent) {
        return `
      <td style="font-family: monospace; color: var(--dash-text-secondary);">${order.order_number || '---'}</td>
      <td style="font-weight: 600;">${order.customer_name}</td>
      <td>${order.wilaya}</td>
      <td style="font-weight: bold; color: var(--dash-gold);">${formatPrice(order.total_price)}</td>
      <td><span class="status-badge ${getStatusClass(order.status)}">${order.status}</span></td>
    `;
    }

    return `
    <td style="font-family: monospace; color: var(--dash-text-secondary); font-size: 0.85rem;">
      ${order.order_number || '---'}<br>
      <span style="font-size: 0.75rem;">${date}</span>
    </td>
    <td>
      <div style="font-weight: 600;">${order.customer_name}</div>
      <div style="color: var(--dash-text-secondary); font-size: 0.85rem; font-family: monospace; margin-top: 4px;" dir="ltr">${order.phone_number}</div>
    </td>
    <td>
      <div style="font-size: 0.9rem;">${order.model_name || 'بدون موديل'}</div>
      <div style="color: var(--dash-gold); font-size: 0.85rem; margin-top: 4px;">${order.wilaya} <span style="opacity:0.8; font-size: 0.75rem;">(${order.delivery_type || 'توصيل لباب المنزل'})</span></div>
    </td>
    <td>
      <div style="font-weight: bold;">${formatPrice(order.total_price)}</div>
      <div style="color: var(--dash-text-secondary); font-size: 0.75rem; margin-top: 4px;">(توصيل: ${formatPrice(order.delivery_price)})</div>
    </td>
    <td>
      <select class="form-control" style="width: auto; height: 32px; padding: 0 10px; font-size: 0.85rem; background: var(--dash-bg);" onchange="updateOrderStatus('${id}', this.value)">
        ${statusOptions}
      </select>
    </td>
    <td>
      <button class="btn" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 6px 10px;" onclick="deleteOrder('${id}')" title="حذف">
        🗑️
      </button>
    </td>
  `;
}

function getStatusClass(status) {
    if (status === 'جديد') return 'blue';
    if (status === 'مؤكد') return 'gold';
    if (status === 'تم الشحن') return 'orange';
    if (status === 'مستلم') return 'green';
    if (status === 'ملغى' || status === 'مرفوض') return 'red';
    return '';
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        await supabaseClient.from('orders').update({ status: newStatus }).eq('id', orderId);
        showToast('تم تحديث حالة الطلب', 'success');

        // Update locally
        const target = orders.find(o => o.id === orderId);
        if (target) target.status = newStatus;

        renderOrdersTable();
        updateDashboardStats();
    } catch (err) {
        showToast('فشل تحديث الحالة', 'error');
    }
}

async function deleteOrder(orderId) {
    if (confirm('هل أنت متأكد من حذف هذا الطلب نهائياً؟')) {
        try {
            await supabaseClient.from('orders').delete().eq('id', orderId);
            showToast('تم حذف الطلب', 'success');

            // local update
            orders = orders.filter(o => o.id !== orderId);
            renderOrdersTable();
            updateDashboardStats();
        } catch (err) {
            showToast('فشل حذف الطلب', 'error');
        }
    }
}

// Filter events

if (document.getElementById('search-order')) {
    document.getElementById('search-order').addEventListener('input', renderOrdersTable);
}
if (document.getElementById('filter-status')) {
    document.getElementById('filter-status').addEventListener('change', renderOrdersTable);
}
if (document.getElementById('export-orders')) {
    document.getElementById('export-orders').addEventListener('click', () => {

        // Simple CSV Export
        if (orders.length === 0) {
            showToast('لا توجد طلبات للتصدير', 'error');
            return;
        }

        let csv = 'رقم الطلب,التاريخ,الاسم,الهاتف,الولاية,نوع التوصيل,الموديل,الثمن,التوصيل,المجموع,الحالة\n';
        orders.forEach(o => {
            const date = new Date(o.created_at).toLocaleString('ar-DZ');
            csv += `"${o.order_number}","${date}","${o.customer_name}","${o.phone_number}","${o.wilaya}","${o.delivery_type || ''}","${o.model_name}",${o.product_price},${o.delivery_price},${o.total_price},"${o.status}"\n`;
        });

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `orders_${new Date().getTime()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

// --- Dashboard Stats ---
function updateDashboardStats() {
    const totalRevenue = orders.reduce((sum, order) => {
        if (order.status === 'مستلم' || order.status === 'تم الشحن' || order.status === 'مؤكد') {
            return sum + (order.total_price || 0);
        }
        return sum;
    }, 0);

    const newOrders = orders.filter(o => o.status === 'جديد').length;
    const delivered = orders.filter(o => o.status === 'مستلم').length;

    if (document.getElementById('stat-revenue')) document.getElementById('stat-revenue').textContent = formatPrice(totalRevenue);
    if (document.getElementById('stat-total-orders')) document.getElementById('stat-total-orders').textContent = orders.length;
    if (document.getElementById('stat-new-orders')) document.getElementById('stat-new-orders').textContent = newOrders;
    if (document.getElementById('stat-delivered')) document.getElementById('stat-delivered').textContent = delivered;
}

// --- Utils ---
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.className = `toast show ${type}`;
    toast.innerHTML = `
    <span>${type === 'success' ? '✅' : '❌'}</span>
    <span>${message}</span>
  `;

    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

function formatPrice(price) {
    if (!price) return "0 د.ج";
    return price.toLocaleString('ar-DZ') + ' د.ج';
}
