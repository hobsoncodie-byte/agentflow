import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-950">
            AF
          </div>
          <span className="text-lg font-semibold tracking-tight">AgentFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            Get started
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-6 pb-24 pt-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-1.5 text-sm text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Now in beta
        </div>

        <h1 className="mt-8 text-5xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl">
          Build your private
          <br />
          <span className="text-slate-400">community product</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
          AgentFlow gives you everything you need to create and manage private
          communities — spaces, members, posts, and access control, all in one place.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            Create your first community
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-slate-700 px-6 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Private spaces",
              body: "Create communities with controlled visibility. Invite members and manage access roles.",
            },
            {
              title: "Updates feed",
              body: "Post updates inside your spaces. Members see everything in one clean feed.",
            },
            {
              title: "Member management",
              body: "Assign admin and member roles. Stay in control of who can see and contribute.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-400">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
