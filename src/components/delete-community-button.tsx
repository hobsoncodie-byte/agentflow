"use client";

import { useFormStatus } from "react-dom";

function DeleteButtonInner() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Deleting..." : "Delete Community"}
    </button>
  );
}

export default function DeleteCommunityButton() {
  return <DeleteButtonInner />;
}
