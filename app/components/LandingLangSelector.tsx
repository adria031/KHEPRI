'use client'
import { LanguageSelector } from './LanguageSelector'

/** Thin client wrapper so the server-rendered landing page can embed it */
export function LandingLangSelector() {
  return (
    <LanguageSelector
      style={{
        padding: '1px 0',
      }}
    />
  )
}
