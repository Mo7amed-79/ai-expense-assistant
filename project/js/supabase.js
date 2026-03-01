// js/supabase.js
const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";

const { createClient } = supabase;

// امنع إعادة إنشاء العميل لو الملف اتقرأ مرتين لأي سبب
window.sb = window.sb || createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.INBOX_BUCKET = "inbox";
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
console.log("[supabase.js] sb.supabaseUrl =", window.sb.supabaseUrl);