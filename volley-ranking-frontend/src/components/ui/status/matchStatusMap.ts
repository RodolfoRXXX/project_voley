import { StatusVariant } from "@/components/ui/status/StatusPill";

export const matchStatusMap: Record<
  string,
  { label: string; variant: StatusVariant; icon: string }
> = {
  abierto: {
    label: "Abierto",
    variant: "info",
    icon: "🟢",
  },
  verificando: {
    label: "Verificando",
    variant: "warning",
    icon: "✔️",
  },
  cerrado: {
    label: "Cerrado",
    variant: "neutral",
    icon: "🔒",
  },
  cancelado: {
    label: "Cancelado",
    variant: "danger",
    icon: "❌",
  },
  jugado: {
    label: "Jugado",
    variant: "success",
    icon: "✅",
  },
};
