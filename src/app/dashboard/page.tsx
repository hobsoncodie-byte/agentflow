import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  async function signOut() {
    "use server";

    const supabase = await createClient();
    await supabase.auth.signOut();

    redirect("/login");
  }

  const { data: communities, error } = await supabase
    .from("communities")
    .select("id, name, description, slug, visibility, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-4 text-3xl font-bold">Dashboard</h1>
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            Error loading dashboard: {error.message}
          </div>
        </div>
      </main>
    );
  }

  const totalCount = communities?.length ?? 0;
  const publicCount =
    communities?.filter((community) => community.visibility === "public")
      .length ?? 0;
  const privateCount =
    communities?.filter((community) => community.visibility === "private")
      .length ?? 0;

  const recentCommunities = communities?.slice(0, 5) ?? [];
  const hasCommunities = recentCommunities.length > 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              Overview
            </p>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Your Dashboard
            </h1>
            <p className="mt-2 text-slate-400">
              Manage your communities and see your app at a glance.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/communities"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              View Communities
            </Link>

            <Link
              href="/communities/new"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
            >
              + New Community
            </Link>

            <form action={signOut}>
              <button
                type="submit"
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
              >
                Log out
              </button>
            </form>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total Communities</p>
            <h2 className="mt-2 text-3xl font-bold">{totalCount}</h2>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Public Communities</p>
            <h2 className="mt-2 text-3xl font-bold">{publicCount}</h2>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Private Communities</p>
            <h2 className="mt-2 text-3xl font-bold">{privateCount}</h2>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Recent Communities</h3>
              <Link
                href="/communities"
                className="text-sm text-slate-400 transition hover:text-white"
              >
                View all
              </Link>
            </div>

            {!hasCommunities ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-2xl">
                  ✨
                </div>
                <h4 className="mt-4 text-xl font-semibold">
                  No communities yet
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Your dashboard is ready. Create your first community to start
                  building out Agent Flow.
                </p>
                <div className="mt-5">
                  <Link
                    href="/communities/new"
                    className="inline-block rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
                  >
                    Create your first community
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCommunities.map((community) => (
                  <div
                    key={community.id}
                    className="flex items-start justify-between rounded-xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div className="pr-4">
                      <h4 className="font-semibold">{community.name}</h4>
                      <p className="mt-1 text-sm text-slate-400">
                        {community.description || "No description yet."}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
                        {community.visibility}
                      </p>
                    </div>

                    <Link
                      href={`/communities/${community.slug}`}
                      className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-800"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-xl font-semibold">Quick Actions</h3>
            <p className="mt-2 text-sm text-slate-400">
              Jump into the main parts of your app.
            </p>

            <div className="mt-5 space-y-3">
              <Link
                href="/communities/new"
                className="block rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
              >
                + Create Community
              </Link>

              <Link
                href="/communities"
                className="block rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
              >
                Browse Communities
              </Link>

              <Link
                href="/dashboard"
                className="block rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
              >
                Refresh Dashboard
              </Link>
            </div>

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Signed in as</p>
              <p className="mt-1 break-all text-sm font-medium text-white">
                {user.email}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
