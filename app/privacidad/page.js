'use client';

// Política de Privacidad — alineada a Ley 21.719 (Chile) y a los requisitos de
// privacidad de App Store y Google Play. TEXTO BASE: reemplazar los datos entre
// corchetes [ ] con los de la empresa y revisar con un abogado antes de lanzar.
export default function Privacidad() {
  var wrap = { paddingTop: 24, paddingBottom: 60, maxWidth: 720, margin: '0 auto' };
  var body = { fontSize: 14, lineHeight: 1.7, color: '#2b2f3a' };
  var h3 = { fontSize: 16, margin: '22px 0 4px', color: '#16181f' };
  var box = { background: '#f7f8fb', border: '1px solid #e7e9f0', borderRadius: 12, padding: 14, margin: '8px 0' };
  var ph = { color: '#b4540a', fontWeight: 700 }; // marcador a completar
  var nota = { fontSize: 12, color: '#9aa1b5', marginTop: 22 };

  return (
    <main className="body" style={wrap}>
      <a href="/" style={{ color: '#ff5a3c', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>← Volver a la app</a>
      <h1 style={{ fontSize: 22, margin: '14px 0 4px' }}>Política de Privacidad</h1>
      <p style={{ fontSize: 12, color: '#9aa1b5', marginTop: 0 }}>Última actualización: 15 de junio de 2026</p>

      <div style={body}>
        <p>Esta Política explica cómo MaestrosEnLínea trata tus datos personales cuando usas nuestro sitio web y aplicación (la “Plataforma”). Cumplimos con la Ley N° 19.628 y la Ley N° 21.719 sobre Protección de Datos Personales de Chile.</p>

        <h3 style={h3}>1. Responsable del tratamiento</h3>
        <div style={box}>
          <div><b>Razón social:</b> <span style={ph}>[RAZÓN SOCIAL]</span></div>
          <div><b>RUT:</b> <span style={ph}>[RUT EMPRESA]</span></div>
          <div><b>Domicilio:</b> <span style={ph}>[DOMICILIO]</span>, Chile</div>
          <div><b>Correo de contacto / privacidad:</b> hola@maestrosenlinea.cl</div>
        </div>

        <h3 style={h3}>2. Datos que recolectamos</h3>
        <p>Recolectamos los datos que nos entregas y los que se generan al usar la Plataforma:</p>
        <p><b>De todos los usuarios:</b> nombre, correo, teléfono, dirección y ubicación (geolocalización para autocompletar direcciones), foto de perfil, mensajes y archivos del chat (texto, audio, imágenes y videos), reseñas y datos de uso (dispositivo, registros de acceso).</p>
        <p><b>De clientes:</b> el video, las fotos y la descripción del problema que envías para cotizar; historial de cotizaciones y reservas.</p>
        <p><b>De maestros:</b> RUT y fotos de carnet/selfie con fines de verificación de identidad; especialidad, experiencia, zona de trabajo y fotos de trabajos.</p>
        <p><b>De pago:</b> los pagos se procesan a través de Mercado Pago. No almacenamos los datos de tu tarjeta; los administra el procesador de pagos.</p>

        <h3 style={h3}>3. Base de licitud y finalidades</h3>
        <p>Tratamos tus datos para: (a) ejecutar el servicio que solicitas —conectar clientes con maestros, mostrar fichas y reseñas, coordinar el trabajo y procesar pagos— sobre la base de la <b>ejecución del contrato</b>; (b) verificar la identidad de los maestros y dar seguridad a la comunidad, sobre la base de nuestro <b>interés legítimo</b> y obligaciones legales; (c) enviarte avisos sobre tu cuenta y trabajos; y (d) finalidades para las que nos das tu <b>consentimiento</b> (por ejemplo, comunicaciones promocionales), que puedes retirar en cualquier momento.</p>

        <h3 style={h3}>4. Con quién compartimos tus datos</h3>
        <p>Compartimos datos solo en lo necesario, con:</p>
        <p>• El cliente o maestro con quien interactúas (los datos de contacto y dirección se revelan a la otra parte únicamente una vez confirmado y pagado el trabajo).<br/>
        • <b>Mercado Pago</b>, para procesar pagos.<br/>
        • Proveedores de infraestructura: <b>Supabase</b> (base de datos y almacenamiento) y <b>Vercel</b> (alojamiento del sitio).<br/>
        • <b>Google Maps/Places</b>, para el autocompletado de direcciones.<br/>
        • <b>Anthropic</b>, cuando el maestro usa la función opcional de generar su descripción con inteligencia artificial (se procesa el texto que ingresa, no datos de carnet).<br/>
        No vendemos tus datos personales.</p>

        <h3 style={h3}>5. Transferencias internacionales</h3>
        <p>Algunos de nuestros proveedores (por ejemplo, Supabase, Vercel, Google y Anthropic) almacenan o procesan información en servidores fuera de Chile, principalmente en Estados Unidos. Adoptamos resguardos contractuales para que esos datos reciban un nivel de protección adecuado.</p>

        <h3 style={h3}>6. Fotos de verificación</h3>
        <p>Las fotos de carnet y selfie del maestro solo las revisa nuestro equipo para verificar su identidad y se eliminan una vez aprobada o rechazada la cuenta, salvo que la ley exija conservarlas.</p>

        <h3 style={h3}>7. Tus derechos (ARCO y portabilidad)</h3>
        <p>Puedes ejercer en cualquier momento tus derechos de <b>acceso, rectificación, cancelación (eliminación), oposición y portabilidad</b> de tus datos, así como retirar tu consentimiento. Escríbenos a <b>hola@maestrosenlinea.cl</b> y responderemos en los plazos legales. Si consideras que no respetamos tus derechos, puedes reclamar ante la <b>Agencia de Protección de Datos Personales</b> de Chile.</p>

        <h3 style={h3}>8. Eliminación de tu cuenta y datos</h3>
        <p>Puedes eliminar tu cuenta y tus datos personales desde la opción <b>“Eliminar mi cuenta”</b> dentro de la app (sección Cuenta), o escribiéndonos a hola@maestrosenlinea.cl. Eliminaremos o anonimizaremos tu información, salvo aquella que debamos conservar por obligaciones legales, contables o para la resolución de disputas.</p>

        <h3 style={h3}>9. Seguridad y retención</h3>
        <p>Aplicamos medidas técnicas y organizativas razonables, incluyendo control de acceso y cifrado de datos sensibles. Conservamos tu información solo el tiempo necesario para prestar el servicio y cumplir obligaciones legales. En caso de una brecha de seguridad que afecte tus datos, notificaremos a la autoridad y a los afectados conforme a la ley.</p>

        <h3 style={h3}>10. Permisos del dispositivo</h3>
        <p>La app puede solicitar acceso a tu <b>cámara y micrófono</b> (para grabar audio y video en el chat y cotizaciones), <b>fotos</b> (para adjuntar imágenes), <b>ubicación</b> (para autocompletar tu dirección) y <b>notificaciones</b> (para avisarte de mensajes y reservas). Puedes administrar estos permisos desde la configuración de tu teléfono.</p>

        <h3 style={h3}>11. Menores de edad</h3>
        <p>La Plataforma está dirigida a personas mayores de 18 años. No recolectamos a sabiendas datos de menores de edad.</p>

        <h3 style={h3}>12. Cookies</h3>
        <p>Usamos cookies y almacenamiento local para mantener tu sesión y mejorar la experiencia. Puedes configurar tu navegador para bloquearlas, aunque algunas funciones podrían dejar de operar.</p>

        <h3 style={h3}>13. Cambios a esta Política</h3>
        <p>Podemos actualizar esta Política. Publicaremos la versión vigente en esta página e indicaremos la fecha de última actualización; los cambios relevantes se avisarán dentro de la app o por correo.</p>

        <h3 style={h3}>14. Contacto</h3>
        <p>Para cualquier consulta sobre privacidad o para ejercer tus derechos: <b>hola@maestrosenlinea.cl</b>.</p>

        <p style={nota}>Texto base referencial; no constituye asesoría legal. Completa los campos marcados en <span style={ph}>[corchetes]</span> y revísalo con un abogado antes del lanzamiento.</p>
      </div>
    </main>
  );
}
