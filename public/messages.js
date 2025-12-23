// public/messages.js
// Messages page with "Reply" button, per-ad threads, and Delete.
// Each card = one thread (ad/project + other user).

(() => {
  console.log(
    "[messages] loaded messages.js (front-end v8 – ad title from project + subject)"
  );

  // -----------------------------
  // API base URL helper (Render vs local)
  // -----------------------------
  const AUTO_HOST = "Surreal Systems.onrender.com";

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

  // cache of project titles: { [id]: "title" }
  const projectTitleCache = {};

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

  // -----------------------------
  // API helpers (send Authorization on all calls)
  // -----------------------------
  function buildAuthHeaders() {
    let token = null;
    try {
      token = localStorage.getItem("token");
    } catch {
      token = null;
    }

    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async function apiGet(path) {
    const headers = buildAuthHeaders();

    const res = await fetch(`${API_URL}${path}`, {
      method: "GET",
      credentials: "include",
      headers,
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
        `GET ${path} failed: ${res.status}`;
      throw new Error(msg);
    }

    return data;
  }

  async function apiPost(path, body) {
    const headers = buildAuthHeaders();

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

  async function apiDelete(path) {
    const headers = buildAuthHeaders();

    const res = await fetch(`${API_URL}${path}`, {
      method: "DELETE",
      credentials: "include",
      headers,
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
    // backend returns { success: true, messages: [...] }
    if (Array.isArray(payload.messages)) return payload.messages;
    if (Array.isArray(payload.data)) return payload.data;
    if (payload.data && Array.isArray(payload.data.rows)) return payload.data.rows;
    if (Array.isArray(payload)) return payload;
    return [];
  }

  // Build allMessages = unique inbox+sent
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

  function removeMessageFromState(messageId) {
    const idNum = Number(messageId);
    const filterOut = (arr) => arr.filter((m) => !m || m.id !== idNum);

    inboxMessages = filterOut(inboxMessages);
    sentMessages = filterOut(sentMessages);
    indexAllMessages();
  }

  // -----------------------------
  // Load project titles for messages using /api/projects/:id
  // -----------------------------
  async function hydrateprojectTitles(messages) {
    const ids = new Set();

    for (const m of messages) {
      if (!m) continue;
      const rawId = m.projectId ?? m.project_id;
      if (rawId == null) continue;
      const num = Number(rawId);
      if (!Number.isFinite(num)) continue;
      if (projectTitleCache[num]) continue; // already have it
      ids.add(num);
    }

    if (!ids.size) return;

    const tasks = Array.from(ids).map(async (id) => {
      try {
        const data = await apiGet(`/projects/${encodeURIComponent(id)}`);
        // Try to pull project object from various shapes
        const svc = data.project || (data.data && data.data.project) || data;
        const title = svc && (svc.title || svc.name);
        if (title) {
          projectTitleCache[id] = title;
        }
      } catch (err) {
        console.warn("[messages] failed to fetch project title for", id, err);
      }
    });

    await Promise.all(tasks);
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

      // fetch ad titles for any messages that have projectId
      await hydrateprojectTitles([...inboxMessages, ...sentMessages]);

      indexAllMessages();
      renderView("inbox");
    } catch (err) {
      console.error("[messages] fetchAllMessages failed", err);
      showStatus("Could not load your messages. Please try again.", "error");
    }
  }

  // -----------------------------
  // LIST VIEW – build threads per (ad + user)
  // -----------------------------
  function renderView(view) {
    setActiveTab(view);
    const rawList = view === "inbox" ? inboxMessages : sentMessages;

    if (!rawList.length) {
      showStatus(
        view === "inbox"
          ? "You have no received messages yet."
          : "You have not sent any messages yet.",
        "empty",
      );
      return;
    }

    // Group into threads by (projectId + partnerId)
    const latestByThread = new Map();

    for (const m of rawList) {
      if (!m) continue;

      const sId = m.senderId ?? m.sender_id;
      const rId = m.receiverId ?? m.receiver_id;

      let partnerId = null;
      if (currentUserId != null && sId === currentUserId) partnerId = rId;
      else if (currentUserId != null && rId === currentUserId) partnerId = sId;

      const projectId = m.projectId ?? m.project_id ?? "no-project";

      const key = `${projectId}:${partnerId ?? "unknown"}`;

      const created = new Date(m.createdAt || m.created_at || 0).getTime();
      const existing = latestByThread.get(key);
      const existingTime = existing
        ? new Date(existing.createdAt || existing.created_at || 0).getTime()
        : -Infinity;

      if (!existing || created > existingTime) {
        latestByThread.set(key, m);
      }
    }

    const threads = Array.from(latestByThread.values()).sort((a, b) => {
      const ta = new Date(a.createdAt || a.created_at || 0).getTime();
      const tb = new Date(b.createdAt || b.created_at || 0).getTime();
      return tb - ta; // newest first
    });

    if (!threads.length) {
      showStatus("No conversations yet.", "empty");
      return;
    }

    const html = threads.map((m) => renderMessageCard(m, view)).join("");
    messagesList.innerHTML = html;
  }

  // Parse the subject to pull out the ad title:
  // e.g. 'RE "Logo Design"' -> 'Logo Design'
  function extractAdTitleFromSubject(subjectRaw) {
    if (!subjectRaw) return "";
    const subject = String(subjectRaw).trim();
    if (!subject) return "";

    const match = subject.match(/RE\s+["'](.+?)["']/i);
    if (match && match[1]) {
      return match[1];
    }

    // Fallback: just use whole subject
    return subject;
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

    const previewRaw = m.preview || m.snippet || m.content || m.text || "";
    const preview =
      previewRaw.length > 220
        ? `${previewRaw.slice(0, 217)}…`
        : previewRaw;

    const createdIso = m.createdAt || m.created_at || "";
    const when = formatDate(createdIso);
    const msgId = m.id || m.messageId || m.messageID || "";

    // Determine partnerId again so we can store it on the card
    const sId = m.senderId ?? m.sender_id;
    const rId = m.receiverId ?? m.receiver_id;
    let partnerId = null;
    if (currentUserId != null && sId === currentUserId) partnerId = rId;
    else if (currentUserId != null && rId === currentUserId) partnerId = sId;
    const partnerName = view === "inbox" ? senderName : receiverName || "User";

    const projectIdRaw = m.projectId ?? m.project_id ?? "";
    const projectIdNum =
      projectIdRaw === "" ? null : Number(projectIdRaw);
    const cachedTitle =
      projectIdNum != null && Number.isFinite(projectIdNum)
        ? projectTitleCache[projectIdNum] || ""
        : "";
    const projectTitle = cachedTitle || "";

    const subjectRaw = m.subject || "";
    const adTitleFromSubject = extractAdTitleFromSubject(subjectRaw);

    // 🔹 Decide what to show as the big heading on the card
    let cardTitle = "";
    let headerTitle = "";

    if (projectTitle) {
      // Best: actual ad title from the project
      cardTitle = projectTitle;
      headerTitle = projectTitle;
    } else if (adTitleFromSubject) {
      // Next: extracted from subject (RE "Title")
      cardTitle = adTitleFromSubject;
      headerTitle = adTitleFromSubject;
    } else if (subjectRaw && subjectRaw.trim().length > 0) {
      // Fallback: full subject
      cardTitle = subjectRaw.trim();
      headerTitle = cardTitle;
    } else {
      // Old messages with no subject + no project title
      cardTitle = `Message from ${senderName}`;
      headerTitle = cardTitle;
    }

    return `
      <article class="message-card" data-message-id="${escapeHtml(
        String(msgId),
      )}">
        <div class="message-main">
          <h3 class="message-title">${escapeHtml(cardTitle)}</h3>
          <p class="message-meta">${escapeHtml(whoLine)}</p>
          <p>${escapeHtml(preview)}</p>
          <p class="timestamp">${escapeHtml(when)}</p>

          <div class="conversation-footer">
            <button type="button" class="reply-toggle">
              Reply
            </button>
            <button type="button" class="delete-btn">
              Delete
            </button>
          </div>
        </div>

        <!-- Email-style conversation panel (hidden until Reply is clicked) -->
        <div
          class="conversation-panel"
          hidden
          data-partner-id="${escapeHtml(String(partnerId ?? ""))}"
          data-partner-name="${escapeHtml(partnerName)}"
          data-project-id="${escapeHtml(String(projectIdRaw))}"
          data-project-title="${escapeHtml(headerTitle)}"
          data-root-created="${escapeHtml(createdIso || "")}"
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
  // THREAD VIEW – per (ad + user), built from allMessages
  // -----------------------------
  function threadMessagesFor(partnerId, projectId, rootCreatedIso, rootMessageId) {
    const partnerIdNum =
      partnerId == null || partnerId === "" ? null : Number(partnerId);
    const svcIdNum =
      projectId == null || projectId === "" ? null : Number(projectId);
    const rootIdNum =
      rootMessageId == null || rootMessageId === "" ? null : Number(rootMessageId);

    const filtered = allMessages.filter((m) => {
      const sId = m.senderId ?? m.sender_id;
      const rId = m.receiverId ?? m.receiver_id;

      // Must be between current user and partner
      const pairMatch =
        partnerIdNum != null &&
        currentUserId != null &&
        ((sId === currentUserId && rId === partnerIdNum) ||
          (sId === partnerIdNum && rId === currentUserId));

      if (!pairMatch) return false;

      const mSvc = m.projectId ?? m.project_id ?? null;

      if (svcIdNum != null) {
        // If the card has a project, require same projectId
        if (mSvc == null) return false;
        if (Number(mSvc) !== svcIdNum) return false;
        return true;
      }

      // ❗ No projectId on this card:
      // treat this card as a single-message thread, not "all messages"
      if (rootIdNum != null) {
        return m.id === rootIdNum;
      }

      // Fallback: just the pair
      return pairMatch;
    });

    // sort oldest → newest
    filtered.sort((a, b) => {
      const da = new Date(a.createdAt || a.created_at);
      const db = new Date(b.createdAt || b.created_at);
      return da - db;
    });

    // de-dup by id
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

  function buildThreadHeaderHtml(partnerName, projectTitle) {
    const parts = [];

    parts.push(
      `<div><strong>Between:</strong> You &nbsp;and&nbsp; ${escapeHtml(
        partnerName || "this user",
      )}</div>`,
    );

    if (projectTitle) {
      parts.push(
        `<div><strong>Ad:</strong> ${escapeHtml(projectTitle)}</div>`,
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
    const projectId = panel.getAttribute("data-project-id") || "";
    const projectTitle = panel.getAttribute("data-project-title") || "";
    const rootCreatedIso = panel.getAttribute("data-root-created") || "";
    const rootMessageId = articleEl.getAttribute("data-message-id") || "";

    const headerEl = panel.querySelector(".thread-header");
    const messagesEl = panel.querySelector(".thread-messages");
    const textarea = panel.querySelector(".thread-reply-input");

    const msgs = threadMessagesFor(
      partnerId,
      projectId,
      rootCreatedIso,
      rootMessageId,
    );

    if (headerEl) {
      headerEl.innerHTML = buildThreadHeaderHtml(partnerName, projectTitle);
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
    const projectIdRaw = panel.getAttribute("data-project-id") || "";
    const partnerName = panel.getAttribute("data-partner-name") || "User";
    const projectTitleAttr = panel.getAttribute("data-project-title") || "";
    const rootCreatedIso = panel.getAttribute("data-root-created") || "";
    const rootMessageId = articleEl.getAttribute("data-message-id") || "";

    const partnerId = partnerIdRaw ? Number(partnerIdRaw) : null;
    const projectId = projectIdRaw ? Number(projectIdRaw) : null;

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

    const subject = projectTitleAttr
      ? `RE "${projectTitleAttr}"`
      : "Message from Surreal Systems";

    const payload = {
      receiverId: partnerId,
      content,
      subject,
    };
    if (projectId) payload.projectId = projectId;

    try {
      const res = await apiPost("/messages", payload);

      const created =
        (res && res.message) ||
        (res && res.data && res.data.message) ||
        res;

      if (created && created.id != null) {
        sentMessages.push(created);
        indexAllMessages();
      }

      textarea.value = "";

      // Rebuild this thread locally from updated allMessages
      const msgs = threadMessagesFor(
        partnerId,
        projectId,
        rootCreatedIso,
        rootMessageId,
      );
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

  async function deleteMessageFromCard(articleEl) {
    if (!articleEl) return;
    const idAttr = articleEl.getAttribute("data-message-id");
    if (!idAttr) {
      alert("Cannot delete: missing message id.");
      return;
    }

    if (!confirm("Delete this message?")) return;

    try {
      await apiDelete(`/messages/${encodeURIComponent(idAttr)}`);
      removeMessageFromState(idAttr);
      renderView(currentView);
    } catch (err) {
      console.error("[messages] deleteMessage failed", err);
      alert(err.message || "Failed to delete message.");
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

    document.addEventListener("click", (e) => {
      const target = e.target;

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

      if (target.classList.contains("thread-send-btn")) {
        const article = target.closest(".message-card");
        if (!article) return;
        sendReplyFromPanel(article);
      }

      if (target.classList.contains("delete-btn")) {
        const article = target.closest(".message-card");
        if (!article) return;
        deleteMessageFromCard(article);
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
