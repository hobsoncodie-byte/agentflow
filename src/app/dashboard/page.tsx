import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type CommunityRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  is_private: boolean | null;
  user_id: string;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: communities, error } = await supabase
    .from("communities")
    .select("id, name, description, created_at, is_private, user_id")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
        Error loading dashboard: {error.message}
      </div>
    );
  }

  const typedCommunities: CommunityRow[] = communities ?? [];

  const totalCount = typedCommunities.length;
  const publicCount = typedCommunities.filter(
    (community) => community.is_private === false
  ).length;
  const privateCount = typedCommunities.filter(
    (community) => community.is_private !== false
  ).length;

  const recentCommunities = typedCommunities.slice(0, 5);
  const hasCommunities = recentCommunities.length > 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Communities</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">
            {totalCount}
          </h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Public Communities</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">
            {publicCount}
          </h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Private Communities</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">
            {privateCount}
          </h2>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-slate-950">
              Recent Communities
            </h3>
            <Link
              href="/dashboard/communities"
              className="text-sm text-slate-500 transition hover:text-slate-950"
            >
              View all
            </Link>
          </div>

          {!hasCommunities ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl">
                ✨
              </div>
              <h4 className="mt-4 text-xl font-semibold text-slate-950">
                No communities yet
              </h4>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Your dashboard is ready. Create your first community to start
                building out Flownz.
              </p>
              <div className="mt-5">
                <Link
                  href="/create-community"
                  className="inline-block rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
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
                  className="flex items-start justify-between rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="pr-4">
                    <h4 className="font-semibold text-slate-950">
                      {community.name}
                    </h4>
                    <p className="mt-1 text-sm text-slate-500">
                      {community.description || "No description yet."}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
                      {community.is_private === false ? "Public" : "Private"}
                    </p>
                  </div>

                  <Link
                    href={`/dashboard/communities/${community.id}`}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-white"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-950">
            Quick Actions
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Jump into the main parts of your app.
          </p>

          <div className="mt-5 space-y-3">
            <Link
              href="/create-community"
              className="block rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              + Create Community
            </Link>

            <Link
              href="/dashboard/communities"
              className="block rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Browse Communities
            </Link>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Signed in as</p>
            <p className="mt-1 break-all text-sm font-medium text-slate-950">
              {user.email}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
