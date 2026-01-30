"use client";

import { createContext, useContext, useState } from "react";
import ConfirmModal from "./ConfirmModal";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger";
};

type ConfirmContextType = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] =
    useState<((value: boolean) => void) | null>(null);

  const confirm = (options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState(options);
      setResolver(() => resolve);
    });
  };

  const handleClose = (result: boolean) => {
    resolver?.(result);
    setState(null);
    setResolver(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {state && (
        <ConfirmModal
          {...state}
          onConfirm={() => handleClose(true)}
          onCancel={() => handleClose(false)}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm debe usarse dentro de ConfirmProvider");
  }
  return ctx;
}
