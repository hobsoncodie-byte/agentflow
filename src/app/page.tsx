import Link from "next/link";
import { Users, MessagesSquare, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const features = [
  {
    icon: ShieldCheck,
    title: "Private spaces",
    body: "Create communities with controlled visibility. Invite members and manage access roles.",
  },
  {
    icon: MessagesSquare,
    title: "Updates feed",
    body: "Post updates inside your spaces. Members see everything in one clean, flowing feed.",
  },
  {
    icon: Users,
    title: "Member management",
    body: "Assign admin and member roles. Stay in control of who can see and contribute.",
  },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-flow-a absolute -left-32 -top-32 h-[32rem] w-[32rem] rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="animate-flow-b absolute right-[-10rem] top-1/4 h-[28rem] w-[28rem] rounded-full bg-violet-500/20 blur-3xl" />
        <div className="animate-flow-a absolute bottom-[-12rem] left-1/3 h-[26rem] w-[26rem] rounded-full bg-blue-500/15 blur-3xl" />
      </div>

      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 text-sm font-bold text-slate-950">
            FZ
          </div>
          <span className="text-lg font-semibold tracking-tight">Flownz</span>
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

      <section className="mx-auto max-w-4xl px-6 pb-16 pt-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-4 py-1.5 text-sm text-slate-300 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Now in beta
        </div>

        <h1 className="mt-8 text-5xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl">
          Where your community
          <br />
          <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 bg-clip-text text-transparent">
            flows
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
          Flownz gives you everything you need to create and manage private
          communities — spaces, members, posts, and access control, all in one place.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.03] hover:bg-slate-200"
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

      <div className="mx-auto -mt-2 mb-4 max-w-6xl px-6" aria-hidden="true">
        <svg viewBox="0 0 1200 60" className="h-10 w-full text-slate-700/60" fill="none">
          <path
            d="M0 30 C 150 0, 300 60, 450 30 S 750 0, 900 30 S 1100 60, 1200 30"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="8 10"
            className="animate-flow-dash"
          />
        </svg>
      </div>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delayMs={index * 120}>
              <div className="group h-full rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:-translate-y-1 hover:border-cyan-500/40 hover:shadow-[0_0_40px_-15px_rgba(34,211,238,0.35)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-cyan-300 transition group-hover:bg-cyan-500/10">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-400">{feature.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-800/80 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-sm text-slate-500 sm:flex-row">
          <span>© {new Date().getFullYear()} Flownz</span>
          <span>Built for communities that move.</span>
        </div>
      </footer>
    </main>
  );
}
