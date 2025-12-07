// public/services.js
// Services page logic: load services, filter/sort, and send messages.

(function () {
  "use strict";

  // ---------- Safe localStorage helpers ----------
  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function getToken() {
    return safeGet("token"); // may be unused; backend decides auth
  }

  function getUserId() {
    return safeGet("userId");
  }

  // ---------- DOM references ----------
  let servicesList;
  let searchInput;
  let sortSelect;
  let refreshBtn;

  let messageModal;
  let messageRecipientSpan;
  let messageContent;
  let sendMessageBtn;
  let cancelMessageBtn;
  let sendError;
  let charCount;
  let toastEl;

  // in-memory services
  let allServices = [];
  let currentRecipientId = null;
  let currentRecipientName = "";

  // ---------- Toast helper ----------
  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("show");
    setTimeout(() => {
      toastEl.classList.remove("show");
    }, 2600);
  }

  // ---------- Services loading / rendering ----------
  async function loadServices() {
    if (!servicesList) return;

    servicesList.innerHTML =
      '<p><span class="spinner"></span> Loading services…</p>';

    try {
      // apiFetch is defined in script.js and automatically sends auth (if any)
      const json = await apiFetch("/services");

      // Accept either { services: [...] } or { data: [...] }
      const raw =
        (Array.isArray(json.services) && json.services) ||
        (Array.isArray(json.data) && json.data) ||
        [];

      allServices = raw;
      renderServices();
    } catch (err) {
      console.error("Failed to load services:", err);
      servicesList.innerHTML =
        "<p>Failed to load services. Please try again.</p>";
    }
  }

  function getFilteredAndSortedServices() {
    const term = (searchInput?.value || "").trim().toLowerCase();
    const sortBy = sortSelect?.value || "newest";

    let list = allServices.slice();

    if (term) {
      list = list.filter((svc) => {
        const title = (svc.title || "").toLowerCase();
        const desc = (svc.description || "").toLowerCase();
        const userObj = svc.User || svc.user || {};
        const username = (userObj.username || "").toLowerCase();
        return (
          title.includes(term) || desc.includes(term) || username.includes(term)
        );
      });
    }

    list.sort((a, b) => {
      if (sortBy === "priceLow") {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortBy === "priceHigh") {
        return (b.price || 0) - (a.price || 0);
      }
      // newest (by createdAt / id as fallback)
      const aTime = new Date(a.createdAt || 0).getTime() || 0;
      const bTime = new Date(b.createdAt || 0).getTime() || 0;
      return bTime - aTime;
    });

    return list;
  }

  function renderServices() {
    if (!servicesList) return;

    const list = getFilteredAndSortedServices();

    if (!list.length) {
      servicesList.innerHTML =
        '<div class="services-empty">No services found yet.</div>';
      return;
    }

    servicesList.innerHTML = "";

    list.forEach((svc) => {
      const userObj = svc.User || svc.user || {};
      const username = userObj.username || "Unknown user";
      const ownerId = userObj.id || userObj.userId || svc.userId || null;

      const card = document.createElement("article");
      card.className = "service-card";

      const titleEl = document.createElement("h3");
      titleEl.className = "service-title";
      titleEl.textContent = svc.title || "Untitled service";

      const descEl = document.createElement("p");
      descEl.className = "service-meta";
      descEl.textContent =
        svc.description || "No description provided for this service.";

      const postedByEl = document.createElement("p");
      postedByEl.className = "service-meta";
      postedByEl.textContent = `Posted by: ${username}`;

      const priceEl = document.createElement("p");
      priceEl.className = "service-price";
      if (svc.price != null && svc.price !== "") {
        priceEl.textContent = `Price: $${svc.price}`;
      } else {
        priceEl.textContent = "Price: Not specified";
      }

      const footer = document.createElement("div");
      footer.className = "service-footer";

      const msgBtn = document.createElement("button");
      msgBtn.type = "button";
      msgBtn.className = "service-message-btn";
      msgBtn.textContent = "Message";

      msgBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!ownerId) {
          showToast("Cannot determine service owner.");
          return;
        }
        openMessageModal(ownerId, username);
      });

      footer.appendChild(msgBtn);

      card.appendChild(titleEl);
      card.appendChild(descEl);
      card.appendChild(postedByEl);
      card.appendChild(priceEl);
      card.appendChild(footer);

      servicesList.appendChild(card);
    });
  }

  // ---------- Message modal ----------
  function openMessageModal(recipientId, recipientName) {
    currentRecipientId = recipientId;
    currentRecipientName = recipientName || "";

    if (messageRecipientSpan) {
      messageRecipientSpan.textContent = currentRecipientName;
    }
    if (messageContent) {
      messageContent.value = "";
    }
    if (charCount) {
      charCount.textContent = "0 / 2000";
    }
    if (sendError) {
      sendError.hidden = true;
      sendError.textContent = "";
    }

    if (messageModal) {
      messageModal.style.display = "flex";
      messageModal.setAttribute("aria-hidden", "false");
    }
  }

  function closeMessageModal() {
    currentRecipientId = null;
    currentRecipientName = "";
    if (messageModal) {
      messageModal.style.display = "none";
      messageModal.setAttribute("aria-hidden", "true");
    }
  }

  async function handleSendMessage() {
    if (!sendError) return;

    if (!currentRecipientId) {
      sendError.textContent = "No recipient selected.";
      sendError.hidden = false;
      return;
    }

    const bodyText = (messageContent?.value || "").trim();
    if (!bodyText) {
      sendError.textContent = "Message cannot be empty.";
      sendError.hidden = false;
      return;
    }

    sendError.hidden = true;

    if (sendMessageBtn) {
      sendMessageBtn.disabled = true;
    }

    try {
      // IMPORTANT: match backend field names
      await apiFetch("/messages", {
        method: "POST",
        body: JSON.stringify({
          receiverId: currentRecipientId, // backend expects receiverId
          body: bodyText,                 // backend expects body/message/text
          subject: "Message about your service",
        }),
      });

      showToast("Message sent.");
      closeMessageModal();
    } catch (err) {
      console.error("Failed to send message:", err);

      const status = err?.status || err?.responseStatus;
      const serverMsg =
        err?.userMessage ||
        err?.message ||
        "Something went wrong sending your message.";

      if (status === 401) {
        // backend says you are not logged in
        sendError.textContent = "Please log in to send messages.";
      } else {
        sendError.textContent = serverMsg;
      }
      sendError.hidden = false;
    } finally {
      if (sendMessageBtn) {
        sendMessageBtn.disabled = false;
      }
    }
  }

  function handleCharCount() {
    if (!messageContent || !charCount) return;
    const len = messageContent.value.length;
    charCount.textContent = `${len} / 2000`;
  }

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", () => {
    servicesList = document.getElementById("services-list");
    searchInput = document.getElementById("search");
    sortSelect = document.getElementById("sort");
    refreshBtn = document.getElementById("refreshBtn");

    messageModal = document.getElementById("messageModal");
    messageRecipientSpan = document.getElementById("messageRecipient");
    messageContent = document.getElementById("messageContent");
    sendMessageBtn = document.getElementById("sendMessageBtn");
    cancelMessageBtn = document.getElementById("cancelMessageBtn");
    sendError = document.getElementById("sendError");
    charCount = document.getElementById("charCount");
    toastEl = document.getElementById("toast");

    if (searchInput) {
      searchInput.addEventListener("input", renderServices);
    }
    if (sortSelect) {
      sortSelect.addEventListener("change", renderServices);
    }
    if (refreshBtn) {
      refreshBtn.addEventListener("click", loadServices);
    }

    if (messageContent) {
      messageContent.addEventListener("input", handleCharCount);
    }
    if (sendMessageBtn) {
      sendMessageBtn.addEventListener("click", handleSendMessage);
    }
    if (cancelMessageBtn) {
      cancelMessageBtn.addEventListener("click", closeMessageModal);
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && messageModal?.style.display === "flex") {
        closeMessageModal();
      }
    });

    loadServices();
  });
})();
