import { requireSupabase } from "./supabase-client.js";

const subcategoryAliases = {
  "coffee-iced-coffee": "iced-coffee",
  "coffee-hot-coffee": "hot-coffee",
  "coffee-espesyal": "espesyal",
  "noncoffee-non-coffee": "non-coffee",
  "noncoffee-espesyal": "espesyal",
  "pastries-smores": "smores",
  "pastries-cookies": "cookies",
  "pastries-cheesecakes": "cheesecakes"
};

const menuImageUrls = import.meta.glob("/images/**/*.{gif,jpeg,jpg,png,webp}", {
  eager: true,
  import: "default",
  query: "?url"
});

const menuImageAliases = {
  "images/products/spanish-latte.jpg": "images/products/coffee/latte.jpg",
  "images/products/caramelmacchiato.jpg": "images/products/coffee/caramelmacchiato.jpg"
};

export function resolveMenuImageUrl(imagePath) {
  if (typeof imagePath !== "string" || !imagePath) return imagePath;
  if (/^(https?:|data:|blob:)/i.test(imagePath)) return imagePath;

  const normalizedPath = imagePath.replace(/\\/g, "/").replace(/^\.?\//, "");
  const imageKey = normalizedPath.startsWith("images/")
    ? `/${normalizedPath}`
    : `/images/${normalizedPath}`;
  const aliasKey = menuImageAliases[normalizedPath];
  return menuImageUrls[imageKey] || (aliasKey ? menuImageUrls[`/${aliasKey}`] || aliasKey : null) || imagePath;
}

function throwIfError({ data, error }) {
  if (error) throw error;
  return data;
}

function isMissingBestSellerColumn(error) {
  return error?.code === "42703" && /best_seller/i.test(error.message || "");
}

const bestSellerMigrationMessage = "Best Seller controls require Supabase migration 005_menu_item_best_seller.sql.";

export async function fetchMenuCategories() {
  const client = requireSupabase();
  return throwIfError(await client
    .from("menu_categories")
    .select("id, slug, name, parent_id, sort_order")
    .order("sort_order")
    .order("name"));
}

export async function fetchMenuCatalog() {
  const client = requireSupabase();
  const [categories, initialRows] = await Promise.all([
    fetchMenuCategories(),
    client.from("menu_items")
      .select("id, source_key, sort_order, category_id, name, description, price, image_path, is_available, best_seller")
      .order("sort_order")
      .order("name")
  ]);
  let rows = initialRows;
  if (isMissingBestSellerColumn(rows.error)) {
    console.warn(`${bestSellerMigrationMessage} The existing catalog is being loaded without Best Seller flags.`);
    rows = await client.from("menu_items")
      .select("id, source_key, sort_order, category_id, name, description, price, image_path, is_available")
      .order("sort_order")
      .order("name");
  }
  if (rows.error) throw rows.error;

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  return rows.data.map((row) => {
    const category = categoryById.get(row.category_id);
    if (!category) throw new Error(`Menu item "${row.name}" references a missing category.`);
    const parentCategory = category.parent_id ? categoryById.get(category.parent_id) : null;
    if (category.parent_id && !parentCategory) {
      throw new Error(`Menu category "${category.name}" references a missing parent category.`);
    }

    return {
      ...row,
      best_seller: Boolean(row.best_seller),
      category,
      mainCategoryName: parentCategory?.name || category.name,
      mainCategory: parentCategory?.slug || category.slug,
      categorySlug: category.slug,
      filterSubcategory: subcategoryAliases[category.slug] || category.slug
    };
  });
}

const normalizeCatalogName = (value) => String(value || "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const categoryAliases = {
  iced: "coffee",
  hot: "coffee",
  "iced-coffee": "coffee",
  "hot-coffee": "coffee",
  "noncoffee": "non-coffee",
  "espesyal2": "non-coffee"
};

function applyCatalogStatus(card, item) {
  card.dataset.supabaseId = item.id;
  card.dataset.sourceKey = item.source_key || "";
  card.dataset.available = String(item.is_available);
  card.dataset.bestSeller = String(Boolean(item.best_seller));
  const title = card.querySelector(".product-title h3")?.textContent.trim() || item.name;
  const info = card.querySelector(".product-info");
  let availabilityLabel = card.querySelector(".product-availability");
  if (!availabilityLabel) {
    availabilityLabel = document.createElement("span");
    availabilityLabel.className = "product-availability availability unavailable";
    availabilityLabel.setAttribute("role", "status");
    info?.append(availabilityLabel);
  }
  availabilityLabel.hidden = Boolean(item.is_available);
  availabilityLabel.textContent = item.is_available ? "" : "Unavailable";

  let bestSellerLabel = card.querySelector(".product-best-seller");
  if (item.best_seller) {
    if (!bestSellerLabel) {
      bestSellerLabel = document.createElement("span");
      bestSellerLabel.className = "product-best-seller";
      bestSellerLabel.innerHTML = '<span aria-hidden="true">◆</span> Best Seller';
      info?.append(bestSellerLabel);
    }
    bestSellerLabel.hidden = false;
  } else {
    bestSellerLabel?.remove();
  }

  const button = card.querySelector(".customer-product-button");
  if (button) {
    button.setAttribute("aria-label", `Customize ${title}`);
  }
}

function matchStaticCatalogCard(cards, usedCards, item) {
  const itemName = normalizeCatalogName(item.name);
  const itemImageUrl = item.image_path ? resolveMenuImageUrl(item.image_path) : "";
  const imagePath = (value) => {
    if (!value) return "";
    try {
      return new URL(value, document.baseURI).pathname.toLocaleLowerCase();
    } catch {
      return String(value).split(/[?#]/)[0].toLocaleLowerCase();
    }
  };
  const itemImageKey = imagePath(itemImageUrl);
  const candidatesByName = cards.filter((card) => {
    if (usedCards.has(card)) return false;
    return normalizeCatalogName(card.querySelector(".product-title h3")?.textContent) === itemName;
  });

  const scoreCard = (card) => {
    let score = 0;
    const cardMain = categoryAliases[card.dataset.mainCategory || card.dataset.category]
      || card.dataset.mainCategory || card.dataset.category || "";
    if (cardMain === item.mainCategory) score += 4;
    const cardSubcategory = card.dataset.subcategory || "";
    if (cardSubcategory === item.filterSubcategory || cardSubcategory === item.categorySlug) score += 2;
    const cardImageKey = imagePath(card.querySelector(".product-image img")?.getAttribute("src"));
    if (itemImageKey && cardImageKey === itemImageKey) score += 5;
    return score;
  };
  if (candidatesByName.length) {
    return candidatesByName.sort((left, right) => scoreCard(right) - scoreCard(left))[0];
  }
  if (!itemImageKey) return null;

  const candidatesByImage = cards.filter((card) => !usedCards.has(card) && scoreCard(card) >= 5);
  const ranked = candidatesByImage.sort((left, right) => scoreCard(right) - scoreCard(left));
  return ranked.length === 1 || (ranked.length > 1 && scoreCard(ranked[0]) > scoreCard(ranked[1]))
    ? ranked[0]
    : null;
}

function ensureCategoryFilter(container, item) {
  const groups = container.querySelector(".category-groups");
  if (!groups) return;
  let group = Array.from(groups.querySelectorAll(".main-category-button"))
    .find((button) => button.dataset.mainCategory === item.mainCategory)?.closest(".category-group");
  if (!group) {
    group = document.createElement("div");
    group.className = "category-group";
    const button = document.createElement("button");
    button.className = "main-category-button";
    button.type = "button";
    button.dataset.mainCategory = item.mainCategory;
    button.textContent = item.mainCategoryName;
    group.append(button);
    groups.append(group);
  }
  if (item.filterSubcategory === item.mainCategory) return;
  let list = group.querySelector(".category-list");
  if (!list) {
    list = document.createElement("div");
    list.className = "category-list";
    group.append(list);
  }
  if (Array.from(list.querySelectorAll(".category-chip")).some((chip) => chip.dataset.subcategory === item.filterSubcategory)) return;
  const chip = document.createElement("button");
  chip.className = "category-chip";
  chip.type = "button";
  chip.dataset.mainCategory = item.mainCategory;
  chip.dataset.subcategory = item.filterSubcategory;
  chip.dataset.category = item.filterSubcategory;
  chip.textContent = item.category.name;
  list.append(chip);
}

function createAdminProductCard(template, item) {
  const card = template.cloneNode(true);
  card.hidden = false;
  card.removeAttribute("hidden");
  card.dataset.mainCategory = item.mainCategory;
  card.dataset.subcategory = item.filterSubcategory;
  card.dataset.category = item.mainCategory;
  card.dataset.sourceKey = "";
  const title = card.querySelector(".product-title h3");
  const price = card.querySelector(".product-title span");
  const description = card.querySelector(".product-info p");
  const image = card.querySelector(".product-image img");
  if (title) title.textContent = item.name;
  if (price) price.textContent = `₱${Number(item.price).toLocaleString("en-US")}`;
  if (description) description.textContent = item.description;
  if (image) {
    image.src = resolveMenuImageUrl(item.image_path);
    image.alt = item.name;
    image.removeAttribute("data-fallback");
  }
  const categoryLabel = card.querySelector(".product-category");
  if (categoryLabel) categoryLabel.textContent = item.category.name.toUpperCase();
  return card;
}

export async function applyCatalogToCards(container, catalog) {
  const staticCards = Array.from(container.querySelectorAll(".product-card"));
  const usedCards = new Set();
  const staticItems = catalog.filter((item) => item.source_key?.startsWith("homepage-"));
  staticItems.forEach((item) => {
    const card = matchStaticCatalogCard(staticCards, usedCards, item);
    if (!card) return;
    usedCards.add(card);
    applyCatalogStatus(card, item);
  });

  if (!staticCards.length) return;
  const adminItems = catalog.filter((item) => !item.source_key?.startsWith("homepage-"));
  adminItems.forEach((item) => {
    const existingCard = Array.from(container.querySelectorAll(".product-card"))
      .find((card) => card.dataset.supabaseId === String(item.id));
    if (existingCard) {
      applyCatalogStatus(existingCard, item);
      return;
    }
    const card = createAdminProductCard(staticCards[0], item);
    applyCatalogStatus(card, item);
    ensureCategoryFilter(container, item);
    container.append(card);
  });
}

export async function fetchMenuAddons() {
  const client = requireSupabase();
  return throwIfError(await client
    .from("menu_addons")
    .select("id, slug, name, price, is_available")
    .order("name"));
}

export async function fetchAllMenuAddons() {
  const client = requireSupabase();
  return throwIfError(await client
    .from("menu_addons")
    .select("id, slug, name, price, is_available")
    .order("name"));
}

function mapOrder(row) {
  return {
    id: row.order_number,
    databaseId: row.id,
    date: new Date(row.created_at).toLocaleString(),
    status: row.status,
    total: Number(row.total),
    customer: row.customer_name || "Customer",
    specialRequest: row.special_requests || "",
    items: (row.order_items || []).map((item) => ({
      name: item.product_name,
      quantity: item.quantity,
      customizations: item.customizations || {},
      addOns: item.selected_addons || [],
      specialRequest: item.customizations?.special_request || "",
      unitPrice: Number(item.unit_price)
    }))
  };
}

export async function fetchCustomerOrders() {
  const client = requireSupabase();
  const rows = throwIfError(await client
    .from("orders")
    .select("id, order_number, status, total, special_requests, created_at, order_items(product_name, quantity, unit_price, customizations, selected_addons)")
    .neq("status", "Pending")
    .order("created_at", { ascending: false }));
  return rows.map(mapOrder);
}

export async function fetchPlacedOrders() {
  const client = requireSupabase();
  const rows = throwIfError(await client
    .from("orders")
    .select("id, order_number, status, total, special_requests, created_at, order_items(product_name, quantity, unit_price, customizations, selected_addons)")
    .eq("status", "Pending")
    .order("created_at", { ascending: false }));
  return rows.map(mapOrder);
}

export async function fetchStaffOrders() {
  const client = requireSupabase();
  const rows = throwIfError(await client
    .from("orders")
    .select("id, order_number, status, total, special_requests, created_at, order_items(product_name, quantity, unit_price, customizations, selected_addons)")
    .order("created_at", { ascending: true }));
  return rows.map((row) => ({ ...mapOrder(row), id: row.id, displayId: row.order_number }));
}

export async function submitCustomerOrder(cart, specialRequest) {
  const client = requireSupabase();
  const items = cart.map((item) => {
    if (!item.menuItemId) {
      throw new Error(`"${item.name}" is a local cart item without a Supabase menu ID. Re-add it from the loaded menu before checkout.`);
    }
    return {
      menu_item_id: item.menuItemId,
      quantity: Number(item.quantity),
      addon_ids: item.addonIds || [],
      customizations: {
        ...(item.customizationOptions || {}),
        special_request: item.specialRequest || ""
      }
    };
  });

  const orderId = throwIfError(await client.rpc("place_order", {
    p_items: items,
    p_special_requests: specialRequest || ""
  }));
  const order = throwIfError(await client
    .from("orders")
    .select("order_number, total")
    .eq("id", orderId)
    .single());
  return { id: orderId, orderNumber: order.order_number, total: Number(order.total) };
}

export async function setOrderStatus(orderId, status) {
  const client = requireSupabase();
  return throwIfError(await client.rpc("update_order_status", {
    p_order_id: orderId,
    p_status: status
  }));
}

export async function fetchReviews({ includeModeration = false } = {}) {
  const client = requireSupabase();
  let query = client
    .from("reviews")
    .select("id, customer_id, rating, comment, status, created_at")
    .order("created_at", { ascending: false });
  if (!includeModeration) query = query.eq("status", "approved");
  return throwIfError(await query);
}

export function subscribeToReviews(onChange, onStatus = () => {}) {
  const client = requireSupabase();
  const channel = client
    .channel(`reviews-live-${Date.now()}`)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "reviews"
    }, (payload) => {
      Promise.resolve(onChange(payload)).catch((error) => onStatus("CALLBACK_ERROR", error));
    })
    .subscribe((status, error) => onStatus(status, error));

  return () => client.removeChannel(channel);
}

export function subscribeToOrders(onChange, onStatus = () => {}) {
  const client = requireSupabase();
  const channel = client
    .channel(`orders-live-${Date.now()}`)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "orders"
    }, (payload) => {
      Promise.resolve(onChange(payload)).catch((error) => onStatus("CALLBACK_ERROR", error));
    })
    .subscribe((status, error) => onStatus(status, error));

  return () => client.removeChannel(channel);
}

