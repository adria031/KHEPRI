import { LegalLayout } from '../components/LegalLayout'

export const metadata = { title: 'Aviso Legal — Khepria' }

export default function AvisoLegal() {
  return (
    <LegalLayout title="Aviso Legal" updated="19 de abril de 2025">

      <div className="lg-section">
        <h2>1. Datos identificativos del titular</h2>
        <p>En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se facilitan los datos identificativos del titular del sitio web:</p>
        <div className="lg-box">
          <div className="lg-box-title">Titular</div>
          <p>
            <strong>Nombre comercial:</strong> Khepria<br/>
            <strong>Correo electrónico:</strong> <a href="mailto:hola@khepria.app">hola@khepria.app</a><br/>
            <strong>País:</strong> España<br/>
            <strong>Sitio web:</strong> <a href="https://khepria.app">https://khepria.app</a>
          </p>
        </div>
      </div>

      <div className="lg-section">
        <h2>2. Objeto</h2>
        <p>El presente aviso legal regula el acceso y utilización del sitio web Khepria, disponible en la dirección <a href="https://khepria.app">khepria.app</a> y sus subdominios.</p>
        <p>El acceso al sitio web implica la aceptación plena del presente aviso legal. Si no estás de acuerdo con su contenido, debes abstenerte de acceder o usar el sitio.</p>
      </div>

      <div className="lg-section">
        <h2>3. Propiedad intelectual e industrial</h2>
        <p>Todos los contenidos del sitio web Khepria —incluyendo, sin carácter limitativo, textos, fotografías, gráficos, imágenes, iconos, tecnología, software, código fuente, diseño gráfico, marca y logotipo— son propiedad de Khepria o de terceros que han autorizado su uso, y están protegidos por los derechos de propiedad intelectual e industrial reconocidos por la legislación española e internacional aplicable.</p>
        <p>Queda prohibida la reproducción, distribución, comunicación pública o transformación de dichos contenidos sin la autorización expresa y por escrito de Khepria, salvo para uso personal y privado.</p>
      </div>

      <div className="lg-section">
        <h2>4. Condiciones de acceso y uso</h2>
        <p>El acceso al sitio web es gratuito. El uso de determinadas funcionalidades de la plataforma puede requerir registro previo y contratación de un plan de suscripción.</p>
        <p>El usuario se compromete a:</p>
        <ul>
          <li>Usar el sitio web de conformidad con la ley, la moral, el orden público y estos términos</li>
          <li>No realizar actividades ilícitas o lesivas para derechos de terceros</li>
          <li>No introducir, almacenar o difundir mediante el sitio web información que sea falsa, difamatoria, obscena o que viole derechos de propiedad intelectual</li>
          <li>No interferir en el correcto funcionamiento del sitio web</li>
        </ul>
      </div>

      <div className="lg-section">
        <h2>5. Exclusión de garantías y responsabilidad</h2>
        <p>Khepria no se responsabiliza de los daños o perjuicios de cualquier naturaleza que pudieran derivarse de:</p>
        <ul>
          <li>La falta de disponibilidad, mantenimiento y funcionamiento efectivo del sitio web</li>
          <li>La falta de utilidad, adecuación o validez del sitio web o sus contenidos para las necesidades del usuario</li>
          <li>Errores u omisiones en los contenidos</li>
          <li>La presencia de virus u otros elementos en los contenidos que puedan producir daños en los sistemas informáticos</li>
          <li>El incumplimiento de la ley, la moral o el orden público por parte de los usuarios</li>
        </ul>
      </div>

      <div className="lg-section">
        <h2>6. Hipervínculos</h2>
        <p>El sitio web puede contener enlaces a sitios web de terceros. Khepria no se responsabiliza del contenido de dichos sitios ni de las prácticas de privacidad de los mismos. Los enlaces se facilitan únicamente a modo informativo.</p>
        <p>Cualquier persona que desee establecer un hipervínculo hacia Khepria debe obtener autorización previa por escrito. El hipervínculo únicamente podrá dirigirse a la página principal del sitio y no podrá reproducir el sitio de ninguna forma.</p>
      </div>

      <div className="lg-section">
        <h2>7. Protección de datos personales</h2>
        <p>El tratamiento de datos personales se realiza conforme al Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD). Consulta nuestra <a href="/privacidad">Política de Privacidad</a> para más información.</p>
      </div>

      <div className="lg-section">
        <h2>8. Legislación aplicable y jurisdicción</h2>
        <p>El presente aviso legal se rige por la legislación española vigente. Para la resolución de cualquier controversia derivada del acceso o uso del sitio web, las partes se someten a los juzgados y tribunales competentes de España, de acuerdo con la legislación aplicable.</p>
      </div>

      <div className="lg-section">
        <h2>9. Contacto</h2>
        <p>Para cualquier consulta relativa al presente aviso legal puedes contactar con nosotros en <a href="mailto:hola@khepria.app">hola@khepria.app</a>.</p>
      </div>

    </LegalLayout>
  )
}
