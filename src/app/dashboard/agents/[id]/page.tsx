import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type AgentRow = {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string;
  user_id: string;
};

export default async function AgentDetailPage({
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

  const { data: agent, error } = await supabase
    .from("agents")
    .select("id, name, description, system_prompt, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !agent) {
    notFound();
  }

  const typedAgent = agent as AgentRow;

  const { data: deployments } = await supabase
    .from("community_agents")
    .select("community_id, communities(id, name)")
    .eq("agent_id", id);

  const typedDeployments = (deployments ?? []) as {
    community_id: string;
    communities: { id: string; name: string } | null;
  }[];

  async function updateAgent(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const systemPrompt = String(formData.get("system_prompt") ?? "").trim();

    if (!name || !systemPrompt) {
      redirect(`/dashboard/agents/${id}`);
    }

    const { error } = await supabase
      .from("agents")
      .update({
        name,
        description: description || null,
        system_prompt: systemPrompt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/agents/${id}`);
    redirect(`/dashboard/agents/${id}`);
  }

  async function deleteAgent(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { error } = await supabase
      .from("agents")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);

    redirect("/dashboard/agents");
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border bg-background shadow-sm">
        <div className="relative p-6 sm:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-muted/60 via-background to-background" />
          <div className="relative space-y-4">
            <Link
              href="/dashboard/agents"
              className="inline-flex items-center text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              ← Back to agents
            </Link>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  {typedAgent.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {typedAgent.description || "No description."}
                </p>
              </div>
              <form action={deleteAgent}>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  Delete agent
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border bg-background p-6 shadow-sm">
          <h2 className="text-xl font-semibold tracking-tight">Edit agent</h2>
          <form action={updateAgent} className="mt-5 space-y-5">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={typedAgent.name}
                required
                className="w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description{" "}
                <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                id="description"
                name="description"
                type="text"
                defaultValue={typedAgent.description ?? ""}
                className="w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="system_prompt" className="text-sm font-medium">
                System prompt
              </label>
              <textarea
                id="system_prompt"
                name="system_prompt"
                defaultValue={typedAgent.system_prompt}
                required
                rows={12}
                className="w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-black"
            >
              Save changes
            </button>
          </form>
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border bg-background p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight">
              Deployed to
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Communities where this agent is active.
            </p>
            <div className="mt-5 space-y-3">
              {typedDeployments.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                  Not deployed anywhere yet.
                </div>
              ) : (
                typedDeployments.map((d) =>
                  d.communities ? (
                    <Link
                      key={d.community_id}
                      href={`/dashboard/communities/${d.communities.id}/agents`}
                      className="flex items-center justify-between rounded-2xl border p-3 text-sm transition hover:bg-muted"
                    >
                      <span className="font-medium">{d.communities.name}</span>
                      <span className="text-muted-foreground">→</span>
                    </Link>
                  ) : null
                )
              )}
            </div>
          </section>

          <section className="rounded-3xl border bg-background p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight">
              Deploy to a community
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Go to a community&apos;s Agents page to add this assistant as a
              chat companion for members.
            </p>
            <div className="mt-4">
              <Link
                href="/dashboard/communities"
                className="inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
              >
                Browse communities
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
