// js/chat.js

let session = null;

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function appendMsg(role, text) {
  const log = $("chatLog");
  const wrap = document.createElement("div");
  wrap.className = role === "user" ? "msg msg-user" : "msg msg-ai";

  // message bubble
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = escapeHtml(text).replaceAll("\n", "<br>");

  wrap.appendChild(bubble);
  log.appendChild(wrap);

  // autoscroll
  log.scrollTop = log.scrollHeight;
}

function setChatBusy(isBusy) {
  if ($("chatSend")) $("chatSend").disabled = isBusy;
  if ($("chatInput")) $("chatInput").disabled = isBusy;
}

async function sendToAssistant(message) {
  const token = session?.access_token;
  if (!token) throw new Error("Missing access token (not logged in).");

  const res = await fetch("http://127.0.0.1:54321/functions/v1/chat_assistant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = data?.error || res.statusText || "Request failed";
    throw new Error(err);
  }

  // expected shape: { reply: "...", action: {...} }
  return data.reply || JSON.stringify(data, null, 2);
}

async function onSend() {
  const input = $("chatInput");
  const text = (input?.value || "").trim();
  if (!text) return;

  appendMsg("user", text);
  input.value = "";
  setChatBusy(true);

  try {
    const reply = await sendToAssistant(text);
    appendMsg("ai", reply);
  } catch (e) {
    appendMsg("ai", `❌ ${String(e?.message || e)}`);
  } finally {
    setChatBusy(false);
    input.focus();
  }
}

function seedHelp() {
  // optional hint line
  if ($("chatHint")) {
    $("chatHint").innerHTML =
        "Try asking about your expenses";
  }
  // first assistant message
  appendMsg(
    "ai",
    "Hi! You can add expenses or ask about spending on a specific day.\n" 
  );
}

async function boot() {
  setActiveNav();
  session = await requireAuth();
  if (!session) return;

  $("logoutBtn").addEventListener("click", logout);

  // send button
  $("chatSend").addEventListener("click", onSend);

  // enter-to-send (Shift+Enter for newline if textarea)
  $("chatInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  });

  seedHelp();
  $("chatInput").focus();
}

document.addEventListener("DOMContentLoaded", boot);