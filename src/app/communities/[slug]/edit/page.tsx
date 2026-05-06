import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CommunitySlugEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: community } = await supabase
    .from("communities")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!community) notFound();

  redirect(`/dashboard/communities/${community.id}/edit`);
}
