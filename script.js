
const $ = id => document.getElementById(id);
const qa = sel => Array.from(document.querySelectorAll(sel));

/* =========================
   Mobile Menu
   ========================= */
const mobileMenuButton = $('mobile-menu-button');
const mobileMenu = $('mobile-menu');

mobileMenuButton?.addEventListener('click', () => {
  mobileMenu.classList.toggle('hidden');
});

qa('#mobile-menu a').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.add('hidden');
  });
});

/* =========================
   Navbar scroll highlight
   ========================= */
const sections = document.querySelectorAll("section");
const navLinks = document.querySelectorAll(".nav-link");

window.addEventListener("scroll", () => {
  let current = "";
  sections.forEach(section => {
    if (scrollY >= section.offsetTop - 120) current = section.id;
  });
  navLinks.forEach(link => {
    link.classList.toggle("active", link.getAttribute("href") === `#${current}`);
  });
});

/* =========================
   Banner slider
   ========================= */
const banners = [
  { img: "https://i.ibb.co/8LB7MbWB/4fa015c8-f384-4c94-a076-dfeee9edeb9e-BD-1976-688-jpg-2200x2200q80-jpg.jpg  ", alt: "Offer" },
  { img: "https://i.ibb.co/HDVsp7bY/df9f69bf-0dc4-4a02-b2fe-bc39a6c7788a-BD-1976-688-jpg-2200x2200q80-jpg.jpg  ", alt: "Cleaning" },
  { img: "https://i.ibb.co/C3VJFWK0/f8c5af6b-66ea-451e-81e2-65352f228d97-BD-1976-688-jpg-2200x2200q80-jpg.jpg  ", alt: "Offer" }
];

const bannerContainer = $('banner-container');
banners.forEach((b, i) => {
  const slide = document.createElement('div');
  slide.className = `absolute inset-0 transition-opacity duration-700 ${i === 0 ? 'opacity-100' : 'opacity-0'} slide`;
  slide.innerHTML = `<img src="${b.img}" alt="${b.alt}" class="w-full h-full object-cover"/>`;
  bannerContainer.appendChild(slide);
});

let currentSlide = 0;
const slides = qa('.slide');

function showSlide(index) {
  slides.forEach((slide, i) => slide.style.opacity = i === index ? '1' : '0');
}

$('nextSlide')?.addEventListener('click', () => {
  currentSlide = (currentSlide + 1) % slides.length;
  showSlide(currentSlide);
});

$('prevSlide')?.addEventListener('click', () => {
  currentSlide = (currentSlide - 1 + slides.length) % slides.length;
  showSlide(currentSlide);
});

setInterval(() => {
  currentSlide = (currentSlide + 1) % slides.length;
  showSlide(currentSlide);
}, 5000);

/* =========================
   Products & Cart System
   ========================= */
const API_PRODUCTS = 'https://fakestoreapi.com/products  ';
let products = [];
let filteredProducts = [];
let cart = {};
let balance = 1000;

async function fetchProducts() {
  const res = await fetch(API_PRODUCTS);
  products = await res.json();
  products = products.map(p => ({
    id: p.id,
    title: p.title || 'No Title',
    price: parseFloat(p.price).toFixed(2) || '0.00',
    description: p.description || 'No Description',
    category: p.category || 'General',
    image: p.image || '',
    rating: p.rating || { rate: 0, count: 0 }
  }));
  filteredProducts = [...products];
  renderProducts(filteredProducts);
}

function renderProducts(list) {
  const grid = $('products-grid');
  if (!grid) return;

  grid.innerHTML = '';

  if (list.length === 0) {
    grid.innerHTML = '<p class="text-center col-span-full">No products found.</p>';
    return;
  }

  list.forEach(p => {
    const card = document.createElement('div');
    card.className = `bg-white rounded-lg shadow p-4 flex flex-col h-full hover:shadow-lg transition card-hover`;

    card.innerHTML = `
      <div class="h-40 flex items-center justify-center mb-3">
        <img src="${p.image}" alt="${p.title}" class="max-h-40 object-contain"/>
      </div>
      <h3 class="font-semibold text-sm mb-1 line-clamp-2">${p.title}</h3>
      <div class="text-rose-700 font-bold mb-2">${p.price} BDT</div>
      <div class="mb-3 text-xs text-slate-600">Rating: ${p.rating?.rate ?? '—'} (${p.rating?.count ?? 0})</div>
      <div class="mt-auto">
        <button data-id="${p.id}" class="add-to-cart w-full py-2 rounded bg-rose-600 text-white hover:bg-rose-700 transition">Add to Cart</button>
      </div>
    `;

    grid.appendChild(card);
  });

  grid.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-to-cart')) {
      const id = Number(e.target.dataset.id);
      if (!isNaN(id)) {
        addToCart(id);
      }
    }
  });
}

