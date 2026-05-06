import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={`rounded-xl bg-zinc-900 px-4 py-3 text-white transition hover:bg-zinc-800 disabled:opacity-60 ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
