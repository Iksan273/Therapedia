import { cn } from "@/shared/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("skeleton-shimmer rounded-md bg-slate-200/70", className)}
      {...props} />
  );
}

export { Skeleton }
