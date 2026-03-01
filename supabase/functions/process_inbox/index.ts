import { createClient } from "npm:@supabase/supabase-js@2";

type InboxItem = {
  id: string;
  user_id: string;
  image_path: string | null;
  status: string | null;
  created_at: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/**
 * Model output schema (kept as-is so your DB inserts remain the same).
 */
const OUTPUT_SCHEMA = {
  name: "inbox_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      type: { type: "string", enum: ["expense", "document"] },
      title: { type: ["string", "null"] },
      merchant: { type: ["string", "null"] },
      category: {
        type: ["string", "null"],
        enum: ["Food", "Utilities", "Transport", "Health", "Shopping", "Entertainment", "Other", null],
      },
      amount: { type: ["number", "null"] },
      currency: { type: "string", enum: ["EGP"] },
      expense_date: { type: ["string", "null"], description: "YYYY-MM-DD" },
      doc_type: { type: ["string", "null"], enum: ["contract", "id", "medical", "receipt", "other", null] },
      summary: { type: ["string", "null"] },
      extracted_fields: { type: "object" },
      confidence: { type: "number", minimum: 0, maximum: 1 },
    },
    required: ["type", "currency", "extracted_fields", "confidence"],
  },
} as const;

/**
 * OCR: send image bytes to local OCR microservice.
 * Expected response: { text: string }
 */
async function runLocalOcr(imageBytes: Uint8Array, ocrUrl: string): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([imageBytes]), "image.png");

  const resp = await fetch(ocrUrl, { method: "POST", body: form });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`OCR error: ${resp.status} ${t}`);
  }

  const data = await resp.json();
  const text = String(data?.text ?? "").trim();
  return text;
}

function extractJsonFromText(content: string) {
  const cleaned = content.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("OpenAI response did not contain a JSON object");
  }
  const jsonText = cleaned.slice(first, last + 1);
  try {
    return JSON.parse(jsonText);
  } catch (err) {
    throw new Error(`Failed to parse JSON: ${(err as Error)?.message ?? err}`);
  }
}

function autoCategory(title: string | null) {
  if (!title) return "Other";
  const t = title.toLowerCase();

  if (/restaurant|cafe|coffee|food|pizza|burger/.test(t)) return "Food";
  if (/uber|taxi|bus|transport/.test(t)) return "Transport";
  if (/pharmacy|medical|clinic/.test(t)) return "Health";
  if (/electric|water|gas|internet/.test(t)) return "Utilities";
  if (/mall|store|shop/.test(t)) return "Shopping";

  return "Other";
}

/**
 * Text → structured JSON using a cheaper model (gpt-4.1-mini).
 * Enforces JSON output via prompt (no response_format).
 */
