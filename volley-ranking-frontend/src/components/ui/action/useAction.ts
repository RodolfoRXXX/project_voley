
// función reusable que:

//      - maneje confirm

//      - maneje spinner

//      - maneje toast

//      - ejecute la acción

"use client";

import { useState } from "react";
import useToast from "@/components/ui/toast/useToast";
import { useConfirm } from "@/components/confirmModal/ConfirmProvider";

type ConfirmVariant = "default" | "danger";

type ActionOptions = {
  confirm?: {
    message: string;
    confirmText?: string;
    variant?: ConfirmVariant;
  };
  successMessage?: string;
  errorMessage?: string;
};

export function useAction() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(false);

  const run = async (
    action: () => Promise<void>,
    options?: ActionOptions
  ): Promise<boolean> => {
    try {
      if (options?.confirm) {
        const ok = await confirm(options.confirm);
        if (!ok) return false;
      }

      setLoading(true);

      await action();

      if (options?.successMessage) {
        showToast({
          type: "success",
          message: options.successMessage,
        });
      }

      return true;
    } catch (err: any) {
      showToast({
        type: "error",
        message:
          options?.errorMessage ||
          err?.message ||
          "Ocurrió un error",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { run, loading };
}
