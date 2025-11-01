/* =========================
   Configuration & State
   ========================= */
const API_PRODUCTS = 'https://fakestoreapi.com/products';
const STARTING_BALANCE = 1000; // BDT
const DELIVERY_CHARGE = 50;
const SHIPPING_COST = 30;
const COUPON_CODE = 'SMART10';
const COUPON_PERCENT = 10;

let products = [];
let filteredProducts = [];
let cart = {}; // { productId: { product, qty } }
let balance = 0;
let couponApplied = false;

/* =========================
   Helpers - DOM getters
   ========================= */
const $ = (id) => document.getElementById(id);
const q = (sel) => document.querySelector(sel);
const qa = (sel) => Array.from(document.querySelectorAll(sel));

/* =========================
   Boot
   ========================= */
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  loadBalance();
  fetchProducts()
    .then(() => {
      filteredProducts = products.slice();
      renderProducts(filteredProducts);
      loadCartFromLocal();
      renderCartItems();
      renderCartSummary();
      updateCartCount();
    });
  initBanner();
  initReviews();
  setCurrentYear();
  highlightOnScroll();
});

/* =========================
   UI Initialization
   ========================= */
function initUI() {
  // Mobile menu toggle
  $('mobile-menu-button')?.addEventListener('click', () => {
    $('mobile-menu')?.classList.toggle('hidden');
  });

  // Cart open/close
  $('cart-button')?.addEventListener('click', openCart);
  $('close-cart')?.addEventListener('click', closeCartSidebar);
  $('cart-overlay')?.addEventListener('click', closeCartSidebar);

  // Add money
  $('add-money')?.addEventListener('click', () => {
    balance = round2(balance + STARTING_BALANCE);
    saveBalance();
    renderBalance();
    renderCartSummary();
    showNotification(`Balance increased by ${STARTING_BALANCE} BDT`);
  });

  // Search / sort / clear
  $('search-input')?.addEventListener('input', (e) => {
    applyFilters(e.target.value.trim().toLowerCase(), $('sort-select')?.value || 'default');
  });
  $('sort-select')?.addEventListener('change', (e) => {
    applyFilters($('search-input')?.value.trim().toLowerCase(), e.target.value);
  });
  $('clear-filters')?.addEventListener('click', () => {
    if ($('search-input')) $('search-input').value = '';
    if ($('sort-select')) $('sort-select').value = 'default';
    applyFilters('', 'default');
  });

  // Coupon
  $('apply-coupon')?.addEventListener('click', () => {
    const code = ($('coupon-input')?.value || '').trim().toUpperCase();
    const msgEl = $('coupon-msg');
    if (!code) {
      if (msgEl) { msgEl.textContent = 'Enter a coupon code'; msgEl.classList.remove('text-green-600'); msgEl.classList.add('text-red-600'); }
      couponApplied = false;
      return;
    }
    if (code === COUPON_CODE) {
      couponApplied = true;
      if (msgEl) { msgEl.textContent = `Applied ${COUPON_CODE} (${COUPON_PERCENT}% off)`; msgEl.classList.remove('text-red-600'); msgEl.classList.add('text-green-600'); }
    } else {
      couponApplied = false;
      if (msgEl) { msgEl.textContent = 'Invalid coupon'; msgEl.classList.remove('text-green-600'); msgEl.classList.add('text-red-600'); }
    }
    renderCartSummary();
  });

  // Checkout
  $('checkout-btn')?.addEventListener('click', handleCheckout);

  // Back to top
  $('back-to-top')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // Contact form
  $('contact-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleContactSubmit();
  });

  // Newsletter
  $('newsletter-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleNewsletterSubscribe();
  });
}

/* =========================
   Balance (localStorage)
   ========================= */
function loadBalance() {
  const saved = localStorage.getItem('pran_balance');
  if (saved !== null) balance = Number(saved);
  else {
    balance = STARTING_BALANCE;
    saveBalance();
  }
  renderBalance();
}
function saveBalance() {
  localStorage.setItem('pran_balance', String(balance));
}
function renderBalance() {
  if ($('balance-display')) $('balance-display').textContent = `${formatPrice(balance)} BDT`;
  if ($('balance-in-cart')) $('balance-in-cart').textContent = `${formatPrice(balance)} BDT`;
}