async function openAITextExtract(
  ocrText: string,
  apiKey: string,
  projectId?: string,
) {
  const payload = {
    model: "gpt-4.1-mini",
    temperature: 0,
    messages: [
  {
    role: "system",
    content:
      "You are a strict classifier and extractor for OCR text from screenshots. " +
      "Decide if the input is an EXPENSE receipt/invoice OR a DOCUMENT. " +
      "Most inputs are expense receipts. Output ONLY valid JSON, no markdown."
  },
  {
    role: "user",
    content:
      "Classification rules:\n" +
      "1) Choose type='expense' if the text indicates a purchase/payment/receipt/invoice, OR contains any of these signals:\n" +
      "   - words: total, subtotal, tax, vat, change, cash, card, invoice, receipt, paid, amount due\n" +
      "   - currency symbols/codes: EGP, LE, جنيه, ج.م, $, SAR, AED, USD\n" +
      "   - line items with prices, quantities, or a final TOTAL\n" +
      "2) Choose type='document' only for non-payment documents like IDs, contracts, letters, medical reports, forms.\n" +
      "3) If unsure, default to type='expense'.\n\n" +
      "Return JSON with this schema:\n" +
      "{\n" +
      '  "type": "expense" | "document",\n' +
      '  "title": string,\n' +
      '  "merchant": string | null,\n' +
      '  "category": "Food"|"Utilities"|"Transport"|"Health"|"Shopping"|"Entertainment"|"Other"|null,\n' +
      '  "amount": number | null,\n' +
      '  "currency": "EGP",\n' +
      '  "expense_date": "YYYY-MM-DD" | null,\n' +
      '  "doc_type": "contract"|"id"|"medical"|"receipt"|"other"|null,\n' +
      '  "summary": string | null,\n' +
      '  "extracted_fields": object,\n' +
      '  "confidence": number\n' +
      "}\n\n" +
      "OCR TEXT:\n" + ocrText.slice(0, 8000)
  }
]
  };

  const headers: Record<string, string> = {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
  };
  if (projectId) headers["OpenAI-Project"] = projectId;

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const t = await resp.text();
    console.log(`[process_inbox] OpenAI error status=${resp.status} body=${t}`);
    throw new Error(`OpenAI error: ${resp.status}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty content");
  return extractJsonFromText(content);
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Use POST" }, 405);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const OPENAI_PROJECT_ID = Deno.env.get("OPENAI_PROJECT_ID") ?? undefined;

    // Windows + Docker Desktop default
    const OCR_URL = Deno.env.get("OCR_URL") ?? "http://host.docker.internal:4000/ocr";

    console.log(`[process_inbox] OCR_URL=${OCR_URL}`);
    console.log(`[process_inbox] OPENAI_API_KEY present=${Boolean(OPENAI_API_KEY)}`);

    if (!SUPABASE_URL) return jsonResponse({ error: "Missing SUPABASE_URL" }, 500);
    if (!SERVICE_ROLE_KEY) return jsonResponse({ error: "Missing SERVICE_ROLE_KEY" }, 500);
    if (!OPENAI_API_KEY) return jsonResponse({ error: "Missing OPENAI_API_KEY" }, 500);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: items, error: queryError } = await admin
      .from("inbox_items")
      .select("*")
      .or(`status.eq.queued,and(status.eq.processing,updated_at.lt.${tenMinsAgo})`)
      .order("created_at", { ascending: true })
      .limit(25);

    if (queryError) {
      console.log("[process_inbox] inbox_items query error:", queryError);
      return jsonResponse({ error: `Query inbox_items failed: ${queryError.message}` }, 500);
    }

    if (!items?.length) {
      return jsonResponse({ ok: true, processed: 0 }, 200);
    }

    let processedCount = 0;

    for (const it of items as InboxItem[]) {
      if (!it.image_path) {
        await admin
          .from("inbox_items")
          .update({ status: "failed", parsed_json: { error: "Missing image_path" } })
          .eq("id", it.id);
        continue;
      }

      // Claim job (atomic) if queued or stale processing
      const { data: claimed, error: claimError } = await admin
        .from("inbox_items")
        .update({ status: "processing" })
        .eq("id", it.id)
        .or(`status.eq.queued,and(status.eq.processing,updated_at.lt.${tenMinsAgo})`)
        .select("id")
        .maybeSingle();

      if (claimError) {
        console.log(`[process_inbox] claim error for ${it.id}:`, claimError);
        continue;
      }
      if (!claimed) continue;

      try {
        // 1) Download image
        const dl = await admin.storage.from("inbox").download(it.image_path);
        if (dl.error) throw new Error(`Storage download error: ${dl.error.message}`);
        const bytes = new Uint8Array(await dl.data.arrayBuffer());

        // 2) OCR (local)
        const ocrText = await runLocalOcr(bytes, OCR_URL);
        if (ocrText.length < 50) {
          throw new Error("OCR text too short (likely failed).");
        }

        // 3) Text → JSON (cheap)
        const extracted = await openAITextExtract(ocrText, OPENAI_API_KEY, OPENAI_PROJECT_ID);

        function looksLikeExpenseByText(text: string) {
          const t = text.toLowerCase();
          return /total|subtotal|vat|tax|invoice|receipt|amount due|paid|cash|card/.test(t) ||
            /egp|le|جنيه|ج\.م/.test(t) ||
            /\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})\b/.test(t);
        }

        if (extracted.type !== "expense" && looksLikeExpenseByText(ocrText)) {
          extracted.type = "expense";
          extracted.doc_type = null;
        }

        // 4) Update inbox item
        const { error: updateError } = await admin
          .from("inbox_items")
          .update({
            status: "done",
            raw_text: ocrText.slice(0, 8000),
            parsed_json: extracted,
          })
          .eq("id", it.id);

        if (updateError) throw new Error(`Update inbox_items failed: ${updateError.message}`);

        // 5) Insert into expenses/documents (same as before)
        if (extracted.type === "expense") {
          if (!extracted.expense_date) {
            extracted.expense_date = new Date().toISOString().slice(0, 10);
          }
          if (!extracted.category || extracted.category === "Other") {
            extracted.category = autoCategory(extracted.title);
          }

          const { error: expenseInsertError } = await admin.from("expenses").insert({
            user_id: it.user_id,
            title: extracted.title ?? extracted.merchant ?? "Expense",
            category: extracted.category ?? "Other",
            amount: extracted.amount,
            expense_date: extracted.expense_date,
            image_path: it.image_path,
          });
          if (expenseInsertError) throw new Error(`Insert expense failed: ${expenseInsertError.message}`);
        } else {
          if (extracted.type === "document") {
            const hasSummary = typeof extracted.summary === "string" && extracted.summary.trim().length > 10;
            const hasFields =
              extracted.extracted_fields && Object.keys(extracted.extracted_fields).length > 0;

            if (!hasSummary && !hasFields) {
              throw new Error("Document classification returned empty content (no summary/fields).");
            }
          }

          const { error: docInsertError } = await admin.from("documents").insert({
            user_id: it.user_id,
            title: extracted.title ?? "Document",
            doc_type: extracted.doc_type ?? "other",
            image_path: it.image_path,
            extracted_text: extracted.summary ?? null,
            extracted_fields: extracted.extracted_fields ?? {},
          });
          if (docInsertError) throw new Error(`Insert document failed: ${docInsertError.message}`);
        }

        processedCount += 1;
      } catch (err) {
        const errMsg = String((err as Error)?.message ?? err);
        console.log(`[process_inbox] processing error for ${it.id}:`, err);
        await admin
          .from("inbox_items")
          .update({ status: "failed", parsed_json: { error: errMsg } })
          .eq("id", it.id);
      }
    }

    return jsonResponse({ ok: true, processed: processedCount }, 200);
  } catch (e) {
    console.log("[process_inbox] fatal error:", e);
    return jsonResponse({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
