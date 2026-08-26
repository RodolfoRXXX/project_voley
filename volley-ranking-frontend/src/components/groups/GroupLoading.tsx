import { Skeleton, SkeletonSoft } from "@/components/ui/skeleton/Skeleton";

export function GroupLoading({ label = "Cargando Grupos" }: { label?: string }) {
  return (
    <div aria-busy="true" aria-label={label} className="space-y-4">
      <Skeleton className="h-24 rounded-xl" />
      <SkeletonSoft className="h-24 rounded-xl" />
    </div>
  );
}
