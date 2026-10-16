import { supabaseConfigured } from "./supabase-client.js";
import {
  getSignedInRole,
  isUsernameAvailable,
  signInCustomer,
  signOutCustomer,
  signUpCustomer
} from "./supabase-auth.js";

"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const introScreen = document.querySelector(".intro-screen");
  if (introScreen) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const introScreenDuration = reducedMotion ? 0 : 1300;
    const fadeDuration = reducedMotion ? 0 : 450;
    window.setTimeout(() => {
      introScreen.classList.add("is-hidden");
      window.setTimeout(() => introScreen.remove(), fadeDuration);
    }, introScreenDuration - fadeDuration);
  }

  const menuToggle = document.querySelector(".menu-toggle");
  const primaryNav = document.querySelector(".primary-nav");

  if (menuToggle && primaryNav) {
    const closeMenu = () => {
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation");
      primaryNav.classList.remove("is-open");
    };

    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
      primaryNav.classList.toggle("is-open", !isOpen);
    });

    primaryNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  const normalizeMainCategory = (value) => {
    const mapping = {
      iced: "coffee",
      hot: "coffee",
      "iced-coffee": "coffee",
      "hot-coffee": "coffee",
      "espesyal": "coffee",
      "espesyal2": "non-coffee",
      noncoffee: "non-coffee",
      "non-coffee": "non-coffee",
      matcha: "matcha",
      cookies: "pastries",
      smores: "pastries",
      cheesecakes: "pastries",
      "add-ons": "add-ons"
    };

    return mapping[value] || value || "";
  };

  const normalizeSubcategory = (value) => {
    const mapping = {
      iced: "iced-coffee",
      hot: "hot-coffee",
      "espesyal2": "espesyal",
      noncoffee: "non-coffee",
      "non-coffee": "non-coffee",
      cookies: "cookies",
      smores: "smores",
      cheesecakes: "cheesecakes",
      "add-ons": "add-ons"
    };

    return mapping[value] || value || "";
  };

  document.addEventListener("click", (event) => {
    const mainButton = event.target.closest(".main-category-button");
    if (mainButton) {
      const group = mainButton.closest(".category-group");
      const list = group?.querySelector(".category-list");
      const menuSection = mainButton.closest(".favorites");

      document.querySelectorAll(".main-category-button").forEach((button) => {
        button.classList.toggle("is-active", button === mainButton);
      });

      document.querySelectorAll(".category-group").forEach((item) => {
        const isSelected = item === group;
        item.classList.toggle("is-open", isSelected);
        const itemList = item.querySelector(".category-list");
        if (itemList) itemList.classList.toggle("is-open", isSelected);
      });

      if (menuSection && list) {
        const firstSubcategory = list.querySelector(".category-chip");
        if (firstSubcategory) {
          firstSubcategory.click();
        }
      }
      if (menuSection && !list?.querySelector(".category-chip")) {
        menuSection.querySelectorAll(".category-chip[data-category]").forEach((chip) => {
          chip.classList.remove("category-active");
        });
        const selectedMainCategory = normalizeMainCategory(mainButton.dataset.mainCategory);
        menuSection.querySelectorAll(".product-card[data-main-category], .product-card[data-category], .product-card[data-best-seller]").forEach((card) => {
          const cardMainCategory = normalizeMainCategory(card.dataset.mainCategory || card.dataset.category);
          const isBestSeller = selectedMainCategory === "best-sellers" && card.dataset.bestSeller === "true";
          card.hidden = !isBestSeller && cardMainCategory !== selectedMainCategory;
        });
      }
      return;
    }

    const chip = event.target.closest(".category-chip[data-category]");
    if (!chip) return;

    const menuSection = chip.closest(".favorites");
    if (!menuSection) return;

    const selectedMainCategory = normalizeMainCategory(chip.dataset.mainCategory || chip.dataset.category);
    const selectedSubcategory = normalizeSubcategory(chip.dataset.subcategory || chip.dataset.category);

    menuSection.querySelectorAll(".category-chip[data-category]").forEach((item) => {
      item.classList.toggle("category-active", item === chip);
    });

    menuSection.querySelectorAll(".product-card[data-main-category], .product-card[data-category], .product-card[data-best-seller]").forEach((card) => {
      const cardMainCategory = normalizeMainCategory(card.dataset.mainCategory || card.dataset.category);
      const cardSubcategory = normalizeSubcategory(card.dataset.subcategory || card.dataset.category);
      const isBestSeller = selectedMainCategory === "best-sellers" && card.dataset.bestSeller === "true";
      const matchesMainCategory = cardMainCategory === selectedMainCategory;
      const matchesSubcategory = !selectedSubcategory || cardSubcategory === selectedSubcategory || (!card.dataset.subcategory && cardSubcategory === selectedSubcategory);
      const shouldShow = isBestSeller || (matchesMainCategory && matchesSubcategory);
      card.hidden = !shouldShow;
    });
  });

  document.querySelectorAll("img[data-fallback]").forEach((image) => {
    image.addEventListener("error", () => {
      if (!image.dataset.fallbackTried) {
        image.dataset.fallbackTried = "true";
        image.src = image.dataset.fallback;
        return;
      }

      const placeholder = image.parentElement?.querySelector(".media-placeholder");
      if (placeholder) placeholder.hidden = false;
      image.hidden = true;
    });
  });

  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.passwordToggle);
      if (!input) return;

      const shouldShow = input.type === "password";
      input.type = shouldShow ? "text" : "password";
      button.setAttribute("aria-pressed", String(shouldShow));
      button.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
    });
  });

  document.querySelectorAll("[data-demo-message]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const message = link.closest("form")?.querySelector(".form-message");
      if (message) {
        message.textContent = link.dataset.demoMessage;
        message.classList.remove("is-success");
      }
    });
  });

  const emailIsValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  const showMessage = (element, text, isSuccess = false) => {
    if (!element) return;
    element.textContent = text;
    element.classList.toggle("is-success", isSuccess);
  };

  const loginForm = document.querySelector("#login-form");
  if (loginForm) {
    const message = loginForm.querySelector(".form-message");
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const identity = loginForm.elements.identity.value.trim();
      const password = loginForm.elements.password.value;

      if (!identity) return showMessage(message, "Please enter your email or username.");
      if (identity.includes("@") && !emailIsValid(identity)) return showMessage(message, "Please enter a valid email address.");
      if (!password) return showMessage(message, "Please enter your password.");

      if (supabaseConfigured) {
        if (!identity.includes("@")) {
          return showMessage(message, "Please use the email address associated with your account.");
        }

        const submitButton = loginForm.querySelector("button[type='submit']");
        showMessage(message, "Signing in...");
        if (submitButton) submitButton.disabled = true;

        try {
          const { user } = await signInCustomer(identity, password);
          const role = await getSignedInRole(user.id);
          showMessage(message, "Login successful! Redirecting...", true);
          const returnTo = new URLSearchParams(window.location.search).get("returnTo");
          const customerDestination = ["orders.html", "customer.html#cart-section"].includes(returnTo) ? returnTo : "index.html";
          const destination = role === "admin" ? "admin.html" : role === "barista" ? "barista.html" : customerDestination;
          window.setTimeout(() => {
            window.location.href = destination;
          }, 400);
        } catch (error) {
          showMessage(message, error.message || "Login failed. Please try again.");
        } finally {
          if (submitButton) submitButton.disabled = false;
        }
        return;
      }

      const returnTo = new URLSearchParams(window.location.search).get("returnTo");
      const destination = ["orders.html", "customer.html#cart-section"].includes(returnTo) ? returnTo : "index.html";
      showMessage(message, destination === "index.html" ? "Login successful! Redirecting to the homepage..." : "Login successful! Returning to your order...", true);
      window.setTimeout(() => {
        window.location.href = destination;
      }, 600);
    });
  }

  const signupForm = document.querySelector("#signup-form");
  if (signupForm) {
    const message = signupForm.querySelector(".form-message");
    const successPanel = document.querySelector("#signup-success");

    signupForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const firstName = signupForm.elements.firstName.value.trim();
      const lastName = signupForm.elements.lastName.value.trim();
      const email = signupForm.elements.email.value.trim();
      const username = signupForm.elements.username.value.trim();
      const phone = signupForm.elements.phone.value.trim();
      const password = signupForm.elements.password.value;
      const confirmPassword = signupForm.elements.confirmPassword.value;
      const termsAccepted = signupForm.elements.terms.checked;

      if (!firstName) return showMessage(message, "Please enter your first name.");
      if (!lastName) return showMessage(message, "Please enter your last name.");
      if (!emailIsValid(email)) return showMessage(message, "Please enter a valid email address.");
      if (!username) return showMessage(message, "Please enter a username.");
      const phoneDigits = phone.replace(/\D/g, "");
      if (!/^[+\d\s().-]+$/.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
        return showMessage(message, "Please enter a valid phone number.");
      }
      if (!password) return showMessage(message, "Please enter a password.");
      if (password.length < 8) return showMessage(message, "Your password must be at least 8 characters long.");
      if (password !== confirmPassword) return showMessage(message, "Passwords do not match.");
      if (!termsAccepted) return showMessage(message, "Please accept the Terms and Conditions.");

      if (supabaseConfigured) {
        try {
          const usernameAvailable = await isUsernameAvailable(username);
          if (!usernameAvailable) {
            return showMessage(message, "That username has already been used. Please choose another.");
          }
          const result = await signUpCustomer({ firstName, lastName, username, phone }, email, password);
          const successText = successPanel?.querySelector("span");
          if (successText) {
            successText.textContent = result.session
              ? "Your KLASIK CAFE account is ready. Continue to login."
              : "Check your email to confirm your account, then continue to login.";
          }
          showMessage(message, "Account created. Follow the next step below.", true);
          if (successPanel) successPanel.hidden = false;
          signupForm.querySelector("button[type='submit']").hidden = true;
        } catch (error) {
          const messageText = error.message || "Account creation failed. Please try again.";
          showMessage(
            message,
            messageText.includes("is_username_available")
              ? "Username availability checking is not set up yet. Ask the site administrator to run the latest Supabase migration."
              : messageText
          );
        }
        return;
      }

      showMessage(message, "", true);
      if (successPanel) successPanel.hidden = false;
      signupForm.querySelector("button[type='submit']").hidden = true;
    });
  }

  document.querySelectorAll("a[href='login.html']").forEach((link) => {
    if (link.textContent.trim().toLowerCase() !== "logout") return;
    link.addEventListener("click", async (event) => {
      if (!supabaseConfigured) return;
      event.preventDefault();
      try {
        await signOutCustomer();
        window.location.href = "login.html";
      } catch (error) {
        console.error("Sign out failed:", error);
        window.alert(error.message || "Sign out failed.");
      }
    });
  });
});

document.addEventListener("DOMContentLoaded", () => {
    const navLinks = document.querySelectorAll(".nav-link");
    
    // Dynamically find the sections based on your link hrefs
    const sections = Array.from(navLinks)
        .map(link => {
            const href = link.getAttribute("href");
            if (href && href.startsWith("#") && href.length > 1) {
                return document.querySelector(href);
            }
            return null;
        })
        .filter(Boolean); 

    // Updated options: Triggers when the element hits the top portion of the screen, regardless of its height
    const observerOptions = {
        root: null,
        rootMargin: "-80px 0px -60% 0px", 
        threshold: 0 
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const activeId = entry.target.getAttribute("id");
                
                navLinks.forEach(link => link.classList.remove("active"));
                
                const activeLink = document.querySelector(`.nav-link[href="#${activeId}"]`);
                if (activeLink) {
                    activeLink.classList.add("active");
                }
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
    });
});