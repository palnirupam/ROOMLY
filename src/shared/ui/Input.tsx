import { useId, type InputHTMLAttributes } from "react";

import { cn } from "@/shared/lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string | undefined;
  label?: string | undefined;
};

export function Input({ className, error, id, label, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <label className={cn("block", className)} htmlFor={inputId}>
      {label ? (
        <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </span>
      ) : null}
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? "true" : undefined}
        className="h-12 w-full rounded-2xl border border-white/50 bg-white/60 px-4 text-base text-slate-950 transition outline-none placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-500"
        id={inputId}
        {...props}
      />
      {error ? (
        <span
          className="mt-2 block text-sm text-rose-600 dark:text-rose-300"
          id={errorId}
          role="alert"
        >
          {error}
        </span>
      ) : null}
    </label>
  );
}
