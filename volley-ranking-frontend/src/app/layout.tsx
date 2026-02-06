
import { ConfirmProvider } from "@/components/confirmModal/ConfirmProvider";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast/ToastProvider";
import Navbar from "@/components/layout/Navbar";

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
              {/* Header mobile */}
              <Navbar />
              <main>{children}</main>
            </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
