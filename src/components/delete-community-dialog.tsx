"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

type DeleteCommunityDialogProps = {
  communityName: string;
  deleteAction: (formData: FormData) => void | Promise<void>;
};

function ConfirmDeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Deleting..." : "Yes, delete community"}
    </button>
  );
}

export default function DeleteCommunityDialog({
  communityName,
  deleteAction,
}: DeleteCommunityDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-3 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
      >
        Delete Community
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl">
            <h2 className="text-xl font-bold">Delete community?</h2>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              You are about to delete{" "}
              <span className="font-semibold text-white">
                {communityName}
              </span>
              . This action cannot be undone.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
              >
                Cancel
              </button>

              <form action={deleteAction}>
                <ConfirmDeleteButton />
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
