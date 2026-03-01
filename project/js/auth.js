async function login() {
  const btn = $("loginBtn");
  setLoading(btn, true, "Signing in...");

  const email = $("email").value.trim();
  const password = $("password").value;

  const timeoutMs = 12000;
  const timeoutPromise = new Promise((_, rej) =>
    setTimeout(() => rej(new Error("Login timeout (check network / Supabase URL)")), timeoutMs)
  );

  try {
    const signInPromise = sb.auth.signInWithPassword({ email, password });
    const { data, error } = await Promise.race([signInPromise, timeoutPromise]);

    if (error) throw error;

    if (!data?.session) {
      throw new Error("No session returned. If Email confirmation is ON, confirm your email then login.");
    }

    window.location.href = "inbox.html";
  } catch (e) {
    toast("Login failed", e.message || "Unknown error");
    console.error("Login error:", e);
  } finally {
    setLoading(btn, false);
  }
}