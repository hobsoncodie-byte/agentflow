# Flownz

A private-community platform where every community can have its own deployable AI assistant. Members create private or public spaces, post updates, manage roles — and can chat with a custom AI agent (its own name, description, and system prompt) that the community owner configures and deploys.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (auth + Postgres) · Groq (`llama-3.1-8b-instant`) for AI chat.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase + Groq credentials
npm run dev                  # http://localhost:3000
```

See `.env.example` for the required environment variables and where each one is used.

## Commands

```bash
npm run dev      # start dev server
npm run build    # production build
npm run lint     # run ESLint
```

No automated test suite is configured yet.

## Architecture

- **Auth & route protection** — `src/proxy.ts` (Next.js middleware) guards `/dashboard/**` and `/communities/**`, redirecting unauthenticated users to `/login`. Two Supabase client factories exist — `@/lib/supabase/server` for Server Components/Actions, `@/lib/supabase/client` for Client Components. Use the correct one; mixing them up breaks the session.
- **Data access** — Server Components query Supabase directly, no API layer. Server Actions (`"use server"`, inline in page files) handle mutations and call `revalidatePath`/`redirect` after.
- **AI chat** — `src/app/api/chat/route.ts` streams responses from Groq, persisting messages via the service-role Supabase client (`src/lib/supabase/service.ts`), which bypasses RLS — treat any change to that route with care. Capped at 40 messages/user/hour, checked against `chat_messages` directly (DB-backed since this runs as serverless functions, not a single long-lived process — an in-memory counter wouldn't hold up).
- **Styling** — public pages (`/`, `/login`, `/signup`) use a dark `slate-950` theme; the dashboard uses a light `slate-50` theme. `cn()` from `@/lib/utils` merges Tailwind classes.

## Database schema and migrations

The full schema is captured in `supabase/migrations/`:
- `00000000000000_baseline.sql` — a complete `pg_dump --schema-only` snapshot of the live project as of 2026-07-18 (7 tables, all constraints/indexes/foreign keys/RLS policies).
- Later-dated files are incremental changes applied after that point.

There's no Supabase CLI project link committed here (`supabase link` was done locally, not checked in) — apply new migrations either through the Supabase SQL Editor directly, or re-link locally with `npx supabase link --project-ref hownotwgfjugcuouyoby` first.

`communities` has both a `visibility` text column and a separate `is_private` boolean representing the same fact — a pre-existing redundancy in the schema, not something introduced by tracking it. Both are kept in sync by the app today; worth consolidating to one eventually.

## Known gaps (as of this writing)

- **No billing.** No Stripe or other payment integration exists yet.
- **No automated tests, no error monitoring.**

RLS was fully audited on 2026-07-18: enabled on all 8 tables, every policy correctly scoped to `auth.uid()` (including via `can_manage_community`/`is_community_member`, both of which properly include the community owner). The one gap found (communities marked public weren't actually visible to non-members) is fixed in `supabase/migrations/20260718000000_communities_public_select.sql`.
