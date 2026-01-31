"use client";

import { useState } from "react";
import useToast from "@/components/ui/toast/useToast";
import { useConfirm } from "@/components/confirmModal/ConfirmProvider";

type ActionOptions = {
  confirm?: {
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "danger" | "warning" | "success";
  };
  successMessage?: string;
  errorMessage?: string;
};

export function useAction() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  const run = async <T>(
    actionId: string,
    action: () => Promise<T>,
    options?: ActionOptions
  ): Promise<boolean> => {
    if (loadingMap[actionId]) return false;

    try {
      if (options?.confirm) {
        const ok = await confirm(options.confirm);
        if (!ok) return false;
      }

      setLoadingMap((p) => ({ ...p, [actionId]: true }));

      await action();

      options?.successMessage &&
        showToast({
          type: "success",
          message: options.successMessage,
        });

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
      setLoadingMap((p) => ({ ...p, [actionId]: false }));
    }
  };

  const isLoading = (actionId: string) =>
    Boolean(loadingMap[actionId]);

  return { run, isLoading };
}