export async function createReview(customerId, rating, comment) {
  const client = requireSupabase();
  return throwIfError(await client
    .from("reviews")
    .insert({ customer_id: customerId, rating, comment })
    .select("id")
    .single());
}

export async function moderateReview(reviewId, status) {
  const client = requireSupabase();
  return throwIfError(await client
    .from("reviews")
    .update({ status })
    .eq("id", reviewId));
}

export async function deleteReview(reviewId) {
  const client = requireSupabase();
  return throwIfError(await client.from("reviews").delete().eq("id", reviewId));
}

export async function fetchSuggestions() {
  const client = requireSupabase();
  return throwIfError(await client
    .from("suggestions")
    .select("id, customer_id, subject, suggestion, status, created_at")
    .order("created_at", { ascending: false }));
}

export async function createSuggestion(customerId, subject, suggestion) {
  const client = requireSupabase();
  return throwIfError(await client
    .from("suggestions")
    .insert({ customer_id: customerId, subject, suggestion })
    .select("id")
    .single());
}

export async function updateSuggestion(suggestionId, status) {
  const client = requireSupabase();
  return throwIfError(await client
    .from("suggestions")
    .update({ status })
    .eq("id", suggestionId));
}

export async function saveMenuItem(item) {
  const client = requireSupabase();
  const values = {
    category_id: item.categoryId,
    name: item.name,
    description: item.description,
    price: item.price,
    image_path: item.image,
    is_available: item.available,
    best_seller: Boolean(item.bestSeller)
  };
  const saveWithBestSellerFallback = async (operation) => {
    let result = await operation(values);
    if (isMissingBestSellerColumn(result.error)) {
      if (values.best_seller) throw new Error(bestSellerMigrationMessage);
      console.warn(`${bestSellerMigrationMessage} Saving this item without a Best Seller flag.`);
      const legacyValues = { ...values };
      delete legacyValues.best_seller;
      result = await operation(legacyValues);
    }
    return throwIfError(result);
  };
  if (item.id) {
    return saveWithBestSellerFallback((row) => client.from("menu_items").update(row).eq("id", item.id).select("id").single());
  }
  const lastItem = throwIfError(await client
    .from("menu_items")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle());
  const insertValues = {
    ...values,
    sort_order: Number(lastItem?.sort_order || 0) + 1
  };
  const insertWithFallback = async (row) => {
    let result = await client.from("menu_items").insert(row).select("id").single();
    if (isMissingBestSellerColumn(result.error)) {
      if (row.best_seller) throw new Error(bestSellerMigrationMessage);
      console.warn(`${bestSellerMigrationMessage} Saving this item without a Best Seller flag.`);
      const legacyValues = { ...row };
      delete legacyValues.best_seller;
      result = await client.from("menu_items").insert(legacyValues).select("id").single();
    }
    return throwIfError(result);
  };
  return insertWithFallback(insertValues);
}

