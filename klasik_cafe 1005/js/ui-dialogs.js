function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

export function themedConfirm({ title, message, confirmLabel = "Confirm", cancelLabel = "Cancel" }) {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "klasik-dialog";
    dialog.innerHTML = `
      <form method="dialog" class="klasik-dialog-card">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(message)}</p>
        <div class="klasik-dialog-actions">
          <button class="button button-outline" value="cancel">${escapeHtml(cancelLabel)}</button>
          <button class="button button-primary" value="confirm">${escapeHtml(confirmLabel)}</button>
        </div>
      </form>
    `;
    dialog.addEventListener("close", () => {
      resolve(dialog.returnValue === "confirm");
      dialog.remove();
    }, { once: true });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close("cancel");
    });
    document.body.append(dialog);
    dialog.showModal();
  });
}

export function showOrderReceipt({ orderNumber, items, total }) {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "klasik-dialog receipt-dialog";
    dialog.innerHTML = `
      <form method="dialog" class="klasik-dialog-card">
        <p class="eyebrow eyebrow-blue"><span></span> OFFICIAL ORDER RECEIPT</p>
        <h2>Order placed</h2>
        <p class="receipt-code">Order #${escapeHtml(orderNumber)}</p>
        <ul class="receipt-items">${items.map((item) => `
          <li><strong>${escapeHtml(item.quantity)}x ${escapeHtml(item.name)}</strong>
            ${item.customizations ? `<small>${escapeHtml(item.customizations)}</small>` : ""}
            ${item.addOns?.length ? `<small>Add-ons: ${escapeHtml(item.addOns.join(", "))}</small>` : ""}
          </li>
        `).join("")}</ul>
        <p class="receipt-total"><strong>Total</strong><strong>₱${Number(total).toLocaleString("en-US")}</strong></p>
        <p class="receipt-note">Please present this receipt and order code at KLASIK CAFE. Your order will move to Order History after a bartender confirms it.</p>
        <div class="klasik-dialog-actions">
          <button class="button button-primary" value="close">Done</button>
        </div>
      </form>
    `;
    dialog.addEventListener("close", () => {
      resolve();
      dialog.remove();
    }, { once: true });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close("close");
    });
    document.body.append(dialog);
    dialog.showModal();
  });
}

export function confirmOrderReview({ items, total }) {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "klasik-dialog receipt-dialog";
    dialog.innerHTML = `
      <form method="dialog" class="klasik-dialog-card">
        <p class="eyebrow eyebrow-blue"><span></span> CHECK BEFORE PLACING</p>
        <h2>Confirm your order</h2>
        <ul class="receipt-items">${items.map((item) => `
          <li><strong>${escapeHtml(item.quantity)}x ${escapeHtml(item.name)}</strong>
            ${item.customizations ? `<small>${escapeHtml(item.customizations)}</small>` : ""}
            ${item.addOns?.length ? `<small>Add-ons: ${escapeHtml(item.addOns.join(", "))}</small>` : ""}
          </li>
        `).join("")}</ul>
        <p class="receipt-total"><strong>Total</strong><strong>₱${Number(total).toLocaleString("en-US")}</strong></p>
        <p class="receipt-note">You’ll receive an official receipt and order code once the order is placed.</p>
        <div class="klasik-dialog-actions">
          <button class="button button-outline" value="cancel">Go back</button>
          <button class="button button-primary" value="confirm">Confirm &amp; Place Order</button>
        </div>
      </form>
    `;
    dialog.addEventListener("close", () => {
      resolve(dialog.returnValue === "confirm");
      dialog.remove();
    }, { once: true });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close("cancel");
    });
    document.body.append(dialog);
    dialog.showModal();
  });
}
