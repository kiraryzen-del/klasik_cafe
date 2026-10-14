import { supabaseConfigured } from "./supabase-client.js";
import { applyCatalogToCards, fetchMenuCatalog } from "./supabase-data.js";

"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const menuContent = document.getElementById("menu-content");
  if (!menuContent) return;

  try {
    const response = await fetch("index.html");
    if (!response.ok) throw new Error("Menu source unavailable");

    const source = new DOMParser().parseFromString(await response.text(), "text/html");
    const menu = source.querySelector("#favorites");
    if (!menu) throw new Error("Menu section unavailable");

    menu.id = "menu";
    menu.classList.add("menu-page-section");
    menu.setAttribute("aria-labelledby", "menu-title");
    const heading = menu.querySelector("#favorites-title");
    if (heading) {
      heading.id = "menu-title";
      heading.textContent = "Menu";
    }

    const intro = menu.querySelector(".section-intro");
    if (intro) intro.textContent = "A few café favorites, made fresh. Choose a category to explore more.";
    menu.querySelector(".featured-menu-action")?.remove();

    const categoryGroups = menu.querySelector(".category-groups");
    if (categoryGroups) {
      const bestSellersGroup = document.createElement("div");
      bestSellersGroup.className = "category-group is-open";
      bestSellersGroup.innerHTML = '<button class="main-category-button is-active" type="button" data-main-category="best-sellers">Best sellers</button>';
      categoryGroups.prepend(bestSellersGroup);
      categoryGroups.querySelector('[data-main-category="add-ons"]')?.closest(".category-group")?.querySelector(".category-list")?.remove();
      categoryGroups.querySelectorAll(".category-group:not(:first-child)").forEach((group) => {
        group.classList.remove("is-open");
        group.querySelector(".main-category-button")?.classList.remove("is-active");
        group.querySelector(".category-list")?.classList.remove("is-open");
      });
    }

    menu.querySelectorAll(".product-card").forEach((card, index) => {
      if (index < 3) card.dataset.bestSeller = "true";
      card.hidden = index >= 3;
      const title = card.querySelector(".product-title h3");
      if (!title || !card.querySelector(".product-info")) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "customer-product-button";
      button.textContent = "Customize";
      button.setAttribute("aria-label", `Customize ${title.textContent.trim()}`);
      card.querySelector(".product-info").appendChild(button);
    });
    menuContent.replaceChildren(menu);
    menuContent.replaceChildren(menu);

    if (supabaseConfigured) {
      try {
        const catalog = await fetchMenuCatalog();
        await applyCatalogToCards(menu, catalog);
      } catch (error) {
        console.error("Supabase menu loading failed; the existing HTML catalog remains visible:", error);
        const warning = document.createElement("p");
        warning.className = "page-width menu-loading";
        warning.setAttribute("role", "alert");
        warning.textContent = "The database menu could not be loaded. The existing website menu is still available.";
        menu.prepend(warning);
      }
    }
  } catch (error) {
    menuContent.innerHTML = '<p class="page-width menu-loading" role="alert">The menu could not be loaded. Please refresh the page to try again.</p>';
  }
});