import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { CookieBanner } from "./components/CookieBanner";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Khepria — Gestión inteligente para negocios",
  description: "Plataforma todo-en-uno con IA para negocios de servicios",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={jakarta.variable}>
      <body>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}