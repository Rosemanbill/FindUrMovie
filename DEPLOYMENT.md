# Deploy StreamVerse (GitHub + Vercel)

StreamVerse is a monorepo:

| App | Host | Why |
|-----|------|-----|
| `apps/web` (Next.js) | **Vercel** | Built for Next.js |
| `apps/api` (NestJS) | **Render**, **Railway**, or similar | Long-running Node server + PostgreSQL |
| PostgreSQL | **Neon**, **Supabase**, or **Render Postgres** | Required by Prisma |

Vercel alone cannot run the NestJS API and database. Deploy the API first (or use a hosted DB + API), then point the Vercel frontend at it.

---

## 1. Push to GitHub

From the project root (PowerShell):

```powershell
cd "c:\Users\ritik\Documents\New project"

# First commit (skip if you already committed)
git add .
git commit -m "Initial StreamVerse release"

# Create repo on GitHub (requires GitHub CLI: https://cli.github.com)
gh auth login
gh repo create streamverse --public --source=. --remote=origin --push
```

Without `gh`, create an empty repo on [github.com/new](https://github.com/new), then:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/streamverse.git
git branch -M main
git push -u origin main
```

Do **not** commit `.env` files — they are in `.gitignore`.

---

## 2. Deploy API + database (Render example)

### Database

1. [Neon](https://neon.tech) or [Supabase](https://supabase.com) → create a PostgreSQL database.
2. Copy the connection string (starts with `postgresql://`).

### API on Render

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service** → connect your GitHub repo.
2. Settings:
   - **Root Directory:** `apps/api`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run prisma:generate && npm run build`
   - **Start Command:** `npx prisma migrate deploy && node dist/main.js`
3. **Environment variables:**

   | Key | Value |
   |-----|--------|
   | `DATABASE_URL` | Your Neon/Supabase URL |
   | `JWT_SECRET` | Long random string |
   | `JWT_EXPIRES_IN` | `7d` |
   | `FRONTEND_ORIGIN` | `https://YOUR-APP.vercel.app` (set after Vercel deploy) |
   | `PORT` | `4000` |
   | `PROVIDER_API_BASE_URL` | `https://hdtoday.casa` |
   | `PROVIDER_API_PATH` | `/api/tmdb` |
   | `PROVIDER_EMBED_BASE_URL` | `https://vsembed.ru` |

4. Deploy and note the URL, e.g. `https://streamverse-api.onrender.com`.

5. API base URL for the frontend: `https://streamverse-api.onrender.com/api/v1`

Run seed once (Render **Shell** or locally with production `DATABASE_URL`):

```bash
npm run prisma:seed --workspace apps/api
```

---

## 3. Deploy frontend on Vercel

1. [vercel.com/new](https://vercel.com/new) → **Import** your GitHub repository.
2. **Root Directory:** `apps/web` (important).
3. Framework should detect **Next.js** (uses `apps/web/vercel.json`).
4. **Environment variable:**

   | Key | Value |
   |-----|--------|
   | `NEXT_PUBLIC_API_URL` | `https://YOUR-API.onrender.com/api/v1` |

5. **Deploy**.

6. Copy your Vercel URL (e.g. `https://streamverse.vercel.app`).

7. Update the API’s `FRONTEND_ORIGIN` on Render to that exact URL (no trailing slash), then redeploy the API so CORS allows the frontend.

---

## 4. Verify production

1. Open `https://YOUR-APP.vercel.app`
2. Log in: `demo@streamverse.test` / `Password123!` (after seed)
3. Search and play a title

If login fails, check `NEXT_PUBLIC_API_URL` and API logs. If images or streams fail, confirm provider env vars on the API service.

---

## Local commands (reference)

```powershell
# Install
npm install

# Database (Docker)
docker compose up -d
npm run prisma:migrate
npm run prisma:seed

# Dev (two terminals)
npm run dev:api
npm run dev:web
```

---

## Optional: Vercel CLI

```powershell
npm i -g vercel
cd "c:\Users\ritik\Documents\New project\apps\web"
vercel login
vercel link
vercel env add NEXT_PUBLIC_API_URL
vercel --prod
```
