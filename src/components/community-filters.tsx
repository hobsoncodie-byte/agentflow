"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function CommunityFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("q") ?? "";
  const currentVisibility = searchParams.get("visibility") ?? "all";

  const [search, setSearch] = useState(currentSearch);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (search.trim()) {
        params.set("q", search.trim());
      } else {
        params.delete("q");
      }

      const queryString = params.toString();
      router.replace(
        queryString ? `/communities?${queryString}` : "/communities"
      );
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, router, searchParams]);

  function handleVisibilityChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value === "all") {
      params.delete("visibility");
    } else {
      params.set("visibility", value);
    }

    const queryString = params.toString();
    router.replace(queryString ? `/communities?${queryString}` : "/communities");
  }

  function clearFilters() {
    setSearch("");
    router.replace("/communities");
  }

  const hasFilters = currentSearch || currentVisibility !== "all";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="grid gap-4 md:grid-cols-[1fr_180px_auto]">
        <div>
          <label
            htmlFor="community-search"
            className="mb-2 block text-sm font-medium text-slate-200"
          >
            Search communities
          </label>
          <input
            id="community-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, slug, or description..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500"
          />
        </div>

        <div>
          <label
            htmlFor="community-visibility"
            className="mb-2 block text-sm font-medium text-slate-200"
          >
            Visibility
          </label>
          <select
            id="community-visibility"
            value={currentVisibility}
            onChange={(e) => handleVisibilityChange(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
          >
            <option value="all">All</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasFilters}
            className="w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
