import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const pages = [
  "index.html",
  "login.html",
  "signup.html",
  "menu.html",
  "orders.html",
  "placed-orders.html",
  "order-history.html",
  "favorites.html",
  "feedback.html",
  "customer.html",
  "admin.html",
  "barista.html"
];

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((page) => [page.replace(".html", ""), resolve(projectRoot, page)])
      )
    }
  }
});