/* =========================
   Fetch products
   ========================= */
async function fetchProducts() {
  try {
    const res = await fetch(API_PRODUCTS);
    if (!res.ok) throw new Error('Network error');
    products = await res.json();
  } catch (err) {
    console.warn('Product fetch failed — using fallback', err);
    products = fallbackProducts();
  }
}

/* =========================
   Render products
   ========================= */
function renderProducts(list) {
  const grid = $('products-grid');
  if (!grid) return;
  grid.innerHTML = '';
  list.forEach(p => {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow p-4 flex flex-col card-hover';
    card.innerHTML = `
      <div class="h-40 flex items-center justify-center mb-3">
        <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" class="max-h-40 object-contain"/>
      </div>
      <h3 class="font-semibold text-sm mb-1">${escapeHtml(p.title)}</h3>
      <div class="text-rose-700 font-bold mb-2">${formatPrice(p.price)} BDT</div>
      <div class="mb-3 text-xs text-slate-600">Rating: ${p.rating?.rate ?? '—'} (${p.rating?.count ?? 0})</div>
      <div class="mt-auto">
        <button data-id="${p.id}" class="add-to-cart w-full py-2 rounded bg-rose-600 text-white hover:bg-rose-700">Add to Cart</button>
      </div>
    `;
    grid.appendChild(card);
  });

  qa('.add-to-cart').forEach(btn => btn.addEventListener('click', (e) => {
    const id = Number(e.currentTarget.dataset.id);
    addToCart(id);
  }));
}

/* =========================
   Cart operations
   ========================= */
function addToCart(productId, qty = 1) {
  const product = products.find(p => p.id === productId);
  if (!product) return showNotification('Product not found', true);

  const currentQty = cart[productId]?.qty || 0;
  const nextQty = currentQty + qty;

  // Prospective total
  const tempCart = JSON.parse(JSON.stringify(cart));
  tempCart[productId] = { product, qty: nextQty };
  const totals = calculateTotals(tempCart);

  if (totals.final > balance) {
    showNotification('Cannot add — would exceed balance', true);
    return;
  }

  cart[productId] = { product, qty: nextQty };
  saveCart();
  renderCartItems();
  renderCartSummary();
  updateCartCount();
  animateCartBadge();
  showNotification('Added to cart');
}

function removeFromCart(productId) {
  delete cart[productId];
  saveCart();
  renderCartItems();
  renderCartSummary();
  updateCartCount();
}

function changeQty(productId, qty) {
  if (!cart[productId]) return;
  if (qty <= 0) { removeFromCart(productId); return; }
  cart[productId].qty = qty;

  const totals = calculateTotals(cart);
  if (totals.final > balance) {
    cart[productId].qty = Math.max(1, cart[productId].qty - 1); // revert a bit
    showNotification('Quantity exceeds balance — reverted', true);
  }

  saveCart();
  renderCartItems();
  renderCartSummary();
  updateCartCount();
}

function renderCartItems() {
  const container = $('cart-items');
  if (!container) return;
  container.innerHTML = '';
  const items = Object.values(cart);
  if (items.length === 0) {
    container.innerHTML = `<div class="text-slate-600">Your cart is empty.</div>`;
    return;
  }

  items.forEach(({ product, qty }) => {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-3';
    row.innerHTML = `
      <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" class="w-16 h-16 object-contain rounded" />
      <div class="flex-1">
        <div class="font-semibold text-sm">${escapeHtml(product.title)}</div>
        <div class="text-xs text-slate-600">Price: ${formatPrice(product.price)} BDT</div>
        <div class="flex items-center gap-2 mt-2">
          <button data-id="${product.id}" class="qty-decr px-2 py-1 rounded border">-</button>
          <input data-id="${product.id}" class="qty-input w-12 text-center border rounded px-1 py-1" value="${qty}" />
          <button data-id="${product.id}" class="qty-incr px-2 py-1 rounded border">+</button>
          <button data-id="${product.id}" class="ml-auto text-red-600 remove-item text-xs">Remove</button>
        </div>
      </div>
    `;
    container.appendChild(row);
  });

  // wire controls
  qa('.remove-item').forEach(b => b.addEventListener('click', (e) => {
    const id = Number(e.currentTarget.dataset.id);
    removeFromCart(id);
  }));
  qa('.qty-decr').forEach(b => b.addEventListener('click', (e) => {
    const id = Number(e.currentTarget.dataset.id);
    const cur = cart[id]?.qty || 1;
    changeQty(id, cur - 1);
  }));
  qa('.qty-incr').forEach(b => b.addEventListener('click', (e) => {
    const id = Number(e.currentTarget.dataset.id);
    const cur = cart[id]?.qty || 0;
    changeQty(id, cur + 1);
  }));
  qa('.qty-input').forEach(inp => inp.addEventListener('change', (e) => {
    const id = Number(e.currentTarget.dataset.id);
    const val = parseInt(e.currentTarget.value) || 0;
    changeQty(id, val);
  }));
}

