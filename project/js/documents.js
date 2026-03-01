// js/documents.js

let session = null;

async function loadDocuments() {
  const tbody = $("documentsBody");
  const showFields = $("toggleFields") ? $("toggleFields").checked : true;

  tbody.innerHTML = `<tr><td colspan="5" class="muted">Loading...</td></tr>`;

  const client = window.sb;

  const { data, error } = await client
    .from("documents")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    tbody.innerHTML = `<tr><td colspan="5" class="muted">Error: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  if (!data?.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="muted">No documents found.</td></tr>`;
    return;
  }

  tbody.innerHTML = data
    .map((r) => {
      const fields =
        showFields && r.extracted_fields
          ? `<pre class="jsonbox">${escapeHtml(JSON.stringify(r.extracted_fields, null, 2))}</pre>`
          : `<span class="muted">—</span>`;

      const text =
        r.extracted_text && String(r.extracted_text).trim().length
          ? `<div class="docText">${escapeHtml(String(r.extracted_text))}</div>`
          : `<span class="muted">—</span>`;

      return `
        <tr>
          <td>${escapeHtml(r.title || "—")}</td>
          <td class="muted">${escapeHtml(r.doc_type || "—")}</td>
          <td class="muted">${escapeHtml(r.created_at ? formatDateTime(r.created_at) : "—")}</td>
          <td>${text}</td>
          <td>${fields}</td>
        </tr>
      `;
    })
    .join("");
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function boot() {
  setActiveNav();
  session = await requireAuth();
  if (!session) return;

  $("logoutBtn").addEventListener("click", logout);

  if ($("refreshDocuments")) {
    $("refreshDocuments").addEventListener("click", loadDocuments);
  }

  if ($("toggleFields")) {
    $("toggleFields").addEventListener("change", loadDocuments);
  }

  await loadDocuments();
}

document.addEventListener("DOMContentLoaded", boot);