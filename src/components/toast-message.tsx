"use client";

import { useEffect, useState } from "react";

type ToastMessageProps = {
  message: string;
  type?: "success" | "error";
};

export default function ToastMessage({
  message,
  type = "success",
}: ToastMessageProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  if (!visible || !message) {
    return null;
  }

  const isSuccess = type === "success";

  return (
    <div className="fixed right-4 top-4 z-50 w-full max-w-sm">
      <div
        className={`rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur ${
          isSuccess
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
            : "border-red-500/30 bg-red-500/10 text-red-200"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              {isSuccess ? "Success" : "Error"}
            </p>
            <p className="mt-1 text-sm leading-6">{message}</p>
          </div>

          <button
            type="button"
            onClick={() => setVisible(false)}
            className="text-xs font-medium opacity-80 transition hover:opacity-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
