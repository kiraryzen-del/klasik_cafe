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

function throwIfError({ data, error }) {
  if (error) throw error;
  return data;
}

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
  const [categories, rows] = await Promise.all([
    fetchMenuCategories(),
    client
      .from("menu_items")
      .select("id, source_key, sort_order, category_id, name, description, price, image_path, is_available")
      .order("sort_order")
      .order("name")
  ]);
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
      category,
      mainCategoryName: parentCategory?.name || category.name,
      mainCategory: parentCategory?.slug || category.slug,
      categorySlug: category.slug,
      filterSubcategory: subcategoryAliases[category.slug] || category.slug
    };
  });
}

export async function applyCatalogToCards(container, catalog) {
  const cards = Array.from(container.querySelectorAll(".product-card"));
  if (catalog.length < cards.length) {
    throw new Error(`Supabase has ${catalog.length} menu items but the existing page contains ${cards.length}; the original catalog was left unchanged.`);
  }

  for (let index = 0; index < catalog.length; index += 1) {
    const item = catalog[index];
    let card = cards[index];
    if (!card) {
      card = cards[0].cloneNode(true);
      container.appendChild(card);
      cards.push(card);
    }

    const mainCategory = item.mainCategory;
    card.dataset.supabaseId = item.id;
    card.dataset.sourceKey = item.source_key || "";
    card.dataset.mainCategory = mainCategory;
    card.dataset.subcategory = item.filterSubcategory;
    card.dataset.category = mainCategory;
    card.dataset.available = String(item.is_available);
    card.hidden = !item.is_available;

    const title = card.querySelector(".product-title h3");
    const price = card.querySelector(".product-title span");
    const description = card.querySelector(".product-info p");
    const image = card.querySelector(".product-image img");
    if (title) title.textContent = item.name;
    if (price) price.textContent = `₱${Number(item.price).toLocaleString("en-US")}`;
    if (description) description.textContent = item.description;
    if (image) {
      image.src = item.image_path;
      image.alt = item.name;
    }
    const categoryLabel = card.querySelector(".product-category");
    if (categoryLabel) categoryLabel.textContent = item.category.name.toUpperCase();
  }
}

export async function fetchMenuAddons() {
  const client = requireSupabase();
  return throwIfError(await client
    .from("menu_addons")
    .select("id, slug, name, price, is_available")
    .eq("is_available", true)
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

  return throwIfError(await client.rpc("place_order", {
    p_items: items,
    p_special_requests: specialRequest || ""
  }));
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
    is_available: item.available
  };
  if (item.id) {
    return throwIfError(await client.from("menu_items").update(values).eq("id", item.id).select("id").single());
  }
  const lastItem = throwIfError(await client
    .from("menu_items")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle());
  const query = client.from("menu_items").insert({
    ...values,
    sort_order: Number(lastItem?.sort_order || 0) + 1
  });
  return throwIfError(await query.select("id").single());
}

export async function setMenuItemAvailability(itemId, isAvailable) {
  const client = requireSupabase();
  return throwIfError(await client
    .from("menu_items")
    .update({ is_available: isAvailable })
    .eq("id", itemId));
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
