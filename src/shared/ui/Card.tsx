import type { HTMLAttributes } from "react";

import { cn } from "@/shared/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-white/45 bg-white/55 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl sm:p-6 dark:border-white/10 dark:bg-slate-950/55 dark:shadow-black/20",
        className,
      )}
      {...props}
    />
  );
}
