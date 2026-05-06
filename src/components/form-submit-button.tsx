"use client";

import { useFormStatus } from "react-dom";

type FormSubmitButtonProps = {
  idleText: string;
  loadingText: string;
};

export default function FormSubmitButton({
  idleText,
  loadingText,
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? loadingText : idleText}
    </button>
  );
}
