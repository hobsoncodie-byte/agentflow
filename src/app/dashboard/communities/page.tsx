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

type MembershipRow = {
  community_id: string;
  role: "admin" | "member";
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatRelativeDate(value: string) {
  const date = new Date(value).getTime();
  const now = Date.now();
  const diff = date - now;
  const day = 1000 * 60 * 60 * 24;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const days = Math.round(diff / day);

  if (Math.abs(days) < 1) return "Today";
  if (Math.abs(days) < 30) return rtf.format(days, "day");

  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return rtf.format(months, "month");

  const years = Math.round(months / 12);
  return rtf.format(years, "year");
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border bg-background p-5 shadow-sm">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{hint}</div>
    </div>
  );
}

export default async function CommunitiesPage() {
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
    throw new Error(error.message);
  }

  const typedCommunities: CommunityRow[] = communities ?? [];
  const communityIds = typedCommunities.map((community) => community.id);

  const membershipMap = new Map<string, MembershipRow["role"]>();

  if (communityIds.length > 0) {
    const { data: memberships, error: membershipsError } = await supabase
      .from("community_members")
      .select("community_id, role")
      .eq("user_id", user.id)
      .in("community_id", communityIds);

    if (membershipsError) {
      throw new Error(membershipsError.message);
    }

    (memberships as MembershipRow[] | null)?.forEach((membership) => {
      membershipMap.set(membership.community_id, membership.role);
    });
  }

  const ownedCount = typedCommunities.filter(
    (community) => community.user_id === user.id
  ).length;

  const joinedCount = typedCommunities.filter(
    (community) => community.user_id !== user.id
  ).length;

  const privateCount = typedCommunities.filter(
    (community) => community.is_private !== false
  ).length;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border bg-background shadow-sm">
        <div className="relative p-6 sm:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-muted/60 via-background to-background" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
                Private community workspace
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Communities
                </h1>
                <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                  Create private spaces, invite members, share updates, and keep
                  everything organised in one place.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/create-community"
                className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-black"
              >
                Create community
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total spaces"
          value={typedCommunities.length}
          hint="Everything you can currently access"
        />
        <StatCard
          label="Owned by you"
          value={ownedCount}
          hint="Spaces you created and control"
        />
        <StatCard
          label="Private spaces"
          value={privateCount}
          hint={`${joinedCount} shared with you`}
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Your spaces</h2>
            <p className="text-sm text-muted-foreground">
              Open a space to post updates, manage members, or edit details.
            </p>
          </div>
        </div>

        {typedCommunities.length === 0 ? (
          <div className="rounded-3xl border border-dashed bg-background p-10 text-center shadow-sm">
            <div className="mx-auto max-w-md space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted/50 text-2xl">
                🏠
              </div>
              <h3 className="text-xl font-semibold">No communities yet</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Create your first private space to invite people, share updates,
                and build out the app properly.
              </p>
              <div className="pt-2">
                <Link
                  href="/create-community"
                  className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-black"
                >
                  Create your first community
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {typedCommunities.map((community) => {
              const isOwner = community.user_id === user.id;
              const membershipRole = membershipMap.get(community.id);

              return (
                <Link
                  key={community.id}
                  href={`/dashboard/communities/${community.id}`}
                  className="group rounded-3xl border bg-background p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex h-full flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            {community.is_private === false ? "Public" : "Private"}
                          </span>

                          {isOwner ? (
                            <span className="inline-flex rounded-full bg-black px-2.5 py-1 text-xs font-medium text-white dark:bg-white dark:text-black">
                              Owner
                            </span>
                          ) : membershipRole === "admin" ? (
                            <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium">
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium">
                              Member
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold tracking-tight transition group-hover:opacity-80">
                            {community.name}
                          </h3>
                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                            {community.description || "No description added yet."}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border px-3 py-2 text-xs font-medium text-muted-foreground">
                        Open
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-muted/40 p-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Created
                        </div>
                        <div className="mt-1 text-sm font-medium">
                          {formatDate(community.created_at)}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-muted/40 p-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Freshness
                        </div>
                        <div className="mt-1 text-sm font-medium">
                          {formatRelativeDate(community.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {isOwner
                          ? "You run this space"
                          : membershipRole === "admin"
                          ? "You help manage this space"
                          : "You are inside this space"}
                      </span>
                      <span className="font-medium transition group-hover:translate-x-0.5">
                        View →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
