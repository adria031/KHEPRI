'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import esMessages from '../../messages/es.json'
import caMessages from '../../messages/ca.json'
import enMessages from '../../messages/en.json'

export type Locale = 'es' | 'ca' | 'en'
const LOCALES: Locale[] = ['es', 'ca', 'en']
const allMessages = { es: esMessages, ca: caMessages, en: enMessages }

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'es'
  // 1. Check localStorage
  const saved = localStorage.getItem('locale') as Locale
  if (LOCALES.includes(saved)) return saved
  // 2. Check browser language
  const lang = navigator.language.toLowerCase().split('-')[0]
  if (lang === 'ca') return 'ca'
  if (lang === 'en') return 'en'
  return 'es'
}

const LocaleCtx = createContext<{ locale: Locale; setLocale: (l: Locale) => void }>({
  locale: 'es',
  setLocale: () => {},
})

export function useLocale() { return useContext(LocaleCtx) }

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('es')

  useEffect(() => {
    setLocaleState(detectLocale())
  }, [])

  function setLocale(l: Locale) {
    localStorage.setItem('locale', l)
    // Also write cookie so server can read it on next request
    document.cookie = `locale=${l};path=/;max-age=31536000;SameSite=Lax`
    setLocaleState(l)
  }

  return (
    <LocaleCtx.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider
        locale={locale}
        messages={allMessages[locale]}
        timeZone="Europe/Madrid"
        now={new Date()}
      >
        {children}
      </NextIntlClientProvider>
    </LocaleCtx.Provider>
  )
}
