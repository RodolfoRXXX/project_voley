import "./globals.css";

import { ConfirmProvider } from "@/components/confirmModal/ConfirmProvider";
import { ToastProvider } from "@/components/ui/toast/ToastProvider";

export default function Iux07BrowserLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="light">
      <body className="h-dvh">
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
