// ============================================
//  Landing Page Script
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
let productData = null;
let deliveryPrices = {};

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  loadProductData();
  loadDeliveryPrices();
  populateWilayas();
  setupNavbar();
  setupRevealAnimations();
  setupForm();
});

// --- Load product data from Supabase ---
async function loadProductData() {
  try {
    const { data: products, error: pErr } = await supabaseClient.from('products').select('*').order('created_at', { ascending: false }).limit(1);
    if (pErr) throw pErr;

    if (products && products.length > 0) {
      const product = products[0];

      // Fetch models
      const { data: models, error: mErr } = await supabaseClient.from('product_models').select('*').eq('product_id', product.id);
      if (mErr) console.error("Models fetch error:", mErr);

      // Fetch images
      const { data: images, error: iErr } = await supabaseClient.from('product_images').select('*').eq('product_id', product.id).order('display_order', { ascending: true });
      if (iErr) console.error("Images fetch error:", iErr);

      productData = {
        id: product.id,
        name: product.name,
        price: product.price,
        description: product.description,
        models: models || [],
        images: images ? images.map(img => img.image_url) : []
      };

      renderProduct();
    } else {
      showNoProduct();
    }
  } catch (err) {
    console.error("Error loading product data:", err);
    showNoProduct();
  }
}

// --- Load delivery prices from Supabase ---
async function loadDeliveryPrices() {
  try {
    const { data, error } = await supabaseClient.from('delivery_prices').select('*');
    if (!error && data) {
      data.forEach(item => {
        deliveryPrices[item.wilaya_name] = {
          home: item.price_home !== undefined && item.price_home !== null ? Number(item.price_home) : (Number(item.price) || 0),
          office: item.price_office !== undefined && item.price_office !== null ? Number(item.price_office) : 0
        };
      });
      updatePriceDisplay();
    }
  } catch (err) {
    console.error("Error loading delivery prices:", err);
  }
}

