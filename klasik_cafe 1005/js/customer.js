"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const orderItems = document.getElementById("customer-order-items");
  const orderTotal = document.getElementById("customer-order-total");
  const cartBadge = document.getElementById("cart-count-badge");
  const specialRequestInput = document.getElementById("customer-special-request");
  const placeOrderButton = document.getElementById("customer-place-order");
  const orderHistory = document.getElementById("customer-order-history");
  const starButtons = document.querySelectorAll(".customer-star");
  const reviewRatingInput = document.getElementById("customer-review-rating");
  const reviewComment = document.getElementById("customer-review-comment");
  const reviewMessage = document.getElementById("customer-review-message");
  const submitReviewButton = document.getElementById("customer-submit-review");
  const reviewList = document.getElementById("customer-review-list");
  const suggestionSubject = document.getElementById("customer-suggestion-subject");
  const suggestionInput = document.getElementById("customer-suggestion-message");
  const submitSuggestionButton = document.getElementById("customer-submit-suggestion");
  const suggestionHistory = document.getElementById("customer-suggestion-history");
  const suggestionStatus = document.getElementById("customer-suggestion-status");
  const modal = document.getElementById("customer-customization-modal");
  const modalClose = document.querySelector(".customer-modal-close");
  const modalAddButton = document.getElementById("customer-add-to-order");
  const modalTotal = document.getElementById("customer-modal-total");
  const modalQty = document.getElementById("customer-modal-qty");

  const orderStorageKey = "klasikCafeCustomerCart";
  const orderHistoryKey = "klasikCafeCustomerOrders";
  const reviewsKey = "klasikCafeCustomerReviews";
  const suggestionsKey = "klasikCafeCustomerSuggestions";

  let activeProduct = null;
  let activeQuantity = 1;

  function loadData(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function money(value) {
    return `₱${Number(value).toLocaleString("en-US")}`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function getCart() {
    return loadData(orderStorageKey, []);
  }

  function setCart(items) {
    saveData(orderStorageKey, items);
  }

  function getOrders() {
    return loadData(orderHistoryKey, [
      {
        id: 1001,
        date: "2026-10-02",
        items: [{ name: "Classic Latte", quantity: 2, customizations: "Large • Oat • 25% • No Ice", addOns: ["Whipped Cream"], specialRequest: "Extra hot." }],
        total: 280,
        status: "Ready"
      },
      {
        id: 1002,
        date: "2026-10-02",
        items: [{ name: "Iced Spanish Latte", quantity: 1, customizations: "Medium • Regular • 50% • Less Ice", addOns: ["Extra Shot"], specialRequest: "Less sugar please." }],
        total: 180,
        status: "Preparing"
      }
    ]);
  }

  function setOrders(items) {
    saveData(orderHistoryKey, items);
  }

  function getReviews() {
    return loadData(reviewsKey, [
      { id: 1, customer: "Guest", rating: 5, comment: "The coffee was smooth and the staff were kind.", date: "2026-10-01" }
    ]);
  }

  function saveReviews(items) {
    saveData(reviewsKey, items);
  }

  function getSuggestions() {
    return loadData(suggestionsKey, [
      { id: 1, subject: "More indoor seating", suggestion: "It would be nice to have more quiet corners for studying.", date: "2026-10-01" }
    ]);
  }

  function saveSuggestions(items) {
    saveData(suggestionsKey, items);
  }

  async function loadSupabaseAddons() {
    const helper = window.KLASIK_SUPABASE;
    const addonContainer = document.querySelector(".customer-option-stack");
    if (!helper?.isConfigured || !addonContainer) return;

    addonContainer.innerHTML = "<span>Loading add-ons...</span>";
    const { data: addons, error } = await helper.getAddons();
    if (error) {
      console.error(error);
      addonContainer.innerHTML = `<span role="alert">Add-ons could not be loaded: ${helper.safeError(error)}</span>`;
      return;
    }

    const availableAddons = addons.filter((addon) => addon.available);
    if (!availableAddons.length) {
      addonContainer.innerHTML = "<span>No add-ons are currently available.</span>";
      return;
    }

    addonContainer.innerHTML = availableAddons.map((addon) => `
      <label>
        <input type="checkbox" name="custom-addon" data-addon-id="${escapeHtml(addon.id)}" data-price="${Number(addon.price)}" value="${escapeHtml(addon.name)}">
        ${escapeHtml(addon.name)} +₱${Number(addon.price).toLocaleString("en-US")}
      </label>
    `).join("");
  }

  async function loadSupabaseProducts() {
    const helper = window.KLASIK_SUPABASE;
    const menuSection = document.getElementById("favorites");
    const productGrid = menuSection?.querySelector(".product-grid");
    if (!helper?.isConfigured || !productGrid) return;

    productGrid.innerHTML = '<p class="customer-empty-state">Loading menu...</p>';
    const { data: products, error } = await helper.getAvailableProducts();
    if (error) {
      console.error(error);
      productGrid.innerHTML = `<p class="customer-empty-state" role="alert">Menu could not be loaded: ${escapeHtml(helper.safeError(error))}</p>`;
      return;
    }

    window.KLASIK_MENU.renderProductCards(productGrid, products);
    menuSection.querySelector(".category-chip.category-active")?.click();
  }

  function updateCartBadge() {
    const cart = getCart();
    if (cartBadge) {
      cartBadge.textContent = String(cart.length);
    }
  }

  function getItemUnitPrice(item) {
    const rawTotal = Number(item.total || 0);
    const quantity = Number(item.quantity || 1);
    return quantity ? rawTotal / quantity : Number(item.unitPrice || 0);
  }

  function updateCartItemQuantity(itemId, change) {
    const cart = getCart();
    const itemIndex = cart.findIndex((item) => String(item.id) === String(itemId));
    if (itemIndex === -1) return;

    const item = cart[itemIndex];
    const nextQuantity = Math.max(1, Number(item.quantity || 1) + change);
    const unitPrice = getItemUnitPrice(item);
    cart[itemIndex].quantity = nextQuantity;
    cart[itemIndex].total = Number((unitPrice * nextQuantity).toFixed(2));
    setCart(cart);
    renderCart();
  }

  function removeCartItem(itemId) {
    const cart = getCart().filter((item) => String(item.id) !== String(itemId));
    setCart(cart);
    renderCart();
  }

  function renderCart() {
    const cart = getCart();
    updateCartBadge();
    if (!orderItems) return;

    if (!cart.length) {
      orderItems.innerHTML = '<p class="customer-empty-state">Your cart is empty.</p>';
      if (orderTotal) orderTotal.textContent = "₱0";
      return;
    }

    orderItems.innerHTML = cart.map((item) => {
      const addOns = Array.isArray(item.addOns) ? item.addOns : [];
      const customizations = item.customizations || "Regular";
      const specialRequest = item.specialRequest || "No special request";
      const quantity = Number(item.quantity || 1);
      const unitPrice = getItemUnitPrice(item);
      const itemTotal = Number((unitPrice * quantity).toFixed(2));

      return `
        <div class="customer-order-item">
          <div class="customer-order-main">
            <strong>${item.name}</strong>
            <span>${quantity}x</span>
          </div>
          <div class="customer-order-detail">${customizations}</div>
          <div class="customer-order-detail">Add-ons: ${addOns.join(", ") || "None"}</div>
          <div class="customer-order-detail">${specialRequest}</div>
          <div class="customer-order-control-row">
            <div class="customer-inline-qty">
              <button type="button" data-cart-qty="decrease" data-cart-id="${item.id}" aria-label="Decrease quantity">−</button>
              <span>${quantity}</span>
              <button type="button" data-cart-qty="increase" data-cart-id="${item.id}" aria-label="Increase quantity">+</button>
            </div>
            <button type="button" class="customer-order-remove" data-cart-remove="${item.id}">Remove</button>
          </div>
          <div class="customer-order-price">${money(itemTotal)}</div>
        </div>
      `;
    }).join("");

    const total = cart.reduce((sum, item) => sum + Number(item.total || 0), 0);
    if (orderTotal) orderTotal.textContent = money(total);
  }

  function renderOrdersHistory() {
    if (!orderHistory) return;

    const orders = getOrders();
    orderHistory.innerHTML = orders.length
      ? orders.map((order) => `
        <article class="customer-history-item">
          <div class="customer-history-head">
            <strong>Order #${order.id}</strong>
            <span class="customer-status customer-status-${String(order.status).toLowerCase()}">${order.status}</span>
          </div>
          <p><span>Date:</span> ${order.date}</p>
          ${order.items.map((item) => `
            <p>${item.quantity}x ${item.name}</p>
            <p>${item.customizations}</p>
            <p>Add-ons: ${Array.isArray(item.addOns) ? item.addOns.join(", ") || "None" : "None"}</p>
            <p>Special request: ${item.specialRequest || "None"}</p>
          `).join("")}
          <p class="customer-history-total">Total: ${money(order.total)}</p>
        </article>
      `).join("")
      : '<p class="customer-empty-state">No orders yet.</p>';
  }

  function renderReviewsList() {
    if (!reviewList) return;

    const reviews = getReviews();
    reviewList.innerHTML = reviews.map((review) => `
      <article class="customer-review-item">
        <div class="customer-review-head">
          <strong>${review.customer}</strong>
          <span>${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</span>
        </div>
        <p>${review.comment}</p>
        <small>${review.date}</small>
      </article>
    `).join("");
  }

  function renderSuggestionsList() {
    if (!suggestionHistory) return;

    const suggestions = getSuggestions();
    suggestionHistory.innerHTML = suggestions.map((item) => `
      <article class="customer-history-item">
        <strong>${item.subject}</strong>
        <p>${item.suggestion}</p>
        <small>${item.date}</small>
      </article>
    `).join("");
  }

  function updateModalTotal() {
    if (!activeProduct || !modalTotal) return;

    const addOnTotal = Array.from(document.querySelectorAll("input[name='custom-addon']:checked")).reduce((sum, checkbox) => sum + Number(checkbox.dataset.price || 0), 0);
    const total = (Number(activeProduct.price) + addOnTotal) * activeQuantity;
    modalTotal.textContent = money(total);
  }

  function openCustomization(productName, productPrice) {
    activeProduct = { name: productName, price: productPrice };
    activeQuantity = 1;
    if (modal) modal.hidden = false;
    if (modalQty) modalQty.textContent = String(activeQuantity);
    updateModalTotal();
  }

  function closeCustomization() {
    if (modal) modal.hidden = true;
    activeProduct = null;
    activeQuantity = 1;
    if (modalQty) modalQty.textContent = "1";
  }

  document.querySelectorAll(".product-card").forEach((card) => {
    const title = card.querySelector(".product-title h3");
    const priceText = card.querySelector(".product-title span");
    if (!title || !priceText) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "customer-product-button";
    button.textContent = "Customize";
    button.setAttribute("aria-label", `Customize ${title.textContent}`);
    card.querySelector(".product-info")?.appendChild(button);
  });

  if (modalClose) modalClose.addEventListener("click", closeCustomization);
  if (modal && modalClose) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeCustomization();
    });
  }

  document.addEventListener("click", (event) => {
    const productButton = event.target.closest(".customer-product-button");
    if (productButton) {
      const card = productButton.closest(".product-card");
      const title = card?.querySelector(".product-title h3");
      const priceText = card?.querySelector(".product-title span");
      if (title && priceText) {
        const amount = parseInt(priceText.textContent.replace(/[^\d]/g, ""), 10) || 0;
        openCustomization(title.textContent.trim(), amount);
      }
      return;
    }

    const qtyButton = event.target.closest(".customer-qty-button");
    if (qtyButton) {
      const action = qtyButton.dataset.qtyAction;
      activeQuantity = action === "increase" ? activeQuantity + 1 : Math.max(1, activeQuantity - 1);
      if (modalQty) modalQty.textContent = String(activeQuantity);
      updateModalTotal();
    }

    const cartQtyButton = event.target.closest("[data-cart-qty]");
    if (cartQtyButton) {
      const itemId = cartQtyButton.dataset.cartId;
      const action = cartQtyButton.dataset.cartQty;
      updateCartItemQuantity(itemId, action === "increase" ? 1 : -1);
    }

    const removeButton = event.target.closest("[data-cart-remove]");
    if (removeButton) {
      removeCartItem(removeButton.dataset.cartRemove);
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.matches("input[name='custom-addon']") || event.target.matches("input[name='custom-size']") || event.target.matches("input[name='custom-milk']") || event.target.matches("input[name='custom-sweetness']") || event.target.matches("input[name='custom-ice']")) {
      updateModalTotal();
    }
  });

  if (modalAddButton) {
    modalAddButton.addEventListener("click", () => {
      if (!activeProduct) return;

      const size = document.querySelector("input[name='custom-size']:checked")?.value || "Medium";
      const milk = document.querySelector("input[name='custom-milk']:checked")?.value || "Regular";
      const sweetness = document.querySelector("input[name='custom-sweetness']:checked")?.value || "0%";
      const ice = document.querySelector("input[name='custom-ice']:checked")?.value || "Regular Ice";
      const addons = Array.from(document.querySelectorAll("input[name='custom-addon']:checked")).map((input) => input.value);
      const addOnTotal = Array.from(document.querySelectorAll("input[name='custom-addon']:checked")).reduce((sum, input) => sum + Number(input.dataset.price || 0), 0);
      const specialRequest = specialRequestInput ? specialRequestInput.value.trim() : "";
      const total = (Number(activeProduct.price) + addOnTotal) * activeQuantity;

      const cart = getCart();
      cart.push({
        id: Date.now(),
        name: activeProduct.name,
        quantity: activeQuantity,
        customizations: `${size} • ${milk} • ${sweetness} • ${ice}`,
        addOns: addons,
        specialRequest,
        total,
        unitPrice: Number(activeProduct.price) + addOnTotal
      });

      setCart(cart);
      renderCart();
      closeCustomization();
    });
  }

  if (placeOrderButton) {
    placeOrderButton.addEventListener("click", () => {
      const cart = getCart();
      if (!cart.length) return;

      const orders = getOrders();
      const nextId = orders.length ? Math.max(...orders.map((order) => Number(order.id))) + 1 : 1001;
      const orderTotalValue = cart.reduce((sum, item) => sum + Number(item.total || 0), 0);

      orders.unshift({
        id: nextId,
        date: new Date().toISOString().slice(0, 10),
        items: cart.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          customizations: item.customizations,
          addOns: item.addOns,
          specialRequest: item.specialRequest
        })),
        total: orderTotalValue,
        status: "Pending"
      });

      setOrders(orders);
      setCart([]);
      if (specialRequestInput) specialRequestInput.value = "";
      updateCartBadge();
      renderCart();
      renderOrdersHistory();
    });
  }

  if (submitReviewButton) {
    submitReviewButton.addEventListener("click", () => {
      const rating = Number(reviewRatingInput.value || 0);
      const comment = reviewComment.value.trim();

      if (!rating || !comment) {
        reviewMessage.textContent = "Please choose a rating and write a comment.";
        return;
      }

      const reviews = getReviews();
      reviews.unshift({
        id: Date.now(),
        customer: "Guest",
        rating,
        comment,
        date: new Date().toISOString().slice(0, 10)
      });

      saveReviews(reviews);
      renderReviewsList();
      reviewComment.value = "";
      reviewRatingInput.value = "0";
      starButtons.forEach((button) => button.classList.remove("is-active"));
      if (reviewMessage) reviewMessage.textContent = "Thank you for your review!";
    });
  }

  starButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const rating = Number(button.dataset.rating);
      reviewRatingInput.value = String(rating);
      starButtons.forEach((star) => {
        star.classList.toggle("is-active", Number(star.dataset.rating) <= rating);
      });
    });
  });

  if (submitSuggestionButton) {
    submitSuggestionButton.addEventListener("click", () => {
      const subject = suggestionSubject.value.trim();
      const message = suggestionInput.value.trim();

      if (!subject || !message) {
        if (suggestionStatus) suggestionStatus.textContent = "Please fill in both fields.";
        return;
      }

      const suggestions = getSuggestions();
      suggestions.unshift({
        id: Date.now(),
        subject,
        suggestion: message,
        date: new Date().toISOString().slice(0, 10)
      });

      saveSuggestions(suggestions);
      renderSuggestionsList();
      suggestionSubject.value = "";
      suggestionInput.value = "";
      if (suggestionStatus) suggestionStatus.textContent = "Thank you for your suggestion!";
    });
  }

  renderCart();
  renderOrdersHistory();
  renderReviewsList();
  renderSuggestionsList();
  loadSupabaseProducts();
  loadSupabaseAddons();
});
