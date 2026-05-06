import SkeletonBlock from "@/components/skeleton-block";

export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="mt-3 h-10 w-64" />
            <SkeletonBlock className="mt-3 h-4 w-80 max-w-full" />
          </div>

          <div className="flex gap-3">
            <SkeletonBlock className="h-10 w-36" />
            <SkeletonBlock className="h-10 w-36" />
            <SkeletonBlock className="h-10 w-24" />
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <SkeletonBlock className="h-28 w-full rounded-2xl" />
          <SkeletonBlock className="h-28 w-full rounded-2xl" />
          <SkeletonBlock className="h-28 w-full rounded-2xl" />
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <SkeletonBlock className="h-7 w-52" />
              <SkeletonBlock className="h-4 w-16" />
            </div>

            <div className="space-y-3">
              <SkeletonBlock className="h-24 w-full rounded-xl" />
              <SkeletonBlock className="h-24 w-full rounded-xl" />
              <SkeletonBlock className="h-24 w-full rounded-xl" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <SkeletonBlock className="h-7 w-36" />
            <SkeletonBlock className="mt-3 h-4 w-44" />

            <div className="mt-5 space-y-3">
              <SkeletonBlock className="h-12 w-full" />
              <SkeletonBlock className="h-12 w-full" />
              <SkeletonBlock className="h-12 w-full" />
            </div>

            <SkeletonBlock className="mt-6 h-20 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </main>
  );
}
