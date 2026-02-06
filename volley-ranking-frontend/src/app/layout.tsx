
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
              <div className="min-h-screen flex flex-col">
                {/* Header mobile */}
                <Navbar />
                <main className="flex-1 flex flex-col min-h-0">{children}</main>
              </div>
            </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
