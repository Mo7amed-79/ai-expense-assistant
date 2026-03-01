// js/common.js
// Utilities + auth helpers used across pages
// Requires: js/supabase.js to run first (defines window.sb)

function $(id) {
  return document.getElementById(id);
}

function assertSbReady() {
  if (!window.sb) {
    throw new Error("Supabase client (sb) is not defined. Make sure js/supabase.js is loaded before common.js");
  }
  if (!window.sb.auth) {
    throw new Error("sb.auth is not available. Check supabase-js script and client initialization.");
  }
}

function toast(title, message = "", type = "info") {
  // Minimal toast implementation; adapt if you already have one.
  // If you already have a toast() elsewhere, remove this and keep yours.
  const el = document.createElement("div");
  el.style.position = "fixed";
  el.style.right = "16px";
  el.style.bottom = "16px";
  el.style.zIndex = "9999";
  el.style.maxWidth = "360px";
  el.style.padding = "12px 14px";
  el.style.borderRadius = "12px";
  el.style.backdropFilter = "blur(8px)";
  el.style.background = "rgba(20,20,30,0.85)";
  el.style.border = "1px solid rgba(255,255,255,0.12)";
  el.style.color = "#fff";
  el.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
  el.style.boxShadow = "0 10px 30px rgba(0,0,0,0.35)";
  el.innerHTML = `
    <div style="font-weight:700; margin-bottom:4px;">${escapeHtml(String(title))}</div>
    <div style="opacity:.9; font-size:13px; line-height:1.35; white-space:pre-wrap;">${escapeHtml(String(message || ""))}</div>
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setLoading(btn, loading, label = "Loading...") {
  if (!btn) return;
  if (loading) {
    btn.dataset._oldText = btn.textContent || "";
    btn.textContent = label;
    btn.disabled = true;
    btn.classList.add("is-loading");
  } else {
    btn.textContent = btn.dataset._oldText || btn.textContent || "Submit";
    btn.disabled = false;
    btn.classList.remove("is-loading");
  }
}

function formatDateTime(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso || "";
    return d.toLocaleString();
  } catch {
    return iso || "";
  }
}

function setActiveNav() {
  // optional: if you have nav buttons with data-nav
  const path = (location.pathname.split("/").pop() || "").toLowerCase();
  document.querySelectorAll("[data-nav]").forEach((el) => {
    const target = String(el.getAttribute("data-nav") || "").toLowerCase();
    el.classList.toggle("active", target === path);
  });
}

// ---------- Auth ----------

async function requireAuth() {
  try {
    assertSbReady();

    const { data, error } = await sb.auth.getSession();
    if (error) {
      toast("Auth error", error.message);
      return null;
    }

    const session = data?.session || null;
if (!session) {
  const current = (location.pathname.split("/").pop() || "").toLowerCase();

  // لو إحنا بالفعل في صفحة login → ما تعملش redirect
  if (current !== "index.html") {
    window.location.href = "index.html";
  }

  return null;
}

    return session;
  } catch (err) {
    toast("Auth init failed", err.message || String(err));
    return null;
  }
}

async function logout() {
  try {
    assertSbReady();
    const { error } = await sb.auth.signOut();
    if (error) toast("Logout failed", error.message);
  } catch (err) {
    toast("Logout failed", err.message || String(err));
  } finally {
    window.location.href = "index.html";
  }
}

// ---------- Modal (optional) ----------

function openModal(imageUrl, title = "Preview") {
  const backdrop = $("modalBackdrop");
  const img = $("modalImg");
  const ttl = $("modalTitle");

  if (!backdrop || !img) {
    // If you don't have a modal in HTML, just open new tab
    window.open(imageUrl, "_blank", "noopener,noreferrer");
    return;
  }

  if (ttl) ttl.textContent = title;
  img.src = imageUrl;
  backdrop.classList.add("open");
}

function closeModal() {
  const backdrop = $("modalBackdrop");
  const img = $("modalImg");
  if (img) img.src = "";
  if (backdrop) backdrop.classList.remove("open");
}

// ---------- Make helpers global (optional) ----------
window.$ = window.$ || $;
window.toast = window.toast || toast;
window.setLoading = window.setLoading || setLoading;
window.formatDateTime = window.formatDateTime || formatDateTime;
window.setActiveNav = window.setActiveNav || setActiveNav;
window.requireAuth = window.requireAuth || requireAuth;
window.logout = window.logout || logout;
window.openModal = window.openModal || openModal;
window.closeModal = window.closeModal || closeModal;