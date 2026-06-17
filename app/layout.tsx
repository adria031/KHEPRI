import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { CookieBanner } from "./components/CookieBanner";
import { ThemeProvider } from "./components/ThemeProvider";
import { LocaleProvider } from "./components/LocaleProvider";
import { PWAInstallBanner } from "./components/PWAInstallBanner";
import StagingBanner from "./components/StagingBanner";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Khepria — Gestión inteligente para negocios de servicios',
  description: 'Reservas automáticas, chatbot IA 24/7, facturación española y más. Todo en una sola app para peluquerías, spas, clínicas y negocios de servicios.',
  keywords: 'reservas online, gestión negocio, chatbot IA, facturación España, peluquería, spa, clínica',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Khepria',
  },
  openGraph: {
    title: 'Khepria — Gestión inteligente para negocios de servicios',
    description: 'Reservas automáticas, chatbot IA 24/7, facturación española y más.',
    url: 'https://khepria.app',
    siteName: 'Khepria',
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Khepria — Gestión inteligente para negocios de servicios',
    description: 'Reservas automáticas, chatbot IA 24/7, facturación española y más.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={jakarta.variable}>
      <head>
        {/* Anti-flash: set dark/light class before first paint to avoid FOUC */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme')||'light';document.documentElement.classList.add(t)}catch(e){document.documentElement.classList.add('light')}})()` }} />

        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#7C3AED" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* iOS PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Khepria" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />

        {/* Viewport */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />

        {/* Service Worker registration */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .catch(function(err) { console.warn('SW registration failed:', err); });
            });
          }
        `}} />
      </head>
      <body>
        <StagingBanner />
        <LocaleProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </LocaleProvider>
        <CookieBanner />
        <PWAInstallBanner />
      </body>
    </html>
  );
}
