import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function UserNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-slate-500">{user?.email}</span>
      <Link href="/logout" className="rounded-2xl bg-slate-900 px-3 py-2 text-white">
        Log out
      </Link>
    </div>
  );
}
