# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Important:** This is Next.js 16 — APIs, conventions, and file structure may differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Commands

```bash
npm run dev      # start dev server on http://localhost:3000
npm run build    # production build
npm run lint     # run ESLint
```

No test suite is configured.

## Environment

Requires `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Architecture

**AgentFlow** is a community management platform built on Next.js App Router, React 19, TypeScript, Tailwind CSS v4, and Supabase (auth + Postgres).

### Auth & Middleware

Route protection lives in `src/proxy.ts`, which acts as the middleware. It guards `/dashboard/**` and `/communities/**` (redirects unauthenticated users to `/login`) and redirects logged-in users away from `/login` and `/signup`.

There are two Supabase client factories — always use the correct one:

| Context | Import | Use when |
|---|---|---|
| Server Components, Route Handlers, Server Actions | `@/lib/supabase/server` | RSC, `async` page/layout, `"use server"` actions |
| Client Components | `@/lib/supabase/client` | `"use client"` files |

`@/lib/auth` exports `requireUser()` — a server-side helper that returns the authenticated user or redirects to `/login`.

### Route Structure

- `/` — public landing
- `/login`, `/signup` — client components, use browser Supabase client
- `/auth/confirm` — email OTP verification route
- `/dashboard` — protected shell with sidebar layout (`src/app/dashboard/layout.tsx`)
- `/dashboard/communities` — user's community list
- `/dashboard/communities/[id]` — community detail with posts feed and Server Actions for posting
- `/dashboard/communities/[id]/members` — member management
- `/communities` — browseable community listing (protected)
- `/create-community` — community creation form (client component, writes directly via browser Supabase client)

### Data Access Pattern

Dashboard pages are React Server Components that call Supabase directly (no API layer). Server Actions use `"use server"` inline inside page files and call `revalidatePath` + `redirect` after mutations.

### Styling

Public pages use a dark `slate-950` theme. The dashboard uses a light `slate-50` background. Tailwind classes are used throughout; `cn()` from `@/lib/utils` merges class names (`clsx` + `tailwind-merge`).

### Components

`src/components/ui/` holds primitive UI components (Button, Card, Input). Feature components live at `src/components/` and are mostly client components (e.g. `CommunityFilters`, `DeleteCommunityButton`).
