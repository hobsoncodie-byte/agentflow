"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function makeSlug(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function CreateCommunityPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreateCommunity(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const slug = makeSlug(name);

    if (!slug) {
      setLoading(false);
      setError("Please enter a valid community name.");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setError("You need to be logged in first.");
      router.push("/login");
      return;
    }

    const { error: insertError } = await supabase.from("communities").insert({
      user_id: user.id,
      name,
      slug,
      description,
      category,
      visibility,
      is_private: visibility !== "public",
    });

    setLoading(false);

    if (insertError) {
      if (insertError.message.toLowerCase().includes("duplicate")) {
        setError("That community name is already taken. Try a different one.");
        return;
      }

      setError(insertError.message);
      return;
    }

    router.push("/communities");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Create Community</h1>
            <p className="mt-2 text-white/70">
              Set up a new community in your AgentFlow app.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl">
          <form onSubmit={handleCreateCommunity} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm text-white/80">
                Community Name
              </label>
              <input
                type="text"
                placeholder="e.g. AgentFlow Founders"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-white/30"
              />
              <p className="mt-2 text-xs text-white/50">
                Slug preview: {makeSlug(name) || "your-community-name"}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/80">
                Description
              </label>
              <textarea
                placeholder="What is this community about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-white/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/80">
                Category
              </label>
              <input
                type="text"
                placeholder="e.g. Startups, Creators, SaaS"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-white/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/80">
                Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-white/30"
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </div>

            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create Community"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
