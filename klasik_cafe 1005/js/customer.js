import { getCurrentUser, requireRole } from "./supabase-auth.js";
import { supabaseConfigured } from "./supabase-client.js";
import {
  applyCatalogToCards,
  createReview,
  createSuggestion,
  fetchCustomerOrders,
  fetchCafeInfo,
  fetchMenuAddons,
  fetchMenuCatalog,
  fetchPlacedOrders,
  fetchReviews,
  fetchSuggestions,
  subscribeToOrders,
  subscribeToReviews,
  submitCustomerOrder
} from "./supabase-data.js";
import { confirmOrderReview, showOrderReceipt, themedConfirm } from "./ui-dialogs.js";

"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const orderItems = document.getElementById("customer-order-items");
  const orderTotal = document.getElementById("customer-order-total");
  const cartBadge = document.getElementById("cart-count-badge");
  const specialRequestInput = document.getElementById("customer-special-request");
  const placeOrderButton = document.getElementById("customer-place-order");
  const orderHistory = document.getElementById("customer-order-history");
  const placedOrdersList = document.getElementById("customer-placed-orders-list");
  const placedOrdersRealtimeStatus = document.getElementById("customer-placed-orders-realtime-status");
  const starButtons = document.querySelectorAll(".customer-star");
  const reviewRatingInput = document.getElementById("customer-review-rating");
  const reviewComment = document.getElementById("customer-review-comment");
  const reviewMessage = document.getElementById("customer-review-message");
  const submitReviewButton = document.getElementById("customer-submit-review");
  const reviewList = document.getElementById("customer-review-list");
  const reviewHistory = document.getElementById("customer-review-history");
  const reviewRealtimeStatus = document.getElementById("customer-review-realtime-status");
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
  let activeCustomer = null;
  let reviewAccountAllowed = false;
  let remoteOrders = null;
  let remotePlacedOrders = null;
  let remoteReviews = null;
  let remoteSuggestions = null;
  let remoteCatalog = null;
  let placedOrdersChannelCleanup = null;
  const remoteLoadErrors = new Map();
  const addonByName = new Map();
  const expectedAddonPrices = new Map([
    ["Large Size Upgrade", 25],
    ["Oreo", 15],
    ["Biscoff", 25],
    ["Cold Foam", 15],
    ["Seasalt Cream", 15],
    ["Extra Shot", 25],
    ["Sauces Syrup", 15],
    ["Oat Milk Substitute", 25]
  ]);

  if (supabaseConfigured && document.body.classList.contains("customer-body")) {
    try {
      activeCustomer = await requireRole(["customer"]);
      if (!activeCustomer) return;
      reviewAccountAllowed = true;
      const profileCard = document.querySelector(".profile-card");
      if (profileCard) {
        const name = [activeCustomer.profile.first_name, activeCustomer.profile.last_name].filter(Boolean).join(" ");
        const heading = profileCard.querySelector("h3");
        if (heading) heading.textContent = name || activeCustomer.profile.username;
        const avatar = profileCard.querySelector(".profile-avatar");
        if (avatar) {
          avatar.textContent = `${activeCustomer.profile.first_name[0] || ""}${activeCustomer.profile.last_name[0] || ""}`.toUpperCase() || "KC";
        }
        const memberSince = profileCard.querySelector("p");
        if (memberSince) {
          memberSince.textContent = `Member since ${new Date(activeCustomer.profile.created_at).getFullYear()}`;
        }
      }
      const emailEntry = Array.from(document.querySelectorAll(".profile-meta li"))
        .find((item) => item.querySelector("span")?.textContent.trim() === "Email");
      if (emailEntry) emailEntry.querySelector("strong").textContent = activeCustomer.user.email || "";
    } catch (error) {
      console.error("Customer authorization failed:", error);
      window.alert(error.message || "Unable to verify your account.");
      return;
    }
  }

  function renderPlacedOrders() {
    if (!placedOrdersList) return;
    const orders = remotePlacedOrders === null
      ? getOrders().filter((order) => order.status === "Pending")
      : remotePlacedOrders;
    placedOrdersList.innerHTML = orders.length ? orders.map((order) => `
      <article class="customer-history-item">
        <div class="customer-history-head">
          <strong>Official Receipt · Order #${escapeHtml(order.id)}</strong>
          <span class="customer-status customer-status-${escapeHtml(String(order.status).toLowerCase())}">${escapeHtml(order.status)}</span>
        </div>
        <p><span>Date:</span> ${escapeHtml(order.date)}</p>
        ${order.items.map((item) => `
          <p>${escapeHtml(item.quantity)}x ${escapeHtml(item.name)}</p>
          <p>${escapeHtml(typeof item.customizations === "string" ? item.customizations : Object.entries(item.customizations || {}).filter(([key]) => key !== "special_request").map(([, value]) => value).join(" / "))}</p>
          <p>Add-ons: ${escapeHtml(Array.isArray(item.addOns) ? item.addOns.map((addon) => typeof addon === "string" ? addon : addon.name).join(", ") || "None" : "None")}</p>
        `).join("")}
        <p class="customer-history-total">Total: ${money(order.total)}</p>
        <p class="placed-orders-note">Present Order #${escapeHtml(order.id)} at the café. This order will appear in Order History after the bartender confirms it.</p>
      </article>
    `).join("") : '<p class="customer-empty-state">No placed orders are waiting for confirmation.</p>';
  }

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

  function getExistingStoredData(key) {
    const value = localStorage.getItem(key);
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error(`Unable to read existing local data for "${key}":`, error);
      return [];
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function saveCustomizedFavorite(favorite) {
    window.dispatchEvent(new CustomEvent("klasik:add-custom-favorite", { detail: favorite }));
  }

  function announceError(container, message, error) {
    console.error(message, error);
    if (!container) return;
    const notice = document.createElement("p");
    notice.className = "customer-empty-state";
    notice.setAttribute("role", "alert");
    notice.textContent = `${message} The original local content has been kept.`;
    container.prepend(notice);
  }

  function appendLoadError(container, key) {
    const message = remoteLoadErrors.get(key);
    if (!container || !message) return;
    const notice = document.createElement("p");
    notice.className = "customer-empty-state";
    notice.setAttribute("role", "alert");
    notice.textContent = message;
    container.appendChild(notice);
  }

  function money(value) {
    return `₱${Number(value).toLocaleString("en-US")}`;
  }

  function getCart() {
    return loadData(supabaseConfigured ? "klasikCafeSupabaseCart" : orderStorageKey, []);
  }

  function setCart(items) {
    saveData(supabaseConfigured ? "klasikCafeSupabaseCart" : orderStorageKey, items);
  }

  function getOrders() {
    return loadData(orderHistoryKey, [
      {
        id: 1001,
        date: "2026-10-02",
        items: [{ name: "Classic Latte", quantity: 2, customizations: "Large • Oat • 25% • Less Ice", addOns: ["Oreo"], specialRequest: "Extra hot." }],
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
    } else {
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
              <strong>${escapeHtml(item.name)}</strong>
              <span>${quantity}x</span>
            </div>
            <div class="customer-order-detail">${escapeHtml(customizations)}</div>
            <div class="customer-order-detail">Add-ons: ${escapeHtml(addOns.join(", ") || "None")}</div>
            <div class="customer-order-detail">${escapeHtml(specialRequest)}</div>
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

    orderItems.querySelector(".customer-legacy-cart-notice")?.remove();
    if (supabaseConfigured && getExistingStoredData(orderStorageKey).length) {
      const notice = document.createElement("p");
      notice.className = "customer-empty-state customer-legacy-cart-notice";
      notice.textContent = "A cart saved before Supabase setup remains in this browser and was not changed. Its products need review before import.";
      orderItems.appendChild(notice);
    }
  }

  function renderOrdersHistory() {
    if (!orderHistory) return;

    const orders = remoteOrders === null ? getOrders().filter((order) => order.status !== "Pending") : remoteOrders;
    orderHistory.innerHTML = orders.length
      ? orders.map((order) => `
        <article class="customer-history-item">
          <div class="customer-history-head">
            <strong>Order #${escapeHtml(order.id)}</strong>
            <span class="customer-status customer-status-${escapeHtml(String(order.status).toLowerCase())}">${escapeHtml(order.status)}</span>
          </div>
          <p><span>Date:</span> ${escapeHtml(order.date)}</p>
          ${order.items.map((item) => `
            <p>${escapeHtml(item.quantity)}x ${escapeHtml(item.name)}</p>
            <p>${escapeHtml(typeof item.customizations === "string" ? item.customizations : Object.values(item.customizations || {}).join(" / "))}</p>
            <p>Add-ons: ${escapeHtml(Array.isArray(item.addOns) ? item.addOns.map((addon) => typeof addon === "string" ? addon : addon.name).join(", ") || "None" : "None")}</p>
            <p>Special request: ${escapeHtml(item.specialRequest || item.customizations?.special_request || "None")}</p>
          `).join("")}
          <p class="customer-history-total">Total: ${money(order.total)}</p>
        </article>
      `).join("")
      : `<p class="customer-empty-state">${remoteOrders === null ? "No orders yet." : "No Supabase orders yet. Any order history saved on this device is still retained locally."}</p>`;
    if (supabaseConfigured && getExistingStoredData(orderHistoryKey).length) {
      const notice = document.createElement("p");
      notice.className = "customer-empty-state";
      notice.textContent = "Previous demo order history remains in this browser and was not imported into your account.";
      orderHistory.appendChild(notice);
    }
    appendLoadError(orderHistory, "orders");
  }

  function renderReviewsList() {
    if (!reviewList) return;

    const reviews = remoteReviews === null ? getReviews() : remoteReviews;
    reviewList.innerHTML = reviews.length ? reviews.map((review) => `
      <article class="customer-review-item">
        <div class="customer-review-head">
          <strong>${escapeHtml(review.customer || "Customer")}</strong>
          <span>${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</span>
        </div>
        <p>${escapeHtml(review.comment)}</p>
        <small>${escapeHtml(review.date || new Date(review.created_at).toLocaleDateString())}</small>
      </article>
    `).join("") : '<p class="customer-empty-state">No approved customer reviews yet.</p>';
    if (supabaseConfigured && getExistingStoredData(reviewsKey).length) {
      const notice = document.createElement("p");
      notice.className = "customer-empty-state";
      notice.textContent = "Previous demo reviews remain in this browser and were not imported or attributed to an account.";
      reviewList.appendChild(notice);
    }
    appendLoadError(reviewList, "reviews");
  }

  function renderSuggestionsList() {
    if (!suggestionHistory) return;

    const suggestions = remoteSuggestions === null ? getSuggestions() : remoteSuggestions;
    suggestionHistory.innerHTML = suggestions.map((item) => `
      <article class="customer-history-item">
        <strong>${escapeHtml(item.subject)}</strong>
        <p>${escapeHtml(item.suggestion)}</p>
        <small>${escapeHtml(item.date || new Date(item.created_at).toLocaleDateString())}</small>
      </article>
    `).join("");
    if (supabaseConfigured && getExistingStoredData(suggestionsKey).length) {
      const notice = document.createElement("p");
      notice.className = "customer-empty-state";
      notice.textContent = "Previous demo suggestions remain in this browser and were not imported or attributed to an account.";
      suggestionHistory.appendChild(notice);
    }
    appendLoadError(suggestionHistory, "suggestions");
  }

  function renderDashboardOrders() {
    const list = document.getElementById("customer-orders-list");
    if (!list) return;
    list.innerHTML = (remoteOrders || []).map((order) => `
      <article class="order-card">
        <div class="order-meta">
          <h3>Order #${escapeHtml(order.id)}</h3>
          <span class="status-pill status-${escapeHtml(String(order.status).toLowerCase())}">${escapeHtml(order.status)}</span>
        </div>
        <p>${escapeHtml(order.date)}</p>
        <ul>${order.items.map((item) => `<li>${escapeHtml(item.quantity)}x ${escapeHtml(item.name)}</li>`).join("")}</ul>
        <div class="order-total"><span>Total</span><span>${money(order.total)}</span></div>
      </article>
    `).join("") || '<p class="customer-empty-state">No Supabase orders yet.</p>';
  }

  function renderDashboardReviews() {
    const list = document.getElementById("customer-review-history");
    if (!list) return;
    list.innerHTML = (remoteReviews || []).map((review) => `
      <article class="history-item">
        <strong>${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}${review.status === "pending" ? " — Pending moderation" : ""}</strong>
        <p>${escapeHtml(review.comment)}</p>
        <small>${escapeHtml(new Date(review.created_at).toLocaleDateString())}</small>
      </article>
    `).join("") || '<p class="customer-empty-state">No reviews yet.</p>';
  }

  function renderDashboardSuggestions() {
    const list = document.getElementById("customer-suggestion-history");
    if (!list) return;
    list.innerHTML = (remoteSuggestions || []).map((item) => `
      <article class="history-item">
        <strong>${escapeHtml(item.subject)}</strong>
        <p>${escapeHtml(item.suggestion)}</p>
        <small>${escapeHtml(item.status)} · ${escapeHtml(new Date(item.created_at).toLocaleDateString())}</small>
      </article>
    `).join("") || '<p class="customer-empty-state">No suggestions yet.</p>';
  }

  function initializeCustomerDashboard() {
    const menuGrid = document.getElementById("customer-menu-grid");
    if (!menuGrid || !remoteCatalog) return;

    const categoryBar = document.querySelector(".customer-category-bar");
    const selectedCategories = new Set(Array.from(categoryBar?.querySelectorAll("[data-menu-category]") || [])
      .map((button) => button.dataset.menuCategory));
    remoteCatalog.forEach((item) => {
      if (selectedCategories.has(item.mainCategory)) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "category-button";
      button.dataset.menuCategory = item.mainCategory;
      button.textContent = item.mainCategoryName;
      categoryBar?.appendChild(button);
      selectedCategories.add(item.mainCategory);
    });

    menuGrid.innerHTML = remoteCatalog.map((item) => `
      <article class="customer-product-card" data-main-category="${escapeHtml(item.mainCategory)}">
        <div class="customer-product-image">
          <img src="${escapeHtml(item.image_path)}" alt="${escapeHtml(item.name)}" loading="lazy">
        </div>
        <div class="customer-product-info">
          <div class="product-header"><h3>${escapeHtml(item.name)}</h3><span>₱${escapeHtml(item.price)}</span></div>
          <p>${escapeHtml(item.description)}</p>
          <span class="availability ${item.is_available ? "" : "unavailable"}">${item.is_available ? "Available" : "Unavailable"}</span>
          <button class="button button-primary dashboard-customize" type="button" data-menu-id="${escapeHtml(item.id)}">Customize</button>
        </div>
      </article>
    `).join("");

    const filterProducts = (selected) => {
      menuGrid.querySelectorAll(".customer-product-card").forEach((card) => {
        card.hidden = selected !== "all" && card.dataset.mainCategory !== selected;
      });
    };
    categoryBar?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-menu-category]");
      if (!button) return;
      categoryBar.querySelectorAll("[data-menu-category]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      filterProducts(button.dataset.menuCategory);
    });

    const dashboardModal = document.getElementById("customization-modal");
    const modalTitle = document.getElementById("customization-title");
    const quantityLabel = document.getElementById("customization-quantity");
    const totalLabel = document.getElementById("customization-total");
    let selectedProduct = null;
    let quantity = 1;

    const selectedAddonInputs = () => Array.from(dashboardModal?.querySelectorAll("input[name='addon']:checked") || []);
    const getDashboardAutoAddons = () => [
      ...(dashboardModal?.querySelector("input[name='size']:checked")?.value === "Large" ? ["Large Size Upgrade"] : []),
      ...(dashboardModal?.querySelector("input[name='milk']:checked")?.value === "Oat" ? ["Oat Milk Substitute"] : [])
    ];
    const updateTotal = () => {
      if (!selectedProduct || !totalLabel) return;
      const addonPrice = selectedAddonInputs().reduce((sum, input) => sum + Number(input.dataset.price || 0), 0)
        + getDashboardAutoAddons().reduce((sum, name) => sum + Number(addonByName.get(name)?.price ?? 25), 0);
      totalLabel.textContent = money((Number(selectedProduct.price) + addonPrice) * quantity);
    };
    const closeModal = () => {
      if (dashboardModal) dashboardModal.hidden = true;
      selectedProduct = null;
      quantity = 1;
      if (quantityLabel) quantityLabel.textContent = "1";
    };

    menuGrid.addEventListener("click", (event) => {
      const button = event.target.closest(".dashboard-customize");
      if (!button) return;
      selectedProduct = remoteCatalog.find((item) => item.id === button.dataset.menuId);
      if (!selectedProduct) return;
      quantity = 1;
      if (modalTitle) modalTitle.textContent = selectedProduct.name;
      if (quantityLabel) quantityLabel.textContent = "1";
      dashboardModal.querySelectorAll("input[name='addon']").forEach((input) => {
        input.checked = false;
      });
      dashboardModal.querySelector("input[name='size'][value='Medium']")?.click();
      dashboardModal.querySelector("input[name='milk'][value='Regular']")?.click();
      dashboardModal.querySelector("input[name='sweetness'][value='50%']")?.click();
      dashboardModal.querySelector("input[name='ice'][value='Regular Ice']")?.click();
      if (dashboardModal) dashboardModal.hidden = false;
      const dashboardAddButton = document.getElementById("add-to-order-button");
      if (dashboardAddButton) {
        dashboardAddButton.disabled = !selectedProduct.is_available;
        dashboardAddButton.textContent = selectedProduct.is_available ? "Add to Order" : "Unavailable";
      }
      updateTotal();
    });
    dashboardModal?.querySelector(".modal-close")?.addEventListener("click", closeModal);
    dashboardModal?.addEventListener("click", (event) => {
      if (event.target === dashboardModal) closeModal();
    });
    dashboardModal?.addEventListener("change", (event) => {
      if (event.target.matches("input[name='addon'], input[name='size'], input[name='milk']")) updateTotal();
    });
    dashboardModal?.addEventListener("click", (event) => {
      const quantityButton = event.target.closest(".qty-button");
      if (quantityButton) {
        quantity = quantityButton.dataset.qtyAction === "increase" ? quantity + 1 : Math.max(1, quantity - 1);
        if (quantityLabel) quantityLabel.textContent = String(quantity);
        updateTotal();
      }
    });

    document.getElementById("add-to-order-button")?.addEventListener("click", () => {
      if (!selectedProduct || !selectedProduct.is_available) return;
      const selectedAddons = Array.from(dashboardModal.querySelectorAll("input[name='addon']:checked"));
      if (selectedAddons.some((input) => !input.dataset.supabaseId)) {
        window.alert("One or more selected add-ons are unavailable from Supabase. Refresh the page and try again.");
        return;
      }
      const options = {
        size: dashboardModal.querySelector("input[name='size']:checked")?.value || "Medium",
        milk: dashboardModal.querySelector("input[name='milk']:checked")?.value || "Regular",
        sweetness: dashboardModal.querySelector("input[name='sweetness']:checked")?.value || "50%",
        ice: dashboardModal.querySelector("input[name='ice']:checked")?.value || "Regular Ice"
      };
      const automaticAddons = [
        ...(options.size === "Large" ? ["Large Size Upgrade"] : []),
        ...(options.milk === "Oat" ? ["Oat Milk Substitute"] : [])
      ].map((name) => addonByName.get(name));
      if (supabaseConfigured && automaticAddons.some((addon) => !addon?.id)) {
        window.alert("The size or oat milk upgrade is not available from Supabase. Please refresh the page or contact the café.");
        return;
      }
      const addonIds = [...selectedAddons.map((input) => input.dataset.supabaseId), ...automaticAddons.map((addon) => addon?.id).filter(Boolean)];
      const addonNames = [...selectedAddons.map((input) => input.value), ...automaticAddons.map((addon, index) => addon?.name || automaticAddons[index])];
      const addonPrice = selectedAddons.reduce((sum, input) => sum + Number(input.dataset.price || 0), 0)
        + automaticAddons.reduce((sum, addon) => sum + Number(addon?.price ?? 25), 0);
      const unitPrice = Number(selectedProduct.price) + addonPrice;
      const cart = getCart();
      cart.push({
        id: Date.now(),
        menuItemId: selectedProduct.id,
        quantity,
        name: selectedProduct.name,
        customizations: Object.values(options).join(" • "),
        customizationOptions: options,
        addonIds,
        addOns: addonNames,
        specialRequest: document.getElementById("customization-request").value.trim(),
        unitPrice,
        total: unitPrice * quantity
      });
      setCart(cart);
      closeModal();
      const status = document.getElementById("customer-cart-status");
      if (status) status.textContent = "Added to your cart. Review and submit it on the Order Review page.";
    });

    document.getElementById("add-to-favorites-button")?.addEventListener("click", () => {
      if (!selectedProduct) return;
      const options = {
        size: dashboardModal.querySelector("input[name='size']:checked")?.value || "Medium",
        milk: dashboardModal.querySelector("input[name='milk']:checked")?.value || "Regular",
        sweetness: dashboardModal.querySelector("input[name='sweetness']:checked")?.value || "50%",
        ice: dashboardModal.querySelector("input[name='ice']:checked")?.value || "Regular Ice"
      };
      const selectedAddons = selectedAddonInputs();
      const automaticAddons = getDashboardAutoAddons().map((name) => addonByName.get(name));
      const addOns = [
        ...selectedAddons.map((input) => input.value),
        ...automaticAddons.map((addon, index) => addon?.name || getDashboardAutoAddons()[index])
      ];
      const addonPrice = selectedAddons.reduce((sum, input) => sum + Number(input.dataset.price || 0), 0)
        + automaticAddons.reduce((sum, addon) => sum + Number(addon?.price ?? 25), 0);
      const unitPrice = Number(selectedProduct.price) + addonPrice;
      saveCustomizedFavorite({
        productId: selectedProduct.id,
        name: selectedProduct.name,
        image: selectedProduct.image_path,
        quantity,
        unitPrice,
        total: unitPrice * quantity,
        customizations: options,
        addOns
      });
      closeModal();
      const status = document.getElementById("customer-cart-status");
      if (status) status.textContent = "Customized item saved to Favorites.";
    });
  }

  function initializeDashboardFeedback() {
    const reviewForm = document.getElementById("customer-review-form");
    const ratingInput = document.getElementById("review-rating");
    const commentInput = document.getElementById("review-comment");
    const reviewStatus = document.getElementById("review-status");
    const dashboardStars = document.querySelectorAll(".star-button[data-rating]");
    const reviewSubmit = reviewForm?.querySelector("button[type='submit']");
    const updateReviewAvailability = () => {
      if (reviewSubmit) reviewSubmit.disabled = !reviewAccountAllowed || !Number(ratingInput?.value || 0) || !commentInput?.value.trim();
    };
    updateReviewAvailability();
    commentInput?.addEventListener("input", updateReviewAvailability);
    dashboardStars.forEach((button) => {
      button.addEventListener("click", () => {
        const rating = Number(button.dataset.rating);
        ratingInput.value = String(rating);
        dashboardStars.forEach((star) => {
          star.classList.toggle("is-active", Number(star.dataset.rating) <= rating);
        });
        updateReviewAvailability();
      });
    });
    reviewForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const rating = Number(ratingInput.value);
      const comment = commentInput.value.trim();
      if (rating < 1 || rating > 5 || !comment) {
        reviewStatus.textContent = "Choose a rating and write a comment.";
        return;
      }
      try {
        await createReview(activeCustomer.user.id, rating, comment);
        remoteReviews = await fetchReviews({ includeModeration: true });
        renderDashboardReviews();
        commentInput.value = "";
        ratingInput.value = "0";
        dashboardStars.forEach((star) => star.classList.remove("is-active"));
        updateReviewAvailability();
        reviewStatus.textContent = "Thank you. Your review was sent for moderation.";
      } catch (error) {
        console.error("Customer dashboard review submission failed:", error);
        reviewStatus.textContent = error.message || "Your review could not be submitted.";
      }
    });

    const suggestionForm = document.getElementById("customer-suggestion-form");
    const subjectInput = document.getElementById("suggestion-subject");
    const suggestionInput = document.getElementById("suggestion-message");
    const suggestionStatusMessage = document.getElementById("suggestion-status");
    const suggestionSubmit = suggestionForm?.querySelector("button[type='submit']");
    const updateSuggestionAvailability = () => {
      if (suggestionSubmit) suggestionSubmit.disabled = !subjectInput?.value.trim() || !suggestionInput?.value.trim();
    };
    updateSuggestionAvailability();
    subjectInput?.addEventListener("input", updateSuggestionAvailability);
    suggestionInput?.addEventListener("input", updateSuggestionAvailability);
    suggestionForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const subject = subjectInput.value.trim();
      const suggestion = suggestionInput.value.trim();
      if (!subject || !suggestion) {
        suggestionStatusMessage.textContent = "Fill in both fields before submitting.";
        return;
      }
      try {
        await createSuggestion(activeCustomer.user.id, subject, suggestion);
        remoteSuggestions = await fetchSuggestions();
        renderDashboardSuggestions();
        suggestionForm.reset();
        suggestionStatusMessage.textContent = "Thank you for your suggestion!";
        updateSuggestionAvailability();
      } catch (error) {
        console.error("Customer dashboard suggestion submission failed:", error);
        suggestionStatusMessage.textContent = error.message || "Your suggestion could not be submitted.";
      }
    });
  }

  function updateModalTotal() {
    if (!activeProduct || !modalTotal) return;

    const selected = Array.from(modal?.querySelectorAll("input[name='custom-addon']:checked") || []);
    const size = modal?.querySelector("input[name='custom-size']:checked")?.value;
    const milk = modal?.querySelector("input[name='custom-milk']:checked")?.value;
    const automaticAddons = [
      ...(size === "Large" ? ["Large Size Upgrade"] : []),
      ...(milk === "Oat" ? ["Oat Milk Substitute"] : [])
    ];
    const addOnTotal = selected.reduce((sum, checkbox) => sum + Number(checkbox.dataset.price || 0), 0)
      + automaticAddons.reduce((sum, name) => sum + Number(addonByName.get(name)?.price ?? 25), 0);
    const total = (Number(activeProduct.price) + addOnTotal) * activeQuantity;
    modalTotal.textContent = money(total);
  }

  function openCustomization(productName, productPrice, menuItemId = null, available = true, image = "") {
    activeProduct = { name: productName, price: productPrice, menuItemId, available, image };
    activeQuantity = 1;
    modal?.querySelectorAll("input[name='custom-addon']").forEach((input) => { input.checked = false; });
    modal?.querySelector("input[name='custom-size'][value='Medium']")?.click();
    modal?.querySelector("input[name='custom-milk'][value='Regular']")?.click();
    modal?.querySelector("input[name='custom-sweetness'][value='0%']")?.click();
    modal?.querySelector("input[name='custom-ice'][value='Regular Ice']")?.click();
    if (modal) modal.hidden = false;
    if (modalQty) modalQty.textContent = String(activeQuantity);
    if (modalAddButton) {
      modalAddButton.disabled = !available;
      modalAddButton.textContent = available ? "Add to Order" : "Unavailable";
    }
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
        openCustomization(
          title.textContent.trim(),
          amount,
          card.dataset.supabaseId || null,
          card.dataset.available !== "false",
          card.querySelector(".product-image img")?.src || ""
        );
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

  const getCustomizationDetails = () => {
    if (!activeProduct) return null;
    const options = {
      size: modal.querySelector("input[name='custom-size']:checked")?.value || "Medium",
      milk: modal.querySelector("input[name='custom-milk']:checked")?.value || "Regular",
      sweetness: modal.querySelector("input[name='custom-sweetness']:checked")?.value || "0%",
      ice: modal.querySelector("input[name='custom-ice']:checked")?.value || "Regular Ice"
    };
    const selectedAddons = Array.from(modal.querySelectorAll("input[name='custom-addon']:checked"));
    const automaticAddons = [
      ...(options.size === "Large" ? ["Large Size Upgrade"] : []),
      ...(options.milk === "Oat" ? ["Oat Milk Substitute"] : [])
    ].map((name) => addonByName.get(name));
    const addonNames = [...selectedAddons.map((input) => input.value), ...automaticAddons.map((addon) => addon?.name).filter(Boolean)];
    const addonIds = [...selectedAddons.map((input) => input.dataset.supabaseId), ...automaticAddons.map((addon) => addon?.id).filter(Boolean)];
    const addonTotal = selectedAddons.reduce((sum, input) => sum + Number(input.dataset.price || 0), 0)
      + automaticAddons.reduce((sum, addon) => sum + Number(addon?.price ?? 25), 0);
    const unitPrice = Number(activeProduct.price) + addonTotal;
    return { options, selectedAddons, automaticAddons, addonNames, addonIds, unitPrice, total: unitPrice * activeQuantity };
  };

  if (modalAddButton) {
    modalAddButton.addEventListener("click", () => {
      if (!activeProduct || !activeProduct.available) return;
      const details = getCustomizationDetails();
      if (!details) return;
      if (supabaseConfigured && details.addonIds.some((id) => !id)) {
        window.alert("One or more selected customizations are not available from Supabase. Refresh the menu before adding them.");
        return;
      }
      const specialRequest = specialRequestInput ? specialRequestInput.value.trim() : "";
      const cart = getCart();
      cart.push({
        id: crypto.randomUUID(),
        name: activeProduct.name,
        quantity: activeQuantity,
        customizations: Object.values(details.options).join(" • "),
        addOns: details.addonNames,
        addonIds: details.addonIds,
        menuItemId: activeProduct.menuItemId,
        customizationOptions: details.options,
        specialRequest,
        total: details.total,
        unitPrice: details.unitPrice
      });

      setCart(cart);
      renderCart();
      closeCustomization();
    });
  }

  document.getElementById("customer-add-to-favorites")?.addEventListener("click", () => {
    if (!activeProduct) return;
    const details = getCustomizationDetails();
    if (!details) return;
    saveCustomizedFavorite({
      productId: activeProduct.menuItemId || activeProduct.name,
      name: activeProduct.name,
      image: activeProduct.image,
      quantity: activeQuantity,
      unitPrice: details.unitPrice,
      total: details.total,
      customizations: details.options,
      addOns: details.addonNames
    });
    closeCustomization();
  });

  if (placeOrderButton) {
    placeOrderButton.addEventListener("click", async () => {
      const cart = getCart();
      if (!cart.length) return;

      const orderTotalValue = cart.reduce((sum, item) => sum + Number(item.total || 0), 0);
      const confirmed = await confirmOrderReview({
        items: cart,
        total: orderTotalValue
      });
      if (!confirmed) return;
      placeOrderButton.disabled = true;

      if (supabaseConfigured) {
        let receipt;
        let orderWasPlaced = false;
        try {
          const user = await getCurrentUser();
          if (!user) {
            const goToLogin = await themedConfirm({
              title: "Log in to place your order",
              message: "Your cart will stay saved. Log in or create a customer account to submit this order.",
              confirmLabel: "Go to Login",
              cancelLabel: "Keep Shopping"
            });
            if (goToLogin) window.location.href = "login.html";
            return;
          }
          try {
            receipt = await submitCustomerOrder(cart, specialRequestInput?.value.trim() || "");
          } catch (error) {
            console.error("Order submission failed:", error);
            window.alert(error.message || "Your order could not be submitted. Your cart has been kept.");
            return;
          }
          orderWasPlaced = true;

          setCart([]);
          if (specialRequestInput) specialRequestInput.value = "";
          updateCartBadge();
          renderCart();
          try {
            remoteOrders = await fetchCustomerOrders();
            if (placedOrdersList) remotePlacedOrders = await fetchPlacedOrders();
            renderOrdersHistory();
            renderPlacedOrders();
          } catch (error) {
            console.error("Order placed but the order list could not refresh:", error);
            if (placedOrdersRealtimeStatus) {
              placedOrdersRealtimeStatus.textContent = "Your order was placed, but the list could not refresh. Reload this page to check its status.";
            }
            window.alert(`Order #${receipt.orderNumber} was placed, but the order list could not refresh. Your receipt code is still valid.`);
          }
          await showOrderReceipt({
            orderNumber: receipt.orderNumber,
            items: cart,
            total: receipt.total
          });
          return;
        } catch (error) {
          console.error(orderWasPlaced ? "Order placed but checkout confirmation failed:" : "Order account verification failed:", error);
          window.alert(orderWasPlaced
            ? `Order #${receipt.orderNumber} was placed, but its receipt could not be displayed. Go to Placed Orders to find the code.`
            : error.message || "Unable to verify your account.");
          return;
        } finally {
          placeOrderButton.disabled = false;
        }
      }

      const orders = getOrders();
      const nextId = orders.length ? Math.max(...orders.map((order) => Number(order.id))) + 1 : 1001;
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
      remotePlacedOrders = null;
      renderPlacedOrders();
      await showOrderReceipt({
        orderNumber: nextId,
        items: cart,
        total: orderTotalValue
      });
      placeOrderButton.disabled = false;
    });
  }

  if (submitReviewButton) {
    const updateReviewButton = () => {
      submitReviewButton.disabled = !reviewAccountAllowed || !Number(reviewRatingInput?.value || 0) || !reviewComment?.value.trim();
    };
    updateReviewButton();
    reviewComment?.addEventListener("input", updateReviewButton);
    submitReviewButton.addEventListener("click", async () => {
      const rating = Number(reviewRatingInput.value || 0);
      const comment = reviewComment.value.trim();

      if (!rating || !comment) {
        reviewMessage.textContent = "Please choose a rating and write a comment.";
        return;
      }

      try {
        const customer = activeCustomer || (supabaseConfigured ? await requireRole(["customer"]) : null);
        if (!customer?.user) {
          if (reviewMessage) reviewMessage.textContent = "Please log in with a customer account before submitting a review.";
          return;
        }
        await createReview(customer.user.id, rating, comment);
        remoteReviews = await fetchReviews({
          includeModeration: Boolean(document.getElementById("customer-review-history"))
        });
        if (reviewMessage) reviewMessage.textContent = "Thank you. Your review was sent for moderation.";
      } catch (error) {
        console.error("Review submission failed:", error);
        if (reviewMessage) reviewMessage.textContent = error.message || "Your review could not be submitted.";
        return;
      }

      renderReviewsList();
      renderDashboardReviews();
      reviewComment.value = "";
      reviewRatingInput.value = "0";
      starButtons.forEach((button) => button.classList.remove("is-active"));
      reviewAccountAllowed = true;
      updateReviewButton();
    });
  }

  starButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const rating = Number(button.dataset.rating);
      reviewRatingInput.value = String(rating);
      starButtons.forEach((star) => {
        star.classList.toggle("is-active", Number(star.dataset.rating) <= rating);
      });
      if (submitReviewButton) submitReviewButton.disabled = !reviewAccountAllowed || !reviewComment?.value.trim();
    });
  });

  if (submitSuggestionButton) {
    const updateSuggestionButton = () => {
      submitSuggestionButton.disabled = !suggestionSubject?.value.trim() || !suggestionInput?.value.trim();
    };
    updateSuggestionButton();
    suggestionSubject?.addEventListener("input", updateSuggestionButton);
    suggestionInput?.addEventListener("input", updateSuggestionButton);
    submitSuggestionButton.addEventListener("click", async () => {
      const subject = suggestionSubject.value.trim();
      const message = suggestionInput.value.trim();

      if (!subject || !message) {
        if (suggestionStatus) suggestionStatus.textContent = "Please fill in both fields.";
        return;
      }

      if (supabaseConfigured) {
        try {
          const user = await getCurrentUser();
          if (!user) {
            window.alert("Please log in before submitting a suggestion.");
            window.location.href = "login.html";
            return;
          }
          await createSuggestion(user.id, subject, message);
          remoteSuggestions = await fetchSuggestions();
        } catch (error) {
          console.error("Suggestion submission failed:", error);
          if (suggestionStatus) suggestionStatus.textContent = error.message || "Your suggestion could not be submitted.";
          return;
        }
      } else {
        const suggestions = getSuggestions();
        suggestions.unshift({
          id: Date.now(),
          subject,
          suggestion: message,
          date: new Date().toISOString().slice(0, 10)
        });
        saveSuggestions(suggestions);
      }

      renderSuggestionsList();
      suggestionSubject.value = "";
      suggestionInput.value = "";
      if (suggestionStatus) suggestionStatus.textContent = "Thank you for your suggestion!";
      updateSuggestionButton();
    });
  }

  if (supabaseConfigured) {
    const staticCatalog = document.querySelector(".favorites .product-grid");
    const dashboardMenu = document.getElementById("customer-menu-grid");
    if (staticCatalog || dashboardMenu) {
      try {
        remoteCatalog = await fetchMenuCatalog();
        if (!remoteCatalog.length) throw new Error("No menu products have been seeded into Supabase yet.");
        if (staticCatalog) await applyCatalogToCards(staticCatalog, remoteCatalog);
      } catch (error) {
        remoteCatalog = null;
        announceError(staticCatalog || dashboardMenu, "The Supabase menu could not be loaded.", error);
      }
    }

    try {
      const addons = await fetchMenuAddons();
      const missingAddons = new Set();
      addons.forEach((addon) => {
        addonByName.set(addon.name, addon);
      });
      expectedAddonPrices.forEach((_, name) => {
        if (!addonByName.has(name)) missingAddons.add(name);
      });
      document.querySelectorAll("input[name='custom-addon'], input[name='addon']").forEach((input) => {
        const addon = addonByName.get(input.value);
        if (!addon) {
          input.disabled = true;
          input.checked = false;
          if (input.closest("label")) input.closest("label").lastChild.textContent = ` ${input.value} (unavailable)`;
          return;
        }
        input.dataset.supabaseId = addon.id;
        input.dataset.price = String(addon.price);
        input.disabled = !addon.is_available;
        if (input.disabled) input.checked = false;
        const label = input.closest("label");
        if (label) label.lastChild.textContent = addon.is_available
          ? ` ${addon.name} +₱${addon.price}`
          : ` ${addon.name} (unavailable)`;
      });
      for (const [selector, addonName, labelText] of [
        ["input[name='custom-size'][value='Large'], input[name='size'][value='Large']", "Large Size Upgrade", "Large"],
        ["input[name='custom-milk'][value='Oat'], input[name='milk'][value='Oat']", "Oat Milk Substitute", "Oat"]
      ]) {
        document.querySelectorAll(selector).forEach((input) => {
          const addon = addonByName.get(addonName);
          input.disabled = !addon?.is_available;
          const label = input.closest("label");
          if (label) label.lastChild.textContent = addon?.is_available
            ? ` ${labelText} (+₱${addon.price})`
            : ` ${labelText} (unavailable)`;
        });
      }
      if (missingAddons.size) {
        const warning = document.createElement("p");
        warning.className = "customer-empty-state";
        warning.dataset.addonMigrationWarning = "true";
        warning.setAttribute("role", "alert");
        warning.textContent = "Some requested customization options are missing from Supabase. Ask the administrator to apply migration 003_order_workflow_and_customizations.sql.";
        document.querySelectorAll("#customer-customization-modal, #customization-modal").forEach((customizationModal) => {
          customizationModal.querySelector(".customer-option-block h4")?.parentElement?.append(warning.cloneNode(true));
          customizationModal.querySelector(".customization-section h4")?.parentElement?.append(warning.cloneNode(true));
        });
      }
    } catch (error) {
      announceError(document.querySelector(".customer-option-stack, .choice-row.stacked"), "Supabase customization add-ons could not be loaded.", error);
    }

    if (orderHistory || placedOrdersList || document.getElementById("customer-orders-list")) {
      try {
        const user = await getCurrentUser();
        remoteOrders = user ? await fetchCustomerOrders() : [];
        remotePlacedOrders = user && placedOrdersList ? await fetchPlacedOrders() : [];
        if (!user && placedOrdersRealtimeStatus) {
          placedOrdersRealtimeStatus.textContent = "Log in to see orders placed on your account.";
        }
      } catch (error) {
        remoteLoadErrors.set("orders", `Supabase order history could not be loaded: ${error.message || "Unknown error."}`);
        announceError(orderHistory || document.getElementById("customer-orders-list"), "Supabase order history could not be loaded.", error);
        remoteOrders = [];
        remotePlacedOrders = [];
      }
    }
    if (reviewList || reviewHistory) {
      try {
        remoteReviews = await fetchReviews({
          includeModeration: Boolean(reviewHistory)
        });
      } catch (error) {
        remoteReviews = [];
        remoteLoadErrors.set("reviews", `Supabase reviews could not be loaded: ${error.message || "Unknown error."}`);
        announceError(reviewList || reviewHistory, "Supabase reviews could not be loaded.", error);
      }
    }
    if (suggestionHistory) {
      try {
        const user = await getCurrentUser();
        remoteSuggestions = user ? await fetchSuggestions() : [];
      } catch (error) {
        remoteSuggestions = [];
        remoteLoadErrors.set("suggestions", `Supabase suggestions could not be loaded: ${error.message || "Unknown error."}`);
        announceError(suggestionHistory, "Supabase suggestions could not be loaded.", error);
      }
    }
    if (document.getElementById("location")) {
      try {
        const cafeInfo = await fetchCafeInfo();
        if (cafeInfo) {
          const locationSection = document.getElementById("location");
          const locationBlock = Array.from(locationSection.querySelectorAll(".visit-detail"))
            .find((block) => block.querySelector("h3")?.textContent.trim() === "Location");
          const hoursBlock = Array.from(locationSection.querySelectorAll(".visit-detail"))
            .find((block) => block.querySelector("h3")?.textContent.trim() === "Opening hours");
          const phoneBlock = Array.from(locationSection.querySelectorAll(".visit-detail"))
            .find((block) => block.querySelector("h3")?.textContent.trim() === "Say hello");
          if (locationBlock && cafeInfo.address) locationBlock.querySelector("p").textContent = cafeInfo.address;
          if (hoursBlock && cafeInfo.opening_hours) hoursBlock.querySelector("p").textContent = cafeInfo.opening_hours;
          if (phoneBlock && cafeInfo.phone) {
            const phoneLink = phoneBlock.querySelector("a");
            if (phoneLink) {
              const normalizedPhone = cafeInfo.phone.replace(/[\s()-]/g, "");
              phoneLink.href = `tel:${normalizedPhone.startsWith("0") ? `+63${normalizedPhone.slice(1)}` : normalizedPhone}`;
              phoneLink.textContent = cafeInfo.phone;
            }
          }
          const socialValues = {
            Facebook: cafeInfo.facebook,
            Instagram: cafeInfo.instagram,
            TikTok: cafeInfo.tiktok
          };
          document.querySelectorAll(".social-links a").forEach((link) => {
            const label = Object.keys(socialValues).find((name) => link.textContent.includes(name));
            if (!label || !socialValues[label]) return;
            const rawUrl = socialValues[label].trim();
            link.href = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
          });
        }
      } catch (error) {
        announceError(document.getElementById("location"), "Supabase cafe information could not be loaded.", error);
      }
    }
    if (document.body.classList.contains("customer-body")) {
      renderDashboardOrders();
      renderDashboardReviews();
      renderDashboardSuggestions();
      initializeCustomerDashboard();
      initializeDashboardFeedback();
    }
  }

  renderCart();
  renderOrdersHistory();
  renderPlacedOrders();
  renderReviewsList();
  renderSuggestionsList();

  if (submitReviewButton && supabaseConfigured) {
    try {
      const user = await getCurrentUser();
      reviewAccountAllowed = Boolean(user);
      if (!reviewAccountAllowed) {
        submitReviewButton.disabled = true;
        if (reviewMessage) reviewMessage.innerHTML = 'Please <a href="login.html">log in</a> with a customer account to submit a review.';
      } else {
        submitReviewButton.disabled = !Number(reviewRatingInput?.value || 0) || !reviewComment?.value.trim();
      }
    } catch (error) {
      console.error("Review account verification failed:", error);
      submitReviewButton.disabled = true;
      if (reviewMessage) reviewMessage.textContent = "Unable to verify your account. Please sign in again.";
    }
  } else if (submitReviewButton) {
    reviewAccountAllowed = false;
    submitReviewButton.disabled = true;
    if (reviewMessage) reviewMessage.innerHTML = 'Sign in with a customer account to submit a review. <a href="login.html">Log in</a>';
  }

  if (placedOrdersList && supabaseConfigured) {
    try {
      const user = await getCurrentUser();
      if (user) {
        placedOrdersChannelCleanup = subscribeToOrders(async () => {
          remotePlacedOrders = await fetchPlacedOrders();
          remoteOrders = await fetchCustomerOrders();
          renderPlacedOrders();
          renderOrdersHistory();
          renderDashboardOrders();
        }, (status, error) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CALLBACK_ERROR") {
            console.error("Placed order live updates failed:", status, error);
            if (placedOrdersRealtimeStatus) placedOrdersRealtimeStatus.textContent = "Live updates are unavailable. Refresh to see the latest order status.";
          } else if (status === "SUBSCRIBED" && placedOrdersRealtimeStatus) {
            placedOrdersRealtimeStatus.textContent = "Live order updates connected.";
          }
        });
        window.addEventListener("pagehide", () => {
          if (!placedOrdersChannelCleanup) return;
          placedOrdersChannelCleanup().catch((error) => console.error("Unable to close the placed-order channel:", error));
          placedOrdersChannelCleanup = null;
        }, { once: true });
      }
    } catch (error) {
      console.error("Placed order live updates could not start:", error);
      if (placedOrdersRealtimeStatus) placedOrdersRealtimeStatus.textContent = "Live updates are unavailable. Refresh to see the latest order status.";
    }
  }

  if (supabaseConfigured && (reviewList || reviewHistory)) {
    let reviewChannelCleanup;
    const setRealtimeStatus = (message, isError = false) => {
      if (!reviewRealtimeStatus) return;
      reviewRealtimeStatus.textContent = message;
      reviewRealtimeStatus.classList.toggle("is-error", isError);
    };

    try {
      setRealtimeStatus("Connecting to live review updates...");
      reviewChannelCleanup = subscribeToReviews(async () => {
        remoteReviews = await fetchReviews({ includeModeration: Boolean(reviewHistory) });
        renderReviewsList();
        renderDashboardReviews();
      }, (status, error) => {
        if (error) console.error(`Supabase review realtime ${status}:`, error);
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("Live review updates connected.");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CALLBACK_ERROR") {
          setRealtimeStatus("Live review updates are unavailable. Check Supabase Realtime and the review query.", true);
        } else if (status === "CLOSED") {
          setRealtimeStatus("Live review updates disconnected.");
        }
      });
      window.addEventListener("pagehide", () => {
        if (!reviewChannelCleanup) return;
        reviewChannelCleanup().catch((error) => console.error("Unable to close the review realtime channel:", error));
        reviewChannelCleanup = null;
      }, { once: true });
    } catch (error) {
      console.error("Unable to subscribe to Supabase review updates:", error);
      setRealtimeStatus("Live review updates could not be started.", true);
    }
  }
});
