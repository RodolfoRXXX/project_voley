import "./globals.css";
import Navbar from "@/components/layout/Navbar";
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
          <Navbar />
          <main>{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
