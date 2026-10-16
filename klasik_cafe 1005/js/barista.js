import { requireRole } from "./supabase-auth.js";
import { supabaseConfigured } from "./supabase-client.js";
import { fetchStaffOrders, setOrderStatus, subscribeToOrders } from "./supabase-data.js";

"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const storageKey = "klasikCafeBaristaOrders";

  const defaultOrders = [
    {
      id: 1024,
      customer: "Juan Dela Cruz",
      items: [
        { name: "Iced Spanish Latte", quantity: 1, customizations: { size: "Medium", milk: "Regular Milk", sweetness: "50%", ice: "Less Ice" }, addOns: ["Extra Shot"] },
        { name: "Croissant", quantity: 1, customizations: {}, addOns: [] }
      ],
      specialRequest: "Less sugar please.",
      total: 280,
      status: "Pending",
      orderTime: "8:40 AM"
    },
    {
      id: 1025,
      customer: "Maria Santos",
      items: [
        { name: "Classic Latte", quantity: 2, customizations: { size: "Large", milk: "Oat", sweetness: "25%", ice: "Less Ice" }, addOns: ["Oreo"] }
      ],
      specialRequest: "Extra hot.",
      total: 280,
      status: "Accepted",
      orderTime: "8:55 AM"
    },
    {
      id: 1026,
      customer: "Rico Tan",
      items: [
        { name: "Mocha Frappe", quantity: 1, customizations: { size: "Large", milk: "Regular", sweetness: "100%", ice: "Regular Ice" }, addOns: ["Seasalt Cream"] }
      ],
      specialRequest: "No whipped cream.",
      total: 190,
      status: "Preparing",
      orderTime: "9:05 AM"
    },
    {
      id: 1027,
      customer: "Alyza Perez",
      items: [
        { name: "Butter Croissant", quantity: 2, customizations: {}, addOns: [] }
      ],
      specialRequest: "Please keep it warm.",
      total: 180,
      status: "Ready",
      orderTime: "9:12 AM"
    }
  ];

  let orders = loadData(storageKey, defaultOrders);
  const queueContainer = document.getElementById("barista-order-queue");
  const detailPanel = document.getElementById("barista-order-detail");
  let orderChannelCleanup = null;
  let selectedOrderId = orders[0]?.id ?? null;

  if (supabaseConfigured) {
    try {
      const access = await requireRole(["barista", "admin"]);
      if (!access) return;
      orders = await fetchStaffOrders();
      selectedOrderId = orders[0]?.id ?? null;
      orderChannelCleanup = subscribeToOrders(async () => {
        orders = await fetchStaffOrders();
        if (!orders.some((order) => String(order.id) === String(selectedOrderId))) {
          selectedOrderId = orders[0]?.id ?? null;
        }
        renderQueue();
        renderDetail();
      }, (status, error) => {
        if (error) console.error(`Supabase order realtime ${status}:`, error);
      });
      window.addEventListener("pagehide", () => {
        if (orderChannelCleanup) {
          orderChannelCleanup().catch((error) => console.error("Unable to close the barista order channel:", error));
          orderChannelCleanup = null;
        }
      }, { once: true });
    } catch (error) {
      console.error("Barista authorization or order loading failed:", error);
      window.alert(error.message || "Unable to load the staff order queue.");
      return;
    }
  }

  function loadData(key, fallback) {
    try {
      const storedValue = localStorage.getItem(key);
      return storedValue ? JSON.parse(storedValue) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getStatusOrder(status) {
    const list = ["Pending", "Accepted", "Preparing", "Ready", "Completed"];
    return list.indexOf(status);
  }

  function getNextStatus(status) {
    const flow = ["Pending", "Accepted", "Preparing", "Ready", "Completed"];
    const currentIndex = flow.indexOf(status);
    return currentIndex >= 0 && currentIndex < flow.length - 1 ? flow[currentIndex + 1] : status;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function renderQueue() {
    if (!queueContainer) return;

    queueContainer.innerHTML = orders.map((order) => `
      <article class="queue-item ${String(selectedOrderId) === String(order.id) ? "is-selected" : ""}" data-order-id="${escapeHtml(order.id)}">
        <div class="queue-header">
          <strong>Order #${escapeHtml(order.displayId ?? order.id)}</strong>
          <span data-status="${escapeHtml(String(order.status).toLowerCase())}">${escapeHtml(order.status)}</span>
        </div>
        <p>Customer: ${escapeHtml(order.customer)}</p>
        <ul>
          ${order.items.map((item) => `<li>${escapeHtml(item.quantity)}x ${escapeHtml(item.name)}</li>`).join("")}
        </ul>
        <button class="queue-action" type="button" data-action="advance" data-order-id="${escapeHtml(order.id)}" ${["Completed", "Cancelled"].includes(order.status) ? "disabled" : ""}>
          ${order.status === "Pending" ? "Confirm Order" : order.status === "Accepted" ? "Start Preparing" : order.status === "Preparing" ? "Mark as Ready" : order.status === "Ready" ? "Complete Order" : order.status}
        </button>
      </article>
    `).join("");
  }

  function renderDetail() {
    if (!detailPanel) return;

    const currentOrder = orders.find((order) => String(order.id) === String(selectedOrderId)) || orders[0];
    if (!currentOrder) {
      detailPanel.innerHTML = "<p>No orders available.</p>";
      return;
    }

    const itemsMarkup = currentOrder.items.map((item) => {
      const customizations = typeof item.customizations === "string"
        ? item.customizations
        : Object.values(item.customizations || {}).filter(Boolean).join(" / ");
      const customizationText = customizations
        ? `<div>${escapeHtml(customizations)}</div>`
        : "";
      const addOnText = item.addOns && item.addOns.length
        ? `Add-ons: ${item.addOns.map((addon) => typeof addon === "string" ? addon : addon.name).map(escapeHtml).join(", ")}`
        : "Add-ons: None";
      return `<li>${escapeHtml(item.quantity)}x ${escapeHtml(item.name)} ${customizationText ? `- ${customizationText}` : ""}<br>${escapeHtml(addOnText)}</li>`;
    }).join("");

    const receiptPreview = currentOrder.status === "Completed" ? `
      <div class="receipt-preview">
        <h4>Receipt Preview</h4>
        <div class="receipt-box">
          <strong>KLASIK CAFE</strong>
          Order #${escapeHtml(currentOrder.displayId ?? currentOrder.id)}<br>
          Date: ${escapeHtml(currentOrder.date || currentOrder.orderTime)}<br>
          Customer: ${escapeHtml(currentOrder.customer)}<br>
          <br>
          Items<br>
          ----------------<br>
          ${currentOrder.items.map((item) => `${escapeHtml(item.name)}<br>${escapeHtml(typeof item.customizations === "string" ? item.customizations : Object.values(item.customizations || {}).join(" "))}<br>${escapeHtml(item.addOns?.map((addon) => typeof addon === "string" ? addon : addon.name).join(", ") || "")}`).join("<br><br>")}
          <br>----------------<br>
          Subtotal: ${currentOrder.total}
          <br>Total: ${currentOrder.total}
        </div>
      </div>
    ` : "";

    detailPanel.innerHTML = `
      <h3>Order #${escapeHtml(currentOrder.displayId ?? currentOrder.id)}</h3>
      <div class="status-tag" data-status="${escapeHtml(String(currentOrder.status).toLowerCase())}">${escapeHtml(currentOrder.status)}</div>
      <dl>
        <dt>Customer</dt>
        <dd>${escapeHtml(currentOrder.customer)}</dd>
        <dt>Order Time</dt>
        <dd>${escapeHtml(currentOrder.orderTime || currentOrder.date)}</dd>
        <dt>Total</dt>
        <dd>₱${escapeHtml(currentOrder.total)}</dd>
        <dt>Special Request</dt>
        <dd>${escapeHtml(currentOrder.specialRequest || "None")}</dd>
      </dl>
      <ul class="detail-items">${itemsMarkup}</ul>
      ${receiptPreview}
    `;
  }

  async function updateOrderStatus(orderId, nextStatus) {
    const order = orders.find((item) => String(item.id) === String(orderId));
    if (!order) return;

    if (supabaseConfigured) {
      await setOrderStatus(orderId, nextStatus);
      orders = await fetchStaffOrders();
      renderQueue();
      renderDetail();
      return;
    }

    order.status = nextStatus;
    if (nextStatus === "Completed") {
      order.date = new Date().toISOString().slice(0, 10);
    }
    saveData(storageKey, orders);
    renderQueue();
    renderDetail();
  }

  queueContainer?.addEventListener("click", async (event) => {
    const queueItem = event.target.closest(".queue-item");
    if (queueItem) {
      selectedOrderId = queueItem.dataset.orderId;
      renderQueue();
      renderDetail();
    }

    const actionButton = event.target.closest("[data-action='advance']");
    if (actionButton) {
      const orderId = actionButton.dataset.orderId;
      const order = orders.find((item) => String(item.id) === String(orderId));
      if (!order) return;

      const nextStatus = getNextStatus(order.status);
      try {
        await updateOrderStatus(orderId, nextStatus);
      } catch (error) {
        console.error("Order status update failed:", error);
        window.alert(error.message || "Unable to update order status.");
      }
    }
  });

  renderQueue();
  renderDetail();
});
