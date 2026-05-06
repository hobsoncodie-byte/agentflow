import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type AgentRow = {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string;
  created_at: string;
};

export default async function AgentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: agents, error } = await supabase
    .from("agents")
    .select("id, name, description, system_prompt, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const typedAgents: AgentRow[] = agents ?? [];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border bg-background shadow-sm">
        <div className="relative p-6 sm:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-muted/60 via-background to-background" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
                AI agents workspace
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  My Agents
                </h1>
                <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                  Build custom AI assistants with your own system prompts, then
                  deploy them to communities as chat companions.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/agents/new"
                className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-black"
              >
                Create agent
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Your agents</h2>
          <p className="text-sm text-muted-foreground">
            Deploy agents to communities so members can chat with them.
          </p>
        </div>

        {typedAgents.length === 0 ? (
          <div className="rounded-3xl border border-dashed bg-background p-10 text-center shadow-sm">
            <div className="mx-auto max-w-md space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted/50 text-2xl">
                🤖
              </div>
              <h3 className="text-xl font-semibold">No agents yet</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Create your first AI agent and give it a custom system prompt.
                Then deploy it to a community as an assistant.
              </p>
              <div className="pt-2">
                <Link
                  href="/dashboard/agents/new"
                  className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-black"
                >
                  Create your first agent
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {typedAgents.map((agent) => (
              <Link
                key={agent.id}
                href={`/dashboard/agents/${agent.id}`}
                className="group rounded-3xl border bg-background p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border bg-muted/50 text-lg">
                        🤖
                      </div>
                      <h3 className="text-xl font-semibold tracking-tight transition group-hover:opacity-80">
                        {agent.name}
                      </h3>
                      <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                        {agent.description || "No description added."}
                      </p>
                    </div>
                    <div className="shrink-0 rounded-xl border px-3 py-2 text-xs font-medium text-muted-foreground">
                      Open
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl bg-muted/40 p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      System prompt preview
                    </div>
                    <div className="mt-1 line-clamp-2 text-sm text-foreground">
                      {agent.system_prompt}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Custom assistant</span>
                    <span className="font-medium transition group-hover:translate-x-0.5">
                      Edit →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