/* =========================
   Totals & summary
   ========================= */
function calculateTotals(cartObj) {
  let subtotal = 0;
  Object.values(cartObj).forEach(({ product, qty }) => {
    subtotal += Number(product.price) * Number(qty);
  });

  // treat cart as empty if no keys or subtotal is 0
  const hasItems = Object.keys(cartObj).length > 0 && subtotal > 0;

  const delivery = hasItems ? DELIVERY_CHARGE : 0;
  const shipping = hasItems ? SHIPPING_COST : 0;

  const discount = couponApplied ? (subtotal * COUPON_PERCENT) / 100 : 0;
  const final = round2(subtotal + delivery + shipping - discount);

  return {
    subtotal: round2(subtotal),
    delivery,
    shipping,
    discount: round2(discount),
    final
  };

}

function renderCartSummary() {
  const totals = calculateTotals(cart);
  if ($('cart-subtotal')) $('cart-subtotal').textContent = `${formatPrice(totals.subtotal)} BDT`;
  if ($('cart-delivery')) $('cart-delivery').textContent = `${formatPrice(totals.delivery)} BDT`;
  if ($('cart-shipping')) $('cart-shipping').textContent = `${formatPrice(totals.shipping)} BDT`;
  if ($('cart-total')) $('cart-total').textContent = `${formatPrice(totals.final)} BDT`;
  if ($('balance-in-cart')) $('balance-in-cart').textContent = `${formatPrice(balance)} BDT`;

  const checkoutBtn = $('checkout-btn');
  if (checkoutBtn) {
    if (totals.final > balance) {
      checkoutBtn.disabled = true;
      checkoutBtn.classList.add('opacity-60', 'cursor-not-allowed');
    } else {
      checkoutBtn.disabled = false;
      checkoutBtn.classList.remove('opacity-60', 'cursor-not-allowed');
    }
  }
}

/* =========================
   Checkout
   ========================= */
function handleCheckout() {
  const totals = calculateTotals(cart);
  if (totals.final <= 0) return showNotification('Cart is empty', true);
  if (totals.final > balance) return showNotification('Insufficient balance', true);

  balance = round2(balance - totals.final);
  saveBalance();
  cart = {};
  couponApplied = false;
  if ($('coupon-input')) $('coupon-input').value = '';
  if ($('coupon-msg')) $('coupon-msg').textContent = '';
  saveCart();
  renderCartItems();
  renderCartSummary();
  updateCartCount();
  closeCartSidebar();
  renderBalance();
  showNotification('Purchase successful — thank you!');
}

/* =========================
   Cart persistence
   ========================= */
function saveCart() {
  try {
    const payload = {};
    Object.keys(cart).forEach(k => {
      payload[k] = {
        qty: cart[k].qty,
        title: cart[k].product.title,
        price: cart[k].product.price,
        image: cart[k].product.image
      };
    });
    localStorage.setItem('pran_cart', JSON.stringify(payload));
  } catch (err) { console.warn('Failed to save cart', err); }
}

function loadCartFromLocal() {
  try {
    const raw = localStorage.getItem('pran_cart');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    cart = {};
    Object.keys(parsed).forEach(k => {
      const pid = Number(k);
      // find latest product object to preserve price/image if API loaded
      const prod = products.find(p => p.id === pid) || { id: pid, title: parsed[k].title, price: parsed[k].price, image: parsed[k].image };
      cart[pid] = { product: prod, qty: parsed[k].qty };
    });
  } catch (err) { console.warn('Failed to load cart', err); }
}

