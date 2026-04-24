import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { CookieBanner } from "./components/CookieBanner";
import { ThemeProvider } from "./components/ThemeProvider";

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
      <head>
        {/* Anti-flash: set dark class before first paint */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(!t)t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';document.documentElement.classList.add(t)}catch(e){}})()` }} />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <CookieBanner />
      </body>
    </html>
  );
}