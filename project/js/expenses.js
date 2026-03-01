// js/expenses.js

let session = null;

function startOfMonthISO(year, monthIndex) {
  const d = new Date(year, monthIndex, 1);
  return d.toISOString().slice(0, 10);
}
function endOfMonthISO(year, monthIndex) {
  const d = new Date(year, monthIndex + 1, 0);
  return d.toISOString().slice(0, 10);
}

async function loadExpenses() {
  const tbody = $("expensesBody");
  const totalEl = $("totalValue");

  tbody.innerHTML = `<tr><td colspan="5" class="muted">Loading...</td></tr>`;
  totalEl.textContent = "—";

  const monthVal = $("monthFilter").value; // YYYY-MM
  const categoryVal = $("categoryFilter").value;

  let fromDate = null;
  let toDate = null;

  if (monthVal) {
    const [y, m] = monthVal.split("-").map(Number);
    fromDate = startOfMonthISO(y, m - 1);
    toDate = endOfMonthISO(y, m - 1);
  }

  // ✅ use the initialized client
  const client = window.sb;

  let q = client
    .from("expenses")
    .select("*")
    .eq("user_id", session.user.id)
    // expense_date ممكن يبقى null، فرتّب created_at كـ fallback
    .order("expense_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (fromDate) q = q.gte("expense_date", fromDate);
  if (toDate) q = q.lte("expense_date", toDate);
  if (categoryVal) q = q.eq("category", categoryVal);

  const { data, error } = await q;

  if (error) {
    tbody.innerHTML = `<tr><td colspan="5" class="muted">Error: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  if (!data?.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="muted">No expenses found.</td></tr>`;
    return;
  }

  let total = 0;
  tbody.innerHTML = data
    .map((r) => {
      const amt = Number(r.amount || 0);
      total += amt;

      return `
      <tr>
        <td>${escapeHtml(r.title || "—")}</td>
        <td class="muted">${escapeHtml(r.category || "—")}</td>
        <td>${r.amount == null ? "—" : amt.toFixed(2)} <span class="muted2">EGP</span></td>
        <td class="muted">${escapeHtml(r.expense_date || "—")}</td>
        <td class="muted">${escapeHtml(r.created_at ? formatDateTime(r.created_at) : "—")}</td>
      </tr>
    `;
    })
    .join("");

  totalEl.textContent = `${total.toFixed(2)} EGP`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setDefaultMonth() {
  const now = new Date();
  const v = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  $("monthFilter").value = v;
}

async function boot() {
  setActiveNav();
  session = await requireAuth();
  if (!session) return;

  $("logoutBtn").addEventListener("click", logout);
  $("applyFilters").addEventListener("click", loadExpenses);
  $("clearFilters").addEventListener("click", () => {
    $("monthFilter").value = "";
    $("categoryFilter").value = "";
    loadExpenses();
  });

  setDefaultMonth();
  await loadExpenses();
}

document.addEventListener("DOMContentLoaded", boot);