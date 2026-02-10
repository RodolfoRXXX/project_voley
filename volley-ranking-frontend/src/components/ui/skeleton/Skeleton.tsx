
// -------------------
// Skeleton Styles
// -------------------

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={`animate-pulse bg-neutral-200 rounded ${className}`}
    />
  );
}

export function SkeletonSoft({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={`animate-pulse bg-neutral-100 rounded ${className}`}
    />
  );
}
