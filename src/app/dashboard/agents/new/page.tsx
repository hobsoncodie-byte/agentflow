"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewAgentPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      router.push("/login");
      return;
    }

    const { error: insertError } = await supabase.from("agents").insert({
      user_id: user.id,
      name: name.trim(),
      description: description.trim() || null,
      system_prompt: systemPrompt.trim(),
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push("/dashboard/agents");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border bg-background shadow-sm">
        <div className="relative p-6 sm:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-muted/60 via-background to-background" />
          <div className="relative space-y-3">
            <Link
              href="/dashboard/agents"
              className="inline-flex items-center text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              ← Back to agents
            </Link>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Create Agent
            </h1>
            <p className="text-sm leading-6 text-muted-foreground sm:text-base">
              Define your agent&apos;s personality and behaviour with a system
              prompt, then deploy it to communities.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-background p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Agent name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Support Bot, Onboarding Guide"
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
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short summary of what this agent does"
              className="w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="system_prompt" className="text-sm font-medium">
              System prompt
            </label>
            <p className="text-xs text-muted-foreground">
              This is the instruction given to the AI at the start of every
              conversation. Be specific about tone, role, and any constraints.
            </p>
            <textarea
              id="system_prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful assistant for this community. Your role is to..."
              required
              rows={10}
              className="w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground"
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
            >
              {loading ? "Creating..." : "Create agent"}
            </button>
            <Link
              href="/dashboard/agents"
              className="inline-flex items-center justify-center rounded-xl border px-5 py-2.5 text-sm font-medium transition hover:bg-muted"
            >
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
