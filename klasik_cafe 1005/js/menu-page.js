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

    const productGrid = menu.querySelector(".product-grid");
    let categoryGroups = menu.querySelector(".category-groups");
    if (!categoryGroups) {
      categoryGroups = document.createElement("div");
      categoryGroups.className = "category-groups";
      productGrid?.before(categoryGroups);
    }

    const search = document.createElement("div");
    search.className = "menu-search";
    search.innerHTML = `
      <label for="menu-search-input">Search the menu</label>
      <div class="menu-search-field">
        <svg class="menu-search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="10.8" cy="10.8" r="6.8"></circle>
          <path d="m16 16 4.5 4.5"></path>
        </svg>
        <input id="menu-search-input" type="search" placeholder="Search drinks, pastries, and more..." autocomplete="off">
      </div>
      <p class="menu-search-status" id="menu-search-status" aria-live="polite"></p>
      <div class="menu-search-suggestions" id="menu-search-suggestions" aria-label="Suggested menu searches"></div>
    `;
    categoryGroups.before(search);

    const bestSellersGroup = document.createElement("div");
    bestSellersGroup.className = "category-group is-open";
    bestSellersGroup.innerHTML = '<button class="main-category-button is-active" type="button" data-main-category="best-sellers">Best sellers</button>';
    categoryGroups.prepend(bestSellersGroup);

    const mainCategoryAliases = {
      iced: "coffee",
      hot: "coffee",
      "iced-coffee": "coffee",
      "hot-coffee": "coffee",
      espesyal: "coffee",
      espesyal2: "non-coffee",
      noncoffee: "non-coffee",
      "non-coffee": "non-coffee",
      cookies: "pastries",
      smores: "pastries",
      cheesecakes: "pastries"
    };
    const subcategoryAliases = {
      iced: "iced-coffee",
      hot: "hot-coffee",
      espesyal: "espesyal",
      espesyal2: "espesyal",
      noncoffee: "non-coffee",
      cookies: "cookies",
      smores: "smores",
      cheesecakes: "cheesecakes",
      "add-ons": "add-ons"
    };
    const categoryDefinitions = [
      { id: "coffee", label: "Coffee", subcategories: [["iced-coffee", "Iced Coffee"], ["hot-coffee", "Hot Coffee"], ["espesyal", "Espesyal"]] },
      { id: "non-coffee", label: "Non Coffee", subcategories: [["non-coffee", "Non Coffee"], ["espesyal", "Espesyal"]] },
      { id: "matcha", label: "Matcha Series" },
      { id: "pastries", label: "Pastries", subcategories: [["smores", "Smores"], ["cookies", "Cookies"], ["cheesecakes", "Cheesecakes"]] },
      { id: "snacks", label: "Snacks" },
      { id: "pasta", label: "Pasta" },
      { id: "add-ons", label: "Add-ons" }
    ];
    const categories = new Set();
    menu.querySelectorAll(".product-card").forEach((card) => {
      const rawCategory = card.dataset.mainCategory || card.dataset.category || "";
      const category = mainCategoryAliases[rawCategory] || rawCategory;
      const subcategory = card.dataset.subcategory || subcategoryAliases[rawCategory] || rawCategory;
      if (!category || category === "best-sellers") return;
      card.dataset.mainCategory = category;
      card.dataset.subcategory = subcategory;
      categories.add(category);
    });

    categoryDefinitions.forEach(({ id, label, subcategories }) => {
      if (!categories.has(id)) return;
      const group = document.createElement("div");
      group.className = "category-group";
      const button = document.createElement("button");
      button.className = "main-category-button";
      button.type = "button";
      button.dataset.mainCategory = id;
      button.textContent = label;
      group.append(button);
      const availableSubcategories = subcategories?.filter(([subcategory]) => menu.querySelector(`.product-card[data-main-category="${id}"][data-subcategory="${subcategory}"]`)) || [];
      if (availableSubcategories.length) {
        const list = document.createElement("div");
        list.className = "category-list";
        availableSubcategories.forEach(([subcategory, subcategoryLabel]) => {
          const chip = document.createElement("button");
          chip.className = "category-chip";
          chip.type = "button";
          chip.dataset.mainCategory = id;
          chip.dataset.subcategory = subcategory;
          chip.dataset.category = subcategory;
          chip.textContent = subcategoryLabel;
          list.append(chip);
        });
        group.append(list);
      }
      categoryGroups.append(group);
    });

    categoryGroups.querySelectorAll(".category-group:not(:first-child)").forEach((group) => {
      group.classList.remove("is-open");
      group.querySelector(".main-category-button")?.classList.remove("is-active");
      group.querySelector(".category-list")?.classList.remove("is-open");
    });

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

    const searchInput = menu.querySelector("#menu-search-input");
    const searchStatus = menu.querySelector("#menu-search-status");
    const suggestions = menu.querySelector("#menu-search-suggestions");
    const cards = Array.from(menu.querySelectorAll(".product-card"));
    const categoryVisibility = new Map(cards.map((card) => [card, !card.hidden]));
    const normalize = (value) => value.toLocaleLowerCase().trim().replace(/\s+/g, " ");
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

    const applyMenuSearch = () => {
      const query = normalize(searchInput.value);
      const matchingCards = [];
      cards.forEach((card) => {
        const searchableText = normalize([
          card.querySelector(".product-title h3")?.textContent || "",
          card.querySelector(".product-category")?.textContent || "",
          card.querySelector(".product-info p")?.textContent || ""
        ].join(" "));
        const matches = query ? searchableText.includes(query) : categoryVisibility.get(card);
        card.hidden = !matches;
        if (matches && query) matchingCards.push(card);
      });

      suggestions.replaceChildren();
      if (!query) {
        searchStatus.textContent = "";
        return;
      }

      const matchingNames = cards.map((card) => card.querySelector(".product-title h3")?.textContent.trim() || "")
        .filter((name, index, list) => name && list.indexOf(name) === index)
        .filter((name) => normalize(name).includes(query))
        .sort((left, right) => Number(!normalize(left).startsWith(query)) - Number(!normalize(right).startsWith(query)) || left.localeCompare(right))
        .slice(0, 5);
      if (matchingNames.length) {
        searchStatus.textContent = "Menu suggestions";
        matchingNames.forEach((name) => {
          const suggestion = document.createElement("button");
          suggestion.type = "button";
          suggestion.className = "menu-search-suggestion";
          suggestion.textContent = name;
          suggestion.addEventListener("click", () => {
            searchInput.value = name;
            applyMenuSearch();
            searchInput.focus();
          });
          suggestions.append(suggestion);
        });
        return;
      }
      if (matchingCards.length) {
        searchStatus.textContent = "";
        return;
      }

      const candidates = cards.map((card) => {
        const name = card.querySelector(".product-title h3")?.textContent.trim() || "";
        const words = normalize(name).split(/[^a-z0-9]+/).filter(Boolean);
        const distance = Math.min(...words.map((word) => editDistance(query, word)));
        return { name, distance };
      }).filter((candidate) => candidate.distance <= Math.max(2, Math.floor(query.length * 0.4)))
        .sort((left, right) => left.distance - right.distance || left.name.localeCompare(right.name))
        .filter((candidate, index, list) => list.findIndex((item) => item.name === candidate.name) === index)
        .slice(0, 4);

      searchStatus.textContent = `No results for "${searchInput.value.trim()}".${candidates.length ? " Did you mean:" : " Try a different search."}`;
      candidates.forEach((candidate) => {
        const suggestion = document.createElement("button");
        suggestion.type = "button";
        suggestion.className = "menu-search-suggestion";
        suggestion.textContent = candidate.name;
        suggestion.addEventListener("click", () => {
          searchInput.value = candidate.name;
          applyMenuSearch();
          searchInput.focus();
        });
        suggestions.append(suggestion);
      });
    };

    searchInput.addEventListener("input", applyMenuSearch);
    document.addEventListener("click", (event) => {
      if (!menu.contains(event.target) || !event.target.closest(".main-category-button, .category-chip")) return;
      window.setTimeout(() => {
        cards.forEach((card) => categoryVisibility.set(card, !card.hidden));
        applyMenuSearch();
      }, 0);
    });
  } catch (error) {
    console.error("Unable to render the menu page:", error);
    menuContent.innerHTML = '<p class="page-width menu-loading" role="alert">The menu could not be loaded. Please refresh the page to try again.</p>';
  }
});