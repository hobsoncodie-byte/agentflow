import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type CommunityRow = {
  id: string;
  name: string;
  user_id: string;
};

type MembershipRow = {
  id: string;
  user_id: string;
  role: "admin" | "member";
  created_at: string;
};

type InviteRow = {
  id: string;
  invited_email: string;
  role: "admin" | "member";
  status: "pending" | "accepted" | "revoked";
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRelativeDate(value: string) {
  const date = new Date(value).getTime();
  const now = Date.now();
  const diff = date - now;
  const day = 1000 * 60 * 60 * 24;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const days = Math.round(diff / day);

  if (Math.abs(days) < 1) return "Today";
  if (Math.abs(days) < 30) return rtf.format(days, "day");

  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return rtf.format(months, "month");

  const years = Math.round(months / 12);
  return rtf.format(years, "year");
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border bg-background p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{hint}</div>
    </div>
  );
}

function RoleBadge({ role }: { role: "owner" | "admin" | "member" }) {
  if (role === "owner") {
    return (
      <span className="inline-flex rounded-full bg-black px-2.5 py-1 text-xs font-medium text-white dark:bg-white dark:text-black">
        Owner
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium">
      {role === "admin" ? "Admin" : "Member"}
    </span>
  );
}

export default async function CommunityMembersPage({
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

  const { data: community, error: communityError } = await supabase
    .from("communities")
    .select("id, name, user_id")
    .eq("id", id)
    .single();

  if (communityError || !community) {
    notFound();
  }

  const typedCommunity = community as CommunityRow;

  const { data: membership } = await supabase
    .from("community_members")
    .select("id, role")
    .eq("community_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const userMembership = membership as { id: string; role: "admin" | "member" } | null;

  const isOwner = typedCommunity.user_id === user.id;
  const isAdmin = userMembership?.role === "admin";
  const canManage = isOwner || isAdmin;

  if (!canManage) {
    redirect(`/dashboard/communities/${id}`);
  }

  const { data: members, error: membersError } = await supabase
    .from("community_members")
    .select("id, user_id, role, created_at")
    .eq("community_id", id)
    .order("created_at", { ascending: true });

  if (membersError) {
    throw new Error(membersError.message);
  }

  const typedMembers: MembershipRow[] = (members as MembershipRow[] | null) ?? [];

  const { data: invites, error: invitesError } = await supabase
    .from("community_invites")
    .select("id, invited_email, role, status, created_at")
    .eq("community_id", id)
    .order("created_at", { ascending: false });

  if (invitesError) {
    throw new Error(invitesError.message);
  }

  const typedInvites: InviteRow[] = (invites as InviteRow[] | null) ?? [];

  const pendingInviteCount = typedInvites.filter(
    (invite) => invite.status === "pending"
  ).length;

  const adminCount =
    (isOwner ? 1 : 0) +
    typedMembers.filter((member) => member.role === "admin").length;

  const totalPeople = 1 + typedMembers.length;

  async function inviteMember(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const invitedEmail = String(formData.get("invited_email") ?? "")
      .trim()
      .toLowerCase();
    const roleValue = String(formData.get("role") ?? "member").trim();
    const role = roleValue === "admin" ? "admin" : "member";

    if (!invitedEmail) {
      redirect(`/dashboard/communities/${id}/members`);
    }

    const { error } = await supabase.from("community_invites").insert({
      community_id: id,
      invited_email: invitedEmail,
      invited_by: user.id,
      role,
      status: "pending",
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(`/dashboard/communities/${id}/members`);
    redirect(`/dashboard/communities/${id}/members`);
  }

  async function revokeInvite(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const inviteId = String(formData.get("invite_id") ?? "");

    if (!inviteId) {
      redirect(`/dashboard/communities/${id}/members`);
    }

    const { error } = await supabase
      .from("community_invites")
      .update({ status: "revoked" })
      .eq("id", inviteId)
      .eq("community_id", id);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(`/dashboard/communities/${id}/members`);
    redirect(`/dashboard/communities/${id}/members`);
  }

  async function changeRole(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const memberId = String(formData.get("member_id") ?? "");
    const nextRoleRaw = String(formData.get("next_role") ?? "member");
    const nextRole = nextRoleRaw === "admin" ? "admin" : "member";

    if (!memberId) {
      redirect(`/dashboard/communities/${id}/members`);
    }

    const { error } = await supabase
      .from("community_members")
      .update({ role: nextRole })
      .eq("id", memberId)
      .eq("community_id", id);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(`/dashboard/communities/${id}/members`);
    redirect(`/dashboard/communities/${id}/members`);
  }

  async function removeMember(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const memberId = String(formData.get("member_id") ?? "");
    const memberUserId = String(formData.get("member_user_id") ?? "");

    if (!memberId || !memberUserId) {
      redirect(`/dashboard/communities/${id}/members`);
    }

    if (memberUserId === typedCommunity.user_id) {
      redirect(`/dashboard/communities/${id}/members`);
    }

    const { error } = await supabase
      .from("community_members")
      .delete()
      .eq("id", memberId)
      .eq("community_id", id);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(`/dashboard/communities/${id}/members`);
    redirect(`/dashboard/communities/${id}/members`);
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border bg-background shadow-sm">
        <div className="relative p-6 sm:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-muted/60 via-background to-background" />

          <div className="relative space-y-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl space-y-4">
                <Link
                  href={`/dashboard/communities/${id}`}
                  className="inline-flex items-center text-sm font-medium text-muted-foreground transition hover:text-foreground"
                >
                  ← Back to space
                </Link>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    Access control
                  </span>
                  <RoleBadge role={isOwner ? "owner" : isAdmin ? "admin" : "member"} />
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Manage Members
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                    Invite people into{" "}
                    <span className="font-medium text-foreground">
                      {typedCommunity.name}
                    </span>
                    , review pending access, and control who can manage this space.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/dashboard/communities/${id}`}
                  className="inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
                >
                  View Space
                </Link>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                label="People inside"
                value={totalPeople}
                hint="Owner plus accepted members"
              />
              <StatCard
                label="Pending invites"
                value={pendingInviteCount}
                hint="Invitations waiting to be accepted"
              />
              <StatCard
                label="Admins"
                value={adminCount}
                hint="People who can help manage this space"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border bg-background p-6 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Invite a member</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Add someone by email so they can join this private space later.
              </p>
            </div>

            <form action={inviteMember} className="mt-5 space-y-4">
              <div className="space-y-2">
                <label htmlFor="invited_email" className="text-sm font-medium">
                  Email address
                </label>
                <input
                  id="invited_email"
                  name="invited_email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="role" className="text-sm font-medium">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  defaultValue="member"
                  className="w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-foreground"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-black"
              >
                Send invite
              </button>
            </form>
          </section>

          <section className="rounded-3xl border bg-background p-6 shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Pending invites</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Invitations that have been sent out for this space.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {typedInvites.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                  No invites yet.
                </div>
              ) : (
                typedInvites.map((invite) => (
                  <div key={invite.id} className="rounded-2xl border p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium">{invite.invited_email}</div>
                          <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium">
                            {invite.role === "admin" ? "Admin invite" : "Member invite"}
                          </span>
                          <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            {invite.status}
                          </span>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          Sent {formatDate(invite.created_at)} • {formatRelativeDate(invite.created_at)}
                        </div>
                      </div>

                      {invite.status === "pending" && (
                        <form action={revokeInvite}>
                          <input type="hidden" name="invite_id" value={invite.id} />
                          <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-muted"
                          >
                            Revoke
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-3xl border bg-background p-6 shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Current members</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Owner stays in control. Admins can help manage the space.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium">You</div>
                      <RoleBadge role="owner" />
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Space owner with full control.
                    </div>
                  </div>

                  <span className="inline-flex rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
                    Protected
                  </span>
                </div>
              </div>

              {typedMembers.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                  No extra members yet.
                </div>
              ) : (
                typedMembers.map((member) => {
                  const isSelf = member.user_id === user.id;
                  const canEditMember = !isSelf;

                  return (
                    <div key={member.id} className="rounded-2xl border p-4">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-medium">
                              {isSelf ? "You" : member.user_id}
                            </div>
                            <RoleBadge role={member.role} />
                          </div>

                          <div className="text-sm text-muted-foreground">
                            Joined {formatDate(member.created_at)} •{" "}
                            {formatRelativeDate(member.created_at)}
                          </div>
                        </div>

                        {canEditMember ? (
                          <div className="flex flex-wrap gap-2">
                            <form action={changeRole}>
                              <input type="hidden" name="member_id" value={member.id} />
                              <input
                                type="hidden"
                                name="next_role"
                                value={member.role === "admin" ? "member" : "admin"}
                              />
                              <button
                                type="submit"
                                className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-muted"
                              >
                                Make {member.role === "admin" ? "Member" : "Admin"}
                              </button>
                            </form>

                            <form action={removeMember}>
                              <input type="hidden" name="member_id" value={member.id} />
                              <input
                                type="hidden"
                                name="member_user_id"
                                value={member.user_id}
                              />
                              <button
                                type="submit"
                                className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-muted"
                              >
                                Remove
                              </button>
                            </form>
                          </div>
                        ) : (
                          <span className="inline-flex rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
                            Your account
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-3xl border bg-background p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight">How this works</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              <p>
                Invite people by email, choose whether they should join as a member or
                admin, and review every pending invite in one place.
              </p>
              <p>
                Members can be promoted, downgraded, or removed later. The space owner
                always keeps full control.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
