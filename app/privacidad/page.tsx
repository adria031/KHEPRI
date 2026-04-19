import { LegalLayout } from '../components/LegalLayout'

export const metadata = { title: 'Política de Privacidad — Khepria' }

export default function Privacidad() {
  return (
    <LegalLayout title="Política de Privacidad" updated="19 de abril de 2025">

      <div className="lg-section">
        <h2>1. Responsable del tratamiento</h2>
        <p>El responsable del tratamiento de los datos personales recogidos a través de Khepria es:</p>
        <div className="lg-box">
          <div className="lg-box-title">Khepria</div>
          <p>Email de contacto: <a href="mailto:privacidad@khepria.app">privacidad@khepria.app</a><br/>
          País: España<br/>
          Plataforma: <a href="https://khepria.app">khepria.app</a></p>
        </div>
      </div>

      <div className="lg-section">
        <h2>2. Datos que recogemos y finalidad</h2>
        <h3>Datos de registro</h3>
        <p>Cuando creas una cuenta en Khepria recogemos tu dirección de correo electrónico, nombre y contraseña (almacenada de forma cifrada). Estos datos se usan para identificarte, gestionar tu sesión y comunicarnos contigo sobre el servicio.</p>

        <h3>Datos del negocio</h3>
        <p>Los titulares de negocios facilitan información sobre su establecimiento (nombre, descripción, tipo, horarios, servicios, precios, fotos). Estos datos se usan para configurar tu perfil público en Khepria y permitir que los clientes realicen reservas.</p>

        <h3>Datos de trabajadores</h3>
        <p>Puedes añadir información de los miembros de tu equipo (nombre, especialidad, email, teléfono, foto). Tratas estos datos como responsable y Khepria actúa como encargado del tratamiento. Debes informar a tus trabajadores de este tratamiento.</p>

        <h3>Datos de clientes y reservas</h3>
        <p>Las reservas realizadas a través de Khepria generan datos sobre el cliente (nombre, email, teléfono) y el servicio contratado. El negocio es responsable de este tratamiento; Khepria actúa como encargado.</p>

        <h3>Datos de uso y técnicos</h3>
        <p>Registramos datos técnicos de acceso como dirección IP, tipo de navegador y páginas visitadas, con fines de seguridad, diagnóstico y mejora del servicio.</p>

        <h3>Datos de facturación</h3>
        <p>Si contratas un plan de pago, recogemos los datos necesarios para la facturación. Los datos de tarjeta son gestionados directamente por nuestro proveedor de pagos (Stripe) y nunca son almacenados por Khepria.</p>
      </div>

      <div className="lg-section">
        <h2>3. Base jurídica del tratamiento</h2>
        <ul>
          <li><strong>Ejecución de un contrato:</strong> el tratamiento es necesario para prestarte el servicio de Khepria.</li>
          <li><strong>Interés legítimo:</strong> seguridad, prevención del fraude y mejora del servicio.</li>
          <li><strong>Consentimiento:</strong> para el envío de comunicaciones de marketing (puedes retirar tu consentimiento en cualquier momento).</li>
          <li><strong>Obligación legal:</strong> cuando sea requerido por la normativa aplicable.</li>
        </ul>
      </div>

      <div className="lg-section">
        <h2>4. Transferencias internacionales</h2>
        <p>Khepria utiliza servicios de terceros que pueden implicar transferencias de datos fuera del Espacio Económico Europeo, siempre bajo garantías adecuadas (cláusulas contractuales tipo de la Comisión Europea u otros mecanismos equivalentes):</p>
        <ul>
          <li><strong>Supabase</strong> — almacenamiento de datos y autenticación</li>
          <li><strong>Vercel</strong> — infraestructura y hosting</li>
          <li><strong>Google (Gemini)</strong> — funcionalidades de inteligencia artificial</li>
          <li><strong>Resend</strong> — envío de emails transaccionales</li>
        </ul>
      </div>

      <div className="lg-section">
        <h2>5. Conservación de datos</h2>
        <p>Conservamos tus datos mientras mantengas una cuenta activa en Khepria. Cuando cancelas tu cuenta, eliminamos o anonimizamos tus datos en un plazo máximo de 90 días, salvo que la normativa exija conservarlos durante más tiempo (por ejemplo, datos de facturación: 5 años según la legislación fiscal española).</p>
      </div>

      <div className="lg-section">
        <h2>6. Tus derechos (RGPD)</h2>
        <p>De acuerdo con el Reglamento General de Protección de Datos (RGPD) tienes los siguientes derechos:</p>
        <div className="lg-box">
          <div className="lg-box-title">Derecho de acceso</div>
          <p>Puedes solicitar una copia de los datos que tenemos sobre ti.</p>
        </div>
        <div className="lg-box">
          <div className="lg-box-title">Derecho de rectificación</div>
          <p>Puedes corregir datos inexactos o incompletos directamente desde tu perfil o contactándonos.</p>
        </div>
        <div className="lg-box">
          <div className="lg-box-title">Derecho de supresión («derecho al olvido»)</div>
          <p>Puedes solicitar la eliminación de tus datos cuando ya no sean necesarios para la finalidad con que fueron recogidos.</p>
        </div>
        <div className="lg-box">
          <div className="lg-box-title">Derecho de oposición y limitación</div>
          <p>Puedes oponerte al tratamiento o solicitar que lo limitemos en determinadas circunstancias.</p>
        </div>
        <div className="lg-box">
          <div className="lg-box-title">Derecho a la portabilidad</div>
          <p>Puedes recibir tus datos en un formato estructurado y de uso común para transferirlos a otro servicio.</p>
        </div>
        <p>Para ejercer cualquiera de estos derechos escríbenos a <a href="mailto:privacidad@khepria.app">privacidad@khepria.app</a>. Responderemos en un plazo máximo de 30 días. También tienes derecho a presentar una reclamación ante la <a href="https://www.aepd.es" target="_blank" rel="noreferrer">Agencia Española de Protección de Datos (AEPD)</a>.</p>
      </div>

      <div className="lg-section">
        <h2>7. Seguridad</h2>
        <p>Aplicamos medidas técnicas y organizativas adecuadas para proteger tus datos: cifrado en tránsito (HTTPS/TLS), almacenamiento cifrado de contraseñas, control de acceso por roles y auditorías periódicas. Sin embargo, ningún sistema es 100% seguro; te recomendamos usar contraseñas fuertes y no compartirlas.</p>
      </div>

      <div className="lg-section">
        <h2>8. Cookies</h2>
        <p>Utilizamos cookies propias y de terceros. Consulta nuestra <a href="/cookies">Política de Cookies</a> para más información.</p>
      </div>

      <div className="lg-section">
        <h2>9. Cambios en esta política</h2>
        <p>Podemos actualizar esta política para reflejar cambios en el servicio o en la normativa aplicable. Cuando realicemos cambios sustanciales te lo notificaremos por email o mediante un aviso destacado en la plataforma.</p>
      </div>

    </LegalLayout>
  )
}
