import { createClient } from "npm:@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function extractJson(s: string) {
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a === -1 || b === -1 || b <= a) return s;
  return s.slice(a, b + 1);
}

type Action =
  | {
      action: "add_expense";
      title: string;
      amount: number | null;
      expense_date: string | null; // YYYY-MM-DD
      category: "Food" | "Utilities" | "Transport" | "Health" | "Shopping" | "Entertainment" | "Other" | null;
    }
  | { action: "query_day"; date: string } // YYYY-MM-DD
  | { action: "unknown"; message: string };

async function callOpenAIToGetAction(userText: string, apiKey: string): Promise<Action> {
  const today = new Date().toISOString().slice(0, 10);

  const payload = {
    model: "gpt-4.1-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "You are an expense assistant. Output ONLY JSON (no markdown). " +
          "Decide the user intent and extract fields.\n\n" +
          "Allowed actions:\n" +
          "1) add_expense\n" +
          "2) query_day\n" +
          "3) unknown\n\n" +
          `Dates must be YYYY-MM-DD. If user says 'today', use ${today}. If 'yesterday', use the day before ${today}.`,
      },
      {
        role: "user",
        content:
          "User message:\n" +
          userText +
          "\n\nReturn JSON exactly in ONE of these forms:\n" +
          '{ "action":"add_expense","title":"...","amount":number|null,"expense_date":"YYYY-MM-DD"|null,"category":"Food|Utilities|Transport|Health|Shopping|Entertainment|Other"|null }\n' +
          '{ "action":"query_day","date":"YYYY-MM-DD" }\n' +
          '{ "action":"unknown","message":"..." }',
      },
    ],
  };

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!r.ok) throw new Error(`OpenAI error: ${r.status} ${await r.text()}`);

  const data = await r.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  return JSON.parse(extractJson(content));
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "Use POST" }, 405);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!SUPABASE_URL) return json({ error: "Missing SUPABASE_URL" }, 500);
    if (!SUPABASE_ANON_KEY) return json({ error: "Missing SUPABASE_ANON_KEY" }, 500);
    if (!SERVICE_ROLE_KEY) return json({ error: "Missing SERVICE_ROLE_KEY" }, 500);
    if (!OPENAI_API_KEY) return json({ error: "Missing OPENAI_API_KEY" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Missing Authorization Bearer token" }, 401);

    // Identify user via JWT
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Invalid user token" }, 401);
    const userId = userData.user.id;

    // Admin client for DB actions
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const { message } = await req.json();
    if (!message || typeof message !== "string") return json({ error: "Missing message" }, 400);

    const action = await callOpenAIToGetAction(message, OPENAI_API_KEY);

    if (action.action === "add_expense") {
      const expense_date = action.expense_date ?? new Date().toISOString().slice(0, 10);
      const category = action.category ?? "Other";
      const title = (action.title ?? "").trim() || "Expense";

      const { error } = await admin.from("expenses").insert({
        user_id: userId,
        title,
        category,
        amount: action.amount, // nullable
        expense_date,          // we set default
        image_path: null,
      });

      if (error) throw new Error(`Insert expense failed: ${error.message}`);

      return json({
        reply: `Added: ${title} — ${action.amount ?? "?"} EGP on ${expense_date} (${category}).`,
        action,
      });
    }

    if (action.action === "query_day") {
      const date = action.date;

      const { data: rows, error } = await admin
        .from("expenses")
        .select("title,amount,category,expense_date,created_at")
        .eq("user_id", userId)
        .eq("expense_date", date)
        .order("created_at", { ascending: true });

      if (error) throw new Error(`Query failed: ${error.message}`);

      const total = (rows ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const lines = (rows ?? [])
        .map((r) => `- ${r.title} (${r.category}) — ${r.amount ?? "?"} EGP`)
        .join("\n");

      const reply =
        rows?.length
          ? `On ${date}, you have ${rows.length} expenses. Total: ${total.toFixed(2)} EGP.\n${lines}`
          : `No expenses found on ${date}.`;

      return json({ reply, action, items: rows ?? [], total });
    }

    return json({
      reply: "I didn't understand. Try: 'Add 50 EGP groceries today' or 'How much did I spend on 2026-02-28?'",
      action,
    });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});