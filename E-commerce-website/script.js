// script.js
// Single script for: Add to Cart (shop), cart rendering (cart page), filters (shop)
// Uses localStorage key: "cartItems"

(() => {
  const STORAGE_KEY = "cartItems";

  /* -------------------------
     Utility helpers
  -------------------------*/
  function parsePrice(priceText) {
    if (!priceText) return 0;
    // Remove currency symbols & commas, e.g. "₹1,299" -> 1299
    return Number(priceText.replace(/[^\d.]/g, "")) || 0;
  }

  function slugify(text) {
    return text.toString().toLowerCase().trim()
      .replace(/['"]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");
  }

  // category detection based on product title
  function detectCategory(title = "") {
    const t = title.toLowerCase();

    // women keywords
    const womenKeys = ["women", "woman", "women's", "women s", "female", "dress", "saree", "kurti", "top", "skirt", "maxi", "floral", "co-ord", "coord", "maxi dress"];
    // men keywords
    const menKeys = ["men", "man", "men's", "men s", "male", "shirt", "tee", "t-shirt", "trouser", "jeans", "jacket", "hoodie", "hoodies", "sweatshirt"];
    // unisex keywords
    const unisexKeys = ["unisex", "sneaker", "sneakers", "hoodie", "coat", "jacket", "tee", "tshirt", "t-shirt"];

    for (let k of menKeys) if (t.includes(k)) return "men";
    for (let k of womenKeys) if (t.includes(k)) return "women";
    for (let k of unisexKeys) if (t.includes(k)) return "unisex";

    // fallback: if contains "men"/"women" may have been detected; else default to "all"
    return "all";
  }

  function readCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function writeCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    updateCartBadge();
  }

  function updateCartBadge() {
    const cart = readCart();
    const count = cart.reduce((s, i) => s + (i.qty || 0), 0);
    // create or update .cart-count in navbar (a small badge)
    let badge = document.querySelector(".cart-count");
    if (!badge) {
      // attempt to find nav container to append badge near Cart link
      const cartLink = document.querySelector('.nav-links a[href*="cart"]') || document.querySelector('.nav-links li:last-child');
      if (cartLink) {
        badge = document.createElement("span");
        badge.className = "cart-count";
        badge.style.cssText = `
          display:inline-block;
          min-width:20px;
          padding:2px 6px;
          font-size:12px;
          border-radius:12px;
          background: var(--color-accent, #A7727D);
          color:white;
          margin-left:8px;
          vertical-align:middle;
        `;
        cartLink.appendChild(badge);
      }
    }
    if (badge) badge.textContent = count;
  }

  /* -------------------------
     Add to Cart (shop page)
  -------------------------*/
  function initAddToCart() {
    const addBtns = document.querySelectorAll(".btn-add");
    if (!addBtns || addBtns.length === 0) return;

    addBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        const card = e.target.closest(".product-card");
        if (!card) return;

        const nameEl = card.querySelector("h3");
        const priceEl = card.querySelector(".price");
        const imgEl = card.querySelector("img");

        const name = nameEl ? nameEl.innerText.trim() : "Product";
        const priceText = priceEl ? priceEl.innerText.trim() : "0";
        const price = parsePrice(priceText);
        const img = imgEl ? imgEl.src : "";

        // detect category from title
        const category = detectCategory(name);

        const id = slugify(name);

        let cart = readCart();

        const existingIndex = cart.findIndex(it => it.id === id);
        if (existingIndex > -1) {
          cart[existingIndex].qty = (cart[existingIndex].qty || 1) + 1;
        } else {
          cart.push({
            id,
            name,
            price,
            priceText, // keep formatted price
            img,
            qty: 1,
            category
          });
        }

        writeCart(cart);
        // small toast-like feedback (non-blocking)
        showTempToast("Added to cart ✓");
      });
    });
  }

  /* -------------------------
     Small Toast
  -------------------------*/
  function showTempToast(message) {
    let t = document.querySelector(".trendora-toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "trendora-toast";
      t.style.cssText = `
        position: fixed;
        right: 20px;
        bottom: 30px;
        background: rgba(71,51,55,0.95);
        color: white;
        padding: 10px 14px;
        border-radius: 10px;
        z-index: 9999;
        font-family: var(--font-primary, sans-serif);
        box-shadow: 0 6px 18px rgba(0,0,0,0.15);
      `;
      document.body.appendChild(t);
    }
    t.textContent = message;
    t.style.opacity = "1";
    setTimeout(() => {
      if (t) t.style.opacity = "0";
    }, 1400);
  }

  /* -------------------------
     Cart Page Rendering (cart.html)
  -------------------------*/
  function renderCartPage() {
    const cartContainer = document.querySelector(".cart-items");
    if (!cartContainer) return; // not on cart page

    let cart = readCart();
    cartContainer.innerHTML = "";

    if (cart.length === 0) {
      cartContainer.innerHTML = `<p class="empty-cart" style="color:var(--color-light-text); text-align:center; padding:20px;">Your cart is empty.</p>`;
      updateOrderSummary(); // ensure summary updates
      return;
    }

    cart.forEach((item, idx) => {
      const itemHTML = document.createElement("div");
      itemHTML.className = "cart-item";
      itemHTML.innerHTML = `
        <img src="${item.img}" alt="${escapeHtml(item.name)}" class="cart-img">
        <div class="item-details">
          <h3>${escapeHtml(item.name)}</h3>
          <p class="item-price">₹${Number(item.price).toLocaleString()}</p>

          <div class="quantity">
            <button class="qty-btn" data-index="${idx}" data-change="-1">-</button>
            <span class="qty-value">${item.qty}</span>
            <button class="qty-btn" data-index="${idx}" data-change="1">+</button>
          </div>

          <button class="remove-btn" data-index="${idx}">Remove</button>
        </div>
      `;
      cartContainer.appendChild(itemHTML);
    });

    // attach qty and remove listeners
    cartContainer.querySelectorAll(".qty-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idx = Number(btn.dataset.index);
        const change = Number(btn.dataset.change);
        changeQty(idx, change);
      });
    });

    cartContainer.querySelectorAll(".remove-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idx = Number(btn.dataset.index);
        removeFromCart(idx);
      });
    });

    updateOrderSummary();
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"'`=\/]/g, function (s) {
      return ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;'
      })[s];
    });
  }

  function changeQty(index, delta) {
    const cart = readCart();
    if (!cart[index]) return;
    cart[index].qty = (cart[index].qty || 1) + delta;
    if (cart[index].qty < 1) cart[index].qty = 1;
    writeCart(cart);
    renderCartPage();
  }

  function removeFromCart(index) {
    const cart = readCart();
    if (!cart[index]) return;
    cart.splice(index, 1);
    writeCart(cart);
    renderCartPage();
  }

  function updateOrderSummary() {
    // update summary fields if present (subtotal, shipping, total)
    const summary = document.querySelector(".cart-summary");
    if (!summary) return;

    const cart = readCart();
    const subtotal = cart.reduce((s, it) => s + (Number(it.price) * (it.qty || 1)), 0);
    const shipping = subtotal > 0 ? 49 : 0;
    const total = subtotal + shipping;

    const subtotalEl = summary.querySelector(".summary-row.subtotal span:last-child");
    const shippingEl = summary.querySelector(".summary-row.shipping span:last-child");
    const totalEl = summary.querySelector(".summary-row.total span:last-child");

    // If custom structure not present, try to fill generic rows
    if (!subtotalEl) {
      // create or update default structure
      summary.innerHTML = `
        <h3>Order Summary</h3>
        <div class="summary-row subtotal"><span>Subtotal</span><span>₹${subtotal.toLocaleString()}</span></div>
        <div class="summary-row shipping"><span>Shipping</span><span>₹${shipping.toLocaleString()}</span></div>
        <div class="summary-row total"><span>Total</span><span>₹${total.toLocaleString()}</span></div>
        <button class="checkout-btn">Proceed to Checkout</button>
      `;
      return;
    }

    subtotalEl.textContent = `₹${subtotal.toLocaleString()}`;
    shippingEl.textContent = `₹${shipping.toLocaleString()}`;
    totalEl.textContent = `₹${total.toLocaleString()}`;
  }

  /* -------------------------
     Filters (shop page)
  -------------------------*/
  function initFilters() {
    const filterToggle = document.querySelector(".filter-btn");
    const filterMenu = document.querySelector(".filter-dropdown");
    const filterOptions = document.querySelectorAll(".filter-option");
    const productCards = document.querySelectorAll(".product-card");

    if (!filterToggle || !filterMenu || filterOptions.length === 0 || productCards.length === 0) return;

    // toggle dropdown
    filterToggle.addEventListener("click", (e) => {
      filterMenu.classList.toggle("hidden");
    });

    // clicking outside closes dropdown
    document.addEventListener("click", (e) => {
      if (!filterMenu.contains(e.target) && !filterToggle.contains(e.target)) {
        filterMenu.classList.add("hidden");
      }
    });

    filterOptions.forEach(opt => {
      opt.addEventListener("click", () => {
        const category = opt.dataset.category || opt.textContent.trim().toLowerCase();

        // UI active
        filterOptions.forEach(o => o.classList.remove("active"));
        opt.classList.add("active");

        // show/hide product cards
        productCards.forEach(card => {
          const nameEl = card.querySelector("h3");
          const title = nameEl ? nameEl.innerText.trim() : "";
          const cat = detectCategory(title);

          if (category === "all") {
            card.style.display = "";
          } else if (category === "men") {
            if (cat === "men") card.style.display = "";
            else card.style.display = "none";
          } else if (category === "women") {
            if (cat === "women") card.style.display = "";
            else card.style.display = "none";
          } else {
            card.style.display = "";
          }
        });

        // hide dropdown after select
        filterMenu.classList.add("hidden");
      });
    });
  }

  /* -------------------------
     Init on DOM load
  -------------------------*/
  document.addEventListener("DOMContentLoaded", () => {
    // initialize features that run on shop page
    initAddToCart();
    initFilters();

    // update navbar cart badge
    updateCartBadge();

    // render cart page (if present)
    renderCartPage();
  });

})();
