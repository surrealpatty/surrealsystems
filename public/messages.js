// public/messages.js
// Messages page: load inbox/sent + inline Reply for each message.

(() => {
  console.log("[messages] loaded messages.js (inline reply, old layout)");

  // -----------------------------
  // API base URL helper (works on Render + localhost)
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

  let currentView = "inbox"; // "inbox" | "sent"

  // -----------------------------
  // Helpers
  // -----------------------------
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

  function showStatus(text, className = "loading") {
    if (!messagesList) return;
    messagesList.innerHTML = `<p class="${className}">${escapeHtml(text)}</p>`;
  }

  function setActiveTab(view) {
    currentView = view;

    if (inboxBtn && sentBtn) {
      inboxBtn.classList.toggle("active", view === "inbox");
      sentBtn.classList.toggle("active", view === "sent");
      inboxBtn.setAttribute("aria-pressed", view === "inbox" ? "true" : "false");
      sentBtn.setAttribute("aria-pressed", view === "sent" ? "true" : "false");
    }
  }

  async function apiGet(path) {
    const res = await fetch(`${API_URL}${path}`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      throw new Error(`GET ${path} failed: ${res.status}`);
    }
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
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

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
      // ignore parse error
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

  // -----------------------------
  // Rendering – keep the OLD look using your existing classes
  // -----------------------------
  function renderMessages(payload) {
    const msgs = normalizeMessages(payload);

    if (!msgs.length) {
      showStatus(
        currentView === "inbox"
          ? "You have no received messages yet."
          : "You have not sent any messages yet.",
        "empty",
      );
      return;
    }

    const html = msgs
      .map((m) => {
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

        const baseSubject =
          m.subject ||
          m.title ||
          `Message from ${senderName || "user"}`;

        const subjectDisplay = `RE 'Message from ${senderName || "user"}'`;

        const preview =
          m.preview ||
          m.snippet ||
          m.content ||
          m.text ||
          "";

        const when = formatDate(m.createdAt || m.sentAt || m.created_at);

        const msgId = m.id || m.messageId || m.messageID || "";

        const senderId = m.senderId || m.sender_id || m.sender?.id || "";
        const receiverId = m.receiverId || m.receiver_id || m.receiver?.id || "";
        const serviceId = m.serviceId || m.service_id || "";

        // In inbox: replying goes back to sender; in sent: replying goes to receiver.
        const replyReceiverId =
          currentView === "inbox" ? senderId : receiverId;

        const metaLine =
          currentView === "inbox"
            ? `From: ${senderName}`
            : receiverName
            ? `To: ${receiverName}`
            : "Sent message";

        return `
          <article class="message-item" data-message-id="${escapeHtml(msgId)}">
            <h3 class="message-title">${escapeHtml(subjectDisplay)}</h3>
            <p class="message-meta">${escapeHtml(metaLine)}</p>
            <p>${escapeHtml(preview)}</p>
            <p class="timestamp">${escapeHtml(when)}</p>

            <div class="conversation-footer">
              <button
                type="button"
                class="view-thread-btn"
                data-message-id="${escapeHtml(msgId)}"
              >
                View Conversation
              </button>
              <button
                type="button"
                class="reply-btn"
                data-receiver-id="${escapeHtml(replyReceiverId)}"
                data-service-id="${escapeHtml(serviceId)}"
                data-subject="${escapeHtml(baseSubject)}"
              >
                Reply
              </button>
            </div>

            <div class="reply-box" hidden>
              <textarea
                class="reply-textarea"
                placeholder="Type your reply…"
              ></textarea>
              <div class="reply-actions">
                <button type="button" class="send-reply-btn">Send reply</button>
                <button type="button" class="cancel-reply-btn">Cancel</button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    messagesList.innerHTML = html;
  }

  async function loadInbox() {
    try {
      setActiveTab("inbox");
      showStatus("Loading messages…", "loading");
      const data = await apiGet("/messages/inbox");
      renderMessages(data);
    } catch (err) {
      console.error("[messages] loadInbox failed", err);
      showStatus("Could not load your inbox. Please try again.", "error");
    }
  }

  async function loadSent() {
    try {
      setActiveTab("sent");
      showStatus("Loading messages…", "loading");
      const data = await apiGet("/messages/sent");
      renderMessages(data);
    } catch (err) {
      console.error("[messages] loadSent failed", err);
      showStatus("Could not load your sent messages. Please try again.", "error");
    }
  }

  // -----------------------------
  // Inline reply logic
  // -----------------------------
  function openReplyBox(articleEl) {
    const box = articleEl.querySelector(".reply-box");
    if (!box) return;
    box.hidden = false;
    const textarea = box.querySelector(".reply-textarea");
    if (textarea) textarea.focus();
  }

  function closeReplyBox(articleEl) {
    const box = articleEl.querySelector(".reply-box");
    if (!box) return;
    box.hidden = true;
    const textarea = box.querySelector(".reply-textarea");
    if (textarea) textarea.value = "";
  }

  async function sendReplyFrom(articleEl) {
    const replyBtn = articleEl.querySelector(".reply-btn");
    const textarea = articleEl.querySelector(".reply-textarea");
    if (!replyBtn || !textarea) return;

    const receiverId = replyBtn.getAttribute("data-receiver-id");
    const serviceId = replyBtn.getAttribute("data-service-id") || "";
    const baseSubject = replyBtn.getAttribute("data-subject") || "";

    const content = textarea.value.trim();
    if (!content) {
      alert("Your reply cannot be empty.");
      return;
    }

    if (!receiverId) {
      alert("Cannot reply: receiver is missing.");
      return;
    }

    const payload = {
      content,
      receiverId,
    };

    if (serviceId) payload.serviceId = serviceId;
    if (baseSubject) payload.subject = `RE '${baseSubject}'`;

    try {
      await apiPost("/messages", payload);
      closeReplyBox(articleEl);

      // Optionally refresh Sent tab so the new message appears there
      if (currentView === "sent") {
        await loadSent();
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
        loadInbox();
      });
    }

    if (sentBtn) {
      sentBtn.addEventListener("click", (e) => {
        e.preventDefault();
        loadSent();
      });
    }

    if (backBtn) {
      backBtn.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "/profile.html";
      });
    }

    // Delegate clicks for dynamic content
    document.addEventListener("click", (e) => {
      const target = e.target;

      // Reply button
      if (target.classList.contains("reply-btn")) {
        const article = target.closest(".message-item");
        if (!article) return;

        const box = article.querySelector(".reply-box");
        if (!box) return;

        if (box.hidden) {
          openReplyBox(article);
        } else {
          closeReplyBox(article);
        }
      }

      // Cancel reply
      if (target.classList.contains("cancel-reply-btn")) {
        const article = target.closest(".message-item");
        if (!article) return;
        closeReplyBox(article);
      }

      // Send reply
      if (target.classList.contains("send-reply-btn")) {
        const article = target.closest(".message-item");
        if (!article) return;
        sendReplyFrom(article);
      }

      // View Conversation – placeholder hook
      if (target.classList.contains("view-thread-btn")) {
        const msgId = target.getAttribute("data-message-id");
        console.log("[messages] View Conversation clicked for", msgId);
        // Later you can route to a thread page, e.g.:
        // window.location.href = `/message-thread.html?messageId=${encodeURIComponent(msgId)}`;
      }
    });
  }

  // -----------------------------
  // Init
  // -----------------------------
  document.addEventListener("DOMContentLoaded", () => {
    setupEvents();
    loadInbox();
  });
})();