export async function uploadMenuItemImage(file) {
  const client = requireSupabase();
  const bucket = "menu-images";
  const safeName = file.name.toLocaleLowerCase().replace(/[^a-z0-9.-]+/g, "-");
  const objectPath = `${crypto.randomUUID()}-${safeName}`;
  const { error } = await client.storage.from(bucket).upload(objectPath, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false
  });
  if (error) {
    throw new Error(`Image upload failed. Check that the public "${bucket}" Storage bucket exists and allows admin uploads. ${error.message}`);
  }
  const { data } = client.storage.from(bucket).getPublicUrl(objectPath);
  if (!data?.publicUrl) throw new Error(`The image was uploaded, but Supabase did not return a public URL for the "${bucket}" bucket.`);
  return data.publicUrl;
}

export async function setMenuItemAvailability(itemId, isAvailable) {
  const client = requireSupabase();
  return throwIfError(await client
    .from("menu_items")
    .update({ is_available: isAvailable })
    .eq("id", itemId)
    .select("id, is_available")
    .single());
}

export async function setMenuItemBestSeller(itemId, isBestSeller) {
  const client = requireSupabase();
  const result = await client
    .from("menu_items")
    .update({ best_seller: isBestSeller })
    .eq("id", itemId)
    .select("id, best_seller")
    .single();
  if (isMissingBestSellerColumn(result.error)) throw new Error(bestSellerMigrationMessage);
  return throwIfError(result);
}

