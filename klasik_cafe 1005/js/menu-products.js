"use strict";

(function () {
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);

  const formatCategoryLabel = (value) => String(value || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const renderProductCards = (productGrid, products) => {
    if (!productGrid) throw new Error("Product list is missing from the menu.");

    if (!products.length) {
      productGrid.innerHTML = '<p class="customer-empty-state">No available products right now.</p>';
      return;
    }

    productGrid.innerHTML = products.map((product) => {
      const mainCategory = product.main_category || product.category || "";
      const subcategory = product.subcategory || product.category || mainCategory;
      const image = product.image || "";

      return `
        <article class="product-card"
          data-main-category="${escapeHtml(mainCategory)}"
          data-subcategory="${escapeHtml(subcategory)}"
          data-category="${escapeHtml(mainCategory)}"
          data-best-seller="${product.is_best_seller ? "true" : "false"}"
          data-product-id="${escapeHtml(product.id)}">
          <div class="product-image image-frame">
            ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" loading="lazy">` : ""}
            <span class="media-placeholder" ${image ? "hidden" : ""}>Photo coming soon</span>
            <span class="product-category">${escapeHtml(formatCategoryLabel(subcategory).toUpperCase())}</span>
          </div>
          <div class="product-info">
            <div class="product-title">
              <h3>${escapeHtml(product.name)}</h3>
              <span>₱${Number(product.price).toLocaleString("en-US")}</span>
            </div>
            <p>${escapeHtml(product.description || "")}</p>
            <button type="button" class="customer-product-button" aria-label="Customize ${escapeHtml(product.name)}">Customize</button>
          </div>
        </article>
      `;
    }).join("");

    productGrid.querySelectorAll(".product-card").forEach((card) => {
      const image = card.querySelector("img");
      const placeholder = card.querySelector(".media-placeholder");
      if (image && placeholder) {
        image.addEventListener("error", () => {
          image.hidden = true;
          placeholder.hidden = false;
        }, { once: true });
      }
    });
  };

  window.KLASIK_MENU = { renderProductCards };
})();
