// public/services.js
(function () {
  // Diagnostics banner
  const diagBanner = document.getElementById("diagBanner");
  const diagMsg = document.getElementById("diagMsg");
  function showDiag(msg, ttl = 7000) {
    if (!diagBanner) return;
    diagMsg.textContent = msg;
    diagBanner.style.display = "block";
    setTimeout(() => {
      diagBanner.style.display = "none";
      diagMsg.textContent = "";
    }, ttl);
  }

  // DOM refs
  const servicesList = document.getElementById("services-list");
  const goToProfileBtn = document.getElementById("goToProfileBtn");
  const refreshBtn = document.getElementById("refreshBtn");
  const searchInput = document.getElementById("search");
  const sortSelect = document.getElementById("sort");

  const messageModal = document.getElementById("messageModal");
  const messageRecipient = document.getElementById("messageRecipient");
  const messageContent = document.getElementById("messageContent");
  const sendMessageBtn = document.getElementById("sendMessageBtn");
  const cancelMessageBtn = document.getElementById("cancelMessageBtn");
  const charCount = document.getElementById("charCount");
  const sendError = document.getElementById("sendError");

  let allServices = [];
  let messageState = { toUserId: null, serviceId: null, username: "" };
  let lastFocusedBeforeModal = null;

  // Utilities
  const esc = (s) =>
    String(s ?? "")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const fmtPrice = (v) => {
    const n = Number(v);
    return Number.isFinite(n)
      ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : esc(v);
  };
  function toast(msg) {
    const el = document.getElementById("toast");
    if (!el) {
      alert(msg);
      return;
    }
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2200);
  }
  function showInlineError(msg) {
    if (sendError) {
      sendError.textContent = msg || "";
      sendError.hidden = !msg;
    }
  }
  function stringifyAny(v) {
    if (v == null) return "";
    if (typeof v === "string") return v;
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }

  async function readError(res) {
    let data = null,
      text = "";
    try {
      data = await res.json();
    } catch {
      text = await res.text().catch(() => "");
    }
    const nested =
      data && typeof data === "object"
        ? data.error?.message ||
          data.error ||
          data.message ||
          data?.errors ||
          data
        : text || `HTTP ${res.status}`;
    return `[${res.status}] ${typeof nested === "string" ? nested : stringifyAny(nested)}`;
  }

  function makeFriendlyError(err) {
    if (!err) return "Unknown error";
    if (err?.payload) {
      try {
        const p = err.payload;
        const msg =
          p?.error?.message ||
          p?.message ||
          (p?.error ? JSON.stringify(p.error) : null);
        if (msg) return String(msg);
      } catch (e) {}
    }
    return err.message || String(err);
  }

  // Render helpers
  function render(services) {
    if (!servicesList) return;
    servicesList.innerHTML = "";
    if (!services.length) {
      servicesList.innerHTML = "<p>No services available.</p>";
      return;
    }
    services.forEach((s) => {
      const div = document.createElement("div");
      div.className = "service-card";
      const usernameHtml =
        s.user && s.user.id
          ? `<a href="profile.html?userId=${encodeURIComponent(s.user.id)}">${esc(s.user.username)}</a>`
          : "Unknown";
      div.innerHTML = `
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.description)}</p>
        <p><strong>Price:</strong> $${fmtPrice(s.price)}</p>
        <p class="username">
          Posted by:
          ${usernameHtml}
        </p>
        <div class="card-actions">
          <button type="button" class="message-btn"
            data-user-id="${s.user?.id ?? ""}"
            data-username="${esc(s.user?.username ?? "")}"
            data-service-id="${s.id ?? ""}"
            ${s.user ? "" : "disabled"}
            aria-label="Message ${esc(s.user?.username ?? "seller")}"
            title="${s.user ? "Send a message to the seller" : "No seller attached"}">
            Message
          </button>
        </div>`;
      servicesList.appendChild(div);
    });
  }

  function applyFilters() {
    const q = (searchInput?.value || "").toLowerCase().trim();
    const filtered = allServices.filter((s) => {
      const hay =
        `${s.title || ""} ${s.description || ""} ${s.user?.username || ""}`.toLowerCase();
      return hay.includes(q);
    });
    switch (sortSelect?.value) {
      case "priceLow":
        filtered.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "priceHigh":
        filtered.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      default:
        filtered.sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
        );
    }
    render(filtered);
  }

  // Data load
  async function loadServices() {
    if (!servicesList) return;
    servicesList.innerHTML =
      '<p><span class="spinner"></span> Loading services…</p>';
    try {
      let sort = "newest";
      if (sortSelect && sortSelect.value === "priceLow") sort = "priceLow";
      if (sortSelect && sortSelect.value === "priceHigh") sort = "priceHigh";

      const out = await apiFetch(
        `services?limit=50&page=1&sort=${encodeURIComponent(sort)}`,
      );

      const payload =
        out && out.services ? out : out && out.data ? out.data : out;
      const list = Array.isArray(payload)
        ? payload
        : payload && payload.services
          ? payload.services
          : [];

      allServices = list;
      applyFilters();
    } catch (e) {
      console.error("[services] load failed:", e);
      const friendly = makeFriendlyError(e);
      servicesList.innerHTML = `<p class="error">Failed to load services: ${esc(friendly)}</p>`;
      showDiag(
        "Failed to load services. If you see CORS errors in the console, update CORS_ALLOWED_ORIGINS to include your frontend origin (e.g. https://codecrowds.onrender.com).",
      );
    }
  }

  // Modal / accessibility
  function updateCounterAndState() {
    const len = (messageContent?.value || "").length;
    if (charCount) charCount.textContent = `${len} / 2000`;
    const ok = len > 0 && len <= 2000 && !!messageState.toUserId;
    if (sendMessageBtn) sendMessageBtn.disabled = !ok;
  }
  function trapFocusIn(node, e) {
    if (e.key !== "Tab") return;
    const focusables = node.querySelectorAll(
      'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',
    );
    const a = Array.from(focusables).filter(
      (x) => !x.disabled && x.offsetParent !== null,
    );
    if (!a.length) return;
    const first = a[0],
      last = a[a.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  function showModal() {
    lastFocusedBeforeModal = document.activeElement;
    if (!messageModal) return;
    messageModal.style.display = "flex";
    messageModal.setAttribute("aria-hidden", "false");
    showInlineError("");
    updateCounterAndState();
    setTimeout(() => messageContent?.focus(), 0);
    window.addEventListener("keydown", onModalKey);
  }
  function hideModal() {
    if (!messageModal) return;
    messageModal.style.display = "none";
    messageModal.setAttribute("aria-hidden", "true");
    if (messageContent) messageContent.value = "";
    showInlineError("");
    updateCounterAndState();
    messageState = { toUserId: null, serviceId: null, username: "" };
    window.removeEventListener("keydown", onModalKey);
    if (lastFocusedBeforeModal?.focus) lastFocusedBeforeModal.focus();
  }
  function onModalKey(e) {
    if (!messageModal || messageModal.style.display !== "flex") return;
    if (e.key === "Tab") trapFocusIn(messageModal, e);
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!sendMessageBtn.disabled) sendMessage();
    }
  }

  // Send message
  async function sendMessage() {
    const token = getToken(); // from script.js
    if (!token) {
      showInlineError("Please log in to send messages.");
      return;
    }
    const text = (messageContent?.value || "").trim();
    if (!messageState.toUserId) {
      showInlineError("Missing recipient.");
      return;
    }
    if (!text) {
      showInlineError("Please write a message.");
      messageContent.focus();
      return;
    }
    showInlineError("");
    try {
      if (sendMessageBtn) {
        sendMessageBtn.disabled = true;
        sendMessageBtn.textContent = "Sending…";
      }

      // Send both "to" and "receiverId" to be compatible with server/client differences
      const body = {
        to: Number(messageState.toUserId),
        receiverId: Number(messageState.toUserId),
        content: text,
      };
      if (messageState.serviceId)
        body.serviceId = Number(messageState.serviceId);

      await apiFetch("messages", {
        method: "POST",
        body,
        timeoutMs: 10000,
      });

      hideModal();
      toast("Message sent!");
    } catch (err) {
      console.error("[messages] network error:", err);
      const friendly = makeFriendlyError(err);
      if (err?.status === 401 || err?.status === 403) {
        try {
          clearToken();
          clearUserId();
        } catch {}
        showInlineError(`${friendly}. Please log in again.`);
      } else {
        const lower = String(err?.message || "").toLowerCase();
        const possibleCors =
          lower.includes("cors") ||
          lower.includes("blocked") ||
          lower.includes("network") ||
          lower.includes("failed to fetch");
        if (possibleCors) {
          showInlineError(
            `Failed to send: ${friendly}. Possible CORS or network issue — ensure CORS_ALLOWED_ORIGINS includes your frontend origin and API_URL is correct.`,
          );
          showDiag(
            "Network/CORS issue sending messages. Check server logs and update CORS_ALLOWED_ORIGINS to include your frontend origin.",
          );
        } else {
          showInlineError(`Failed to send: ${friendly}`);
        }
      }
    } finally {
      if (sendMessageBtn) {
        sendMessageBtn.disabled = false;
        sendMessageBtn.textContent = "Send";
      }
      updateCounterAndState();
    }
  }

  // Events & boot
  if (goToProfileBtn)
    goToProfileBtn.addEventListener("click", () => {
      location.href = "profile.html";
    });
  if (refreshBtn) refreshBtn.addEventListener("click", loadServices);

  let filterTimer = null;
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(filterTimer);
      filterTimer = setTimeout(applyFilters, 120);
    });
  }
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      loadServices();
    });
  }

  if (servicesList) {
    servicesList.addEventListener("click", (e) => {
      const btn = e.target.closest(".message-btn");
      if (!btn) return;
      const rawUserId = btn.getAttribute("data-user-id");
      const toUserId = rawUserId ? Number(rawUserId) : null;
      const username = btn.getAttribute("data-username") || "seller";
      const rawServiceId = btn.getAttribute("data-service-id");
      const serviceId = rawServiceId ? Number(rawServiceId) : null;

      if (!toUserId) {
        toast("This service has no associated user.");
        return;
      }

      if (typeof isLoggedIn === "function" && !isLoggedIn()) {
        toast("Please log in to message sellers.");
        setTimeout(() => {
          location.replace(
            `/?from=${encodeURIComponent(location.pathname + location.search)}`,
          );
        }, 600);
        return;
      }

      messageState = { toUserId, serviceId, username };
      messageRecipient.textContent = username || "seller";
      showModal();
    });
  }

  if (cancelMessageBtn) cancelMessageBtn.addEventListener("click", hideModal);
  if (sendMessageBtn) sendMessageBtn.addEventListener("click", sendMessage);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && messageModal?.style?.display === "flex")
      hideModal();
  });
  if (messageModal) {
    messageModal.addEventListener("click", (e) => {
      if (e.target === messageModal) hideModal();
    });
  }
  if (messageContent)
    messageContent.addEventListener("input", updateCounterAndState);

  window.addEventListener("load", () => {
    updateCounterAndState();
    loadServices();
  });
})();
