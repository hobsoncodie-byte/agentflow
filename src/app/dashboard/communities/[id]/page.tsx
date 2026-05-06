import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type CommunityRow = {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
  is_private: boolean | null;
};

type MembershipRow = {
  role: "admin" | "member";
};

type PostRow = {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
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
    <div className="rounded-2xl border bg-background p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{hint}</div>
    </div>
  );
}

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: community, error: communityError } = await supabase
    .from("communities")
    .select("id, name, description, user_id, created_at, is_private")
    .eq("id", id)
    .single();

  if (communityError || !community) {
    notFound();
  }

  const typedCommunity = community as CommunityRow;

  const { data: membership } = await supabase
    .from("community_members")
    .select("role")
    .eq("community_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const typedMembership = (membership as MembershipRow | null) ?? null;

  const isOwner = typedCommunity.user_id === user.id;
  const isAdmin = typedMembership?.role === "admin";
  const canManage = isOwner || isAdmin;

  const { data: posts, error: postsError } = await supabase
    .from("community_posts")
    .select("id, content, author_id, created_at, updated_at")
    .eq("community_id", id)
    .order("created_at", { ascending: false });

  if (postsError) {
    throw new Error(postsError.message);
  }

  const typedPosts: PostRow[] = (posts as PostRow[] | null) ?? [];

  const { count: memberCount, error: memberCountError } = await supabase
    .from("community_members")
    .select("*", { count: "exact", head: true })
    .eq("community_id", id);

  const { data: deployedAgents } = await supabase
    .from("community_agents")
    .select("agent_id, agents(id, name)")
    .eq("community_id", id);

  const typedDeployedAgents = (deployedAgents ?? []) as unknown as {
    agent_id: string;
    agents: { id: string; name: string } | null;
  }[];

  if (memberCountError) {
    throw new Error(memberCountError.message);
  }

  const totalPeople = 1 + (memberCount ?? 0);
  const totalPosts = typedPosts.length;
  const latestPost = typedPosts[0]?.created_at ?? null;

  async function createPost(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const content = String(formData.get("content") ?? "").trim();

    if (!content) {
      redirect(`/dashboard/communities/${id}`);
    }

    const { error } = await supabase.from("community_posts").insert({
      community_id: id,
      author_id: user.id,
      content,
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(`/dashboard/communities/${id}`);
    redirect(`/dashboard/communities/${id}`);
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border bg-background shadow-sm">
        <div className="relative p-6 sm:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-muted/60 via-background to-background" />

          <div className="relative space-y-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl space-y-4">
                <Link
                  href="/dashboard/communities"
                  className="inline-flex items-center text-sm font-medium text-muted-foreground transition hover:text-foreground"
                >
                  ← Back to communities
                </Link>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {typedCommunity.is_private === false ? "Public space" : "Private space"}
                  </span>

                  {isOwner ? (
                    <span className="inline-flex rounded-full bg-black px-2.5 py-1 text-xs font-medium text-white dark:bg-white dark:text-black">
                      Owner
                    </span>
                  ) : isAdmin ? (
                    <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium">
                      Admin
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium">
                      Member
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    {typedCommunity.name}
                  </h1>

                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                    {typedCommunity.description || "No description added yet for this space."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>Created {formatDate(typedCommunity.created_at)}</span>
                  <span>•</span>
                  <span>{formatRelativeDate(typedCommunity.created_at)}</span>
                  {latestPost && (
                    <>
                      <span>•</span>
                      <span>Latest activity {formatRelativeDate(latestPost)}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {canManage && (
                  <Link
                    href={`/dashboard/communities/${id}/members`}
                    className="inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
                  >
                    Manage Members
                  </Link>
                )}

                {canManage && (
                  <Link
                    href={`/dashboard/communities/${id}/edit`}
                    className="inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
                  >
                    Edit Space
                  </Link>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                label="People inside"
                value={totalPeople}
                hint="Owner plus invited members who join"
              />
              <StatCard
                label="Total posts"
                value={totalPosts}
                hint="Updates shared in this space"
              />
              <StatCard
                label="Your access"
                value={isOwner ? "Owner" : isAdmin ? "Admin" : "Member"}
                hint="What level of control you currently have"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border bg-background p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Post an update</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Share wins, plans, ideas, or anything members should see.
                </p>
              </div>
            </div>

            <form action={createPost} className="mt-5 space-y-4">
              <textarea
                name="content"
                rows={6}
                placeholder="Write an update for your space..."
                className="w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground"
                required
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-black"
                >
                  Publish update
                </button>
              </div>
            </form>
          </section>

          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Updates feed</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Everything shared inside this private space.
                </p>
              </div>
            </div>

            {typedPosts.length === 0 ? (
              <div className="rounded-3xl border border-dashed bg-background p-10 text-center shadow-sm">
                <div className="mx-auto max-w-sm space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted/50 text-2xl">
                    ✍️
                  </div>
                  <h3 className="text-xl font-semibold">No posts yet</h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Be the first person to post an update in this space.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {typedPosts.map((post) => {
                  const authorLabel =
                    post.author_id === user.id
                      ? "You"
                      : post.author_id === typedCommunity.user_id
                      ? "Owner"
                      : "Member";

                  return (
                    <article
                      key={post.id}
                      className="rounded-3xl border bg-background p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium">
                            {authorLabel}
                          </span>
                          {post.updated_at !== post.created_at && (
                            <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                              Edited
                            </span>
                          )}
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {formatDate(post.created_at)}
                        </div>
                      </div>

                      <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground">
                        {post.content}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>{formatRelativeDate(post.created_at)}</span>
                        {post.updated_at !== post.created_at && (
                          <span>Updated {formatDate(post.updated_at)}</span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-3xl border bg-background p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight">About this space</h2>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 p-3">
                <span className="text-sm text-muted-foreground">Visibility</span>
                <span className="text-sm font-medium">
                  {typedCommunity.is_private === false ? "Public" : "Private"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 p-3">
                <span className="text-sm text-muted-foreground">Your access</span>
                <span className="text-sm font-medium">
                  {isOwner ? "Owner" : isAdmin ? "Admin" : "Member"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 p-3">
                <span className="text-sm text-muted-foreground">People inside</span>
                <span className="text-sm font-medium">{totalPeople}</span>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 p-3">
                <span className="text-sm text-muted-foreground">Posts</span>
                <span className="text-sm font-medium">{totalPosts}</span>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border bg-background p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight">Quick actions</h2>
            <div className="mt-5 space-y-3">
              <Link
                href={`/dashboard/communities/${id}/members`}
                className="flex items-center justify-between rounded-2xl border p-4 transition hover:bg-muted"
              >
                <div>
                  <div className="font-medium">Manage members</div>
                  <div className="text-sm text-muted-foreground">
                    Invite, review, and manage access.
                  </div>
                </div>
                <span className="text-sm font-medium">→</span>
              </Link>

              <Link
                href={`/dashboard/communities/${id}/agents`}
                className="flex items-center justify-between rounded-2xl border p-4 transition hover:bg-muted"
              >
                <div>
                  <div className="font-medium">AI agents</div>
                  <div className="text-sm text-muted-foreground">
                    Deploy assistants members can chat with.
                  </div>
                </div>
                <span className="text-sm font-medium">→</span>
              </Link>

              {typedDeployedAgents.length > 0 && (
                <div className="rounded-2xl border p-4">
                  <div className="font-medium">Chat with an agent</div>
                  <div className="mt-3 space-y-2">
                    {typedDeployedAgents.map((d) =>
                      d.agents ? (
                        <Link
                          key={d.agent_id}
                          href={`/dashboard/communities/${id}/chat/${d.agent_id}`}
                          className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition hover:bg-muted"
                        >
                          <span>🤖</span>
                          <span className="font-medium">{d.agents.name}</span>
                          <span className="ml-auto text-muted-foreground">→</span>
                        </Link>
                      ) : null
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