// --- Render product on the page ---
function renderProduct() {
  if (!productData) return;

  // Update hero
  const heroTitle = document.getElementById('hero-product-name');
  if (heroTitle) heroTitle.textContent = productData.name;

  // Update description
  const heroDesc = document.getElementById('hero-description');
  if (heroDesc && productData.description) {
    heroDesc.textContent = productData.description;
  }

  // Update hero price badge
  const heroPriceVal = document.getElementById('hero-price-val');
  if (heroPriceVal) {
    heroPriceVal.textContent = productData.price ? formatPrice(productData.price) : '---';
    document.getElementById('hero-price-badge').style.display = productData.price ? 'inline-flex' : 'none';
  }

  // Update hero main image (legacy, kept for compatibility)
  const heroMainImg = document.getElementById('hero-main-img');
  if (heroMainImg) {
    if (productData.images && productData.images.length > 0) {
      heroMainImg.src = productData.images[0];
      heroMainImg.style.display = 'block';
    } else {
      heroMainImg.style.display = 'none';
    }
  }

  // Show description block below gallery
  const descBlock = document.getElementById('product-desc-block');
  const descEl = document.getElementById('hero-description');
  if (descEl && productData.description) {
    descEl.textContent = productData.description;
    if (descBlock) descBlock.style.display = 'block';
  }

  // Update models grid
  const modelsGrid = document.getElementById('models-grid');
  if (modelsGrid && productData.models && productData.models.length > 0) {
    modelsGrid.innerHTML = '';
    productData.models.forEach(model => {
      const mName = typeof model === 'string' ? model : model.name;
      const parsedImage = (typeof model !== 'string' && (model.image_url || model.image)) ? (model.image_url || model.image) : null;
      const mImg = parsedImage ? parsedImage : `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23222"/><text x="50" y="55" font-family="Arial" font-size="20" fill="%23666" text-anchor="middle">${i18n[currentLang].no_image}</text></svg>`;

      const card = document.createElement('div');
      card.className = 'model-card';
      card.innerHTML = `
        <img src="${mImg}" alt="${mName}">
        <div class="model-name">${mName}</div>
      `;
      card.addEventListener('click', () => {
        document.querySelectorAll('.model-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        document.getElementById('selected-model-val').value = mName;
        document.getElementById('model-error').style.display = 'none';
      });
      modelsGrid.appendChild(card);
    });
  }

  // Update gallery
  renderGallery();

  // Show price
  updatePriceDisplay();
}

// --- Render gallery images ---
function renderGallery() {
  const container = document.getElementById('gallery-container');
  const noMsg = document.getElementById('no-product-msg');

  if (!productData || !productData.images || productData.images.length === 0) {
    showNoProduct();
    return;
  }

  if (noMsg) noMsg.style.display = 'none';

  container.innerHTML = '';

  // Main image
  const mainDiv = document.createElement('div');
  mainDiv.className = 'gallery-main';
  const mainImg = document.createElement('img');
  mainImg.src = productData.images[0];
  mainImg.alt = productData.name || 'صورة المنتج';
  mainImg.id = 'main-gallery-img';
  mainDiv.appendChild(mainImg);
  container.appendChild(mainDiv);

  // Thumbnails
  if (productData.images.length > 1) {
    const thumbsDiv = document.createElement('div');
    thumbsDiv.className = 'gallery-thumbs';

    productData.images.forEach((imgSrc, index) => {
      const thumb = document.createElement('div');
      thumb.className = 'gallery-thumb' + (index === 0 ? ' active' : '');
      const thumbImg = document.createElement('img');
      thumbImg.src = imgSrc;
      thumbImg.alt = `صورة ${index + 1}`;
      thumb.appendChild(thumbImg);

      thumb.addEventListener('click', () => {
        document.getElementById('main-gallery-img').src = imgSrc;
        document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });

      thumbsDiv.appendChild(thumb);
    });

    container.appendChild(thumbsDiv);
  }
}

// --- Show no product message ---
function showNoProduct() {
  const container = document.getElementById('gallery-container');
  container.innerHTML = `
    <div class="no-product" style="grid-column: 1 / -1;">
      <div class="icon">📦</div>
      <h3>لا توجد صور حالياً</h3>
      <p>سيتم إضافة صور المنتج قريباً</p>
    </div>
  `;
}

// --- Populate wilaya dropdown ---
function populateWilayas() {
  const select = document.getElementById('wilaya-select');
  WILAYAS.forEach((wilaya, index) => {
    const opt = document.createElement('option');
    opt.value = wilaya;
    opt.textContent = `${String(index + 1).padStart(2, '0')} - ${wilaya}`;
    select.appendChild(opt);
  });
}

// --- Update price display ---
let currentDeliveryType = 'home'; // 'home' or 'office'

window.selectDeliveryType = function (element, type) {
  const card = element.closest ? (element.closest('.delivery-type-card') || element) : element;
  // Update UI
  document.querySelectorAll('.delivery-type-card').forEach(c => c.classList.remove('active'));
  card.classList.add('active');

  // Update State
  currentDeliveryType = type;

  // Update Price
  updatePriceDisplay();
};

function getSelectedDeliveryType() {
  return currentDeliveryType === 'home' ? 'توصيل لباب المنزل' : 'توصيل للمكتب';
}

function getDeliveryPrice(wilaya) {
  const type = getSelectedDeliveryType();
  const priceObj = deliveryPrices[wilaya];
  if (!priceObj) return 0;
  return type.includes('المكتب') ? (priceObj.office || 0) : (priceObj.home || 0);
}

function updatePriceDisplay() {
  const productPriceEl = document.getElementById('product-price-display');
  const deliveryPriceEl = document.getElementById('delivery-price-display');
  const totalPriceEl = document.getElementById('total-price-display');
  const wilayaNameEl = document.getElementById('selected-wilaya-name');
  const wilayaSelect = document.getElementById('wilaya-select');

  const selectedWilaya = wilayaSelect.value;
  const productPrice = productData ? (productData.price || 0) : 0;

  productPriceEl.textContent = formatPrice(productPrice);

  if (!selectedWilaya) {
    deliveryPriceEl.textContent = '---';
    totalPriceEl.textContent = formatPrice(productPrice);
    wilayaNameEl.textContent = i18n[currentLang].price_undefined;
  } else {
    const deliveryPrice = getDeliveryPrice(selectedWilaya);
    const total = productPrice + deliveryPrice;

    deliveryPriceEl.textContent = formatPrice(deliveryPrice);
    totalPriceEl.textContent = formatPrice(total);
    wilayaNameEl.textContent = selectedWilaya;
  }
}

// --- Format price ---
function formatPrice(price) {
  return price.toLocaleString('ar-DZ') + ' ' + i18n[currentLang].currency;
}

// --- Setup form ---
function setupForm() {
  const wilayaSelect = document.getElementById('wilaya-select');
  wilayaSelect.addEventListener('change', updatePriceDisplay);

  const form = document.getElementById('order-form');
  form.addEventListener('submit', handleSubmit);
}

// --- Handle form submission ---
async function handleSubmit(e) {
  e.preventDefault();

  const model = document.getElementById('selected-model-val').value;
  const name = document.getElementById('full-name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const wilaya = document.getElementById('wilaya-select').value;

  // Validation
  if (!model) {
    document.getElementById('model-error').style.display = 'block';
    shakeElement(document.getElementById('models-grid'));
    return;
  }
  if (!name) {
    shakeElement(document.getElementById('full-name'));
    return;
  }
  if (!phone || phone.length < 9) {
    shakeElement(document.getElementById('phone'));
    return;
  }
  if (!wilaya) {
    shakeElement(document.getElementById('wilaya-select'));
    return;
  }

  const productPrice = productData ? productData.price || 0 : 0;
  const deliveryType = getSelectedDeliveryType();
  const deliveryPrice = getDeliveryPrice(wilaya);

  const submitBtn = document.getElementById('submit-btn');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span>${i18n[currentLang].sending}</span><span>⏳</span>`;

  try {
    const { data, error } = await supabaseClient.from('orders').insert([{
      order_number: generateId(),
      product_id: productData ? productData.id : null,
      model_name: model,
      delivery_type: deliveryType,
      customer_name: name,
      phone_number: phone,
      wilaya: wilaya,
      product_price: productPrice,
      delivery_price: deliveryPrice,
      total_price: productPrice + deliveryPrice,
      status: 'جديد'
    }]);

    if (error) throw error;

    // Show success
    document.getElementById('success-modal').classList.add('active');

    // Reset form
    e.target.reset();
    document.querySelectorAll('.model-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('selected-model-val').value = '';
    updatePriceDisplay();
  } catch (err) {
    console.error("Error submitting order:", err);
    alert(i18n[currentLang].error_submit);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

// --- Shake animation for validation ---
function shakeElement(el) {
  el.style.animation = 'none';
  el.offsetHeight; // trigger reflow
  el.style.animation = 'shake 0.5s ease';
  el.style.borderColor = '#f87171';
  setTimeout(() => {
    el.style.borderColor = '';
    el.style.animation = '';
  }, 1500);
}

// Add shake keyframes dynamically
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-6px); }
    80% { transform: translateX(6px); }
  }
`;
document.head.appendChild(shakeStyle);

// --- Generate unique ID ---
function generateId() {
  return 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

// --- Close modal ---
function closeModal() {
  document.getElementById('success-modal').classList.remove('active');
}

// --- Navbar scroll effect ---
function setupNavbar() {
  window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

// --- Reveal on scroll ---
function setupRevealAnimations() {
  const reveals = document.querySelectorAll('.reveal');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  reveals.forEach(el => observer.observe(el));
}


// --- Localization (i18n) ---
const i18n = {
  ar: {
    nav_home: "الرئيسية",
    nav_product: "المنتج",
    nav_order: "اطلب الآن",
    hero_badge: "منتج حصري بجودة عالية",
    hero_btn_order: "اطلب الآن",
    hero_btn_view: "شاهد المنتج",
    gallery_label: "معرض الصور",
    gallery_title: "شاهد منتجنا عن قرب",
    gallery_desc: "صور حقيقية للمنتج بجودة عالية",
    order_label: "نموذج الطلب",
    order_title: "اطلب الآن واستلم حتى باب بيتك",
    order_desc: "املأ النموذج التالي وسنتواصل معك لتأكيد الطلب",
    form_model: "نوع الموديل",
    form_model_error: "يرجى اختيار الموديل",
    form_name: "الاسم الكامل",
    form_name_placeholder: "أدخل اسمك الكامل",
    form_phone: "رقم الهاتف",
    form_phone_placeholder: "مثال: 0555 00 00 00",
    form_wilaya: "ولاية التوصيل",
    form_wilaya_placeholder: "-- اختر الولاية --",
    price_product: "سعر المنتج:",
    price_delivery: "سعر التوصيل",
    price_undefined: "غير محدد",
    price_total: "المجموع الكلي",
    btn_submit: "تأكيد الطلب",
    feature_1_title: "توصيل سريع",
    feature_1_desc: "لجميع الولايات",
    feature_2_title: "جودة مضمونة",
    feature_2_desc: "منتجات أصلية 100%",
    feature_3_title: "دفع عند الاستلام",
    feature_3_desc: "لا تدفع حتى تستلم",
    feature_4_title: "دعم فني",
    feature_4_desc: "خدمة ما بعد البيع",
    footer_rights: "جميع الحقوق محفوظة.",
    modal_title: "تم تسجيل طلبك بنجاح! 🎉",
    modal_desc: "فريق AKKI DECOR راح يتواصل معكم لتأكيد الطلبية",
    modal_btn: "حسناً",
    currency: "د.ج",
    no_image: "بدون صورة",
    sending: "جاري الإرسال...",
    error_submit: "حدث خطأ أثناء إرسال الطلب، يرجى المحاولة لاحقاً.",
    form_delivery_type: "نوع التوصيل",
    delivery_home: "توصيل لباب المنزل",
    delivery_office: "توصيل للمكتب"
  },
  fr: {
    nav_home: "Accueil",
    nav_product: "Produit",
    nav_order: "Commander",
    hero_badge: "Produit exclusif de haute qualité",
    hero_btn_order: "Commander",
    hero_btn_view: "Voir le produit",
    gallery_label: "Galerie",
    gallery_title: "Découvrez notre produit de près",
    gallery_desc: "Vraies photos du produit en haute qualité",
    order_label: "Formulaire de commande",
    order_title: "Commandez maintenant et payez à la livraison",
    order_desc: "Remplissez le formulaire ci-dessous et nous vous contacterons",
    form_model: "Modèle",
    form_model_error: "Veuillez choisir un modèle",
    form_name: "Nom complet",
    form_name_placeholder: "Entrez votre nom complet",
    form_phone: "Numéro de téléphone",
    form_phone_placeholder: "Ex: 0555 00 00 00",
    form_wilaya: "Wilaya de livraison",
    form_wilaya_placeholder: "-- Choisissez la wilaya --",
    price_product: "Prix du produit:",
    price_delivery: "Prix de livraison",
    price_undefined: "Non défini",
    price_total: "Total",
    btn_submit: "Confirmer la commande",
    feature_1_title: "Livraison rapide",
    feature_1_desc: "Dans toutes les wilayas",
    feature_2_title: "Qualité garantie",
    feature_2_desc: "Produits 100% originaux",
    feature_3_title: "Paiement à la livraison",
    feature_3_desc: "Ne payez qu'à la réception",
    feature_4_title: "Support technique",
    feature_4_desc: "Service après-vente",
    footer_rights: "Tous droits réservés.",
    modal_title: "Commande enregistrée avec succès ! 🎉",
    modal_desc: "L'équipe AKKI DECOR vous contactera pour confirmer",
    modal_btn: "D'accord",
    currency: "DA",
    no_image: "Sans image",
    sending: "Envoi...",
    error_submit: "Une erreur s'est produite. Veuillez réessayer plus tard.",
    form_delivery_type: "Type de livraison",
    delivery_home: "Livraison à domicile",
    delivery_office: "Livraison au bureau"
  }
};

let currentLang = localStorage.getItem('site_lang') || 'ar';

function changeLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('site_lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.getElementById('lang-switcher').value = lang;
  applyTranslations();
  updatePriceDisplay();
}

function applyTranslations() {
  const dict = i18n[currentLang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) {
      el.setAttribute('placeholder', dict[key]);
    }
  });

  // Re-render strings inside JS
  const submitBtnSpan = document.querySelector('#submit-btn span[data-i18n="btn_submit"]');
  if (submitBtnSpan) submitBtnSpan.textContent = dict.btn_submit;
}

// Initial Call
document.addEventListener('DOMContentLoaded', () => {
  changeLanguage(currentLang);
});
