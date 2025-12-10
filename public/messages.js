// public/messages.js
// Messages page: inbox/sent toggle + reply button + reply modal sending.

(() => {
  console.log("[messages] loaded messages.js v2 with Reply button");

  // -----------------------------
  // API base URL helper
  // -----------------------------
  const AUTO_HOST = "codecrowds.onrender.com";

  const API_URL =
    // if init.js already set API_URL, reuse it
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

  const replyModal = document.getElementById("replyModal");
  const replyText = document.getElementById("replyText");
  const sendReplyBtn = document.getElementById("sendReply");
  const cancelReplyBtn = document.getElementById("cancelReply");

  if (!messagesList) {
    console.warn("[messages] #messages-list not found in DOM.");
  }

  let currentView = "inbox"; // "inbox" | "sent"
  let replyTarget = null; // { receiverId, serviceId, subject }

  // -----------------------------
  // Small helpers
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

  function showStatus(message) {
    if (!messagesList) return;
    messagesList.innerHTML = `<div class="messages-empty">${escapeHtml(
      message,
    )}</div>`;
  }

  function setActiveTab(view) {
    currentView = view;
    if (inboxBtn && sentBtn) {
      inboxBtn.classList.toggle("pill-selected", view === "inbox");
      sentBtn.classList.toggle("pill-selected", view === "sent");
    }
  }

  async function apiGet(path) {
    try {
      const res = await fetch(`${API_URL}${path}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        throw new Error(`GET ${path} failed: ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.error("[messages] GET error", err);
      throw err;
    }
  }

  async function apiPost(path, body) {
    const token = (() => {
      try {
        return localStorage.getItem("token");
      } catch {
        return null;
      }
    })();

    const headers = {
      "Content-Type": "application/json",
    };
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
      // ignore parse error – will handle by status below
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

  // Normalise different backend shapes into a simple list
  function normalizeMessages(payload) {
    if (!payload) return [];

    // common shapes we used elsewhere: { data: [...] }, { data: { rows: [...] } }, { messages: [...] }
    if (Array.isArray(payload.messages)) return payload.messages;
    if (Array.isArray(payload.data)) return payload.data;
    if (payload.data && Array.isArray(payload.data.rows)) return payload.data.rows;

    // fallback
    if (Array.isArray(payload)) return payload;
    return [];
  }

  // -----------------------------
  // Rendering
  // -----------------------------
  function renderMessages(payload) {
    const msgs = normalizeMessages(payload);

    if (!msgs.length) {
      showStatus(
        currentView === "inbox"
          ? "You have no received messages yet."
          : "You have not sent any messages yet.",
      );
      return;
    }

    const cardsHtml = msgs
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

        const subject = `RE '${baseSubject}'`;

        const preview =
          m.preview ||
          m.snippet ||
          m.content ||
          m.text ||
          "";

        const when = formatDate(m.createdAt || m.sentAt || m.created_at);

        // who-line differs between inbox and sent
        const whoLine =
          currentView === "inbox"
            ? `From: ${senderName}`
            : receiverName
            ? `To: ${receiverName}`
            : "Sent message";

        const msgId = m.id || m.messageId || m.messageID || "";

        // for replying:
        const senderId = m.senderId || m.sender_id || m.sender?.id || "";
        const receiverId = m.receiverId || m.receiver_id || m.receiver?.id || "";
        const serviceId = m.serviceId || m.service_id || "";

        const replyReceiverId =
          currentView === "inbox" ? senderId : receiverId;

        return `
          <article class="message-card">
            <div class="msg-main">
              <h3 class="msg-title">${escapeHtml(subject)}</h3>
              <div class="msg-from">${escapeHtml(whoLine)}</div>
              <p class="msg-body-preview">${escapeHtml(preview)}</p>
            </div>
            <div class="msg-footer">
              <span class="msg-time">${escapeHtml(when)}</span>
              <div class="msg-actions">
                <button
                  class="cc-btn cc-btn-ghost view-thread-btn"
                  data-message-id="${escapeHtml(msgId)}"
                  type="button"
                >
                  View Conversation
                </button>
                <button
                  class="cc-btn cc-btn-primary reply-btn"
                  data-message-id="${escapeHtml(msgId)}"
                  data-receiver-id="${escapeHtml(replyReceiverId)}"
                  data-service-id="${escapeHtml(serviceId)}"
                  data-subject="${escapeHtml(baseSubject)}"
                  type="button"
                >
                  Reply
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    messagesList.innerHTML = cardsHtml;
  }

  async function loadInbox() {
    try {
      setActiveTab("inbox");
      showStatus("Loading received messages…");
      const data = await apiGet("/messages/inbox");
      renderMessages(data);
    } catch (err) {
      console.error("[messages] inbox load failed", err);
      showStatus("Could not load your inbox. Please try again.");
    }
  }

  async function loadSent() {
    try {
      setActiveTab("sent");
      showStatus("Loading sent messages…");
      const data = await apiGet("/messages/sent");
      renderMessages(data);
    } catch (err) {
      console.error("[messages] sent load failed", err);
      showStatus("Could not load your sent messages. Please try again.");
    }
  }

  // -----------------------------
  // Reply modal logic
  // -----------------------------
  function openReplyModal(target) {
    if (!replyModal || !replyText) return;
    replyTarget = target;
    replyText.value = "";
    replyModal.classList.add("open");
    replyText.focus();
  }

  function closeReplyModal() {
    if (!replyModal || !replyText) return;
    replyModal.classList.remove("open");
    replyText.value = "";
    replyTarget = null;
  }

  async function sendReply() {
    if (!replyTarget) return;

    const content = replyText.value.trim();
    if (!content) {
      alert("Your reply cannot be empty.");
      return;
    }

    try {
      const payload = {
        content,
        receiverId: replyTarget.receiverId,
      };
      if (replyTarget.serviceId) {
        payload.serviceId = replyTarget.serviceId;
      }

      await apiPost("/messages", payload);

      closeReplyModal();
      // Reload current view so the new message appears in "Sent"
      if (currentView === "inbox") {
        await loadInbox();
      } else {
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

    // Delegate clicks for dynamic message cards
    document.addEventListener("click", (e) => {
      const target = e.target;

      // Reply button
      if (target.classList.contains("reply-btn")) {
        const receiverId = target.getAttribute("data-receiver-id");
        const serviceId = target.getAttribute("data-service-id") || "";
        const subject = target.getAttribute("data-subject") || "";

        if (!receiverId) {
          alert("Cannot reply: receiver is missing.");
          return;
        }

        openReplyModal({ receiverId, serviceId, subject });
      }

      // View conversation button – basic placeholder (you can hook this to a thread page)
      if (target.classList.contains("view-thread-btn")) {
        const msgId = target.getAttribute("data-message-id");
        if (!msgId) return;
        // If you later make a thread page, change this URL:
        console.log("[messages] view conversation for message", msgId);
        // Example:
        // window.location.href = `/message-thread.html?messageId=${encodeURIComponent(msgId)}`;
      }
    });

    if (cancelReplyBtn) {
      cancelReplyBtn.addEventListener("click", (e) => {
        e.preventDefault();
        closeReplyModal();
      });
    }

    if (sendReplyBtn) {
      sendReplyBtn.addEventListener("click", (e) => {
        e.preventDefault();
        sendReply();
      });
    }

    // Close modal when clicking backdrop
    if (replyModal) {
      replyModal.addEventListener("click", (e) => {
        if (e.target === replyModal) {
          closeReplyModal();
        }
      });
    }

    // Escape key closes modal
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && replyModal && replyModal.classList.contains("open")) {
        closeReplyModal();
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
