"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const storageKeys = {
    products: "klasikCafeAdminProducts",
    reviews: "klasikCafeAdminReviews",
    suggestions: "klasikCafeAdminSuggestions",
    cafeInfo: "klasikCafeInfo"
  };

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

  const productTableBody = document.getElementById("admin-product-table-body");
  const reviewList = document.getElementById("admin-review-list");
  const suggestionList = document.getElementById("admin-suggestion-list");
  const productModal = document.getElementById("product-modal");
  const productForm = document.getElementById("product-form");
  const addProductTrigger = document.getElementById("add-product-trigger");
  const cancelProductModal = document.getElementById("cancel-product-modal");
  const cafeForm = document.getElementById("cafe-info-form");

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

  function getSubcategoryOptions(mainCategory) {
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
      "add-ons": [{ value: "add-ons", label: "Add-ons" }]
    };

    return options[mainCategory] || [{ value: mainCategory, label: formatCategoryLabel(mainCategory) }];
  }

  function populateSubcategoryOptions(mainCategory, selectedValue = null) {
    const subcategorySelect = document.getElementById("product-subcategory");
    if (!subcategorySelect) return;

    const options = getSubcategoryOptions(mainCategory);
    subcategorySelect.innerHTML = options.map((option) => `
      <option value="${option.value}" ${selectedValue === option.value ? "selected" : ""}>${option.label}</option>
    `).join("");

    if (!selectedValue && options[0]) {
      subcategorySelect.value = options[0].value;
    }
  }

  function renderProducts() {
    if (!productTableBody) return;

    productTableBody.innerHTML = products.map((product) => {
      const mainCategory = product.mainCategory || product.category || "coffee";
      const subcategory = product.subcategory || product.category || mainCategory;

      return `
        <tr>
          <td>${product.name}</td>
          <td>${formatCategoryLabel(mainCategory)} / ${formatCategoryLabel(subcategory)}</td>
          <td>₱${product.price}</td>
          <td>
            <select class="small-select availability-select" data-product-id="${product.id}">
              <option value="Available" ${product.available ? "selected" : ""}>Available</option>
              <option value="Unavailable" ${!product.available ? "selected" : ""}>Unavailable</option>
            </select>
          </td>
          <td>
            <div class="table-actions">
              <button type="button" class="table-button edit-btn" data-product-id="${product.id}">Edit</button>
              <button type="button" class="table-button delete" data-product-id="${product.id}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function renderReviews() {
    if (!reviewList) return;

    reviewList.innerHTML = adminReviews.map((review) => `
      <div class="admin-review-item">
        <strong>${review.customer}</strong>
        <span class="review-rating">${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</span>
        <p>${review.comment}</p>
        <span>${review.date}</span>
        <button type="button" class="inline-button delete-review" data-review-id="${review.id}">Delete</button>
      </div>
    `).join("");
  }

  function renderSuggestions() {
    if (!suggestionList) return;

    suggestionList.innerHTML = suggestions.map((item) => `
      <div class="admin-suggestion-item">
        <div>
          <strong>${item.customer}</strong>
          <p>${item.subject}</p>
          <small>${item.suggestion}</small>
        </div>
        <span>${item.date}</span>
        <select class="small-select suggestion-status" data-suggestion-id="${item.id}">
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

  function openProductModal(product = null) {
    if (!productModal) return;

    const mainCategory = product ? (product.mainCategory || product.category || "coffee") : "coffee";
    const subcategory = product ? (product.subcategory || product.category || "iced-coffee") : "iced-coffee";

    if (product) {
      document.getElementById("product-id").value = product.id;
      document.getElementById("product-name").value = product.name;
      document.getElementById("product-main-category").value = mainCategory;
      populateSubcategoryOptions(mainCategory, subcategory);
      document.getElementById("product-description").value = product.description;
      document.getElementById("product-price").value = product.price;
      document.getElementById("product-image").value = product.image;
      document.getElementById("product-availability").value = product.available ? "Available" : "Unavailable";
      document.querySelector("#product-form button[type='submit']").textContent = "Save Changes";
      document.getElementById("product-modal-title").textContent = "Edit Product";
    } else {
      productForm.reset();
      document.getElementById("product-id").value = "";
      document.getElementById("product-main-category").value = "coffee";
      populateSubcategoryOptions("coffee", "iced-coffee");
      document.getElementById("product-availability").value = "Available";
      document.querySelector("#product-form button[type='submit']").textContent = "Add Product";
      document.getElementById("product-modal-title").textContent = "Add Product";
    }

    productModal.hidden = false;
  }

  function closeProductModal() {
    if (productModal) productModal.hidden = true;
  }

  const productMainCategory = document.getElementById("product-main-category");
  const productSubcategory = document.getElementById("product-subcategory");

  productMainCategory?.addEventListener("change", (event) => {
    populateSubcategoryOptions(event.target.value, null);
  });

  addProductTrigger.addEventListener("click", () => openProductModal());
  cancelProductModal.addEventListener("click", closeProductModal);
  productModal?.addEventListener("click", (event) => {
    if (event.target === productModal) closeProductModal();
  });

  productForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const id = document.getElementById("product-id").value;
    const mainCategory = document.getElementById("product-main-category").value;
    const subcategory = document.getElementById("product-subcategory").value || mainCategory;
    const record = {
      id: id ? Number(id) : Date.now(),
      name: document.getElementById("product-name").value.trim(),
      category: mainCategory,
      mainCategory,
      subcategory,
      description: document.getElementById("product-description").value.trim(),
      price: Number(document.getElementById("product-price").value),
      image: document.getElementById("product-image").value.trim() || "images/products/coffee.jpg",
      available: document.getElementById("product-availability").value === "Available"
    };

    if (!record.name || !record.description || !record.price) {
      return;
    }

    const existingIndex = products.findIndex((item) => item.id === record.id);
    if (existingIndex >= 0) {
      products[existingIndex] = record;
    } else {
      products.push(record);
    }

    saveData(storageKeys.products, products);
    renderProducts();
    closeProductModal();
  });

  document.addEventListener("click", (event) => {
    const editButton = event.target.closest(".edit-btn");
    if (editButton) {
      const product = products.find((item) => item.id === Number(editButton.dataset.productId));
      if (product) openProductModal(product);
      return;
    }

    const deleteButton = event.target.closest(".delete");
    if (deleteButton) {
      const id = Number(deleteButton.dataset.productId);
      const product = products.find((item) => item.id === id);
      if (!product) return;
      const confirmDelete = window.confirm(`Are you sure you want to delete this product?\n${product.name}`);
      if (confirmDelete) {
        const index = products.findIndex((item) => item.id === id);
        if (index >= 0) {
          products.splice(index, 1);
          saveData(storageKeys.products, products);
          renderProducts();
        }
      }
    }

    const reviewDeleteButton = event.target.closest(".delete-review");
    if (reviewDeleteButton) {
      const id = Number(reviewDeleteButton.dataset.reviewId);
      const review = adminReviews.find((item) => item.id === id);
      if (!review) return;
      const confirmDelete = window.confirm(`Are you sure you want to delete this review from ${review.customer}?`);
      if (confirmDelete) {
        const index = adminReviews.findIndex((item) => item.id === id);
        if (index >= 0) {
          adminReviews.splice(index, 1);
          saveData(storageKeys.reviews, adminReviews);
          renderReviews();
        }
      }
    }
  });

  document.addEventListener("change", (event) => {
    const availabilitySelect = event.target.closest(".availability-select");
    if (availabilitySelect) {
      const product = products.find((item) => item.id === Number(availabilitySelect.dataset.productId));
      if (product) {
        product.available = availabilitySelect.value === "Available";
        saveData(storageKeys.products, products);
        renderProducts();
      }
    }

    const suggestionStatusSelect = event.target.closest(".suggestion-status");
    if (suggestionStatusSelect) {
      const suggestion = suggestions.find((item) => item.id === Number(suggestionStatusSelect.dataset.suggestionId));
      if (suggestion) {
        suggestion.status = suggestionStatusSelect.value;
        saveData(storageKeys.suggestions, suggestions);
        renderSuggestions();
      }
    }
  });

  cafeForm.addEventListener("submit", (event) => {
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

    Object.assign(cafeInfo, updatedInfo);
    saveData(storageKeys.cafeInfo, cafeInfo);
  });

  renderProducts();
  renderReviews();
  renderSuggestions();
  populateCafeInfo();
});
