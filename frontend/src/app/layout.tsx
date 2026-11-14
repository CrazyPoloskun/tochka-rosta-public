import type { Metadata } from "next";
import { Onest } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/ui/toast";

const onest = Onest({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Точка Роста — Цифровая платформа",
  description: "Инновационная экосистема сервисов «Точка Роста»",
  icons: {
    icon: [
      { url: "/mini-logo.png", type: "image/png" },
    ],
    shortcut: "/mini-logo.png",
    apple: "/mini-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${onest.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground tabular-nums">
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
