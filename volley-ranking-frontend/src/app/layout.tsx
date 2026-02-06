
import { ConfirmProvider } from "@/components/confirmModal/ConfirmProvider";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast/ToastProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <ToastProvider>
            <ConfirmProvider>
              <main>{children}</main>
            </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
