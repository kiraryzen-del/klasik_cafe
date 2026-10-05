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

    const helper = window.KLASIK_SUPABASE;
    if (helper?.isConfigured) {
      const { data: products, error } = await helper.getAvailableProducts();
      if (error) throw new Error(helper.safeError(error) || "Could not load products from Supabase.");
      window.KLASIK_MENU.renderProductCards(menu.querySelector(".product-grid"), products);
      menu.querySelectorAll(".product-card").forEach((card) => {
        card.hidden = card.dataset.bestSeller !== "true";
      });
    } else {
      menu.querySelectorAll(".product-card").forEach((card, index) => {
        card.dataset.bestSeller = index < 3 ? "true" : "false";
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
    }

    menuContent.replaceChildren(menu);
  } catch (error) {
    console.error(error);
    menuContent.innerHTML = '<p class="page-width menu-loading" role="alert">The menu could not be loaded. Please refresh the page to try again.</p>';
  }
});
