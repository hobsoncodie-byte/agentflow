import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ToastMessage from "@/components/toast-message";
import CommunityFilters from "@/components/community-filters";

type PageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
    q?: string;
    visibility?: string;
  }>;
};

function getSuccessMessage(value?: string) {
  switch (value) {
    case "created":
      return "Community created successfully.";
    case "deleted":
      return "Community deleted successfully.";
    default:
      return null;
  }
}

function getErrorMessage(value?: string) {
  switch (value) {
    case "load_failed":
      return "Could not load your communities.";
    default:
      return null;
  }
}

export default async function CommunitiesPage({ searchParams }: PageProps) {
  const { success, error, q, visibility } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let query = supabase
    .from("communities")
    .select("id, name, slug, description, visibility, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (visibility === "public" || visibility === "private") {
    query = query.eq("visibility", visibility);
  }

  if (q?.trim()) {
    const safeQuery = q.trim();
    query = query.or(
      `name.ilike.%${safeQuery}%,slug.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`
    );
  }

  const { data: communities, error: communitiesError } = await query;

  const successMessage = getSuccessMessage(success);
  const queryErrorMessage = getErrorMessage(error);
  const runtimeErrorMessage = communitiesError
    ? "Could not load your communities."
    : null;

  const hasCommunities = !!communities && communities.length > 0;
  const hasActiveFilters = !!q?.trim() || visibility === "public" || visibility === "private";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {successMessage ? (
        <ToastMessage message={successMessage} type="success" />
      ) : null}

      {queryErrorMessage ? (
        <ToastMessage message={queryErrorMessage} type="error" />
      ) : null}

      {runtimeErrorMessage ? (
        <ToastMessage message={runtimeErrorMessage} type="error" />
      ) : null}

      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              Communities
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Your Communities
            </h1>
            <p className="mt-2 text-slate-400">
              Create, manage, and organise your communities.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Back to Dashboard
            </Link>

            <Link
              href="/communities/new"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
            >
              + New Community
            </Link>
          </div>
        </div>

        <div className="mb-6">
          <CommunityFilters />
        </div>

        {communitiesError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
            We could not load your communities right now. Please refresh and try
            again.
          </div>
        ) : !hasCommunities ? (
          hasActiveFilters ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-2xl">
                🔎
              </div>
              <h2 className="mt-5 text-2xl font-semibold">
                No matching communities
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">
                Try changing your search or visibility filter to find what you
                are looking for.
              </p>
              <div className="mt-6">
                <Link
                  href="/communities"
                  className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
                >
                  Clear filters
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-2xl">
                🚀
              </div>
              <h2 className="mt-5 text-2xl font-semibold">
                Create your first community
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">
                Communities are where your content, members, and conversations can
                live. Start with one simple community and build from there.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/communities/new"
                  className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
                >
                  Create Community
                </Link>

                <Link
                  href="/dashboard"
                  className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          )
        ) : (
          <>
            <div className="mb-4 text-sm text-slate-400">
              {communities.length} {communities.length === 1 ? "community" : "communities"} found
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {communities.map((community) => (
                <div
                  key={community.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">{community.name}</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        /{community.slug}
                      </p>
                    </div>

                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
                      {community.visibility}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-300">
                    {community.description || "No description yet."}
                  </p>

                  <div className="mt-5 flex gap-3">
                    <Link
                      href={`/communities/${community.slug}`}
                      className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
                    >
                      View
                    </Link>

                    <Link
                      href={`/communities/${community.slug}/edit`}
                      className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
