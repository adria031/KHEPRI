export default function KhepriaLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#AA88FF"/>
          <stop offset="50%" stopColor="#7C3AED"/>
          <stop offset="100%" stopColor="#4FACFE"/>
        </linearGradient>
      </defs>
      <path d="M20 2L38 20L20 38L2 20Z" fill="url(#logoGrad)" opacity="0.2"/>
      <path d="M20 7L33 20L20 33L7 20Z" fill="url(#logoGrad)" opacity="0.4"/>
      <path d="M20 12L28 20L20 28L12 20Z" fill="url(#logoGrad)" opacity="0.65"/>
      <path d="M20 16L24 20L20 24L16 20Z" fill="url(#logoGrad)" opacity="0.9"/>
      <circle cx="20" cy="20" r="2.5" fill="white"/>
    </svg>
  )
}