/* =========================
   Banner slider
   ========================= */
const banners = [
  { img: 'https://i.ibb.co.com/8LB7MbWB/4fa015c8-f384-4c94-a076-dfeee9edeb9e-BD-1976-688-jpg-2200x2200q80-jpg.jpg', alt: 'offer' },
  { img: 'https://i.ibb.co.com/HDVsp7bY/df9f69bf-0dc4-4a02-b2fe-bc39a6c7788a-BD-1976-688-jpg-2200x2200q80-jpg.jpg', alt: 'cleaning' },
  { img: 'https://i.ibb.co.com/C3VJFWK0/f8c5af6b-66ea-451e-81e2-65352f228d97-BD-1976-688-jpg-2200x2200q80-jpg.jpg', alt: 'offer' }
];
let currentBanner = 0;
let bannerInterval = null;
function initBanner() {
  const container = $('banner-container');
  if (!container) return;
  container.innerHTML = banners.map((b, i) => `
    <div class="absolute inset-0 transition-opacity duration-700 ${i===0?'opacity-100':'opacity-0'} banner-slide">
      <img src="${b.img}" alt="${b.alt}" class="w-full h-full object-cover"/>
      <div class="absolute inset-0 bg-black/10"></div>
    </div>
  `).join('');
  $('banner-prev')?.addEventListener('click', () => changeBanner(-1));
  $('banner-next')?.addEventListener('click', () => changeBanner(1));
  bannerInterval = setInterval(() => changeBanner(1), 2000);
  // pause on hover
  container.addEventListener('mouseenter', () => clearInterval(bannerInterval));
  container.addEventListener('mouseleave', () => bannerInterval = setInterval(() => changeBanner(1), 2000));
}
function changeBanner(delta) {
  const slides = qa('.banner-slide');
  if (!slides.length) return;
  slides.forEach(s => { s.classList.remove('opacity-100'); s.classList.add('opacity-0'); });
  currentBanner = (currentBanner + delta + slides.length) % slides.length;
  slides[currentBanner].classList.remove('opacity-0');
  slides[currentBanner].classList.add('opacity-100');
}

/* =========================
   Reviews carousel
   ========================= */
const reviews = [
  { name: 'Aisha', comment: 'Fruits were very fresh and delivery fast!', rating: 5, date: '2025-10-15' },
  { name: 'Rafi', comment: 'Quality is great — recommended.', rating: 4, date: '2025-09-22' },
  { name: 'Mina', comment: 'Nice packaging.', rating: 5, date: '2025-10-01' }
];
let currentReview = 0;
let reviewInterval = null;
function initReviews() {
  renderReview(currentReview);
  $('review-next')?.addEventListener('click', () => showReview(1));
  $('review-prev')?.addEventListener('click', () => showReview(-1));
  reviewInterval = setInterval(() => showReview(1), 2000);
}
function renderReview(i) {
  const r = reviews[i];
  const c = $('reviews-container');
  if (!c) return;
  c.innerHTML = `
    <div class="text-center max-w-3xl">
      <div class="text-lg font-semibold mb-2">${escapeHtml(r.name)} — <span class="text-yellow-500">${'★'.repeat(r.rating)}</span></div>
      <div class="text-slate-700 italic">"${escapeHtml(r.comment)}"</div>
      <div class="text-xs text-slate-500 mt-2">${new Date(r.date).toLocaleDateString()}</div>
    </div>
  `;
}
function showReview(delta) {
  clearInterval(reviewInterval);
  currentReview = (currentReview + delta + reviews.length) % reviews.length;
  renderReview(currentReview);
  reviewInterval = setInterval(() => showReview(1), 2000);
}

/* =========================
   Contact form
   ========================= */
function handleContactSubmit() {
  const name = ($('contact-name')?.value || '').trim();
  const email = ($('contact-email')?.value || '').trim();
  const msg = ($('contact-message')?.value || '').trim();
  if (!name || !email || !msg) {
    showNotification('Please fill all contact fields', true);
    return;
  }
  if (!validateEmail(email)) { showNotification('Enter a valid email', true); return; }

  // mock send
  if ($('contact-form')) $('contact-form').reset();
  if ($('contact-success')) { $('contact-success').classList.remove('hidden'); setTimeout(()=> $('contact-success').classList.add('hidden'), 3000); }
  if ($('contact-thanks')) { $('contact-thanks').classList.remove('hidden'); setTimeout(()=> $('contact-thanks').classList.add('hidden'), 3000); }
  showNotification(`Thanks ${name}, we'll contact you soon!`);
}

