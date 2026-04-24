'use client'
import { useLocale, type Locale } from './LocaleProvider'

const LANGS: { code: Locale; label: string; full: string }[] = [
  { code: 'es', label: 'ES', full: 'Español' },
  { code: 'ca', label: 'CA', full: 'Català' },
  { code: 'en', label: 'EN', full: 'English' },
]

interface Props {
  /** 'pill' = button group (default), 'select' = native <select> for compact spaces */
  variant?: 'pill' | 'select'
  /** additional wrapper style */
  style?: React.CSSProperties
}

export function LanguageSelector({ variant = 'pill', style }: Props) {
  const { locale, setLocale } = useLocale()

  if (variant === 'select') {
    return (
      <select
        value={locale}
        onChange={e => setLocale(e.target.value as Locale)}
        aria-label="Idioma / Language"
        style={{
          padding: '5px 8px',
          borderRadius: '8px',
          border: '1.5px solid rgba(0,0,0,0.1)',
          background: 'transparent',
          fontFamily: 'inherit',
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer',
          color: 'inherit',
          ...style,
        }}
      >
        {LANGS.map(l => (
          <option key={l.code} value={l.code}>{l.label} – {l.full}</option>
        ))}
      </select>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center', ...style }}>
      {LANGS.map(l => (
        <button
          key={l.code}
          onClick={() => setLocale(l.code)}
          title={l.full}
          aria-pressed={locale === l.code}
          style={{
            padding: '5px 8px',
            borderRadius: '7px',
            border: '1.5px solid',
            borderColor: locale === l.code ? 'rgba(99,102,241,0.6)' : 'rgba(0,0,0,0.1)',
            background: locale === l.code ? 'rgba(99,102,241,0.08)' : 'transparent',
            fontFamily: 'inherit',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.3px',
            opacity: locale === l.code ? 1 : 0.55,
            color: locale === l.code ? '#6366F1' : 'inherit',
            transition: 'all 0.15s',
          }}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
