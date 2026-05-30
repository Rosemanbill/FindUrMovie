# StreamVerse

StreamVerse is a Netflix-like streaming MVP with original branding, legal sample media, a Next.js frontend, and a separate NestJS backend API.

## Apps

- `apps/web` - Next.js App Router frontend.
- `apps/api` - NestJS REST API with Prisma/PostgreSQL.

## Quick Start

1. Copy environment files:

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start PostgreSQL. If Docker is installed, use:

   ```bash
   docker compose up -d
   ```

   If Docker is not installed, point `apps/api/.env` at any PostgreSQL database.

4. Run migrations and seed demo content:

   ```bash
   npm run prisma:migrate
   npm run prisma:seed
   ```

5. Run the apps in two terminals:

   ```bash
   npm run dev:api
   npm run dev:web
   ```

The frontend runs on `http://localhost:3000` and the API runs on `http://localhost:4000/api/v1`.

## TMDb import

There is no public Netflix API for third-party playback. For recognizable catalog content, StreamVerse supports TMDb metadata import plus YouTube trailer playback.

1. Create a TMDb account and generate an API Read Access Token.
2. Add it to [apps/api/.env](../apps/api/.env):

   ```env
   TMDB_ACCESS_TOKEN="your-token-here"
   ```

3. Restart the API server.
4. Sign in as `admin@streamverse.test`.
5. Open `/admin` and use **Import TMDb Titles**.

Imported TMDb titles use YouTube trailers as the playable source on the watch page.

## Demo Accounts

The seed command creates:

- User: `demo@streamverse.test`
- Admin: `admin@streamverse.test`
- Password: `Password123!`

## Deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md) for GitHub, Vercel (frontend), and hosting the API + PostgreSQL.

## Notes

- The catalog uses sample media and externally hosted poster/backdrop URLs for demo purposes.
- The AI features are implemented as deterministic recommendation and semantic-style scoring services. They are shaped so real embeddings or an LLM provider can be added later without changing the frontend contract.
