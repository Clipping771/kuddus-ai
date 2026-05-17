# Kuddus Ali AI — Brutally Honest Personal Business Advisor

Kuddus Ali AI is a full-stack, premium web application that gives entrepreneurs unfiltered, battle-tested, and brutally honest business advice. Inspired by 20+ years of experience across 4 continents, Kuddus Ali analyzes your startup idea, targets your specific country/market, flags critical regulatory & economic risks, and crafts a concrete 7-day action plan.

Powered by **Anthropic's Claude AI** (`claude-sonnet-4-20250514`), authenticated via **Clerk**, and persisted in **Supabase (PostgreSQL)**.

---

## ⚡ Key Features

1. **Brutally Honest Verdicts:** Direct Go / No-Go / Pivot feedback in the very first line of response.
2. **Infinite Consultations:** Zero daily limits, fully free for authenticated users.
3. **Chat Persistence:** Seamlessly save, retrieve, and delete consultation history threads in Supabase.
4. **Real-time Streaming:** Dynamic, real-time word-by-word streaming updates with responsive typing indicators.
5. **High-Fidelity UI:** Gorgeous custom vector illustrations, premium glassmorphism grids, warm amber (`#F59E0B`) accents, and a fully responsive collapsible dashboard drawer.

---

## 🛠️ Tech Stack

- **Frontend Framework:** Next.js 14 (App Router)
- **Programming Language:** TypeScript
- **Styling Engine:** Tailwind CSS + Lucide Icons + custom global prose configurations
- **Authentication:** Clerk Client Core
- **Database Engine:** Supabase (PostgreSQL client)
- **AI Core:** Anthropic Claude API SDK
- **Deployment Platform:** Vercel

---

## 🚀 Local Setup Guide

Follow these steps to run the application locally:

### 1. Clone & Bootstrap Dependencies

Navigate to your workspace directory and install packages using:
```bash
npm install --legacy-peer-deps
```

### 2. Configure Database Schema

Log in to your [Supabase Dashboard](https://supabase.com), create a new project, navigate to the **SQL Editor**, paste the contents of `supabase_schema.sql` (found in the root of this project), and hit **Run**. This establishes:
* `users` — for lazy profile syncing.
* `chats` — for user consult threads.
* `messages` — for persistent conversation arrays.

### 3. Environment Variables Configuration

Create a `.env.local` file in the root directory and populate it with your API keys:
```env
# Clerk Authentication Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Supabase Configurations
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Anthropic Claude API Key
ANTHROPIC_API_KEY=sk-ant-api03-...

# App Base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Development Server

Launch the dev server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to start your consultation!

---

## ⚡ Production Compilation Check

Ensure all TypeScript constraints, ESLint rules, and route generation paths are 100% stable:
```bash
npm run build
```

---

## 📄 License

Made with 💛 by the Kuddus Ali AI Team. Built for founders serious about building something real.
