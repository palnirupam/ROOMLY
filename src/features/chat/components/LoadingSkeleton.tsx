import { memo } from "react";

import { Skeleton } from "@/shared/ui/Skeleton";

function LoadingSkeletonComponent() {
  return (
    <div
      aria-label="Loading messages"
      className="flex min-h-full flex-col justify-end gap-3 overflow-hidden"
      role="status"
    >
      <Skeleton className="h-16 w-4/5 rounded-[1.35rem]" />
      <Skeleton className="ml-auto h-14 w-2/3 rounded-[1.35rem]" />
      <Skeleton className="h-20 w-5/6 rounded-[1.35rem]" />
      <Skeleton className="ml-auto h-12 w-1/2 rounded-[1.35rem]" />
    </div>
  );
}

export const LoadingSkeleton = memo(LoadingSkeletonComponent);
