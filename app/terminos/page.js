'use client';

// Términos y Condiciones — marketplace de servicios (Chile), con cláusulas de
// retención de pago, contenido de usuarios y requisitos de App Store / Play.
// TEXTO BASE: completar los datos entre [ ] y revisar con un abogado antes de lanzar.
export default function Terminos() {
  var wrap = { paddingTop: 24, paddingBottom: 60, maxWidth: 720, margin: '0 auto' };
  var body = { fontSize: 14, lineHeight: 1.7, color: '#2b2f3a' };
  var h3 = { fontSize: 16, margin: '22px 0 4px', color: '#16181f' };
  var ph = { color: '#b4540a', fontWeight: 700 };
  var nota = { fontSize: 12, color: '#9aa1b5', marginTop: 22 };

  return (
    <main className="body" style={wrap}>
      <a href="/" style={{ color: '#ff5a3c', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>← Volver a la app</a>
      <h1 style={{ fontSize: 22, margin: '14px 0 4px' }}>Términos y Condiciones</h1>
      <p style={{ fontSize: 12, color: '#9aa1b5', marginTop: 0 }}>Última actualización: 15 de junio de 2026</p>

      <div style={body}>
        <p>Estos Términos regulan el uso del sitio web y la aplicación de MaestrosEnLínea (la “Plataforma”), operada por <span style={ph}>[RAZÓN SOCIAL]</span>, RUT <span style={ph}>[RUT EMPRESA]</span>, domicilio en <span style={ph}>[DOMICILIO]</span>, Chile. Al crear una cuenta o usar la Plataforma, aceptas estos Términos.</p>

        <h3 style={h3}>1. Qué es MaestrosEnLínea</h3>
        <p>MaestrosEnLínea es una plataforma que <b>conecta</b> a clientes con maestros independientes (gasfíteres, electricistas, cerrajeros, pintores, y otros oficios) para cotizar y contratar servicios. <b>No somos empleadores de los maestros</b> ni prestamos directamente los servicios; los maestros actúan de forma independiente y son los únicos responsables del trabajo que realizan.</p>

        <h3 style={h3}>2. Quién puede usar la Plataforma</h3>
        <p>Debes ser mayor de 18 años y tener capacidad legal para contratar. Debes entregar datos veraces y mantenerlos actualizados. Eres responsable de la actividad realizada con tu cuenta y de mantener su seguridad.</p>

        <h3 style={h3}>3. Cotizaciones y precios</h3>
        <p>Los precios los define cada maestro. Una cotización es una oferta del maestro; el trabajo se entiende contratado cuando el cliente lo agenda y paga a través de la Plataforma.</p>

        <h3 style={h3}>4. Pagos y retención (dinero protegido)</h3>
        <p>Los pagos se procesan mediante <b>Mercado Pago</b>. Para proteger a ambas partes, el pago del cliente queda <b>retenido</b> por la Plataforma y se <b>libera al maestro</b> una vez que el cliente confirma que el trabajo fue terminado. MaestrosEnLínea cobra una <b>comisión</b> por el uso de la Plataforma, informada al maestro en su panel de Ganancias, que se descuenta al liberar el pago.</p>

        <h3 style={h3}>5. Cancelaciones y reembolsos</h3>
        <p>El <b>cliente</b> puede cancelar sin costo mientras la reserva esté <b>pendiente de pago</b>. Una vez pagado y mientras el trabajo no se haya realizado, las cancelaciones y reembolsos se evalúan según el estado del trabajo; si el trabajo no se prestó, el cliente tiene derecho a reembolso del monto retenido. Para cancelar un trabajo ya pagado, escríbenos a hola@maestrosenlinea.cl. Lo anterior es sin perjuicio de los derechos que te otorga la Ley N° 19.496 sobre Protección de los Derechos de los Consumidores.</p>

        <h3 style={h3}>6. Conducta y uso prohibido</h3>
        <p>No está permitido usar la Plataforma para fines ilegales; ofrecer servicios que no puedes cumplir; suplantar a terceros; ni <b>acordar pagos o contacto por fuera</b> para evadir comisiones cuando el contacto se originó dentro de la Plataforma. Para tu seguridad, el chat oculta números de teléfono, correos y enlaces hasta que el trabajo esté pagado.</p>

        <h3 style={h3}>7. Contenido de los usuarios</h3>
        <p>Eres responsable del contenido que publicas (mensajes, fotos, videos, reseñas). Al publicarlo, otorgas a MaestrosEnLínea una licencia limitada para mostrarlo dentro de la Plataforma con el fin de prestar el servicio. No se permite contenido ofensivo, difamatorio, falso o que infrinja derechos de terceros. Puedes <b>reportar</b> contenido o <b>bloquear</b> a un usuario desde el chat; revisaremos los reportes y podremos remover contenido o suspender cuentas que incumplan estos Términos.</p>

        <h3 style={h3}>8. Verificación y reseñas</h3>
        <p>Verificamos la identidad de los maestros, pero <b>no garantizamos</b> el resultado, calidad o seguridad de cada trabajo. Recomendamos revisar las reseñas y conversar por el chat antes de agendar. Las reseñas deben reflejar experiencias reales.</p>

        <h3 style={h3}>9. Responsabilidad</h3>
        <p>MaestrosEnLínea actúa como <b>intermediario</b>. La relación de servicio es directamente entre el cliente y el maestro. En la medida que la ley lo permita, no nos hacemos responsables de daños, pérdidas o perjuicios derivados de los servicios prestados por los maestros ni de la conducta de los usuarios. Nada en estos Términos limita derechos irrenunciables que la ley chilena te reconozca.</p>

        <h3 style={h3}>10. Suspensión y término</h3>
        <p>Podemos suspender o cerrar cuentas que incumplan estos Términos o la ley. Puedes cerrar tu cuenta en cualquier momento desde la app o escribiéndonos.</p>

        <h3 style={h3}>11. Propiedad intelectual</h3>
        <p>La marca, el logotipo, el diseño y el software de la Plataforma son de MaestrosEnLínea o de sus licenciantes. No puedes copiarlos ni usarlos sin autorización.</p>

        <h3 style={h3}>12. Ley aplicable y jurisdicción</h3>
        <p>Estos Términos se rigen por las leyes de la República de Chile. Cualquier controversia se someterá a los tribunales competentes de Chile, sin perjuicio de los procedimientos de protección al consumidor ante el SERNAC.</p>

        <h3 style={h3}>13. Disposición para apps de Apple (iOS)</h3>
        <p>Si descargas la app desde la App Store, además aplica el contrato de licencia estándar de Apple (“Licensed Application End User License Agreement”). Reconoces que el contrato es entre tú y MaestrosEnLínea, no con Apple; que Apple no tiene obligación de prestar soporte ni mantenimiento de la app; y que Apple y sus filiales son terceros beneficiarios de estos Términos y podrán exigir su cumplimiento.</p>

        <h3 style={h3}>14. Cambios</h3>
        <p>Podemos actualizar estos Términos. Publicaremos la versión vigente en esta página y avisaremos los cambios relevantes dentro de la app o por correo.</p>

        <h3 style={h3}>15. Contacto</h3>
        <p>Escríbenos a <b>hola@maestrosenlinea.cl</b>.</p>

        <p style={nota}>Texto base referencial; no constituye asesoría legal. Completa los campos marcados en <span style={ph}>[corchetes]</span> y revísalo con un abogado antes del lanzamiento.</p>
      </div>
    </main>
  );
}
