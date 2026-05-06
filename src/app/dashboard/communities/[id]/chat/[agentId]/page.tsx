import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatInterface from "@/components/chat-interface";

type MessageRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default async function CommunityAgentChatPage({
  params,
}: {
  params: Promise<{ id: string; agentId: string }>;
}) {
  const { id, agentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verify community exists
  const { data: community, error: communityError } = await supabase
    .from("communities")
    .select("id, name")
    .eq("id", id)
    .single();

  if (communityError || !community) notFound();

  // Verify agent is deployed in this community
  const { data: deployment } = await supabase
    .from("community_agents")
    .select("agent_id, agents(id, name, description, system_prompt)")
    .eq("community_id", id)
    .eq("agent_id", agentId)
    .maybeSingle();

  if (!deployment) notFound();

  const agentsRaw = deployment.agents as unknown;
  const agentData = (Array.isArray(agentsRaw) ? agentsRaw[0] : agentsRaw) as {
    id: string;
    name: string;
    description: string | null;
    system_prompt: string;
  } | null;

  if (!agentData) notFound();

  // Upsert chat session
  const { data: session, error: sessionError } = await supabase
    .from("chat_sessions")
    .upsert(
      {
        community_id: id,
        agent_id: agentId,
        user_id: user.id,
      },
      { onConflict: "community_id,agent_id,user_id" }
    )
    .select("id")
    .single();

  if (sessionError || !session) {
    throw new Error(sessionError?.message ?? "Failed to create chat session");
  }

  // Load message history
  const { data: messages } = await supabase
    .from("chat_messages")
    .select("id, role, content")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true })
    .limit(50);

  const typedMessages: MessageRow[] = (messages ?? []) as MessageRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href={`/dashboard/communities/${id}`}
            className="inline-flex items-center text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            ← Back to {community.name}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            {agentData.name}
          </h1>
          {agentData.description && (
            <p className="text-sm text-muted-foreground">
              {agentData.description}
            </p>
          )}
        </div>
        <Link
          href={`/dashboard/communities/${id}/agents`}
          className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-muted"
        >
          Manage agents
        </Link>
      </div>

      <ChatInterface
        sessionId={session.id}
        agentName={agentData.name}
        initialMessages={typedMessages}
      />
    </div>
  );
}
