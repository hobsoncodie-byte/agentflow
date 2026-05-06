import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type DashboardLayoutProps = {
  children: ReactNode;
};

const navItems = [
  {
    href: "/dashboard",
    label: "Overview",
    description: "Your main workspace",
  },
  {
    href: "/dashboard/communities",
    label: "Communities",
    description: "Private spaces and updates",
  },
  {
    href: "/dashboard/agents",
    label: "My Agents",
    description: "Build and deploy AI assistants",
  },
  {
    href: "/create-community",
    label: "Create Community",
    description: "Start a new private space",
  },
];

function getInitial(email?: string) {
  if (!email) return "A";
  return email.charAt(0).toUpperCase();
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const email = user.email ?? "your account";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.06),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.05),_transparent_28%),linear-gradient(to_bottom,_#f8fafc,_#f1f5f9)]" />

      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-[290px] shrink-0 border-r border-slate-200/80 bg-white/70 px-6 py-6 backdrop-blur xl:flex xl:flex-col">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-sm">
              AF
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">Workspace</div>
              <div className="text-xl font-semibold tracking-tight">
                AgentFlow
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-900">
                {getInitial(email)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900">Signed in</div>
                <div className="truncate text-sm text-slate-500">{email}</div>
              </div>
            </div>
          </div>

          <nav className="mt-8 space-y-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group block rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {item.label}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-slate-500">
                      {item.description}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-slate-400 transition group-hover:text-slate-700">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </nav>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">
              Build status
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-500">
              Your dashboard shell is live. Communities, private spaces, and
              members pages are now wired into the app.
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Focus
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  Private spaces
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Stage
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  Live build
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-8">
            <Link
              href="/logout"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Log out
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/75 backdrop-blur">
            <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-sm xl:hidden">
                  AF
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                    AgentFlow Dashboard
                  </div>
                  <div className="truncate text-lg font-semibold tracking-tight text-slate-950">
                    Build your private community product
                  </div>
                </div>
              </div>

              <div className="hidden items-center gap-2 md:flex">
                <Link
                  href="/dashboard/communities"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  View communities
                </Link>
                <Link
                  href="/create-community"
                  className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
                >
                  Create community
                </Link>
              </div>
            </div>

            <div className="border-t border-slate-200/70 bg-white/60 xl:hidden">
              <div className="mx-auto flex w-full max-w-[1280px] gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </header>

          <main className="flex-1">
            <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
