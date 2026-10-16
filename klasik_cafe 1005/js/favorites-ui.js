const favoritesKey = "klasikCafeCustomerFavorites";
const cartKeys = ["klasikCafeSupabaseCart", "klasikCafeCustomerCart"];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function getFavorites() {
  let stored;
  try {
    stored = localStorage.getItem(favoritesKey);
  } catch (error) {
    console.error("Unable to access saved favorites:", error);
    return [];
  }
  if (!stored) return [];
  try {
    const favorites = JSON.parse(stored);
    if (!Array.isArray(favorites)) throw new TypeError("Saved favorites must be a list.");
    return favorites;
  } catch (error) {
    console.error("Unable to read saved favorites:", error);
    return [];
  }
}

function saveFavorites(favorites) {
  try {
    localStorage.setItem(favoritesKey, JSON.stringify(favorites));
  } catch (error) {
    console.error("Unable to save favorites:", error);
    window.alert("Your favorites could not be saved in this browser.");
    return false;
  }
  return true;
}

function saveCustomizedFavorite(item) {
  const customizations = item.customizations || {};
  const addOns = Array.isArray(item.addOns) ? item.addOns : [];
  const variant = JSON.stringify([customizations, addOns]);
  const favorite = {
    id: `custom:${item.productId}:${encodeURIComponent(variant)}`,
    name: String(item.name || "Customized drink"),
    price: Number(item.unitPrice || 0),
    total: Number(item.total || item.unitPrice || 0),
    quantity: Math.max(1, Number(item.quantity || 1)),
    image: String(item.image || ""),
    customizations,
    addOns
  };
  const favorites = getFavorites();
  const existingIndex = favorites.findIndex((saved) => String(saved.id) === favorite.id);
  if (existingIndex >= 0) favorites[existingIndex] = favorite;
  else favorites.push(favorite);
  if (saveFavorites(favorites)) {
    syncFavoriteButtons();
    renderFavorites();
  }
}

function favoriteFromCard(card) {
  const name = card.querySelector(".product-title h3")?.textContent.trim();
  if (!name) return null;
  const priceText = card.querySelector(".product-title span")?.textContent || "";
  return {
    id: String(card.dataset.supabaseId || card.dataset.sourceKey || card.dataset.productId || name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")),
    name,
    price: Number(priceText.replace(/[^\d.]/g, "")) || 0,
    image: card.querySelector(".product-image img")?.getAttribute("src") || ""
  };
}

function syncFavoriteButtons() {
  const favoriteIds = new Set(getFavorites().map((favorite) => String(favorite.id)));
  document.querySelectorAll(".product-favorite-button").forEach((button) => {
    const card = button.closest(".product-card");
    const name = card?.querySelector(".product-title h3")?.textContent.trim() || "product";
    const isFavorite = favoriteIds.has(String(button.dataset.favoriteId));
    button.classList.toggle("is-favorite", isFavorite);
    button.setAttribute("aria-pressed", String(isFavorite));
    button.setAttribute("aria-label", `${isFavorite ? "Remove" : "Add"} ${name} ${isFavorite ? "from" : "to"} favorites`);
  });
}

function decorateCards(root = document) {
  root.querySelectorAll(".product-card").forEach((card) => {
    const favorite = favoriteFromCard(card);
    const image = card.querySelector(".product-image");
    if (!favorite || !image) return;

    let button = image.querySelector(".product-favorite-button");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "product-favorite-button";
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"></path></svg>';
      image.append(button);
    }
    button.dataset.favoriteId = favorite.id;
  });
  syncFavoriteButtons();
}

function renderFavorites() {
  const list = document.getElementById("customer-favorites-list");
  if (!list) return;
  const favorites = getFavorites();
  if (!favorites.length) {
    list.innerHTML = '<p class="customer-empty-state">Your favorites will appear here when you save a menu item.</p>';
    return;
  }
  list.innerHTML = favorites.map((favorite) => `
    <article class="customer-favorite-item">
      ${favorite.image ? `<img src="${escapeHtml(favorite.image)}" alt="" loading="lazy">` : '<div class="customer-favorite-image-placeholder" aria-hidden="true">♡</div>'}
      <div>
        <strong>${escapeHtml(favorite.name)}</strong>
        <span>₱${Number(favorite.price || 0).toLocaleString("en-US")}${favorite.quantity > 1 ? ` each · Qty ${escapeHtml(favorite.quantity)}` : ""}</span>
        ${favorite.customizations ? `<small>${escapeHtml(Object.entries(favorite.customizations).map(([name, value]) => `${name}: ${value}`).join(" · "))}</small>` : ""}
        ${favorite.addOns?.length ? `<small>Add-ons: ${escapeHtml(favorite.addOns.join(", "))}</small>` : ""}
        ${favorite.total !== undefined && favorite.quantity > 1 ? `<small>Reference total: ₱${Number(favorite.total).toLocaleString("en-US")}</small>` : ""}
      </div>
      <div class="customer-favorite-actions">
        <a href="menu.html">View menu</a>
        <button type="button" data-favorite-remove="${escapeHtml(favorite.id)}">Remove</button>
      </div>
    </article>
  `).join("");
}

function updateCartBadge() {
  const badge = document.getElementById("cart-count-badge");
  if (!badge) return;
  for (const key of cartKeys) {
    try {
      const cart = JSON.parse(localStorage.getItem(key) || "[]");
      if (!Array.isArray(cart)) throw new TypeError("Saved cart must be a list.");
      if (cart.length) {
        badge.textContent = String(cart.reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1), 0));
        return;
      }
    } catch (error) {
      console.error(`Unable to read saved cart "${key}":`, error);
    }
  }
  badge.textContent = "0";
}

document.addEventListener("DOMContentLoaded", () => {
  decorateCards();
  renderFavorites();
  updateCartBadge();

  document.addEventListener("click", (event) => {
    const favoriteButton = event.target.closest(".product-favorite-button");
    if (favoriteButton) {
      event.preventDefault();
      event.stopPropagation();
      const favorite = favoriteFromCard(favoriteButton.closest(".product-card"));
      if (!favorite) return;
      const favorites = getFavorites();
      const existingIndex = favorites.findIndex((item) => String(item.id) === favorite.id);
      if (existingIndex >= 0) favorites.splice(existingIndex, 1);
      else favorites.push(favorite);
      if (saveFavorites(favorites)) {
        syncFavoriteButtons();
        renderFavorites();
      }
      return;
    }

    const removeButton = event.target.closest("[data-favorite-remove]");
    if (!removeButton) return;
    const favorites = getFavorites().filter((favorite) => String(favorite.id) !== removeButton.dataset.favoriteRemove);
    if (saveFavorites(favorites)) {
      renderFavorites();
      syncFavoriteButtons();
    }
  });

  window.addEventListener("klasik:add-custom-favorite", (event) => {
    if (!event.detail || typeof event.detail !== "object") {
      console.error("A customized favorite was requested without item details.");
      return;
    }
    saveCustomizedFavorite(event.detail);
  });

  const observer = new MutationObserver(() => decorateCards());
  observer.observe(document.documentElement, { childList: true, subtree: true });
});

window.addEventListener("storage", (event) => {
  if (event.key === favoritesKey) {
    syncFavoriteButtons();
    renderFavorites();
  }
  if (cartKeys.includes(event.key)) updateCartBadge();
});
