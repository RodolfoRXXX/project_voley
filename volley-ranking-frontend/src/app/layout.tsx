
import { ConfirmProvider } from "@/components/confirmModal/ConfirmProvider";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast/ToastProvider";
import Navbar from "@/components/layout/Navbar";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { PersonProvider } from "@/components/providers/PersonProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" data-theme="light">
      <body
        className="h-dvh"
        style={{
          ["--font-brand" as string]: "Inter, 'Segoe UI', Roboto, Arial, sans-serif",
        }}
      >
        <AuthProvider>
          <PersonProvider>
            <ToastProvider>
              <ConfirmProvider>
                <div className="flex h-full flex-col">
                  {/* Header mobile */}
                  <Navbar />
                  <main className="flex-1 flex flex-col min-h-0">{children}</main>
                </div>
              </ConfirmProvider>
            </ToastProvider>
          </PersonProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