function applyFilters(search = '', sort = 'default') {
  filteredProducts = products.filter(p => p.title.toLowerCase().includes(search));

  if (sort === 'low') {
    filteredProducts.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  } else if (sort === 'high') {
    filteredProducts.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
  }

  renderProducts(filteredProducts);
}

$('search-input')?.addEventListener('input', e => applyFilters(e.target.value.toLowerCase(), $('sort-select')?.value || 'default'));
$('sort-select')?.addEventListener('change', e => applyFilters($('search-input')?.value.toLowerCase(), e.target.value));
$('clear-filters')?.addEventListener('click', () => {
  $('search-input').value = '';
  $('sort-select').value = 'default';
  applyFilters();
});

/* =========================
   Cart System
   ========================= */

function addToCart(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  if (cart[id]) {
    cart[id].qty++;
  } else {
    cart[id] = { product, qty: 1 };
  }
  updateCartDisplay();
  showNotification(`Added ${product.title} to cart!`);
}

function updateCartDisplay() {
  const totalItems = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
  const subtotal = Object.values(cart).reduce((sum, item) => sum + (parseFloat(item.product.price) * item.qty), 0).toFixed(2);
  const delivery = 50.00;
  const shipping = 30.00;
  const total = (parseFloat(subtotal) + delivery + shipping).toFixed(2);
  const cartCount = $('cart-count');
  if (cartCount) {
    cartCount.textContent = totalItems > 0 ? totalItems : '0'; 
  }

  
  $('balance-display').textContent = `${balance.toFixed(2)} BDT`;
  $('balance-in-cart').textContent = `${balance.toFixed(2)} BDT`;
  $('cart-subtotal').textContent = `${subtotal} BDT`;
  $('cart-delivery').textContent = `${delivery.toFixed(2)} BDT`;
  $('cart-shipping').textContent = `${shipping.toFixed(2)} BDT`;
  $('cart-total').textContent = `${total} BDT`;

  const cartItems = $('cart-items');
  if (cartItems) {
    cartItems.innerHTML = '';

    if (totalItems === 0) {
      cartItems.innerHTML = '<p class="text-center">Your cart is empty.</p>';
      return;
    }

 
    Object.values(cart).forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.className = 'flex justify-between items-center border-b pb-2';
      itemElement.innerHTML = `
        <div>
          <h4 class="font-medium">${item.product.title}</h4>
          <p class="text-sm text-slate-600">${item.qty} x ${item.product.price} BDT</p>
        </div>
        <div class="flex items-center gap-2">
          <button class="change-qty bg-gray-200 rounded px-2" data-id="${item.product.id}" data-action="dec">-</button>
          <span>${item.qty}</span>
          <button class="change-qty bg-gray-200 rounded px-2" data-id="${item.product.id}" data-action="inc">+</button>
          <button class="remove-item ml-2 text-red-600" data-id="${item.product.id}">Remove</button>
        </div>
      `;
      cartItems.appendChild(itemElement);
    });


    qa('.change-qty').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.target.dataset.id);
        const action = e.target.dataset.action;
        if (action === 'inc') {
          cart[id].qty++;
        } else if (action === 'dec' && cart[id].qty > 1) {
          cart[id].qty--;
        } else if (action === 'dec' && cart[id].qty === 1) {
          delete cart[id];
        }
        updateCartDisplay();
      });
    });

    qa('.remove-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.target.dataset.id);
        delete cart[id];
        updateCartDisplay();
        showNotification("Item removed from cart.");
      });
    });
  }
}

function showNotification(message) {
  const notification = $('notification');
  if (notification) {
    notification.textContent = message;
    notification.classList.remove('opacity-0');
    notification.classList.add('opacity-100');

    setTimeout(() => {
      notification.classList.remove('opacity-100');
      notification.classList.add('opacity-0');
    }, 3000);
  }
}

// Cart Sidebar Toggle
const cartBtn = $('cartBtn');
const closeCartBtn = $('close-cart');
const cartOverlay = $('cart-overlay');
const cartSidebar = $('cart-sidebar');

cartBtn?.addEventListener('click', () => {
  cartSidebar.classList.remove('translate-x-full');
  cartOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
});

