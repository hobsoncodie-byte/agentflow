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
- **AI chat** — `src/app/api/chat/route.ts` streams responses from Groq, persisting messages via the service-role Supabase client (`src/lib/supabase/service.ts`), which bypasses RLS — treat any change to that route with care.
- **Styling** — public pages (`/`, `/login`, `/signup`) use a dark `slate-950` theme; the dashboard uses a light `slate-50` theme. `cn()` from `@/lib/utils` merges Tailwind classes.

## Known gaps (as of this writing)

These are worth knowing before treating this as production-ready:

- **No version-controlled database schema.** The `communities`, `agents`, `chat_sessions`, `chat_messages`, `community_agents`, and membership/invite tables only exist live in the Supabase project — nothing here can rebuild them from scratch.
- **Row Level Security status is unverified from the codebase.** The app enforces ownership checks in application code; whether RLS policies also enforce this at the database level needs confirming directly in the Supabase dashboard (Authentication → Policies).
- **No billing.** No Stripe or other payment integration exists yet.
- **No rate limiting on AI chat.** `/api/chat` has no per-user quota — a single shared Groq API key currently has no usage guardrails.
- **No automated tests, no error monitoring.**
