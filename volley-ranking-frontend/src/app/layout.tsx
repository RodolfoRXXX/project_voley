
import { ConfirmProvider } from "@/components/confirmModal/ConfirmProvider";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast/ToastProvider";
import Navbar from "@/components/layout/Navbar";
import { Outfit, Arizonia } from "next/font/google";

export const outfit = Outfit({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-outfit",
});

export const arizonia = Arizonia({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-arizonia",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" data-theme="light">
      <body className={`h-screen overflow-hidden ${outfit.variable} ${arizonia.variable}`}>
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
