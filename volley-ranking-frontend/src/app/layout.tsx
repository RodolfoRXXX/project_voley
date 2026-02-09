
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
      <body className="h-screen overflow-hidden">
        <ToastProvider>
            <ConfirmProvider>
              <div className="h-full flex flex-col">
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
