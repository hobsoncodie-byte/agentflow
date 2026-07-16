import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-flow-a absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="animate-flow-b absolute -bottom-32 right-[-8rem] h-[24rem] w-[24rem] rounded-full bg-violet-500/20 blur-3xl" />
      </div>

      <Link href="/" className="absolute left-6 top-6 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 text-sm font-bold text-slate-950">
          FZ
        </div>
        <span className="text-lg font-semibold tracking-tight">Flownz</span>
      </Link>

      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
