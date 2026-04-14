import { Spinner } from "@/components/ui/spinner/spinner";

export default function AdminLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600 shadow-sm">
        <Spinner size="md" className="text-neutral-700" />
        Cargando vista de administración...
      </div>
    </div>
  );
}
