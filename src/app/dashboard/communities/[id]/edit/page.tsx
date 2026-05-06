import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type CommunityRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  visibility: string;
  user_id: string;
};

export default async function EditCommunityPage({
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

  const { data: community, error } = await supabase
    .from("communities")
    .select("id, name, slug, description, visibility, user_id")
    .eq("id", id)
    .single();

  if (error || !community) notFound();

  const typedCommunity = community as CommunityRow;

  if (typedCommunity.user_id !== user.id) {
    redirect(`/dashboard/communities/${id}`);
  }

  async function updateCommunity(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const visibility = String(formData.get("visibility") ?? "private");
    const isPrivate = visibility !== "public";

    if (!name) redirect(`/dashboard/communities/${id}/edit`);

    const newSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    const { error } = await supabase
      .from("communities")
      .update({
        name,
        slug: newSlug,
        description: description || null,
        visibility,
        is_private: isPrivate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/communities/${id}`);
    redirect(`/dashboard/communities/${id}`);
  }

  async function deleteCommunity() {
    "use server";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { error } = await supabase
      .from("communities")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);

    redirect("/dashboard/communities");
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Edit Space
                </h1>
                <p className="text-sm text-muted-foreground">
                  Update the details for{" "}
                  <span className="font-medium text-foreground">
                    {typedCommunity.name}
                  </span>
                  .
                </p>
              </div>
              <form action={deleteCommunity}>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  Delete space
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-background p-6 shadow-sm">
        <form action={updateCommunity} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Community name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={typedCommunity.name}
              required
              className="w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Changing the name will also update the URL slug.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              defaultValue={typedCommunity.description ?? ""}
              rows={4}
              className="w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="visibility" className="text-sm font-medium">
              Visibility
            </label>
            <select
              id="visibility"
              name="visibility"
              defaultValue={typedCommunity.visibility}
              className="w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-foreground"
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-black"
            >
              Save changes
            </button>
            <Link
              href={`/dashboard/communities/${id}`}
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
