import { StatusVariant } from "@/components/ui/status/StatusPill";

export const playerStatusMap: Record<
  "titular" | "suplente" | "pendiente" | "eliminado",
  { label: string; variant: StatusVariant }
> = {
  titular: {
    label: "Titular",
    variant: "success",
  },
  suplente: {
    label: "Suplente",
    variant: "info",
  },
  pendiente: {
    label: "Pendiente",
    variant: "warning",
  },
  eliminado: {
    label: "Canceló",
    variant: "danger",
  },
};
