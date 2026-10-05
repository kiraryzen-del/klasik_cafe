"use strict";

document.addEventListener("DOMContentLoaded", () => {
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
        { name: "Classic Latte", quantity: 2, customizations: { size: "Large", milk: "Oat Milk", sweetness: "25%", ice: "No Ice" }, addOns: ["Vanilla"] }
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
        { name: "Mocha Frappe", quantity: 1, customizations: { size: "Large", milk: "Regular Milk", sweetness: "100%", ice: "Regular Ice" }, addOns: ["Whipped Cream"] }
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

  const orders = loadData(storageKey, defaultOrders);
  const queueContainer = document.getElementById("barista-order-queue");
  const detailPanel = document.getElementById("barista-order-detail");
  let selectedOrderId = orders[0]?.id ?? null;

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

  function renderQueue() {
    if (!queueContainer) return;

    queueContainer.innerHTML = orders.map((order) => `
      <article class="queue-item ${selectedOrderId === order.id ? "is-selected" : ""}" data-order-id="${order.id}">
        <div class="queue-header">
          <strong>Order #${order.id}</strong>
          <span>${order.status}</span>
        </div>
        <p>Customer: ${order.customer}</p>
        <ul>
          ${order.items.map((item) => `<li>${item.quantity}x ${item.name}</li>`).join("")}
        </ul>
        <button class="queue-action" type="button" data-action="advance" data-order-id="${order.id}">
          ${order.status === "Pending" ? "Accept Order" : order.status === "Accepted" ? "Start Preparing" : order.status === "Preparing" ? "Mark as Ready" : order.status === "Ready" ? "Complete Order" : "Completed"}
        </button>
      </article>
    `).join("");
  }

  function renderDetail() {
    if (!detailPanel) return;

    const currentOrder = orders.find((order) => order.id === selectedOrderId) || orders[0];
    if (!currentOrder) {
      detailPanel.innerHTML = "<p>No orders available.</p>";
      return;
    }

    const itemsMarkup = currentOrder.items.map((item) => {
      const customizationText = item.customizations && Object.keys(item.customizations).length
        ? `<div>${item.customizations.size || ""} / ${item.customizations.milk || ""} / ${item.customizations.sweetness || ""} / ${item.customizations.ice || ""}</div>`
        : "";
      const addOnText = item.addOns && item.addOns.length ? `Add-ons: ${item.addOns.join(", ")}` : "Add-ons: None";
      return `<li>${item.quantity}x ${item.name} ${customizationText ? `- ${customizationText}` : ""}<br>${addOnText}</li>`;
    }).join("");

    const receiptPreview = currentOrder.status === "Completed" ? `
      <div class="receipt-preview">
        <h4>Receipt Preview</h4>
        <div class="receipt-box">
          <strong>KLASIK CAFE</strong>
          Order #${currentOrder.id}<br>
          Date: ${currentOrder.date || currentOrder.orderTime}<br>
          Customer: ${currentOrder.customer}<br>
          <br>
          Items<br>
          ----------------<br>
          ${currentOrder.items.map((item) => `${item.name}<br>${item.customizations?.size || ""} ${item.customizations?.ice || ""}<br>${item.addOns?.join(", ") || ""}`).join("<br><br>")}
          <br>----------------<br>
          Subtotal: ${currentOrder.total}
          <br>Total: ${currentOrder.total}
        </div>
      </div>
    ` : "";

    detailPanel.innerHTML = `
      <h3>Order #${currentOrder.id}</h3>
      <div class="status-tag">${currentOrder.status}</div>
      <dl>
        <dt>Customer</dt>
        <dd>${currentOrder.customer}</dd>
        <dt>Order Time</dt>
        <dd>${currentOrder.orderTime}</dd>
        <dt>Total</dt>
        <dd>₱${currentOrder.total}</dd>
        <dt>Special Request</dt>
        <dd>${currentOrder.specialRequest || "None"}</dd>
      </dl>
      <ul class="detail-items">${itemsMarkup}</ul>
      ${receiptPreview}
    `;
  }

  function updateOrderStatus(orderId, nextStatus) {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return;

    order.status = nextStatus;
    if (nextStatus === "Completed") {
      order.date = new Date().toISOString().slice(0, 10);
    }
    saveData(storageKey, orders);
    renderQueue();
    renderDetail();
  }

  queueContainer?.addEventListener("click", (event) => {
    const queueItem = event.target.closest(".queue-item");
    if (queueItem) {
      selectedOrderId = Number(queueItem.dataset.orderId);
      renderQueue();
      renderDetail();
    }

    const actionButton = event.target.closest("[data-action='advance']");
    if (actionButton) {
      const orderId = Number(actionButton.dataset.orderId);
      const order = orders.find((item) => item.id === orderId);
      if (!order) return;

      const nextStatus = getNextStatus(order.status);
      updateOrderStatus(orderId, nextStatus);
    }
  });

  renderQueue();
  renderDetail();
});
