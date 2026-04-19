import { LegalLayout } from '../components/LegalLayout'

export const metadata = { title: 'Términos y Condiciones — Khepria' }

export default function Terminos() {
  return (
    <LegalLayout title="Términos y Condiciones" updated="19 de abril de 2025">

      <div className="lg-section">
        <h2>1. Objeto y aceptación</h2>
        <p>Los presentes Términos y Condiciones regulan el acceso y uso de Khepria, plataforma SaaS de gestión inteligente para negocios de servicios, disponible en <a href="https://khepria.app">khepria.app</a>.</p>
        <p>El acceso y uso de Khepria implica la aceptación plena y sin reservas de estos términos. Si no estás de acuerdo con alguno de ellos, no debes usar el servicio.</p>
      </div>

      <div className="lg-section">
        <h2>2. Descripción del servicio</h2>
        <p>Khepria es una plataforma todo-en-uno que permite a los negocios de servicios:</p>
        <ul>
          <li>Gestionar reservas y citas online</li>
          <li>Administrar equipos, servicios, horarios y productos</li>
          <li>Configurar un chatbot con inteligencia artificial para atención al cliente</li>
          <li>Acceder a herramientas de facturación, nóminas, marketing y reseñas</li>
          <li>Disponer de una página pública para recibir reservas de clientes</li>
        </ul>
        <p>Khepria se presta «tal como está» y puede evolucionar con nuevas funcionalidades o cambios en las existentes.</p>
      </div>

      <div className="lg-section">
        <h2>3. Registro y cuenta</h2>
        <p>Para acceder a las funcionalidades de Khepria debes crear una cuenta con un email válido y una contraseña. Eres responsable de mantener la confidencialidad de tus credenciales y de todas las actividades que se realicen desde tu cuenta.</p>
        <p>Debes tener al menos 18 años para registrarte. Al crear una cuenta declaras que la información proporcionada es veraz y actualizada.</p>
        <p>Khepria se reserva el derecho de suspender o cancelar cuentas que incumplan estos términos, realicen usos fraudulentos o perjudiquen a otros usuarios.</p>
      </div>

      <div className="lg-section">
        <h2>4. Planes y facturación</h2>
        <h3>Planes disponibles</h3>
        <p>Khepria ofrece distintos planes de suscripción (Básico, Pro, Agencia) con diferentes funcionalidades y límites. Consulta la página de precios para información actualizada.</p>
        <h3>Pago</h3>
        <p>Los planes de pago se facturan mensualmente o anualmente según la opción elegida. Los pagos se procesan de forma segura a través de Stripe. Al suscribirte autorizas el cobro recurrente hasta que canceles la suscripción.</p>
        <h3>Cambios de precio</h3>
        <p>Podemos modificar los precios de los planes con un preaviso mínimo de 30 días. El cambio se aplicará en el siguiente ciclo de facturación.</p>
        <h3>Reembolsos</h3>
        <p>No realizamos reembolsos por períodos ya facturados, salvo que la ley lo exija o que el servicio haya presentado incidencias graves imputables a Khepria.</p>
      </div>

      <div className="lg-section">
        <h2>5. Uso aceptable</h2>
        <p>Te comprometes a usar Khepria de forma lícita y a no realizar ninguna de las siguientes actividades:</p>
        <ul>
          <li>Usar el servicio para actividades ilegales o fraudulentas</li>
          <li>Intentar acceder a cuentas o datos de otros usuarios sin autorización</li>
          <li>Sobrecargar deliberadamente la infraestructura de Khepria</li>
          <li>Reproducir, distribuir o revender el servicio sin autorización expresa</li>
          <li>Introducir contenidos falsos, difamatorios o que vulneren derechos de terceros</li>
          <li>Hacer ingeniería inversa del software o intentar extraer el código fuente</li>
        </ul>
      </div>

      <div className="lg-section">
        <h2>6. Propiedad intelectual</h2>
        <p>Khepria y todo su contenido (diseño, código, marca, textos, logos) son propiedad de Khepria y están protegidos por la legislación española e internacional de propiedad intelectual e industrial.</p>
        <p>Los contenidos que introduces en Khepria (nombre del negocio, fotos, descripciones, etc.) son de tu propiedad. Nos concedes una licencia no exclusiva para mostrarlos dentro de la plataforma con el fin de prestar el servicio.</p>
      </div>

      <div className="lg-section">
        <h2>7. Datos y privacidad</h2>
        <p>El tratamiento de datos personales se rige por nuestra <a href="/privacidad">Política de Privacidad</a>. Para los datos de clientes y trabajadores que introduces en Khepria, actúas como responsable del tratamiento y Khepria como encargado, de acuerdo con el RGPD.</p>
      </div>

      <div className="lg-section">
        <h2>8. Disponibilidad y limitación de responsabilidad</h2>
        <p>Khepria se esfuerza por mantener el servicio disponible de forma continua, pero no garantiza una disponibilidad del 100%. Pueden producirse interrupciones por mantenimiento, fallos técnicos o causas de fuerza mayor.</p>
        <p>En la máxima medida permitida por la ley, Khepria no será responsable de daños indirectos, pérdidas de beneficios o pérdida de datos derivados del uso o la imposibilidad de usar el servicio. La responsabilidad máxima de Khepria se limita al importe abonado por el usuario en los últimos 3 meses.</p>
      </div>

      <div className="lg-section">
        <h2>9. Cancelación</h2>
        <p>Puedes cancelar tu cuenta en cualquier momento desde los ajustes de tu perfil o contactando con nosotros. La cancelación se hará efectiva al final del período de facturación en curso.</p>
        <p>Khepria puede cancelar tu cuenta si incumples estos términos, con o sin previo aviso dependiendo de la gravedad de la infracción.</p>
      </div>

      <div className="lg-section">
        <h2>10. Modificaciones de los términos</h2>
        <p>Podemos actualizar estos términos en cualquier momento. Los cambios sustanciales se comunicarán con al menos 15 días de antelación por email. El uso continuado del servicio tras la entrada en vigor de los nuevos términos implica su aceptación.</p>
      </div>

      <div className="lg-section">
        <h2>11. Legislación aplicable y jurisdicción</h2>
        <p>Estos términos se rigen por la ley española. Para cualquier controversia, las partes se someten a los juzgados y tribunales competentes de España, salvo que la normativa de protección de consumidores establezca otro fuero.</p>
        <p>Para reclamaciones puedes contactarnos en <a href="mailto:hola@khepria.app">hola@khepria.app</a>.</p>
      </div>

    </LegalLayout>
  )
}
