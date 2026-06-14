'use client';

// Términos y Condiciones (texto base; revisar con un abogado antes de lanzar).
export default function Terminos() {
  return (
    <main className="body" style={{ paddingTop: 24, paddingBottom: 60, maxWidth: 720, margin: '0 auto' }}>
      <a href="/" style={{ color: '#ff5a3c', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>← Volver a la app</a>
      <h1 style={{ fontSize: 22, margin: '14px 0 4px' }}>Términos y Condiciones</h1>
      <p style={{ fontSize: 12, color: '#9aa1b5', marginTop: 0 }}>Última actualización: junio 2026</p>
      <div style={{ fontSize: 14, lineHeight: 1.7, color: '#2b2f3a' }}>
        <h3>1. Qué es MaestrosEnLínea</h3>
        <p>MaestrosEnLínea es una plataforma que conecta a clientes con maestros independientes (gasfíteres, electricistas, cerrajeros, etc.) para cotizar y contratar servicios. No somos empleadores de los maestros; ellos prestan sus servicios de forma independiente.</p>
        <h3>2. Cuentas</h3>
        <p>Para pedir o prestar servicios debes crear una cuenta con datos veraces y mantenerlos actualizados. Eres responsable de la actividad realizada con tu cuenta.</p>
        <h3>3. Cotizaciones y pagos</h3>
        <p>Los precios los define cada maestro. Los pagos dentro de la app se procesan mediante Mercado Pago. MaestrosEnLínea cobra una comisión por el uso de la plataforma, informada al maestro en su panel de Ganancias.</p>
        <h3>4. Conducta</h3>
        <p>No está permitido usar la plataforma para fines ilegales, ofrecer servicios que no puedes cumplir, ni acordar pagos por fuera para evadir comisiones cuando el contacto se originó dentro de la plataforma.</p>
        <h3>5. Verificación</h3>
        <p>Verificamos la identidad de los maestros, pero no garantizamos el resultado de cada trabajo. Recomendamos revisar las reseñas y conversar por el chat antes de agendar.</p>
        <h3>6. Responsabilidad</h3>
        <p>MaestrosEnLínea actúa como intermediario. La relación de servicio es directamente entre el cliente y el maestro. En la medida que la ley lo permita, no nos hacemos responsables de daños derivados de los servicios prestados por terceros.</p>
        <h3>7. Cancelaciones y reembolsos</h3>
        <p>Las cancelaciones y eventuales reembolsos se gestionan caso a caso. Escríbenos para resolver cualquier inconveniente con un trabajo agendado.</p>
        <h3>8. Cambios</h3>
        <p>Podemos actualizar estos términos. Te avisaremos de cambios relevantes dentro de la app o por correo.</p>
        <h3>9. Contacto</h3>
        <p>Escríbenos a hola@maestrosenlinea.cl.</p>
        <p style={{ fontSize: 12, color: '#9aa1b5', marginTop: 22 }}>Este documento es un texto base y no constituye asesoría legal. Recomendamos revisarlo con un abogado antes del lanzamiento.</p>
      </div>
    </main>
  );
}
