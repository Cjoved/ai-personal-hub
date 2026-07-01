# Personal Tasker

A personal task dashboard built with Vue 3, Vite, Tailwind CSS, Supabase, and Vercel. Organize tasks in **Spaces** and **Lists**, track them in **List**, **Board**, and **Calendar** views, and receive a **daily Telegram reminder** for due and overdue tasks.

## Features

- Spaces, lists, subtasks, tags, due dates, reminders, and recurrence
- List, kanban board, and calendar views per list
- Home and per-space dashboards with charts
- Filters (including archived), search, quick add, and keyboard shortcuts
- Undo delete, settings (timezone, default space), and dark mode
- Daily Telegram digest via Vercel Cron

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vue 3, Vite, Tailwind CSS 4 |
| Auth & DB | Supabase (Row Level Security) |
| Hosting | Vercel (static app + serverless cron) |
| Notifications | Telegram Bot API |

---

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- A [Supabase](https://supabase.com/) account
- A [Vercel](https://vercel.com/) account
- A [Telegram](https://telegram.org/) account (for daily reminders)
- Git (optional, for deploy via GitHub)

---

## Step 1 — Clone and install locally

```bash
git clone <your-repo-url>
cd tasker
npm install
```

Copy the environment template:

```bash
cp .env.example .env.local
```

> **Windows (PowerShell):** `Copy-Item .env.example .env.local`

---

## Step 2 — Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and click **New project**.
2. Choose an organization, name, database password, and region (pick one close to you, e.g. Singapore).
3. Wait until the project finishes provisioning.

### Get your API keys

1. Open **Project Settings → API**.
2. Copy these values (you will use them later):
   - **Project URL** → `VITE_SUPABASE_URL` and `SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server only — never put this in browser code)

---

## Step 3 — Run database migrations

Migrations live in `supabase/migrations/`. Run them **in order**:

| File | What it creates |
|------|-----------------|
| `0001_create_tasks.sql` | `tasks` table + RLS |
| `0002_add_spaces_and_lists.sql` | `spaces`, `task_lists`, task location columns |
| `0003_create_task_subtasks.sql` | `task_subtasks` table |
| `0004_cascade_delete_space_tasks.sql` | Cascade delete when a space is removed |
| `0005_task_reminders_recurrence.sql` | `reminder_at`, recurrence fields |
| `0006_list_space_consistency.sql` | Trigger to keep list/space in sync |

### Option A — Supabase SQL Editor (simplest)

1. In the Supabase dashboard, open **SQL Editor**.
2. For each file above (0001 → 0006), open the file locally, copy the full SQL, paste into a new query, and click **Run**.
3. Confirm there are no errors before running the next file.

### Option B — Supabase CLI

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Your project ref is in **Project Settings → General → Reference ID**.

### Enable Realtime (recommended)

The app listens for live task updates.

1. Go to **Database → Publications** (or **Realtime** in older dashboards).
2. Ensure the `supabase_realtime` publication includes:
   - `public.tasks`
   - `public.task_subtasks`

If those tables are not listed, add them via **Database → Replication** or run:

```sql
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.task_subtasks;
```

---

## Step 4 — Create your user account

1. In Supabase, open **Authentication → Users**.
2. Click **Add user → Create new user**.
3. Enter the **email** and **password** you want to use to sign in.
4. Use the same email for `VITE_ALLOWED_EMAIL` and `ALLOWED_USER_EMAIL` later.

> On first sign-in, the app seeds default Spaces (Personal, Work, Learning) if your account has no spaces yet.

---

## Step 5 — Configure local environment

Edit `.env.local`:

```env
# Browser — safe to expose in Vite bundle
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ALLOWED_EMAIL=you@example.com

# Server-only — used when testing the cron API locally (optional for npm run dev)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ALLOWED_USER_EMAIL=you@example.com
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
CRON_SECRET=generate-a-long-random-string
```

| Variable | Required for `npm run dev` | Notes |
|----------|---------------------------|-------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Anon/public key |
| `VITE_ALLOWED_EMAIL` | Recommended | Restricts sign-in to one email |
| `SUPABASE_*` / `ALLOWED_USER_EMAIL` | No (local UI) | Needed for Telegram cron |
| `TELEGRAM_*` / `CRON_SECRET` | No (local UI) | Needed for Telegram cron |

Generate `CRON_SECRET` (example):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Run locally

```bash
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`). Sign in with the user you created in Step 4.

Other scripts:

| Command | Description |
|---------|-------------|
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## Step 6 — Set up Telegram daily reminders

### 6.1 Create a bot

1. In Telegram, open a chat with [@BotFather](https://t.me/BotFather).
2. Send `/newbot` and follow the prompts.
3. Copy the **bot token** → `TELEGRAM_BOT_TOKEN`.

### 6.2 Get your chat ID

1. Open a chat with your new bot and send any message (e.g. `hi`).
2. Visit this URL in a browser (replace `TOKEN`):

   ```
   https://api.telegram.org/botTOKEN/getUpdates
   ```

3. Find `"chat":{"id":123456789` in the JSON response.
4. That number is your `TELEGRAM_CHAT_ID`.

Alternatively, message [@userinfobot](https://t.me/userinfobot) to get your personal chat ID.

### 6.3 What the cron sends

Every day, the job at `/api/cron/daily-reminder` loads your open tasks and sends a Telegram message listing:

- **Overdue** tasks
- **Due today** tasks

If none, it sends a short “you are clear” message. Times in the message use **Asia/Manila** timezone.

### 6.4 Cron schedule

In `vercel.json` the schedule is:

```json
"schedule": "0 23 * * *"
```

That is **23:00 UTC** → **7:00 AM Philippines (UTC+8)**. Change the cron expression if you want a different time (Vercel uses UTC).

---

## Step 7 — Deploy to Vercel

### 7.1 Connect the repository

1. Push this project to GitHub (or GitLab/Bitbucket).
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import the repository.
4. Vercel should detect Vite automatically:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`

These are also set in `vercel.json`.

### 7.2 Add environment variables

In **Vercel → Project → Settings → Environment Variables**, add:

| Variable | Environments | Sensitive |
|----------|--------------|-----------|
| `VITE_SUPABASE_URL` | Production, Preview | No |
| `VITE_SUPABASE_ANON_KEY` | Production, Preview | No |
| `VITE_ALLOWED_EMAIL` | Production, Preview | No |
| `SUPABASE_URL` | Production (and Preview if needed) | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | **Yes** |
| `ALLOWED_USER_EMAIL` | Production | No |
| `TELEGRAM_BOT_TOKEN` | Production | **Yes** |
| `TELEGRAM_CHAT_ID` | Production | Yes |
| `CRON_SECRET` | Production | **Yes** |

Rules:

- Variables starting with `VITE_` are embedded in the browser bundle — only use public Supabase keys there.
- **Never** expose `SUPABASE_SERVICE_ROLE_KEY` as a `VITE_` variable.
- `ALLOWED_USER_EMAIL` must match the Supabase Auth user from Step 4 (same as `VITE_ALLOWED_EMAIL`).

### 7.3 Deploy

1. Click **Deploy** (or push to `main` if auto-deploy is enabled).
2. When the build finishes, open your production URL and sign in.

### 7.4 Verify the cron job

1. After deploy, go to **Vercel → Project → Cron Jobs**.
2. Confirm `/api/cron/daily-reminder` is listed.
3. Optionally trigger a manual test:

   ```bash
   curl -X GET "https://YOUR_APP.vercel.app/api/cron/daily-reminder" \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

   A successful response looks like:

   ```json
   { "ok": true, "sent": true, "dueToday": 0, "overdue": 0 }
   ```

   You should receive a Telegram message.

> Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` when invoking scheduled crons if `CRON_SECRET` is set in the project.

---

## Step 8 — Post-deploy checklist

- [ ] Sign in on production with your allowed email
- [ ] Create a task with a due date and confirm it appears in List, Board, and Calendar
- [ ] Archive a task and filter by **Archived**
- [ ] Receive a test Telegram message from the cron endpoint
- [ ] Confirm Realtime works (open two tabs; edit a task in one and see it update in the other)

---

## Environment reference

See [`.env.example`](.env.example) for the full list.

```env
# Browser (Vite)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ALLOWED_EMAIL=

# Server (Vercel functions only)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ALLOWED_USER_EMAIL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
CRON_SECRET=
```

---

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Focus task search |
| `N` | New task (when a list is open) |
| `Esc` | Close editor, settings, or mobile sidebar |

---

## Security notes

- Row Level Security (RLS) on all user tables scopes data to `auth.uid()`.
- Only the Supabase **anon** key is used in frontend code.
- The **service role** key is used only in the serverless cron function.
- Security headers are set in `vercel.json`.
- Do not commit `.env.local` or real secrets to Git.

---

## Troubleshooting

### Cannot sign in

- Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` or Vercel.
- Confirm the user exists under **Authentication → Users**.
- If `VITE_ALLOWED_EMAIL` is set, the sign-in email must match exactly.

### Tasks do not load / permission errors

- Confirm all migrations (0001–0006) ran successfully.
- In Supabase **Logs → Postgres**, check for RLS or policy errors.

### Telegram cron returns 401

- `CRON_SECRET` must be set in Vercel.
- Manual tests must send `Authorization: Bearer <CRON_SECRET>`.

### Telegram cron returns 500

- Verify `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ALLOWED_USER_EMAIL`.
- Ensure you have messaged the bot at least once.
- Check **Vercel → Logs** for the function error message.

### Realtime updates not appearing

- Enable `tasks` and `task_subtasks` on the `supabase_realtime` publication (Step 3).

### Cron time is wrong

- Vercel cron uses **UTC**. Adjust the `schedule` in `vercel.json` for your timezone.

---

## Project structure (quick reference)

```
tasker/
├── api/cron/daily-reminder.js   # Vercel cron handler
├── lib/server/                  # Telegram + Supabase admin helpers
├── src/                         # Vue app
├── supabase/migrations/         # SQL schema (run in order)
├── vercel.json                  # Rewrites, headers, cron schedule
└── .env.example                 # Environment template
```

---

## License

Private / personal use.

---

## PWA & Android APK (PWA Builder)

The website stays the same in the browser. PWA files only add installability and offline caching for static assets. Supabase auth and task data still load over the network.

### What was added

- `manifest.webmanifest` (auto-generated on build)
- Service worker (`sw.js`) for caching static files
- PNG icons: `public/pwa-192.png`, `public/pwa-512.png`
- Regenerate icons anytime: `npm run icons`

### Build and deploy first

PWA Builder needs your **live HTTPS URL**, not localhost:

```bash
npm run build
```

Push to GitHub / deploy on Vercel as usual. The PWA files ship inside `dist/` automatically.

### Verify before packaging

1. Open your Vercel URL in Chrome (desktop or mobile).
2. Open DevTools → **Application** → **Manifest** — confirm name and icons load.
3. Check **Service workers** — should show a registered worker.
4. On Android Chrome: menu → **Install app** or **Add to Home screen**.

### Package APK with PWA Builder

1. Go to [pwabuilder.com](https://www.pwabuilder.com/) and enter your Vercel URL.
2. Fix any warnings (manifest and service worker should already score well).
3. Click **Package for stores** → **Android**.
4. Set package ID (e.g. `com.yourname.tasker`), version, and colors.
5. Create or upload a signing key, then download the **APK**.

No extra Supabase or Vercel env vars are needed for the APK — it wraps the same deployed site.

