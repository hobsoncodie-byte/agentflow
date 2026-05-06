import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type CommunityRow = { id: string; name: string; user_id: string };
type AgentRow = { id: string; name: string; description: string | null };
type DeployedAgent = { id: string; agent_id: string; agents: AgentRow | null };

export default async function CommunityAgentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: community, error: communityError } = await supabase
    .from("communities")
    .select("id, name, user_id")
    .eq("id", id)
    .single();

  if (communityError || !community) notFound();

  const typedCommunity = community as CommunityRow;
  const isOwner = typedCommunity.user_id === user.id;

  if (!isOwner) redirect(`/dashboard/communities/${id}`);

  const { data: deployed } = await supabase
    .from("community_agents")
    .select("id, agent_id, agents(id, name, description)")
    .eq("community_id", id);

  const typedDeployed: DeployedAgent[] = (deployed ?? []) as unknown as DeployedAgent[];
  const deployedAgentIds = new Set(typedDeployed.map((d) => d.agent_id));

  const { data: myAgents } = await supabase
    .from("agents")
    .select("id, name, description")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const typedMyAgents: AgentRow[] = (myAgents ?? []) as AgentRow[];
  const undeployed = typedMyAgents.filter((a) => !deployedAgentIds.has(a.id));

  async function deployAgent(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const agentId = String(formData.get("agent_id") ?? "");
    if (!agentId) redirect(`/dashboard/communities/${id}/agents`);

    const { error } = await supabase.from("community_agents").insert({
      community_id: id,
      agent_id: agentId,
      deployed_by: user.id,
    });

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/communities/${id}/agents`);
    redirect(`/dashboard/communities/${id}/agents`);
  }

  async function undeployAgent(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const deploymentId = String(formData.get("deployment_id") ?? "");
    if (!deploymentId) redirect(`/dashboard/communities/${id}/agents`);

    const { error } = await supabase
      .from("community_agents")
      .delete()
      .eq("id", deploymentId)
      .eq("community_id", id);

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/communities/${id}/agents`);
    redirect(`/dashboard/communities/${id}/agents`);
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border bg-background shadow-sm">
        <div className="relative p-6 sm:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-muted/60 via-background to-background" />
          <div className="relative space-y-4">
            <Link
              href={`/dashboard/communities/${id}`}
              className="inline-flex items-center text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              ← Back to space
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                AI Agents
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                Deploy agents to{" "}
                <span className="font-medium text-foreground">
                  {typedCommunity.name}
                </span>{" "}
                so members can chat with them inside this community.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-2">
        {/* Deployed agents */}
        <section className="rounded-3xl border bg-background p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Active agents
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These agents are available for members to chat with.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {typedDeployed.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                No agents deployed yet. Add one from your agents below.
              </div>
            ) : (
              typedDeployed.map((deployment) =>
                deployment.agents ? (
                  <div
                    key={deployment.id}
                    className="flex items-start justify-between gap-4 rounded-2xl border p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-muted/50 text-base">
                        🤖
                      </div>
                      <div>
                        <div className="font-medium">
                          {deployment.agents.name}
                        </div>
                        <div className="mt-0.5 text-sm text-muted-foreground">
                          {deployment.agents.description || "No description."}
                        </div>
                        <Link
                          href={`/dashboard/communities/${id}/chat/${deployment.agent_id}`}
                          className="mt-2 inline-flex text-xs font-medium text-foreground underline-offset-2 hover:underline"
                        >
                          Open chat →
                        </Link>
                      </div>
                    </div>

                    <form action={undeployAgent}>
                      <input
                        type="hidden"
                        name="deployment_id"
                        value={deployment.id}
                      />
                      <button
                        type="submit"
                        className="shrink-0 inline-flex items-center justify-center rounded-xl border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                ) : null
              )
            )}
          </div>
        </section>

        {/* Available to deploy */}
        <section className="rounded-3xl border bg-background p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Add an agent
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose from your agents to deploy here.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {typedMyAgents.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                You haven&apos;t created any agents yet.{" "}
                <Link
                  href="/dashboard/agents/new"
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  Create one
                </Link>
              </div>
            ) : undeployed.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                All your agents are already deployed here.
              </div>
            ) : (
              undeployed.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-start justify-between gap-4 rounded-2xl border p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-muted/50 text-base">
                      🤖
                    </div>
                    <div>
                      <div className="font-medium">{agent.name}</div>
                      <div className="mt-0.5 text-sm text-muted-foreground">
                        {agent.description || "No description."}
                      </div>
                    </div>
                  </div>

                  <form action={deployAgent}>
                    <input type="hidden" name="agent_id" value={agent.id} />
                    <button
                      type="submit"
                      className="shrink-0 inline-flex items-center justify-center rounded-xl bg-black px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-black"
                    >
                      Deploy
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 border-t pt-5">
            <Link
              href="/dashboard/agents/new"
              className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-muted"
            >
              + Create new agent
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
