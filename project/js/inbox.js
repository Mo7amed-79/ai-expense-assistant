// js/inbox.js

let session = null;

// Local Edge Functions base (بدّله لو هتستخدم cloud)
const FUNCTIONS_BASE_URL = "http://127.0.0.1:54321/functions/v1";
const PROCESS_FN_NAME = "process_inbox";

async function loadInbox() {
  const list = $("inboxList");
  list.innerHTML = `<div class="center"><span class="spinner"></span></div>`;

  const { data, error } = await sb
    .from("inbox_items")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    list.innerHTML = "";
    toast("Load failed", error.message);
    return;
  }

  if (!data?.length) {
    list.innerHTML = `<div class="muted">No inbox items yet.</div>`;
    return;
  }

  list.innerHTML = data.map(renderInboxItem).join("");
  document.querySelectorAll("[data-preview]").forEach((btn) => {
    btn.addEventListener("click", onPreview);
  });
}

function statusBadge(status) {
  const s = (status || "").toLowerCase();
  if (s === "done") return `<span class="badge dot good">done</span>`;
  if (s === "failed") return `<span class="badge dot bad">failed</span>`;
  if (s === "processing")
    return `<span class="badge dot warn">processing</span>`;
  return `<span class="badge dot">queued</span>`;
}

function renderInboxItem(it) {
  const created = formatDateTime(it.created_at);
  const meta = it.parsed_json
    ? `<div class="small muted2">parsed_json موجود</div>`
    : `<div class="small muted2">parsed_json: —</div>`;

  return `
    <div class="card">
      <div class="card-inner">
        <div class="card-header">
          <div>
            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
              <div style="font-weight:700;">Inbox item</div>
              ${statusBadge(it.status)}
            </div>
            <div class="subtitle">Created: ${created}</div>
            <div class="small muted2" style="margin-top:6px; word-break:break-all;">${it.image_path || ""}</div>
            ${meta}
          </div>

          <div class="row" style="justify-content:flex-end; flex: 0 0 auto;">
            <button class="btn" data-preview="1" data-path="${it.image_path || ""}">Preview</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function onPreview(e) {
  const path = e.currentTarget.getAttribute("data-path");
  if (!path) return;

  // bucket private => signed URL
  const { data, error } = await sb.storage
    .from(INBOX_BUCKET)
    .createSignedUrl(path, 60);
  if (error) {
    toast("Preview failed", error.message);
    return;
  }
  openModal(data.signedUrl, "Image preview");
}


async function triggerProcessing() {
  try {
    const { data } = await sb.auth.getSession();
    const token = data?.session?.access_token;

    const headers = {};
    // لو فيه توكن ابعته، لو مفيش عادي (local no-verify-jwt)
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${FUNCTIONS_BASE_URL}/${PROCESS_FN_NAME}`, {
      method: "POST",
      headers,
    });

    const text = await res.text();
    console.log("[process_inbox] status:", res.status, text);

    if (!res.ok) throw new Error(`HTTP ${res.status} — ${text}`);
    try { return JSON.parse(text); } catch { return { ok: true, raw: text }; }
  } catch (err) {
    console.warn("triggerProcessing failed:", err);
    toast("Processing trigger failed", err.message || String(err));
    return null;
  }
}
async function uploadImage() {
  const input = $("fileInput");
  const file = input.files?.[0];
  if (!file) return toast("No file", "اختار صورة الأول.");

  const btn = $("uploadBtn");
  setLoading(btn, true, "Uploading...");

  try {
    // Basic validation
    if (!file.type.startsWith("image/")) {
      throw new Error("الملف لازم يكون صورة (jpg/png/...).");
    }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const safeName = `${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
    const path = `${session.user.id}/${safeName}`;

    // 1) upload to storage
    const up = await sb.storage
      .from(INBOX_BUCKET)
      .upload(path, file, { upsert: false });
    if (up.error) throw up.error;

    // 2) insert inbox item queued
    const ins = await sb.from("inbox_items").insert({
      user_id: session.user.id,
      image_path: path,
      status: "queued",
    });
    if (ins.error) throw ins.error;

    toast("Uploaded", "تم رفع الصورة وإضافتها للـ Inbox.");

    // 3) اختياري: trigger processing
    await triggerProcessing();

    input.value = "";
    await loadInbox();
  } catch (err) {
    toast("Upload failed", err.message || "Unknown error");
  } finally {
    setLoading(btn, false);
  }
}

async function boot() {
  setActiveNav();
  session = await requireAuth();
  if (!session) return;

  $("logoutBtn").addEventListener("click", logout);
  $("uploadBtn").addEventListener("click", uploadImage);
  $("refreshBtn").addEventListener("click", loadInbox);
  $("modalClose").addEventListener("click", closeModal);
  $("modalBackdrop").addEventListener("click", (e) => {
    if (e.target.id === "modalBackdrop") closeModal();
  });

  await loadInbox();
}

document.addEventListener("DOMContentLoaded", boot);
