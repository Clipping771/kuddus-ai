# OpenRouter API Keys - Multi-Key Rotation System

## কেন এটা দরকার?

OpenRouter এর free tier এ **50 requests/day** limit আছে। যখন একটা key exhausted হয়ে যায়, system automatically পরের key তে switch করে। এতে করে আপনি unlimited requests পাবেন (যতগুলো key add করবেন)।

## Setup Steps

### 1. Supabase Migration Run করুন

```sql
-- Supabase SQL Editor এ গিয়ে এই file টা run করুন:
supabase_migrations/003_openrouter_keys.sql
```

অথবা Supabase Dashboard → SQL Editor → New Query → Paste করে Run করুন।

### 2. OpenRouter Keys Generate করুন

1. **https://openrouter.ai** এ যান
2. Multiple accounts বানান (different emails দিয়ে)
3. প্রতিটা account থেকে একটা করে API key generate করুন
4. Keys গুলো copy করে রাখুন (format: `sk-or-v1-...`)

### 3. App এ Keys Add করুন

**Option A: UI দিয়ে (Recommended)**
1. Dashboard এ যান
2. Settings → OpenRouter Keys
3. "Add New Key" button এ click করুন
4. Key paste করুন এবং একটা label দিন (e.g., "Account 1", "Account 2")
5. Save করুন

**Option B: `.env.local` দিয়ে (Fallback)**
```env
OPENROUTER_API_KEY_1=sk-or-v1-...
OPENROUTER_API_KEY_2=sk-or-v1-...
OPENROUTER_API_KEY_3=sk-or-v1-...
```

## কিভাবে কাজ করে?

1. **User chat করে** → System প্রথম key দিয়ে try করে
2. **429 (rate limit) error** → Automatically পরের key তে switch করে
3. **সব keys exhausted** → Clear error message দেখায়: "Add more keys or wait for reset"

## Key Management

### Keys দেখা
```
GET /api/settings/openrouter-keys
```

### নতুন Key Add করা
```
POST /api/settings/openrouter-keys
Body: { "api_key": "sk-or-v1-...", "label": "Account 1" }
```

### Key Delete করা
```
DELETE /api/settings/openrouter-keys
Body: { "id": "uuid" }
```

### Key Enable/Disable করা
```
PATCH /api/settings/openrouter-keys
Body: { "id": "uuid", "is_active": false }
```

## Security

- Keys database এ encrypted store হয় না (plain text), কিন্তু শুধুমাত্র authenticated user নিজের keys access করতে পারে
- API response এ শুধু last 6 characters দেখায় (`sk-or-...abc123`)
- Full key শুধু server-side code এ থাকে

## Troubleshooting

### "No OpenRouter API keys configured" Error
- Settings এ গিয়ে অন্তত একটা key add করুন
- অথবা `.env.local` এ `OPENROUTER_API_KEY_1` set করুন

### "All keys exhausted" Error
- আরো keys add করুন (different accounts থেকে)
- অথবা midnight UTC পর্যন্ত wait করুন (rate limit reset হবে)

### Keys কাজ করছে না
- Key format check করুন: `sk-or-v1-` দিয়ে শুরু হতে হবে
- OpenRouter dashboard এ গিয়ে key valid কিনা check করুন
- Key এর is_active status true আছে কিনা check করুন

## Best Practices

1. **3-5টা keys রাখুন** — এতে করে 150-250 requests/day পাবেন
2. **Label দিয়ে রাখুন** — কোন key কোন account এর সেটা মনে রাখা সহজ হবে
3. **Inactive keys disable করুন** — যেগুলো কাজ করছে না সেগুলো off করে দিন
4. **Monitor করুন** — Console logs এ দেখবেন কোন key কখন use হচ্ছে

## Example Console Output

```
[OpenRouter] ✅ Key ...abc123 → model "deepseek/deepseek-v4-flash:free" OK
[OpenRouter] ❌ Key ...abc123 → model "google/gemma-4-31b-it:free" (429): Rate limit exceeded
[OpenRouter] ✅ Key ...def456 → model "google/gemma-4-31b-it:free" OK
```

এভাবে দেখতে পারবেন কোন key কখন exhausted হচ্ছে এবং system automatically rotate করছে।
