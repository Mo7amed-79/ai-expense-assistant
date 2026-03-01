# 🧠 AI Expense & Document Assistant (SaaS MVP)

An AI-powered assistant that transforms receipt and document images into structured financial data using OCR + GPT, built on Supabase with Edge Functions.

> From unstructured images → structured database entries → real-time AI chat interaction.

---

## 🚀 Overview

This project demonstrates a production-style AI SaaS architecture where users can:

- Upload receipt/document images
- Automatically extract structured JSON using OCR + GPT
- Store results in a PostgreSQL database (Supabase)
- Manage expenses via natural language chat
- Query real-time spending totals

The system runs locally using Supabase Docker and Edge Functions, making it fully self-contained and scalable.

---

## 🏗️ Architecture

### Tech Stack

- **Frontend:** Vanilla JS + Custom CSS (SaaS-style UI)
- **Backend:** Supabase (Auth, Postgres, Storage)
- **Edge Functions:** Deno-based serverless functions
- **AI Layer:** OpenAI GPT (structured extraction + intent detection)
- **OCR:** Local image-to-text processing
- **Database:** PostgreSQL (via Supabase)

---

### 🔄 Data Flow

1. User uploads image → stored in Supabase Storage (`inbox` bucket)
2. Entry created in `inbox_items` with status = `queued`
3. `process_inbox` Edge Function:
   - Downloads image
   - Runs OCR
   - Sends text to GPT
   - Receives structured JSON
   - Inserts into:
     - `expenses` (if expense)
     - `documents` (if document)
4. Status updated to `done` or `failed`
5. Chat assistant interacts directly with the database

---

## 💬 AI Chat Capabilities

The system supports natural language commands:

### Add expense:

Add 45 EGP taxi today


### Query total:

How much did I spend on 2026-03-01?


The assistant:
- Detects intent
- Parses amount/date/category
- Writes to DB
- Returns real-time totals

---

## 🗃️ Database Design

### `inbox_items`
- id
- user_id
- image_path
- status (queued | processing | done | failed)
- parsed_json
- error_message

### `expenses`
- id
- user_id
- amount
- currency
- category
- expense_date
- description

### `documents`
- id
- user_id
- extracted_fields (JSON)
- document_type

---

## 🛠️ Setup (Local Development)

### 1️⃣ Clone the repo

git clone <repo-url>
cd ai-expense-assistant


### 2️⃣ Start Supabase locally

supabase start


### 3️⃣ Add credentials
Update:

js/supabase.js


With:

SUPABASE_URL
SUPABASE_ANON_KEY


### 4️⃣ Deploy Edge Functions

supabase functions deploy process_inbox
supabase functions deploy chat_assistant


---

## 🧠 Engineering Highlights

- Secure JWT-based Edge Functions
- Structured JSON extraction without `response_format`
- Graceful failure handling with stored error reasons
- Nullable DB constraints to avoid LLM failure crashes
- Real-time chat-driven DB mutations
- Clean UI state management

---

## 📸 Demo

Upload → Process → Auto-categorize → Chat query → Real-time total.

(Insert demo GIF or LinkedIn video link here)

---

## ⚠️ Error Handling

Failures are tracked with:
- `status = failed`
- `error_message` column
- UI indicators (colored badges)
- Retry-ready architecture

---

## 🔮 Future Improvements

- Automatic categorization using embeddings
- Multi-currency support
- Analytics dashboard
- Monthly reports
- Deployment to Supabase Cloud
- Role-based access control
- AI document classification improvements

---

## 🎯 Why This Project?

This project demonstrates:

- Full-stack AI integration
- Serverless backend design
- Database-aware LLM usage
- Production-style error handling
- SaaS-grade architecture thinking

---

## 📄 License

MIT License

---

Built as a demonstration of AI-native SaaS architecture.