closeCartBtn?.addEventListener('click', () => {
  cartSidebar.classList.add('translate-x-full');
  cartOverlay.classList.add('hidden');
  document.body.style.overflow = '';
});

cartOverlay?.addEventListener('click', () => {
  closeCartBtn.click();
});

// Add Money Button
const addMoneyBtn = $('add-money');
addMoneyBtn?.addEventListener('click', () => {
  balance += 1000;
  updateCartDisplay();
  showNotification("1000 BDT added to balance!");
});

// Apply Coupon Button (SMART10 code)
const applyCouponBtn = $('apply-coupon');
const couponInput = $('coupon-input');
const couponMsg = $('coupon-msg');

applyCouponBtn?.addEventListener('click', () => {
  const code = couponInput.value.trim();
  if (code === 'SMART10') { 
    const currentSubtotal = parseFloat($('cart-subtotal').textContent.replace(' BDT', ''));
    const discount = currentSubtotal * 0.10;
    const newSubtotal = currentSubtotal - discount;
    $('cart-subtotal').textContent = `${newSubtotal.toFixed(2)} BDT`;
    const delivery = 50.00;
    const shipping = 30.00;
    const total = (newSubtotal + delivery + shipping).toFixed(2);
    $('cart-total').textContent = `${total} BDT`;
    couponMsg.textContent = 'Coupon applied! 10% discount.';
    couponMsg.className = 'text-sm text-green-600 mt-1';
  } else {
    couponMsg.textContent = 'Invalid coupon code.';
    couponMsg.className = 'text-sm text-red-600 mt-1';
  }
  setTimeout(() => { couponMsg.textContent = ''; }, 3000);
});

// Checkout Button (placeholder logic)
const checkoutBtn = $('checkout-btn');
checkoutBtn?.addEventListener('click', () => {
  const total = parseFloat($('cart-total').textContent.replace(' BDT', ''));
  if (balance >= total) {
    balance -= total;
    cart = {};
    updateCartDisplay();
    closeCartBtn.click();
    showNotification("Checkout successful!");
  } else {
    showNotification("Insufficient balance!");
  }
});

/* =========================
Reviews Carousel
========================= */
const reviews = [
  { name: 'Aisha', comment: 'Fruits were very fresh and delivery was fast!', rating: 5, date: '2025-10-15' },
  { name: 'Rafi', comment: 'Quality is great — highly recommended.', rating: 4, date: '2025-09-22' },
  { name: 'Mina', comment: 'Nice packaging and timely delivery.', rating: 5, date: '2025-10-01' }
];

let currentReview = 0;
const reviewContainer = document.getElementById('reviews-container');
const nextBtn = document.getElementById('review-next');
const prevBtn = document.getElementById('review-prev');
let reviewInterval;

function renderReview(index) {
  const r = reviews[index];
  if (!reviewContainer) return;

  reviewContainer.innerHTML = `
    <div class="text-center max-w-3xl mx-auto">
      <div class="text-lg font-semibold mb-2">
        ${r.name} — <span class="text-yellow-500">${'★'.repeat(r.rating)}</span>
      </div>
      <div class="text-slate-700 italic">"${r.comment}"</div>
      <div class="text-xs text-slate-500 mt-2">${new Date(r.date).toLocaleDateString()}</div>
    </div>
  `;
}

function showReview(delta) {
  currentReview = (currentReview + delta + reviews.length) % reviews.length;
  renderReview(currentReview);
}

function initReviews() {
  renderReview(currentReview);

  nextBtn?.addEventListener('click', () => showReview(1));
  prevBtn?.addEventListener('click', () => showReview(-1));

  reviewInterval = setInterval(() => showReview(1), 5000);

  reviewContainer?.addEventListener('mouseenter', () => clearInterval(reviewInterval));
  reviewContainer?.addEventListener('mouseleave', () => {
    reviewInterval = setInterval(() => showReview(1), 5000);
  });
}

const contactForm = document.getElementById('contact-form');
const successMsg = document.getElementById('contact-success');

contactForm.addEventListener('submit', e => {
  e.preventDefault();
  successMsg.classList.remove('hidden');
  contactForm.reset();

  setTimeout(() => {
    successMsg.classList.add('hidden');
  }, 2000);
});

document.addEventListener('DOMContentLoaded', initReviews);

/* =========================
   Initialize
   ========================= */
document.addEventListener('DOMContentLoaded', () => {
  fetchProducts();
});
