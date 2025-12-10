// public/messages.js
// Email-style messages page with Reply button that opens a thread
// connecting sender, receiver, and the ad (service) that started it.

(() => {
  console.log("[messages] loaded messages.js (email-style thread)");

  // -----------------------------
  // API base URL helper (Render vs local)
  // -----------------------------
  const AUTO_HOST = "codecrowds.onrender.com";

  const API_URL =
    window.API_URL ||
    (window.location.hostname === AUTO_HOST ||
      window.location.hostname.endsWith(".onrender.com")
      ? `https://${AUTO_HOST}/api`
      : "/api");

  // -----------------------------
  // DOM elements
  // -----------------------------
  const messagesList = document.getElementById("messages-list");
  const inboxBtn = document.getElementById("inboxBtn");
  const sentBtn = document.getElementById("sentBtn");
  const backBtn = document.getElementById("goBackBtn");

  // -----------------------------
  // State
  // -----------------------------
  let currentView = "inbox"; // "inbox" | "sent"
  let inboxMessages = [];
  let sentMessages = [];
  let allMessages = [];
  const currentUserId = getCurrentUserId();

  // -----------------------------
  // Helpers
  // -----------------------------
  function getCurrentUserId() {
    try {
      const raw = localStorage.getItem("userId");
      if (!raw) return null;
      const n = Number(raw);
      return Number.isNaN(n) ? null : n;
    } catch {
      return null;
    }
  }

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function showStatus(text, cls = "loading") {
    if (!messagesList) return;
    messagesList.innerHTML = `<p class="${cls}">${escapeHtml(text)}</p>`;
  }

  function setActiveTab(view) {
    currentView = view;
    if (!inboxBtn || !sentBtn) return;

    inboxBtn.classList.toggle("active", view === "inbox");
    sentBtn.classList.toggle("active", view === "sent");

    inboxBtn.setAttribute("aria-pressed", view === "inbox" ? "true" : "false");
    sentBtn.setAttribute("aria-pressed", view === "sent" ? "true" : "false");
  }

  async function apiGet(path) {
    const res = await fetch(`${API_URL}${path}`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return res.json();
  }

  async function apiPost(path, body) {
    let token = null;
    try {
      token = localStorage.getItem("token");
    } catch {
      token = null;
    }

    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify(body),
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      // ignore parse error, rely on status
    }

    if (!res.ok) {
      const msg =
        (data && data.error && data.error.message) ||
        data?.message ||
        `Request failed with status ${res.status}`;
      throw new Error(msg);
    }

    return data;
  }

  function normalizeMessages(payload) {
    if (!payload) return [];
    if (Array.isArray(payload.messages)) return payload.messages;
    if (Array.isArray(payload.data)) return payload.data;
    if (payload.data && Array.isArray(payload.data.rows)) return payload.data.rows;
    if (Array.isArray(payload)) return payload;
    return [];
  }

  function indexAllMessages() {
    const seen = new Set();
    const combined = [...inboxMessages, ...sentMessages];
    allMessages = [];

    for (const m of combined) {
      const id = m && m.id;
      if (id == null) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      allMessages.push(m);
    }
  }

  // -----------------------------
  // Fetch both inbox + sent once
  // -----------------------------
  async function fetchAllMessages() {
    try {
      showStatus("Loading messages…", "loading");
      const [inboxRaw, sentRaw] = await Promise.all([
        apiGet("/messages/inbox"),
        apiGet("/messages/sent"),
      ]);

      inboxMessages = normalizeMessages(inboxRaw);
      sentMessages = normalizeMessages(sentRaw);
      indexAllMessages();

      renderView("inbox");
    } catch (err) {
      console.error("[messages] fetchAllMessages failed", err);
      showStatus("Could not load your messages. Please try again.", "error");
    }
  }

  // -----------------------------
  // Rendering main list (cards)
  // -----------------------------
  function renderView(view) {
    setActiveTab(view);
    const list = view === "inbox" ? inboxMessages : sentMessages;

    if (!list.length) {
      showStatus(
        view === "inbox"
          ? "You have no received messages yet."
          : "You have not sent any messages yet.",
        "empty",
      );
      return;
    }

    const html = list.map((m) => renderMessageCard(m, view)).join("");
    messagesList.innerHTML = html;
  }

  function renderMessageCard(m, view) {
    const senderName =
      m.senderName ||
      m.senderUsername ||
      m.sender?.displayName ||
      m.sender?.username ||
      m.sender?.email ||
      "Unknown user";

    const receiverName =
      m.receiverName ||
      m.receiverUsername ||
      m.receiver?.displayName ||
      m.receiver?.username ||
      m.receiver?.email ||
      "";

    const whoLine =
      view === "inbox"
        ? `From: ${senderName}`
        : receiverName
        ? `To: ${receiverName}`
        : "Sent message";

    const previewRaw =
      m.preview || m.snippet || m.content || m.text || "";
    const preview =
      previewRaw.length > 220
        ? `${previewRaw.slice(0, 217)}…`
        : previewRaw;

    const when = formatDate(m.createdAt || m.sentAt || m.created_at);
    const msgId = m.id || m.messageId || m.messageID || "";

    // Figure out "other user" in the pair (not you)
    const sId = m.senderId ?? m.sender_id;
    const rId = m.receiverId ?? m.receiver_id;
    let partnerId = null;
    if (currentUserId != null && sId === currentUserId) partnerId = rId;
    else if (currentUserId != null && rId === currentUserId) partnerId = sId;
    else partnerId = view === "inbox" ? sId : rId;

    const partnerName = view === "inbox" ? senderName : receiverName || "User";

    // Service / ad info
    const serviceId = m.serviceId ?? m.service_id ?? "";
    const serviceTitle =
      (m.service && (m.service.title || m.service.name)) ||
      m.serviceTitle ||
      "";

    // Subject shown on card (keeps your existing look)
    const subjectDisplay = `RE 'Message from ${senderName}'`;

    return `
      <article class="message-card" data-message-id="${escapeHtml(
        String(msgId),
      )}">
        <div class="message-main">
          <h3 class="message-title">${escapeHtml(subjectDisplay)}</h3>
          <p class="message-meta">${escapeHtml(whoLine)}</p>
          <p>${escapeHtml(preview)}</p>
          <p class="timestamp">${escapeHtml(when)}</p>

          <div class="conversation-footer">
            <!-- looks like the old "View Conversation" button but says Reply -->
            <button
              type="button"
              class="reply-toggle"
            >
              Reply
            </button>
          </div>
        </div>

        <!-- Email-style conversation panel (hidden until Reply is clicked) -->
        <div
          class="conversation-panel"
          hidden
          data-partner-id="${escapeHtml(String(partnerId ?? ""))}"
          data-partner-name="${escapeHtml(partnerName)}"
          data-service-id="${escapeHtml(String(serviceId))}"
          data-service-title="${escapeHtml(serviceTitle)}"
        >
          <div class="thread-header"></div>
          <div class="thread-messages"></div>
          <div class="thread-reply">
            <textarea
              class="thread-reply-input"
              placeholder="Type your reply…"
            ></textarea>
            <button type="button" class="thread-send-btn">Send</button>
          </div>
        </div>
      </article>
    `;
  }

  // -----------------------------
  // Build email-style conversation thread
  // -----------------------------
  function threadMessagesFor(partnerId, serviceId) {
    const partnerIdNum =
      partnerId == null || partnerId === "" ? null : Number(partnerId);
    const svcIdNum =
      serviceId == null || serviceId === "" ? null : Number(serviceId);

    const filtered = allMessages.filter((m) => {
      const sId = m.senderId ?? m.sender_id;
      const rId = m.receiverId ?? m.receiver_id;

      const pairMatch =
        partnerIdNum != null &&
        currentUserId != null &&
        ((sId === currentUserId && rId === partnerIdNum) ||
          (sId === partnerIdNum && rId === currentUserId));

      if (!pairMatch) return false;

      const mSvc = m.serviceId ?? m.service_id ?? null;
      if (!svcIdNum || !mSvc) return true;

      return Number(mSvc) === svcIdNum;
    });

    // sort oldest → newest
    filtered.sort((a, b) => {
      const da = new Date(a.createdAt || a.created_at);
      const db = new Date(b.createdAt || b.created_at);
      return da - db;
    });

    // de-dup by id just in case
    const seen = new Set();
    const deduped = [];
    for (const m of filtered) {
      if (!m || m.id == null) continue;
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      deduped.push(m);
    }

    return deduped;
  }

  function buildThreadHeaderHtml(partnerName, serviceTitle) {
    const parts = [];

    // Connect sender + receiver
    parts.push(
      `<div><strong>Between:</strong> You &nbsp;and&nbsp; ${escapeHtml(
        partnerName || "this user",
      )}</div>`,
    );

    // Connect to ad / service
    if (serviceTitle) {
      parts.push(
        `<div><strong>Ad:</strong> ${escapeHtml(serviceTitle)}</div>`,
      );
    }

    return `<div class="thread-header-inner">${parts.join("")}</div>`;
  }

  function buildThreadMessagesHtml(msgs, partnerName) {
    if (!msgs.length) {
      return `<p class="thread-empty">No previous messages in this conversation yet.</p>`;
    }

    return msgs
      .map((m) => {
        const sId = m.senderId ?? m.sender_id;
        const fromMe = currentUserId != null && sId === currentUserId;
        const fromName = fromMe ? "You" : partnerName || "User";
        const toName = fromMe ? partnerName || "User" : "You";
        const dateStr = formatDate(m.createdAt || m.created_at);
        const body = m.content || m.text || "";

        return `
          <div class="thread-email">
            <div class="thread-email-header">
              <div><strong>From:</strong> ${escapeHtml(fromName)}</div>
              <div><strong>To:</strong> ${escapeHtml(toName)}</div>
              <div><strong>Date:</strong> ${escapeHtml(dateStr)}</div>
            </div>
            <div class="thread-email-body">
              <p>${escapeHtml(body)}</p>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function openConversationPanel(articleEl) {
    const panel = articleEl.querySelector(".conversation-panel");
    if (!panel) return;

    const partnerId = panel.getAttribute("data-partner-id");
    const partnerName = panel.getAttribute("data-partner-name") || "User";
    const serviceId = panel.getAttribute("data-service-id") || "";
    const serviceTitle = panel.getAttribute("data-service-title") || "";

    const headerEl = panel.querySelector(".thread-header");
    const messagesEl = panel.querySelector(".thread-messages");
    const textarea = panel.querySelector(".thread-reply-input");

    const msgs = threadMessagesFor(partnerId, serviceId);

    if (headerEl) {
      headerEl.innerHTML = buildThreadHeaderHtml(partnerName, serviceTitle);
    }
    if (messagesEl) {
      messagesEl.innerHTML = buildThreadMessagesHtml(msgs, partnerName);
    }

    panel.hidden = false;
    if (textarea) textarea.focus();
  }

  function closeConversationPanel(articleEl) {
    const panel = articleEl.querySelector(".conversation-panel");
    if (!panel) return;
    panel.hidden = true;
  }

  async function sendReplyFromPanel(articleEl) {
    const panel = articleEl.querySelector(".conversation-panel");
    if (!panel) return;

    const partnerIdRaw = panel.getAttribute("data-partner-id");
    const serviceIdRaw = panel.getAttribute("data-service-id") || "";
    const partnerName = panel.getAttribute("data-partner-name") || "User";

    const partnerId = partnerIdRaw ? Number(partnerIdRaw) : null;
    const serviceId = serviceIdRaw ? Number(serviceIdRaw) : null;

    const textarea = panel.querySelector(".thread-reply-input");
    if (!textarea) return;

    const content = textarea.value.trim();
    if (!content) {
      alert("Your reply cannot be empty.");
      return;
    }
    if (!partnerId) {
      alert("Cannot send reply: missing receiver.");
      return;
    }

    const payload = {
      content,
      receiverId: partnerId,
    };
    if (serviceId) payload.serviceId = serviceId;

    try {
      const res = await apiPost("/messages", payload);

      // Try to grab created message for local thread update
      const created =
        (res && res.data) ||
        (res && res.message) ||
        res;

      if (created && created.id != null) {
        // treat as sent message
        sentMessages.push(created);
        indexAllMessages();
      }

      textarea.value = "";

      // Rebuild thread
      const msgs = threadMessagesFor(partnerId, serviceId);
      const messagesEl = panel.querySelector(".thread-messages");
      if (messagesEl) {
        messagesEl.innerHTML = buildThreadMessagesHtml(msgs, partnerName);
      }

      if (currentView === "sent") {
        renderView("sent");
      }
    } catch (err) {
      console.error("[messages] sendReply failed", err);
      alert(err.message || "Failed to send reply.");
    }
  }

  // -----------------------------
  // Event wiring
  // -----------------------------
  function setupEvents() {
    if (inboxBtn) {
      inboxBtn.addEventListener("click", (e) => {
        e.preventDefault();
        renderView("inbox");
      });
    }

    if (sentBtn) {
      sentBtn.addEventListener("click", (e) => {
        e.preventDefault();
        renderView("sent");
      });
    }

    if (backBtn) {
      backBtn.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "/profile.html";
      });
    }

    // Delegate clicks for message cards
    document.addEventListener("click", (e) => {
      const target = e.target;

      // Reply button toggles email-style conversation
      if (target.classList.contains("reply-toggle")) {
        const article = target.closest(".message-card");
        if (!article) return;

        const panel = article.querySelector(".conversation-panel");
        if (!panel) return;

        if (panel.hidden) {
          openConversationPanel(article);
        } else {
          closeConversationPanel(article);
        }
      }

      // Send inside the conversation panel
      if (target.classList.contains("thread-send-btn")) {
        const article = target.closest(".message-card");
        if (!article) return;
        sendReplyFromPanel(article);
      }
    });
  }

  // -----------------------------
  // Init
  // -----------------------------
  document.addEventListener("DOMContentLoaded", () => {
    setupEvents();
    fetchAllMessages();
  });
})();
