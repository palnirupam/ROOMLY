import type { HTMLAttributes } from "react";

import { cn } from "@/shared/lib/cn";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-white/45 dark:bg-white/10",
        className,
      )}
      {...props}
    />
  );
}