/* =========================
   Newsletter
   ========================= */
function handleNewsletterSubscribe() {
  const email = ($('newsletter-email')?.value || '').trim();
  if (!email || !validateEmail(email)) {
    showNotification('Enter a valid email', true);
    return;
  }
  // Save to localStorage (list)
  try {
    const key = 'pran_newslist';
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    if (!list.includes(email)) {
      list.push(email);
      localStorage.setItem(key, JSON.stringify(list));
    }
  } catch (e) { console.warn('newsletter save failed', e); }

  if ($('newsletter-form')) $('newsletter-form').reset();
  if ($('newsletter-msg')) { $('newsletter-msg').classList.remove('hidden'); setTimeout(()=> $('newsletter-msg').classList.add('hidden'), 3000); }
  showNotification('Subscribed — thank you!');
}

/* =========================
   Small UI helpers
   ========================= */
function openCart() {
  const sidebar = $('cart-sidebar');
  const overlay = $('cart-overlay');
  if (!sidebar || !overlay) {
    console.warn('Cart elements missing');
    return;
  }
  sidebar.classList.remove('translate-x-full');
  overlay.classList.remove('hidden');
  renderCartItems();
  renderCartSummary();
}
function closeCartSidebar() {
  $('cart-sidebar')?.classList.add('translate-x-full');
  $('cart-overlay')?.classList.add('hidden');
}
function updateCartCount() {
  const count = Object.values(cart).reduce((s, e) => s + (e.qty || 0), 0);
  if ($('cart-count')) {
    $('cart-count').textContent = String(count);
    if (count > 0) $('cart-count').classList.add('bg-red-500');
    else $('cart-count').classList.remove('bg-red-500');
  }
}
function animateCartBadge() {
  const el = $('cart-count');
  if (!el) return;
  el.classList.add('animate-bounce');
  setTimeout(() => el.classList.remove('animate-bounce'), 700);
}
function showNotification(text, isError = false, duration = 1600) {
  const el = $('notification');
  if (!el) return;
  el.textContent = text;
  el.style.opacity = '1';
  if (isError) {
    el.classList.remove('bg-rose-600'); el.classList.add('bg-red-600');
  } else {
    el.classList.remove('bg-red-600'); el.classList.add('bg-rose-600');
  }
  setTimeout(() => { el.style.opacity = '0'; }, duration);
}
function setCurrentYear() { const el = $('current-year'); if (el) el.textContent = new Date().getFullYear(); }
function validateEmail(e) { return /^\S+@\S+\.\S+$/.test(e); }
function escapeHtml(s) { if (!s) return ''; return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function round2(n) { return Math.round(Number(n) * 100) / 100; }
function formatPrice(n) { return Number(n).toFixed(2).replace(/\.00$/, ''); }

/* =========================
   Filters / Sort
   ========================= */
function applyFilters(q = '', sort = 'default') {
  let list = products.slice();
  if (q) list = list.filter(p => (p.title || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q));
  if (sort === 'low') list.sort((a, b) => a.price - b.price);
  if (sort === 'high') list.sort((a, b) => b.price - a.price);
  filteredProducts = list;
  renderProducts(filteredProducts);
}

/* =========================
   Nav highlight on scroll
   ========================= */
function highlightOnScroll() {
  const sections = Array.from(document.querySelectorAll('main section[id]'));
  const navLinks = qa('.nav-link');
  if (!sections.length || !navLinks.length) return;
  const handler = () => {
    const top = window.scrollY + 140;
    let current = sections[0].id;
    for (const s of sections) if (s.offsetTop <= top) current = s.id;
    navLinks.forEach(a => {
      const href = (a.getAttribute('href') || '').replace('#','');
      if (href === current) a.classList.add('bg-rose-600','text-white'); else a.classList.remove('bg-rose-600','text-white');
    });
  };
  window.addEventListener('scroll', handler);
  handler();
}

