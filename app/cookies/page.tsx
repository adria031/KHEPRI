import { LegalLayout } from '../components/LegalLayout'

export const metadata = { title: 'Política de Cookies — Khepria' }

export default function Cookies() {
  return (
    <LegalLayout title="Política de Cookies" updated="19 de abril de 2025">

      <div className="lg-section">
        <h2>1. ¿Qué son las cookies?</h2>
        <p>Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas un sitio web. Permiten que el sitio recuerde tus preferencias, mantengas la sesión iniciada y mejore tu experiencia de uso.</p>
        <p>Khepria utiliza cookies propias y de terceros. Puedes gestionar tus preferencias en cualquier momento desde el banner de cookies o desde los ajustes de tu navegador.</p>
      </div>

      <div className="lg-section">
        <h2>2. Tipos de cookies que utilizamos</h2>

        <h3>Cookies estrictamente necesarias</h3>
        <p>Son imprescindibles para que el sitio funcione correctamente. No requieren tu consentimiento.</p>
        <div className="lg-box">
          <div className="lg-box-title">sb-session (Supabase Auth)</div>
          <p>Mantiene tu sesión iniciada en Khepria. Duración: sesión / 7 días.</p>
        </div>
        <div className="lg-box">
          <div className="lg-box-title">khepria_cookies_consent</div>
          <p>Guarda tus preferencias sobre cookies para no volver a mostrarte el banner. Duración: 1 año. Almacenada en localStorage.</p>
        </div>
        <div className="lg-box">
          <div className="lg-box-title">khepria_negocio_activo</div>
          <p>Recuerda el negocio activo seleccionado en el dashboard. Duración: sesión. Almacenada en localStorage.</p>
        </div>

        <h3>Cookies analíticas</h3>
        <p>Nos ayudan a entender cómo se usa Khepria para mejorar el servicio. Solo se activan si das tu consentimiento.</p>
        <div className="lg-box">
          <div className="lg-box-title">Vercel Analytics</div>
          <p>Métricas de rendimiento y visitas agregadas, sin identificar usuarios individuales. Proveedor: Vercel Inc.</p>
        </div>

        <h3>Cookies de funcionalidad</h3>
        <p>Recuerdan tus preferencias para ofrecerte una experiencia personalizada. Solo se activan con tu consentimiento.</p>
        <div className="lg-box">
          <div className="lg-box-title">Preferencias de UI</div>
          <p>Guardan ajustes de interfaz como tema o filtros seleccionados. Duración: 30 días.</p>
        </div>
      </div>

      <div className="lg-section">
        <h2>3. Cookies de terceros</h2>
        <p>Algunos servicios integrados en Khepria pueden instalar sus propias cookies:</p>
        <ul>
          <li><strong>Supabase</strong> — autenticación y base de datos. <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">Política de privacidad</a></li>
          <li><strong>Vercel</strong> — hosting y CDN. <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">Política de privacidad</a></li>
          <li><strong>Google Fonts</strong> — tipografía. <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Política de privacidad</a></li>
        </ul>
        <p>Khepria no tiene control sobre las cookies instaladas por terceros. Te recomendamos revisar sus políticas de privacidad.</p>
      </div>

      <div className="lg-section">
        <h2>4. Gestión de cookies</h2>
        <h3>Desde Khepria</h3>
        <p>Puedes cambiar tus preferencias en cualquier momento haciendo clic en el enlace «Configurar cookies» que aparece en el pie de página o en el banner de cookies.</p>
        <h3>Desde tu navegador</h3>
        <p>Todos los navegadores modernos permiten gestionar, bloquear y eliminar cookies:</p>
        <ul>
          <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noreferrer">Google Chrome</a></li>
          <li><a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web" target="_blank" rel="noreferrer">Mozilla Firefox</a></li>
          <li><a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noreferrer">Safari</a></li>
          <li><a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406" target="_blank" rel="noreferrer">Microsoft Edge</a></li>
        </ul>
        <p>Ten en cuenta que bloquear las cookies necesarias puede afectar al funcionamiento del servicio.</p>
      </div>

      <div className="lg-section">
        <h2>5. Actualizaciones de esta política</h2>
        <p>Podemos actualizar esta política de cookies cuando añadamos nuevas funcionalidades o cambiemos los proveedores que utilizamos. La fecha de la última actualización siempre estará indicada al inicio del documento.</p>
        <p>Para cualquier consulta sobre cookies puedes escribirnos a <a href="mailto:privacidad@khepria.app">privacidad@khepria.app</a>.</p>
      </div>

    </LegalLayout>
  )
}
