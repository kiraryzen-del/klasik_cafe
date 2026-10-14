import { requireSupabase } from "./supabase-client.js";

function getLegacyCategorySlug(product) {
  const main = product.mainCategory || product.category || "";
  const sub = product.subcategory || product.category || main;
  if (main === "coffee") {
    const coffeeSubcategory = {
      iced: "iced-coffee",
      "iced-coffee": "iced-coffee",
      hot: "hot-coffee",
      "hot-coffee": "hot-coffee",
      especiales: "espesyal",
      espesyal: "espesyal"
    }[sub] || sub;
    return ["iced-coffee", "hot-coffee", "espesyal"].includes(coffeeSubcategory)
      ? `coffee-${coffeeSubcategory}`
      : "coffee";
  }
  if (main === "non-coffee" || main === "noncoffee") {
    return sub === "espesyal" || sub === "espesyal2"
      ? "noncoffee-espesyal"
      : "noncoffee-non-coffee";
  }
  if (main === "pastries") {
    return ["smores", "cookies", "cheesecakes"].includes(sub) ? `pastries-${sub}` : "pastries";
  }
  return main;
}

export function downloadLocalDataBackup() {
  const data = Object.fromEntries(
    Object.keys(localStorage)
      .filter((key) => key.startsWith("klasikCafe"))
      .map((key) => [key, localStorage.getItem(key)])
  );
  const file = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "klasik-cafe-local-data-backup.json";
  link.click();
  URL.revokeObjectURL(url);
  return Object.keys(data).length;
}

export async function importLegacyAdminMenu(categories) {
  const raw = localStorage.getItem("klasikCafeAdminProducts");
  if (!raw) return { inserted: 0, skipped: 0, message: "No saved admin product list was found in this browser." };

  let products;
  try {
    products = JSON.parse(raw);
  } catch (error) {
    throw new Error(`The saved admin product list is not valid JSON: ${error.message}`);
  }
  if (!Array.isArray(products)) {
    throw new Error("The saved admin product list is not an array; no data was imported.");
  }

  const client = requireSupabase();
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const existingResult = await client
    .from("menu_items")
    .select("category_id, name, image_path");
  if (existingResult.error) throw existingResult.error;
  const knownProducts = new Set((existingResult.data || []).map((item) =>
    `${item.category_id}|${item.name.trim().toLocaleLowerCase()}|${item.image_path}`
  ));

  const rows = [];
  let skipped = 0;
  const knownDemoProducts = new Map([
    [1, "Amerikano"],
    [2, "Classic Latte"],
    [3, "Klasik Espesyal"],
    [4, "Mocha Frappe"],
    [5, "Butter Croissant"],
    [6, "Extra Shot"]
  ]);
  products.forEach((product, index) => {
    if (knownDemoProducts.get(Number(product.id)) === product.name) {
      skipped += 1;
      return;
    }
    const category = categoryBySlug.get(getLegacyCategorySlug(product));
    if (!category) {
      throw new Error(`Cannot safely map saved product "${product.name}" to a Supabase category.`);
    }
    const duplicateKey = `${category.id}|${String(product.name).trim().toLocaleLowerCase()}|${product.image || ""}`;
    if (knownProducts.has(duplicateKey)) {
      skipped += 1;
      return;
    }
    const stableId = String(product.id ?? index).replace(/[^a-zA-Z0-9_-]/g, "-");
    const price = Number(product.price);
    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`Cannot safely import "${product.name}" because its price is invalid.`);
    }
    rows.push({
      source_key: `legacy-admin-${stableId}`,
      category_id: category.id,
      sort_order: 1000 + index,
      name: String(product.name).trim(),
      description: String(product.description || ""),
      price,
      image_path: String(product.image || ""),
      is_available: product.available !== false
    });
    knownProducts.add(duplicateKey);
  });

  if (!rows.length) return { inserted: 0, skipped, message: "No new local products needed importing." };
  const { data, error } = await client
    .from("menu_items")
    .upsert(rows, { onConflict: "source_key", ignoreDuplicates: true })
    .select("id");
  if (error) throw error;
  return { inserted: data.length, skipped, message: "Local menu import completed without deleting or replacing records." };
}
