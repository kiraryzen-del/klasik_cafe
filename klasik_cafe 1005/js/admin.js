import { inviteStaffMember, requireRole } from "./supabase-auth.js";
import { supabaseConfigured } from "./supabase-client.js";
import {
  deleteMenuAddon,
  deleteMenuItem,
  deleteReview,
  fetchAllMenuAddons,
  fetchCafeInfo,
  fetchMenuCatalog,
  fetchMenuCategories,
  fetchReviews,
  fetchStaffOrders,
  fetchStoreSettings,
  fetchSuggestions,
  moderateReview,
  saveCafeInfo,
  saveMenuAddon,
  saveMenuCategory,
  saveMenuItem,
  saveStoreSettings,
  uploadMenuItemImage,
  subscribeToOrders,
  subscribeToReviews,
  setMenuItemAvailability,
  setOrderStatus,
  updateSuggestion
} from "./supabase-data.js";
import { downloadLocalDataBackup, importLegacyAdminMenu } from "./supabase-migration.js";
import { themedConfirm } from "./ui-dialogs.js";

"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const storageKeys = {
    products: "klasikCafeAdminProducts",
    reviews: "klasikCafeAdminReviews",
    suggestions: "klasikCafeAdminSuggestions",
    cafeInfo: "klasikCafeInfo"
  };
  const defaultStoreSettings = {
    theme: "royal-blue",
    mobileMenuEnabled: true,
    autoSaveEnabled: true
  };
  let storeSettings = { ...defaultStoreSettings, ...loadData("klasikCafeStoreSettings", defaultStoreSettings) };

  const defaultProducts = [
    { id: 1, name: "Amerikano", category: "coffee", mainCategory: "coffee", subcategory: "iced-coffee", description: "Dark, smooth, and refreshing.", price: 120, image: "images/products/coffee/amerikano.jpg", available: true },
    { id: 2, name: "Classic Latte", category: "coffee", mainCategory: "coffee", subcategory: "hot-coffee", description: "Smooth espresso with steamed milk.", price: 150, image: "images/products/latte.jpg", available: true },
    { id: 3, name: "Klasik Espesyal", category: "coffee", mainCategory: "coffee", subcategory: "espesyal", description: "Our signature house espresso special.", price: 180, image: "images/products/spanish-latte.jpg", available: true },
    { id: 4, name: "Mocha Frappe", category: "non-coffee", mainCategory: "non-coffee", subcategory: "non-coffee", description: "Chocolate and cold cream blend.", price: 170, image: "images/products/icedmocha.jpg", available: true },
    { id: 5, name: "Butter Croissant", category: "pastries", mainCategory: "pastries", subcategory: "pastries", description: "Buttery and flaky.", price: 90, image: "images/products/croissant.jpg", available: true },
    { id: 6, name: "Extra Shot", category: "add-ons", mainCategory: "add-ons", subcategory: "add-ons", description: "Extra espresso boost.", price: 30, image: "images/products/coffee.jpg", available: true }
  ];

  const defaultReviews = [
    { id: 1, customer: "Maria D.", rating: 5, comment: "Great coffee and friendly staff!", date: "2026-10-01" },
    { id: 2, customer: "Jose L.", rating: 4, comment: "Loved the pastries and ambience.", date: "2026-10-02" }
  ];

  const defaultSuggestions = [
    { id: 1, customer: "Ari A.", subject: "More seating", suggestion: "Can we add more indoor seating for students?", date: "2026-10-01", status: "New" },
    { id: 2, customer: "Lia C.", subject: "Seasonal drinks", suggestion: "A seasonal pumpkin spice drink would be nice.", date: "2026-10-02", status: "Reviewing" }
  ];

  const defaultCafeInfo = {
    name: "KLASIK CAFE",
    address: "Beside Chapel, Matimbubong, San Ildefonso, Bulacan",
    hours: "Mon-Sun: 7:00 AM - 9:00 PM",
    phone: "+63 912 345 6789",
    facebook: "facebook.com/klasikcafe",
    instagram: "@klasikcafe",
    tiktok: "@klasikcafe",
    description: "A neighborhood coffee haven known for handcrafted drinks and warm hospitality."
  };

  const products = loadData(storageKeys.products, defaultProducts);
  const adminReviews = loadData(storageKeys.reviews, defaultReviews);
  const suggestions = loadData(storageKeys.suggestions, defaultSuggestions);
  const cafeInfo = { ...defaultCafeInfo, ...loadData(storageKeys.cafeInfo, defaultCafeInfo) };
  let categories = [];
  let addons = [];

  const productTableBody = document.getElementById("admin-product-table-body");
  const productPagination = document.getElementById("admin-product-pagination");
  const productSearchInput = document.getElementById("admin-product-search-input");
  const productSearchStatus = document.getElementById("admin-product-search-status");
  const productSearchSuggestions = document.getElementById("admin-product-search-suggestions");
  const reviewList = document.getElementById("admin-review-list");
  const reviewRealtimeStatus = document.getElementById("admin-review-realtime-status");
  const suggestionList = document.getElementById("admin-suggestion-list");
  const productModal = document.getElementById("product-modal");
  const productForm = document.getElementById("product-form");
  const addProductTrigger = document.getElementById("add-product-trigger");
  const cancelProductModal = document.getElementById("cancel-product-modal");
  const productImageFile = document.getElementById("product-image-file");
  const productImageDropzone = document.getElementById("product-image-dropzone");
  const productImagePreviewWrap = document.getElementById("product-image-preview-wrap");
  const productImagePreview = document.getElementById("product-image-preview");
  const productImageFileName = document.getElementById("product-image-file-name");
  const productImageUploadStatus = document.getElementById("product-image-upload-status");
  const productAvailability = document.getElementById("product-availability");
  const cafeForm = document.getElementById("cafe-info-form");
  const settingsForm = document.getElementById("store-settings-form");
  const storeSettingsMessage = document.getElementById("store-settings-message");
  const orderList = document.getElementById("admin-order-list");
  let productSearchQuery = "";
  let currentProductPage = 1;
  const productsPerPage = 10;
  const categoryForm = document.getElementById("menu-category-form");
  const addonForm = document.getElementById("menu-addon-form");
  const supabaseMenuTools = document.getElementById("supabase-menu-tools");
  const staffAccountsSection = document.getElementById("admin-staff-accounts");
  const staffAccountsNav = document.getElementById("staff-accounts-nav");
  const staffInviteForm = document.getElementById("staff-invite-form");
  const staffInviteMessage = document.getElementById("staff-invite-message");
  let reviewChannelCleanup = null;
  let orderChannelCleanup = null;
  let selectedProductImage = null;
  let productImagePreviewUrl = null;

  function loadData(key, fallback) {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function formatCategoryLabel(value) {
    return (value || "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

  function createSlug(value) {
    return value.toLowerCase().trim().normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function getSubcategoryOptions(mainCategory) {
    if (mainCategory === "add-ons") return [];
    if (supabaseConfigured && categories.length) {
      const parent = categories.find((item) => item.slug === mainCategory);
      if (!parent) return [];
      const children = categories.filter((item) => item.parent_id === parent.id);
      return (children.length ? children : [parent]).map((item) => ({
        value: item.slug,
        label: item.name
      }));
    }

    const options = {
      coffee: [
        { value: "iced-coffee", label: "Iced Coffee" },
        { value: "hot-coffee", label: "Hot Coffee" },
        { value: "espesyal", label: "Espesyal" }
      ],
      "non-coffee": [
        { value: "non-coffee", label: "Non Coffee" },
        { value: "espesyal", label: "Espesyal" }
      ],
      matcha: [{ value: "matcha", label: "Matcha Series" }],
      pastries: [
        { value: "smores", label: "Smores" },
        { value: "cookies", label: "Cookies" },
        { value: "cheesecakes", label: "Cheesecakes" }
      ],
      snacks: [],
      pasta: [],
      "add-ons": []
    };

    return options[mainCategory] || [{ value: mainCategory, label: formatCategoryLabel(mainCategory) }];
  }

  function populateSubcategoryOptions(mainCategory, selectedValue = null) {
    const subcategorySelect = document.getElementById("product-subcategory");
    if (!subcategorySelect) return;

    const options = getSubcategoryOptions(mainCategory);
    const subcategoryLabel = subcategorySelect.closest("label");
    if (subcategoryLabel) subcategoryLabel.hidden = options.length === 0;
    subcategorySelect.innerHTML = options.map((option) => `
      <option value="${option.value}" ${selectedValue === option.value ? "selected" : ""}>${option.label}</option>
    `).join("");

    if (!selectedValue && options[0]) {
      subcategorySelect.value = options[0].value;
    }
  }

  function populateCategoryControls() {
    if (!supabaseConfigured || !categories.length) return;
    const mainSelect = document.getElementById("product-main-category");
    const parentSelect = document.getElementById("menu-category-parent");
    const roots = categories.filter((item) => !item.parent_id);
    if (mainSelect) {
      mainSelect.innerHTML = roots.map((item) =>
        `<option value="${escapeHtml(item.slug)}">${escapeHtml(item.name)}</option>`
      ).join("");
    }
    if (parentSelect) {
      parentSelect.innerHTML = `<option value="">Main category</option>${roots.map((item) =>
        `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`
      ).join("")}`;
    }
    if (mainSelect) populateSubcategoryOptions(mainSelect.value);
    renderCategories();
  }

  function renderCategories() {
    const list = document.getElementById("admin-category-list");
    if (!list) return;
    list.innerHTML = categories.map((category) => {
      const parent = categories.find((item) => item.id === category.parent_id);
      return `<li>${escapeHtml(parent ? `${parent.name} / ` : "")}${escapeHtml(category.name)}</li>`;
    }).join("");
  }

  function renderAddons() {
    const list = document.getElementById("admin-addon-list");
    if (!list) return;
    list.innerHTML = addons.map((addon) => `
      <li>
        <span>${escapeHtml(addon.name)} — ₱${escapeHtml(addon.price)}</span>
        <select class="small-select addon-availability" data-addon-id="${escapeHtml(addon.id)}">
          <option value="Available" ${addon.is_available ? "selected" : ""}>Available</option>
          <option value="Unavailable" ${!addon.is_available ? "selected" : ""}>Unavailable</option>
        </select>
        <button type="button" class="inline-button edit-addon" data-addon-id="${escapeHtml(addon.id)}">Edit</button>
        <button type="button" class="inline-button delete-addon" data-addon-id="${escapeHtml(addon.id)}">Delete</button>
      </li>
    `).join("");
  }

  function renderProducts() {
    if (!productTableBody) return;

    productTableBody.innerHTML = products.map((product) => {
      const mainCategory = product.mainCategory || product.category || "coffee";
      const subcategory = product.subcategory || product.category || mainCategory;
      const categoryLabel = subcategory === mainCategory
        ? formatCategoryLabel(mainCategory)
        : `${formatCategoryLabel(mainCategory)} / ${formatCategoryLabel(subcategory)}`;

      return `
        <tr>
          <td>${product.image ? `<img class="admin-product-thumbnail" src="${escapeHtml(product.image)}" alt="" loading="lazy">` : "—"}</td>
          <td>${escapeHtml(product.name)}</td>
          <td>${escapeHtml(categoryLabel)}</td>
          <td>₱${escapeHtml(product.price)}</td>
          <td>
            <label class="availability-switch" aria-label="${product.available ? "Mark unavailable" : "Mark available"}: ${escapeHtml(product.name)}">
              <input class="availability-switch-input" type="checkbox" data-product-id="${escapeHtml(product.id)}" ${product.available ? "checked" : ""}>
              <span class="availability-switch-track" aria-hidden="true"></span>
              <span class="availability-switch-label">${product.available ? "Available" : "Unavailable"}</span>
            </label>
          </td>
          <td>
            <div class="table-actions">
              <button type="button" class="table-button edit-btn" data-product-id="${escapeHtml(product.id)}">Edit</button>
              <button type="button" class="table-button delete" data-product-id="${escapeHtml(product.id)}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
    updateProductSearch();
  }

  function updateProductSearch() {
    if (!productTableBody) return;

    const rows = Array.from(productTableBody.querySelectorAll("tr:not([data-no-product-matches])"));
    const matching = [];
    rows.forEach((row) => {
      const matches = !productSearchQuery || row.textContent.toLocaleLowerCase().includes(productSearchQuery);
      row.hidden = true;
      if (matches) matching.push(row);
    });

    let emptyRow = productTableBody.querySelector("[data-no-product-matches]");
    if (productSearchQuery && !matching.length) {
      if (!emptyRow) {
        emptyRow = document.createElement("tr");
        emptyRow.dataset.noProductMatches = "true";
        emptyRow.innerHTML = "<td colspan='5'>No matching products.</td>";
        productTableBody.append(emptyRow);
      }
    } else {
      emptyRow?.remove();
    }

    const pageCount = Math.max(1, Math.ceil(matching.length / productsPerPage));
    currentProductPage = Math.min(currentProductPage, pageCount);
    matching.slice((currentProductPage - 1) * productsPerPage, currentProductPage * productsPerPage)
      .forEach((row) => { row.hidden = false; });
    if (productPagination) {
      productPagination.innerHTML = pageCount > 1 ? `
        <button class="table-button" type="button" data-product-page="${currentProductPage - 1}" ${currentProductPage === 1 ? "disabled" : ""}>Previous</button>
        <span>Page ${currentProductPage} of ${pageCount} · ${matching.length} products</span>
        <button class="table-button" type="button" data-product-page="${currentProductPage + 1}" ${currentProductPage === pageCount ? "disabled" : ""}>Next</button>
      ` : matching.length ? `<span>${matching.length} product${matching.length === 1 ? "" : "s"}</span>` : "";
    }

    if (!productSearchSuggestions || !productSearchStatus) return;
    productSearchSuggestions.replaceChildren();
    if (!productSearchQuery || matching.length) {
      productSearchStatus.textContent = "";
      return;
    }

    const editDistance = (left, right) => {
      const row = Array.from({ length: right.length + 1 }, (_, index) => index);
      for (let i = 1; i <= left.length; i += 1) {
        let diagonal = row[0];
        row[0] = i;
        for (let j = 1; j <= right.length; j += 1) {
          const above = row[j];
          row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (left[i - 1] === right[j - 1] ? 0 : 1));
          diagonal = above;
        }
      }
      return row[right.length];
    };
    const suggestions = products.map((product) => {
      const words = product.name.toLocaleLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
      return {
        name: product.name,
        distance: Math.min(...words.map((word) => editDistance(productSearchQuery, word)))
      };
    }).filter((item) => item.distance <= Math.max(2, Math.floor(productSearchQuery.length * 0.4)))
      .sort((left, right) => left.distance - right.distance || left.name.localeCompare(right.name))
      .slice(0, 4);

    productSearchStatus.textContent = `No results for "${productSearchInput.value.trim()}".${suggestions.length ? " Did you mean:" : " Try a different search."}`;
    suggestions.forEach((item) => {
      const suggestion = document.createElement("button");
      suggestion.type = "button";
      suggestion.className = "admin-product-search-suggestion";
      suggestion.textContent = item.name;
      suggestion.addEventListener("click", () => {
        productSearchInput.value = item.name;
        productSearchInput.dispatchEvent(new Event("input", { bubbles: true }));
        productSearchInput.focus();
      });
      productSearchSuggestions.append(suggestion);
    });
  }

  productSearchInput?.addEventListener("input", () => {
    productSearchQuery = productSearchInput.value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
    currentProductPage = 1;
    updateProductSearch();
  });

  function renderReviews() {
    if (!reviewList) return;

    reviewList.innerHTML = adminReviews.length ? adminReviews.map((review) => `
      <div class="admin-review-item">
        <strong>${escapeHtml(review.customer || "Customer")}</strong>
        <span class="review-rating">${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</span>
        <p>${escapeHtml(review.comment)}</p>
        <span>${escapeHtml(review.date || new Date(review.created_at).toLocaleDateString())}</span>
        ${supabaseConfigured ? `<select class="small-select review-status" data-review-id="${escapeHtml(review.id)}">
          <option value="pending" ${review.status === "pending" ? "selected" : ""}>Pending</option>
          <option value="approved" ${review.status === "approved" ? "selected" : ""}>Approved</option>
          <option value="rejected" ${review.status === "rejected" ? "selected" : ""}>Rejected</option>
        </select>` : ""}
        <button type="button" class="inline-button delete-review" data-review-id="${escapeHtml(review.id)}">Delete</button>
      </div>
    `).join("") : '<p class="customer-empty-state">No reviews have been submitted yet.</p>';
  }

  function replaceAdminReviews(rows) {
    adminReviews.splice(0, adminReviews.length, ...rows.map((item) => ({
      ...item,
      customer: "Customer",
      date: new Date(item.created_at).toLocaleDateString()
    })));
    renderReviews();
  }

  function setReviewRealtimeStatus(message, isError = false) {
    if (!reviewRealtimeStatus) return;
    reviewRealtimeStatus.textContent = message;
    reviewRealtimeStatus.classList.toggle("is-error", isError);
  }

  function renderSuggestions() {
    if (!suggestionList) return;

    suggestionList.innerHTML = suggestions.map((item) => `
      <div class="admin-suggestion-item">
        <div>
          <strong>${escapeHtml(item.customer || "Customer")}</strong>
          <p>${escapeHtml(item.subject)}</p>
          <small>${escapeHtml(item.suggestion)}</small>
        </div>
        <span>${escapeHtml(item.date || new Date(item.created_at).toLocaleDateString())}</span>
        <select class="small-select suggestion-status" data-suggestion-id="${escapeHtml(item.id)}">
          <option value="New" ${item.status === "New" ? "selected" : ""}>New</option>
          <option value="Reviewing" ${item.status === "Reviewing" ? "selected" : ""}>Reviewing</option>
          <option value="Resolved" ${item.status === "Resolved" ? "selected" : ""}>Resolved</option>
        </select>
      </div>
    `).join("");
  }

  function populateCafeInfo() {
    document.getElementById("cafe-name").value = cafeInfo.name;
    document.getElementById("cafe-address").value = cafeInfo.address;
    document.getElementById("cafe-hours").value = cafeInfo.hours;
    document.getElementById("cafe-phone").value = cafeInfo.phone;
    document.getElementById("cafe-facebook").value = cafeInfo.facebook;
    document.getElementById("cafe-instagram").value = cafeInfo.instagram;
    document.getElementById("cafe-tiktok").value = cafeInfo.tiktok;
    document.getElementById("cafe-description").value = cafeInfo.description;
  }

  function populateStoreSettings() {
    const themeInput = document.getElementById("store-theme");
    const mobileMenuInput = document.getElementById("store-mobile-menu");
    const autoSaveInput = document.getElementById("store-auto-save");
    if (themeInput) themeInput.value = storeSettings.theme;
    if (mobileMenuInput) mobileMenuInput.value = String(storeSettings.mobileMenuEnabled);
    if (autoSaveInput) autoSaveInput.value = String(storeSettings.autoSaveEnabled);
  }

  function renderOrders(orders) {
    if (!orderList) return;
    const allowedTransitions = {
      Pending: ["Pending", "Accepted"],
      Accepted: ["Accepted", "Preparing", "Cancelled"],
      Preparing: ["Preparing", "Ready", "Cancelled"],
      Ready: ["Ready", "Completed", "Cancelled"],
      Completed: ["Completed"],
      Cancelled: ["Cancelled"]
    };
    orderList.innerHTML = orders.length ? orders.map((order) => `
      <li>
        <span>Order #${escapeHtml(order.displayId)} — ${escapeHtml(order.customer)}</span>
        <strong>₱${escapeHtml(order.total)}</strong>
        <select class="small-select admin-order-status" data-order-id="${escapeHtml(order.id)}" data-status="${escapeHtml(order.status.toLowerCase())}">
          ${["Pending", "Accepted", "Preparing", "Ready", "Completed", "Cancelled"].map((status) =>
            `<option value="${status}" class="status-option-${status.toLowerCase()}" ${order.status === status ? "selected" : ""} ${allowedTransitions[order.status]?.includes(status) ? "" : "disabled"}>${status}</option>`
          ).join("")}
        </select>
      </li>
    `).join("") : "<li>No Supabase orders yet.</li>";
  }

  function openProductModal(product = null) {
    if (!productModal) return;
    selectedProductImage = null;
    if (productImageFile) productImageFile.value = "";
    if (productImageUploadStatus) {
      productImageUploadStatus.textContent = supabaseConfigured
        ? "Uploads use the public Supabase Storage bucket named menu-images."
        : "This browser stores the selected image locally.";
      productImageUploadStatus.classList.remove("is-error");
    }
    if (productImagePreviewUrl) URL.revokeObjectURL(productImagePreviewUrl);
    productImagePreviewUrl = null;

    const mainCategory = product ? (product.mainCategory || product.category || "coffee") : "coffee";
    const subcategory = product
      ? (product.categorySlug || product.subcategory || product.category || "iced-coffee")
      : (supabaseConfigured ? (categories.find((item) => item.parent_id === categories.find((candidate) => candidate.slug === mainCategory)?.id)?.slug || mainCategory) : "iced-coffee");

    if (product) {
      document.getElementById("product-id").value = product.id;
      document.getElementById("product-name").value = product.name;
      document.getElementById("product-main-category").value = mainCategory;
      populateSubcategoryOptions(mainCategory, subcategory);
      document.getElementById("product-description").value = product.description;
      document.getElementById("product-price").value = product.price;
      document.getElementById("product-image").value = product.image;
      productAvailability.checked = Boolean(product.available);
      setProductImagePreview(product.image, "Current product image");
      document.querySelector("#product-form button[type='submit']").textContent = "Save Changes";
      document.getElementById("product-modal-title").textContent = "Edit Product";
    } else {
      productForm.reset();
      document.getElementById("product-id").value = "";
      document.getElementById("product-image").value = "";
      const defaultMainCategory = supabaseConfigured ? (categories.find((item) => !item.parent_id)?.slug || "coffee") : "coffee";
      document.getElementById("product-main-category").value = defaultMainCategory;
      populateSubcategoryOptions(defaultMainCategory, supabaseConfigured ? null : "iced-coffee");
      productAvailability.checked = true;
      setProductImagePreview("", "");
      document.querySelector("#product-form button[type='submit']").textContent = "Add Product";
      document.getElementById("product-modal-title").textContent = "Add Product";
    }

    productModal.hidden = false;
  }

  function setProductImagePreview(source, fileName) {
    if (!productImagePreviewWrap || !productImagePreview || !productImageFileName) return;
    if (!source) {
      productImagePreviewWrap.hidden = true;
      productImagePreview.removeAttribute("src");
      productImageFileName.textContent = "";
      return;
    }
    productImagePreview.src = source;
    productImageFileName.textContent = fileName;
    productImagePreviewWrap.hidden = false;
  }

  function acceptProductImage(file) {
    if (!file) return;
    const maxBytes = supabaseConfigured ? 5 * 1024 * 1024 : 1024 * 1024;
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
      selectedProductImage = null;
      if (productImageUploadStatus) {
        productImageUploadStatus.textContent = "Choose a PNG, JPG, WEBP, or GIF image.";
        productImageUploadStatus.classList.add("is-error");
      }
      if (productImageFile) productImageFile.value = "";
      setProductImagePreview(document.getElementById("product-image").value, "Current product image");
      return;
    }
    if (file.size > maxBytes) {
      selectedProductImage = null;
      if (productImageUploadStatus) {
        productImageUploadStatus.textContent = `This image is larger than ${supabaseConfigured ? "5 MB" : "1 MB"}. Choose a smaller file.`;
        productImageUploadStatus.classList.add("is-error");
      }
      if (productImageFile) productImageFile.value = "";
      setProductImagePreview(document.getElementById("product-image").value, "Current product image");
      return;
    }
    selectedProductImage = file;
    if (productImagePreviewUrl) URL.revokeObjectURL(productImagePreviewUrl);
    productImagePreviewUrl = URL.createObjectURL(file);
    setProductImagePreview(productImagePreviewUrl, file.name);
    if (productImageUploadStatus) {
      productImageUploadStatus.textContent = `Ready to upload: ${file.name}`;
      productImageUploadStatus.classList.remove("is-error");
    }
  }

  productImageFile?.addEventListener("change", () => acceptProductImage(productImageFile.files[0]));
  productImageDropzone?.addEventListener("dragover", (event) => {
    event.preventDefault();
    productImageDropzone.classList.add("is-dragging");
  });
  productImageDropzone?.addEventListener("dragleave", (event) => {
    if (!productImageDropzone.contains(event.relatedTarget)) productImageDropzone.classList.remove("is-dragging");
  });
  productImageDropzone?.addEventListener("drop", (event) => {
    event.preventDefault();
    productImageDropzone.classList.remove("is-dragging");
    acceptProductImage(event.dataTransfer.files[0]);
  });
  productAvailability?.addEventListener("change", () => {
    const label = productAvailability.closest(".availability-switch")?.querySelector(".availability-switch-label");
    if (label) label.textContent = productAvailability.checked ? "Available" : "Unavailable";
  });

  function closeProductModal() {
    if (productModal) productModal.hidden = true;
    if (productImagePreviewUrl) URL.revokeObjectURL(productImagePreviewUrl);
    productImagePreviewUrl = null;
  }

  const productMainCategory = document.getElementById("product-main-category");
  const productSubcategory = document.getElementById("product-subcategory");

  productMainCategory?.addEventListener("change", (event) => {
    populateSubcategoryOptions(event.target.value, null);
  });

  addProductTrigger.addEventListener("click", () => openProductModal());
  cancelProductModal.addEventListener("click", closeProductModal);
  productModal?.querySelector(".modal-close")?.addEventListener("click", closeProductModal);
  productModal?.addEventListener("click", (event) => {
    if (event.target === productModal) closeProductModal();
  });

  productForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = document.getElementById("product-id").value;
    const mainCategory = document.getElementById("product-main-category").value;
    const subcategory = document.getElementById("product-subcategory").value || mainCategory;
    let image = document.getElementById("product-image").value.trim();
    const submitButton = productForm.querySelector("button[type='submit']");
    if (selectedProductImage) {
      submitButton.disabled = true;
      if (productImageUploadStatus) {
        productImageUploadStatus.textContent = supabaseConfigured ? "Uploading image…" : "Preparing image…";
        productImageUploadStatus.classList.remove("is-error");
      }
      try {
        if (supabaseConfigured) {
          image = await uploadMenuItemImage(selectedProductImage);
        } else {
          image = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.addEventListener("load", () => resolve(reader.result));
            reader.addEventListener("error", () => reject(new Error("The image file could not be read.")));
            reader.readAsDataURL(selectedProductImage);
          });
        }
        document.getElementById("product-image").value = image;
        selectedProductImage = null;
        if (productImageFile) productImageFile.value = "";
        if (productImageUploadStatus) productImageUploadStatus.textContent = "Image ready to save.";
      } catch (error) {
        console.error("Product image upload failed:", error);
        if (productImageUploadStatus) {
          productImageUploadStatus.textContent = error.message || "Unable to upload this image.";
          productImageUploadStatus.classList.add("is-error");
        }
        submitButton.disabled = false;
        return;
      }
    }
    const record = {
      id: id ? (supabaseConfigured ? id : Number(id)) : Date.now(),
      name: document.getElementById("product-name").value.trim(),
      category: mainCategory,
      mainCategory,
      categorySlug: subcategory,
      categoryId: categories.find((item) => item.slug === subcategory)?.id,
      subcategory,
      description: document.getElementById("product-description").value.trim(),
      price: Number(document.getElementById("product-price").value),
      image,
      available: productAvailability.checked
    };

    if (!record.name || !record.description || !record.price) {
      submitButton.disabled = false;
      return;
    }

    if (supabaseConfigured) {
      try {
        if (!record.categoryId) throw new Error("Choose a valid menu category.");
        const saved = await saveMenuItem(record);
        record.id = saved.id;
        const existingIndex = products.findIndex((item) => String(item.id) === String(record.id));
        if (existingIndex >= 0) products[existingIndex] = record;
        else products.push(record);
        renderProducts();
        closeProductModal();
      } catch (error) {
        console.error("Menu item save failed:", error);
        window.alert(error.message || "Unable to save the menu item.");
      } finally {
        submitButton.disabled = false;
      }
      return;
    }

    const existingIndex = products.findIndex((item) => String(item.id) === String(record.id));
    if (existingIndex >= 0) {
      products[existingIndex] = record;
    } else {
      products.push(record);
    }

    saveData(storageKeys.products, products);
    renderProducts();
    closeProductModal();
    submitButton.disabled = false;
  });

  document.addEventListener("click", async (event) => {
    const pageButton = event.target.closest("[data-product-page]");
    if (pageButton) {
      currentProductPage = Number(pageButton.dataset.productPage);
      updateProductSearch();
      return;
    }

    const editButton = event.target.closest(".edit-btn");
    if (editButton) {
      const product = products.find((item) => String(item.id) === editButton.dataset.productId);
      if (product) openProductModal(product);
      return;
    }

    const deleteButton = event.target.closest(".delete");
    if (deleteButton) {
      const id = supabaseConfigured ? deleteButton.dataset.productId : Number(deleteButton.dataset.productId);
      const product = products.find((item) => String(item.id) === String(id));
      if (!product) return;
      const confirmDelete = await themedConfirm({
        title: "Delete product?",
        message: `This will remove ${product.name} from the menu.`,
        confirmLabel: "Delete product"
      });
      if (confirmDelete && supabaseConfigured) {
        deleteMenuItem(id).then(() => {
          const index = products.findIndex((item) => String(item.id) === String(id));
          if (index >= 0) {
            products.splice(index, 1);
            renderProducts();
          }
        }).catch((error) => {
          console.error("Menu item deletion failed:", error);
          window.alert(error.message || "Unable to delete the menu item.");
        });
      } else if (confirmDelete) {
        const index = products.findIndex((item) => String(item.id) === String(id));
        if (index >= 0) {
          products.splice(index, 1);
          saveData(storageKeys.products, products);
          renderProducts();
        }
      }
    }

    const reviewDeleteButton = event.target.closest(".delete-review");
    if (reviewDeleteButton) {
      const id = supabaseConfigured ? reviewDeleteButton.dataset.reviewId : Number(reviewDeleteButton.dataset.reviewId);
      const review = adminReviews.find((item) => String(item.id) === String(id));
      if (!review) return;
      const confirmDelete = await themedConfirm({
        title: "Delete review?",
        message: `This will permanently remove the review from ${review.customer || "this customer"}.`,
        confirmLabel: "Delete review"
      });
      if (confirmDelete && supabaseConfigured) {
        deleteReview(id).then(() => {
          const index = adminReviews.findIndex((item) => String(item.id) === String(id));
          if (index >= 0) {
            adminReviews.splice(index, 1);
            renderReviews();
          }
        }).catch((error) => {
          console.error("Review deletion failed:", error);
          window.alert(error.message || "Unable to delete the review.");
        });
      } else if (confirmDelete) {
        const index = adminReviews.findIndex((item) => String(item.id) === String(id));
        if (index >= 0) {
          adminReviews.splice(index, 1);
          saveData(storageKeys.reviews, adminReviews);
          renderReviews();
        }
      }
    }

    const editAddonButton = event.target.closest(".edit-addon");
    if (editAddonButton) {
      const addon = addons.find((item) => item.id === editAddonButton.dataset.addonId);
      if (addon) {
        document.getElementById("menu-addon-id").value = addon.id;
        document.getElementById("menu-addon-name").value = addon.name;
        document.getElementById("menu-addon-price").value = addon.price;
      }
    }

    const deleteAddonButton = event.target.closest(".delete-addon");
    if (deleteAddonButton && await themedConfirm({
      title: "Delete add-on?",
      message: "This will remove the customization add-on from future orders.",
      confirmLabel: "Delete add-on"
    })) {
      deleteMenuAddon(deleteAddonButton.dataset.addonId).then(async () => {
        addons = await fetchAllMenuAddons();
        renderAddons();
      }).catch((error) => {
        console.error("Add-on deletion failed:", error);
        window.alert(error.message || "Unable to delete the add-on.");
      });
    }
  });

  document.addEventListener("change", async (event) => {
    const availabilitySwitch = event.target.closest(".availability-switch-input");
    if (availabilitySwitch) {
      const id = availabilitySwitch.dataset.productId;
      const product = products.find((item) => String(item.id) === String(id));
      if (product) {
        const nextAvailability = availabilitySwitch.checked;
        try {
          if (supabaseConfigured) await setMenuItemAvailability(id, nextAvailability);
          product.available = nextAvailability;
          if (!supabaseConfigured) saveData(storageKeys.products, products);
          renderProducts();
        } catch (error) {
          availabilitySwitch.checked = product.available;
          console.error("Menu availability update failed:", error);
          window.alert(error.message || "Unable to update availability.");
        }
      }
    }

    const suggestionStatusSelect = event.target.closest(".suggestion-status");
    if (suggestionStatusSelect) {
      const id = supabaseConfigured ? suggestionStatusSelect.dataset.suggestionId : Number(suggestionStatusSelect.dataset.suggestionId);
      const suggestion = suggestions.find((item) => String(item.id) === String(id));
      if (suggestion) {
        try {
          if (supabaseConfigured) await updateSuggestion(id, suggestionStatusSelect.value);
          suggestion.status = suggestionStatusSelect.value;
          if (!supabaseConfigured) saveData(storageKeys.suggestions, suggestions);
          renderSuggestions();
        } catch (error) {
          console.error("Suggestion update failed:", error);
          window.alert(error.message || "Unable to update suggestion.");
        }
      }
    }

    const reviewStatusSelect = event.target.closest(".review-status");
    if (reviewStatusSelect) {
      const review = adminReviews.find((item) => String(item.id) === reviewStatusSelect.dataset.reviewId);
      if (review) {
        try {
          await moderateReview(review.id, reviewStatusSelect.value);
          review.status = reviewStatusSelect.value;
        } catch (error) {
          console.error("Review moderation failed:", error);
          window.alert(error.message || "Unable to update review status.");
        }
      }
    }

    const addonAvailability = event.target.closest(".addon-availability");
    if (addonAvailability) {
      const addon = addons.find((item) => item.id === addonAvailability.dataset.addonId);
      if (addon) {
        const previousValue = addon.is_available ? "Available" : "Unavailable";
        try {
          const saved = await saveMenuAddon({ ...addon, isAvailable: addonAvailability.value === "Available" });
          const index = addons.findIndex((item) => item.id === saved.id);
          if (index >= 0) addons[index] = saved;
          renderAddons();
        } catch (error) {
          addonAvailability.value = previousValue;
          console.error("Add-on availability update failed:", error);
          window.alert(error.message || "Unable to update add-on availability.");
        }
      }
    }

    const orderStatusSelect = event.target.closest(".admin-order-status");
    if (orderStatusSelect) {
      const previousStatus = orderStatusSelect.dataset.status;
      const nextStatus = orderStatusSelect.value;
      try {
        await setOrderStatus(orderStatusSelect.dataset.orderId, nextStatus);
        renderOrders(await fetchStaffOrders());
      } catch (error) {
        orderStatusSelect.value = previousStatus.charAt(0).toUpperCase() + previousStatus.slice(1);
        console.error("Admin order status update failed:", error);
        window.alert(error.message || "Unable to update order status.");
      }
    }
  });

  cafeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const updatedInfo = {
      name: document.getElementById("cafe-name").value.trim(),
      address: document.getElementById("cafe-address").value.trim(),
      hours: document.getElementById("cafe-hours").value.trim(),
      phone: document.getElementById("cafe-phone").value.trim(),
      facebook: document.getElementById("cafe-facebook").value.trim(),
      instagram: document.getElementById("cafe-instagram").value.trim(),
      tiktok: document.getElementById("cafe-tiktok").value.trim(),
      description: document.getElementById("cafe-description").value.trim()
    };

    try {
      if (supabaseConfigured) await saveCafeInfo(updatedInfo);
      Object.assign(cafeInfo, updatedInfo);
      if (!supabaseConfigured) saveData(storageKeys.cafeInfo, cafeInfo);
    } catch (error) {
      console.error("Cafe information update failed:", error);
      window.alert(error.message || "Unable to update cafe information.");
    }
  });

  settingsForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = settingsForm.querySelector("button[type='submit']");
    const updatedSettings = {
      theme: document.getElementById("store-theme").value.trim(),
      mobileMenuEnabled: document.getElementById("store-mobile-menu").value === "true",
      autoSaveEnabled: document.getElementById("store-auto-save").value === "true"
    };
    if (!updatedSettings.theme) {
      if (storeSettingsMessage) storeSettingsMessage.textContent = "Enter a theme name.";
      return;
    }

    submitButton.disabled = true;
    if (storeSettingsMessage) storeSettingsMessage.textContent = "Saving settings...";
    try {
      if (supabaseConfigured) {
        const saved = await saveStoreSettings(updatedSettings);
        storeSettings = {
          theme: saved.theme,
          mobileMenuEnabled: saved.mobile_menu_enabled,
          autoSaveEnabled: saved.auto_save_enabled
        };
      } else {
        saveData("klasikCafeStoreSettings", updatedSettings);
        storeSettings = updatedSettings;
      }
      if (storeSettingsMessage) storeSettingsMessage.textContent = "Settings saved.";
    } catch (error) {
      console.error("Store settings update failed:", error);
      if (storeSettingsMessage) storeSettingsMessage.textContent = error.message || "Unable to save store settings.";
    } finally {
      submitButton.disabled = false;
    }
  });

  staffInviteForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!staffInviteForm.reportValidity()) return;

    const formData = new FormData(staffInviteForm);
    const submitButton = staffInviteForm.querySelector("button[type='submit']");
    const profile = {
      firstName: formData.get("firstName").trim(),
      lastName: formData.get("lastName").trim(),
      username: formData.get("username").trim(),
      phone: formData.get("phone").trim()
    };

    staffInviteMessage.textContent = "Sending invitation...";
    submitButton.disabled = true;
    try {
      const result = await inviteStaffMember(
        profile,
        formData.get("email").trim(),
        formData.get("role")
      );
      staffInviteMessage.textContent = result.message;
      staffInviteForm.reset();
    } catch (error) {
      console.error("Staff invitation failed:", error);
      staffInviteMessage.textContent = error.message || "Could not send the staff invitation.";
    } finally {
      submitButton.disabled = false;
    }
  });

  categoryForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.getElementById("menu-category-name").value.trim();
    const parentId = document.getElementById("menu-category-parent").value || null;
    if (!name) return;
    try {
      const parent = categories.find((item) => item.id === parentId);
      const category = await saveMenuCategory({
        name,
        slug: parent ? `${parent.slug}-${createSlug(name)}` : createSlug(name),
        parentId
      });
      categories.push(category);
      categoryForm.reset();
      populateCategoryControls();
    } catch (error) {
      console.error("Category creation failed:", error);
      window.alert(error.message || "Unable to add the category.");
    }
  });

  addonForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.getElementById("menu-addon-name").value.trim();
    const id = document.getElementById("menu-addon-id").value || null;
    const existing = addons.find((item) => item.id === id);
    try {
      const saved = await saveMenuAddon({
        id,
        slug: existing?.slug || createSlug(name),
        name,
        price: Number(document.getElementById("menu-addon-price").value),
        isAvailable: existing?.is_available ?? true
      });
      const index = addons.findIndex((item) => item.id === saved.id);
      if (index >= 0) addons[index] = saved;
      else addons.push(saved);
      addonForm.reset();
      document.getElementById("menu-addon-id").value = "";
      renderAddons();
    } catch (error) {
      console.error("Customization add-on save failed:", error);
      window.alert(error.message || "Unable to save the add-on.");
    }
  });

  document.getElementById("export-local-data")?.addEventListener("click", () => {
    try {
      const keyCount = downloadLocalDataBackup();
      window.alert(`Downloaded a backup of ${keyCount} KLASIK CAFE LocalStorage keys. No browser data was changed.`);
    } catch (error) {
      console.error("Local data backup failed:", error);
      window.alert(error.message || "Unable to download the local data backup.");
    }
  });

  document.getElementById("import-local-menu")?.addEventListener("click", async () => {
    if (!await themedConfirm({
      title: "Import local menu items?",
      message: "Only new custom LocalStorage menu items will be added. Existing Supabase products will not be updated or deleted, and known demo seed products will be skipped.",
      confirmLabel: "Import items"
    })) return;
    try {
      const result = await importLegacyAdminMenu(categories);
      const remoteCatalog = await fetchMenuCatalog();
      products.splice(0, products.length, ...remoteCatalog.map((item) => ({
        id: item.id,
        category: item.mainCategory,
        mainCategory: item.mainCategory,
        categorySlug: item.categorySlug,
        categoryId: item.category_id,
        subcategory: item.categorySlug,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image_path,
        available: item.is_available
      })));
      renderProducts();
      window.alert(`${result.message} Imported: ${result.inserted}. Skipped: ${result.skipped}.`);
    } catch (error) {
      console.error("Legacy menu import failed:", error);
      window.alert(error.message || "Unable to import the local menu.");
    }
  });

  if (supabaseConfigured) {
    try {
      const access = await requireRole(["admin"]);
      if (!access) return;
      const [remoteCategories, remoteCatalog, remoteReviews, remoteSuggestions, remoteAddons, remoteOrders, remoteCafeInfo, remoteStoreSettings] = await Promise.all([
        fetchMenuCategories(),
        fetchMenuCatalog(),
        fetchReviews({ includeModeration: true }),
        fetchSuggestions(),
        fetchAllMenuAddons(),
        fetchStaffOrders(),
        fetchCafeInfo(),
        fetchStoreSettings()
      ]);
      categories = remoteCategories;
      products.splice(0, products.length, ...remoteCatalog.map((item) => ({
        id: item.id,
        category: item.mainCategory,
        mainCategory: item.mainCategory,
        categorySlug: item.categorySlug,
        categoryId: item.category_id,
        subcategory: item.categorySlug,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image_path,
        available: item.is_available
      })));
      replaceAdminReviews(remoteReviews);
      suggestions.splice(0, suggestions.length, ...remoteSuggestions.map((item) => ({
        ...item,
        customer: "Customer",
        date: new Date(item.created_at).toLocaleDateString()
      })));
      addons = remoteAddons;
      if (remoteCafeInfo) {
        Object.assign(cafeInfo, {
          name: remoteCafeInfo.name,
          address: remoteCafeInfo.address,
          hours: remoteCafeInfo.opening_hours,
          phone: remoteCafeInfo.phone,
          facebook: remoteCafeInfo.facebook,
          instagram: remoteCafeInfo.instagram,
          tiktok: remoteCafeInfo.tiktok,
          description: remoteCafeInfo.description
        });
      }
      if (remoteStoreSettings) {
        storeSettings = {
          theme: remoteStoreSettings.theme,
          mobileMenuEnabled: remoteStoreSettings.mobile_menu_enabled,
          autoSaveEnabled: remoteStoreSettings.auto_save_enabled
        };
      }
      if (supabaseMenuTools) supabaseMenuTools.hidden = false;
      if (staffAccountsSection) staffAccountsSection.hidden = false;
      if (staffAccountsNav) staffAccountsNav.hidden = false;
      populateCategoryControls();
      renderOrders(remoteOrders);
      renderAddons();
    } catch (error) {
      console.error("Admin authorization or data loading failed:", error);
      window.alert(error.message || "Unable to load the admin data.");
      return;
    }
  }

  renderProducts();
  renderReviews();
  renderSuggestions();
  populateCafeInfo();
  populateStoreSettings();

  if (supabaseConfigured && reviewList) {
    try {
      setReviewRealtimeStatus("Connecting to live review updates...");
      reviewChannelCleanup = subscribeToReviews(async () => {
        const reviews = await fetchReviews({ includeModeration: true });
        replaceAdminReviews(reviews);
      }, (status, error) => {
        if (error) console.error(`Supabase review realtime ${status}:`, error);
        if (status === "SUBSCRIBED") {
          setReviewRealtimeStatus("Live review updates connected.");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CALLBACK_ERROR") {
          setReviewRealtimeStatus("Live review updates are unavailable. Check Supabase Realtime and the review query.", true);
        } else if (status === "CLOSED") {
          setReviewRealtimeStatus("Live review updates disconnected.");
        }

      });
      window.addEventListener("pagehide", () => {
        if (!reviewChannelCleanup) return;
        reviewChannelCleanup().catch((error) => console.error("Unable to close the review realtime channel:", error));
        reviewChannelCleanup = null;
      }, { once: true });
    } catch (error) {
      console.error("Unable to subscribe to Supabase review updates:", error);
      setReviewRealtimeStatus("Live review updates could not be started.", true);
    }
  }

  if (supabaseConfigured && orderList) {
    try {
      orderChannelCleanup = subscribeToOrders(async () => {
        renderOrders(await fetchStaffOrders());
      }, (status, error) => {
        if (error) console.error(`Supabase order realtime ${status}:`, error);
      });
      window.addEventListener("pagehide", () => {
        if (!orderChannelCleanup) return;
        orderChannelCleanup().catch((error) => console.error("Unable to close the admin order channel:", error));
        orderChannelCleanup = null;
      }, { once: true });
    } catch (error) {
      console.error("Unable to subscribe to Supabase order updates:", error);
    }
  }
});
