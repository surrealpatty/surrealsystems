/* public/messages.js */
(() => {
  const AUTO_HOST = "codecrowds.onrender.com";

  // choose API base URL intelligently
  const API_URL =
    window.location.hostname === AUTO_HOST ||
    window.location.hostname.endsWith(".onrender.com")
      ? `https://${AUTO_HOST}/api`
      : "/api";

  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  const messagesList = document.getElementById("messages-list");
  const goBackBtn = document.getElementById("goBackBtn");
  const inboxBtn = document.getElementById("inboxBtn");
  const sentBtn = document.getElementById("sentBtn");

  let lastView = "inbox";

  if (!token || !userId) {
    // If you're debugging, comment the redirect to stay on page
    console.warn("Missing token or userId; redirecting to login.");
    window.location.href = "index.html";
    return;
  }

  goBackBtn.addEventListener("click", () => {
    window.location.href = "profile.html";
  });
  inboxBtn.addEventListener("click", () => {
    setActiveTab("inbox");
    loadInbox();
  });
  sentBtn.addEventListener("click", () => {
    setActiveTab("sent");
    loadSent();
  });

  function setActiveTab(tab) {
    lastView = tab;
    if (tab === "inbox") {
      inboxBtn.classList.add("active");
      inboxBtn.setAttribute("aria-pressed", "true");
      sentBtn.classList.remove("active");
      sentBtn.setAttribute("aria-pressed", "false");
    } else {
      sentBtn.classList.add("active");
      sentBtn.setAttribute("aria-pressed", "true");
      inboxBtn.classList.remove("active");
      inboxBtn.setAttribute("aria-pressed", "false");
    }
  }

  function escapeHtml(unsafe) {
    return String(unsafe || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function extractMessages(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.messages)) return payload.messages;
    if (payload.data && Array.isArray(payload.data.messages))
      return payload.data.messages;
    return [];
  }

  function renderStatus(text) {
    messagesList.innerHTML = `<p class="loading">${escapeHtml(text)}</p>`;
  }
  function renderError(text) {
    messagesList.innerHTML = `<p class="error">${escapeHtml(text)}</p>`;
  }
  function renderEmpty(text = "No messages") {
    messagesList.innerHTML = `<p class="empty">${escapeHtml(text)}</p>`;
  }

  function renderMessageCard(m, kind = "inbox") {
    const article = document.createElement("article");
    article.className = "card";
    article.tabIndex = 0;

    if (kind === "inbox") {
      const fromName = m.sender?.username || "Unknown";
      article.innerHTML = `
        <h3>From: ${escapeHtml(fromName)}</h3>
        <p>${escapeHtml(m.content || "")}</p>
        <p class="timestamp">${new Date(m.createdAt).toLocaleString()}</p>
        <div class="card-actions"><button class="viewConversationBtn" data-userid="${m.sender?.id || m.senderId}" data-username="${escapeHtml(fromName)}">View Conversation</button></div>
      `;
    } else {
      const toName = m.receiver?.username || "Unknown";
      article.innerHTML = `
        <h3>To: ${escapeHtml(toName)}</h3>
        <p>${escapeHtml(m.content || "")}</p>
        <p class="timestamp">${new Date(m.createdAt).toLocaleString()}</p>
        <div class="card-actions"><button class="viewConversationBtn" data-userid="${m.receiver?.id || m.receiverId}" data-username="${escapeHtml(toName)}">View Conversation</button></div>
      `;
    }
    return article;
  }

  function attachConversationButtons() {
    document.querySelectorAll(".viewConversationBtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const otherUserId = btn.dataset.userid;
        const otherUsername = btn.dataset.username;
        loadConversation(otherUserId, otherUsername);
      });
    });
  }

  async function doFetch(path, opts = {}) {
    const url = path.startsWith("http") ? path : `${API_URL}${path}`;
    const headers = Object.assign({}, opts.headers || {}, {
      Authorization: `Bearer ${token}`,
    });

    // For GET/HEAD don't add Content-Type; only add for requests with a body
    const fetchOpts = {
      method: opts.method || "GET",
      headers,
      body: opts.body !== undefined ? opts.body : undefined,
      credentials: opts.credentials || "same-origin",
    };

    console.debug("[doFetch] url=", url, "opts=", fetchOpts);
    try {
      const res = await fetch(url, fetchOpts);
      const ct = res.headers.get("content-type") || "";
      const text = await res.text();
      let data = null;
      if (ct.includes("application/json")) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = text;
        }
      } else {
        data = text;
      }
      console.debug("[doFetch] status=", res.status, "body=", data);

      if (!res.ok)
        throw { status: res.status, body: data, statusText: res.statusText };

      return data;
    } catch (err) {
      // network / CORS errors typically are TypeError
      if (
        err instanceof TypeError ||
        (err && err.message && err.message.includes("NetworkError"))
      ) {
        console.error("[doFetch] Network/CORS error", err);
        throw { type: "network", message: err.message || "Network/CORS error" };
      }
      throw err;
    }
  }

  async function loadInbox() {
    setActiveTab("inbox");
    inboxBtn.disabled = true;
    sentBtn.disabled = false;
    renderStatus("Loading received messages…");

    try {
      const data = await doFetch("/messages/inbox");
      const messages = extractMessages(data);
      if (!messages.length) {
        renderEmpty("No messages yet.");
        return;
      }
      messagesList.innerHTML = "";
      messages.forEach((m) =>
        messagesList.appendChild(renderMessageCard(m, "inbox")),
      );
      attachConversationButtons();
    } catch (err) {
      console.error("[loadInbox] error:", err);
      if (err.type === "network") {
        renderError(
          "Network/CORS error while fetching inbox. See console for details.",
        );
      } else if (err.status === 401) {
        renderError("Unauthorized (401). Please log in again.");
      } else if (err.status === 403) {
        renderError(
          "Forbidden (403). CORS or permission issue. Check server logs and CORS_ALLOWED_ORIGINS.",
        );
      } else {
        const msg =
          err.body?.error?.message ||
          err.body ||
          err.statusText ||
          err.message ||
          "Unknown";
        renderError(`Failed to load messages: ${msg}`);
      }
    } finally {
      inboxBtn.disabled = false;
    }
  }

  async function loadSent() {
    setActiveTab("sent");
    sentBtn.disabled = true;
    inboxBtn.disabled = false;
    renderStatus("Loading sent messages…");

    try {
      const data = await doFetch("/messages/sent");
      const messages = extractMessages(data);
      if (!messages.length) {
        renderEmpty("No sent messages yet.");
        return;
      }
      messagesList.innerHTML = "";
      messages.forEach((m) =>
        messagesList.appendChild(renderMessageCard(m, "sent")),
      );
      attachConversationButtons();
    } catch (err) {
      console.error("[loadSent] error:", err);
      if (err.type === "network") {
        renderError(
          "Network/CORS error while fetching sent messages. See console for details.",
        );
      } else if (err.status === 401) {
        renderError("Unauthorized (401). Please log in again.");
      } else if (err.status === 403) {
        renderError(
          "Forbidden (403). CORS or permission issue. Check server logs and CORS_ALLOWED_ORIGINS.",
        );
      } else {
        const msg =
          err.body?.error?.message ||
          err.body ||
          err.statusText ||
          err.message ||
          "Unknown";
        renderError(`Failed to load sent messages: ${msg}`);
      }
    } finally {
      sentBtn.disabled = false;
    }
  }

  async function loadConversation(otherUserId, otherUsername) {
    renderStatus(`Loading conversation with ${otherUsername}…`);
    try {
      const data = await doFetch(`/messages/thread/${otherUserId}`);
      const conversation = extractMessages(data);
      messagesList.innerHTML = `<h2>Conversation with ${escapeHtml(otherUsername)}</h2>`;

      if (!conversation.length) {
        messagesList.innerHTML +=
          '<p class="empty">No messages in this conversation yet.</p>';
      } else {
        conversation.forEach((m) => {
          const article = document.createElement("article");
          article.className = "card";
          article.tabIndex = 0;
          const isMine = Number(m.senderId) === Number(userId);
          const who = isMine ? "You" : m.sender?.username || "Unknown";
          article.innerHTML = `<h3>${escapeHtml(who)}</h3><p>${escapeHtml(m.content || "")}</p><p class="timestamp">${new Date(m.createdAt).toLocaleString()}</p>`;
          messagesList.appendChild(article);
        });
      }

      const footer = document.createElement("div");
      footer.className = "conversation-footer";
      const backBtn = document.createElement("button");
      backBtn.textContent = "Back";
      backBtn.addEventListener("click", () => {
        if (lastView === "sent") loadSent();
        else loadInbox();
      });
      footer.appendChild(backBtn);
      messagesList.appendChild(footer);
    } catch (err) {
      console.error("[loadConversation] error:", err);
      if (err.type === "network") {
        renderError(
          "Network/CORS error while loading conversation. See console for details.",
        );
      } else if (err.status === 401) {
        renderError("Unauthorized (401). Please log in again.");
      } else {
        const msg =
          err.body?.error?.message ||
          err.body ||
          err.statusText ||
          err.message ||
          "Unknown";
        renderError(`Failed to load conversation: ${msg}`);
      }
    }
  }

  // initialize
  window.addEventListener("load", () => {
    console.info("[messages] API_URL=", API_URL, "userIdPresent=", !!userId);
    loadInbox();
  });
})();
