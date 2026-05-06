import { NextRequest } from "next/server";
import Groq from "groq-sdk";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(10000),
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response("Invalid request body", { status: 400 });
  }

  const { sessionId, message } = parsed.data;

  const { data: session, error: sessionError } = await supabase
    .from("chat_sessions")
    .select("id, agent_id, community_id, agents(system_prompt, name)")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !session) {
    return new Response("Session not found", { status: 404 });
  }

  const { data: deployment } = await supabase
    .from("community_agents")
    .select("id")
    .eq("community_id", session.community_id)
    .eq("agent_id", session.agent_id)
    .maybeSingle();

  if (!deployment) {
    return new Response("Agent not deployed in this community", { status: 403 });
  }

  const agentsRaw = session.agents as unknown;
  const agentData = (Array.isArray(agentsRaw) ? agentsRaw[0] : agentsRaw) as { system_prompt: string; name: string } | null;
  const systemPrompt = agentData?.system_prompt ?? "You are a helpful assistant.";

  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(20);

  const historyMessages = (history ?? []) as { role: "user" | "assistant"; content: string }[];

  await supabase.from("chat_messages").insert({
    session_id: sessionId,
    role: "user",
    content: message,
  });

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...historyMessages,
    { role: "user", content: message },
  ];

  const encoder = new TextEncoder();
  const serviceClient = createServiceClient();

  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = "";

      try {
        const completion = await groq.chat.completions.create({
          model: "llama-3.1-8b-instant",
          messages,
          stream: true,
        });

        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) {
            fullContent += text;
            controller.enqueue(encoder.encode(text));
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "AI error";
        controller.enqueue(encoder.encode(`\n\n[Error: ${errorMsg}]`));
      } finally {
        controller.close();
      }

      if (fullContent) {
        await serviceClient.from("chat_messages").insert({
          session_id: sessionId,
          role: "assistant",
          content: fullContent,
        });
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