export async function deleteMenuItem(itemId) {
  const client = requireSupabase();
  return throwIfError(await client.from("menu_items").delete().eq("id", itemId));
}

export async function saveMenuCategory(category) {
  const client = requireSupabase();
  return throwIfError(await client
    .from("menu_categories")
    .insert({
      slug: category.slug,
      name: category.name,
      parent_id: category.parentId || null
    })
    .select("id, slug, name, parent_id, sort_order")
    .single());
}

export async function saveMenuAddon(addon) {
  const client = requireSupabase();
  const values = {
    slug: addon.slug,
    name: addon.name,
    price: addon.price,
    is_available: addon.isAvailable
  };
  const query = addon.id
    ? client.from("menu_addons").update(values).eq("id", addon.id)
    : client.from("menu_addons").insert(values);
  return throwIfError(await query.select("id, slug, name, price, is_available").single());
}

export async function deleteMenuAddon(addonId) {
  const client = requireSupabase();
  return throwIfError(await client.from("menu_addons").delete().eq("id", addonId));
}

export async function saveCafeInfo(info) {
  const client = requireSupabase();
  return throwIfError(await client
    .from("cafe_info")
    .upsert({
      singleton: true,
      name: info.name,
      address: info.address,
      opening_hours: info.hours,
      phone: info.phone,
      facebook: info.facebook,
      instagram: info.instagram,
      tiktok: info.tiktok,
      description: info.description
    }, { onConflict: "singleton" })
    .select("singleton")
    .single());
}

export async function fetchCafeInfo() {
  const client = requireSupabase();
  return throwIfError(await client
    .from("cafe_info")
    .select("name, address, opening_hours, phone, facebook, instagram, tiktok, description")
    .eq("singleton", true)
    .maybeSingle());
}

export async function fetchStoreSettings() {
  const client = requireSupabase();
  return throwIfError(await client
    .from("store_settings")
    .select("theme, mobile_menu_enabled, auto_save_enabled")
    .eq("singleton", true)
    .single());
}

export async function saveStoreSettings(settings) {
  const client = requireSupabase();
  return throwIfError(await client
    .from("store_settings")
    .upsert({
      singleton: true,
      theme: settings.theme,
      mobile_menu_enabled: settings.mobileMenuEnabled,
      auto_save_enabled: settings.autoSaveEnabled
    }, { onConflict: "singleton" })
    .select("theme, mobile_menu_enabled, auto_save_enabled")
    .single());
}
