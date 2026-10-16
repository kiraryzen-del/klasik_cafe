import { supabaseConfigured } from "./supabase-client.js";
import { applyCatalogToCards, fetchMenuCatalog } from "./supabase-data.js";

document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.querySelector(".favorites .product-grid");
  if (!grid || !supabaseConfigured) return;

  try {
    const catalog = await fetchMenuCatalog();
    await applyCatalogToCards(grid, catalog);
  } catch (error) {
    console.error("Homepage menu availability could not be loaded from Supabase:", error);
    const status = document.createElement("p");
    status.className = "menu-data-status";
    status.setAttribute("role", "status");
    status.textContent = "Menu availability could not be refreshed. Please try again later.";
    grid.before(status);
  }
});
