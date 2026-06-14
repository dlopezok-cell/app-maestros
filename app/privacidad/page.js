'use client';

// Política de Privacidad (texto base; revisar con un abogado antes de lanzar).
export default function Privacidad() {
  return (
    <main className="body" style={{ paddingTop: 24, paddingBottom: 60, maxWidth: 720, margin: '0 auto' }}>
      <a href="/" style={{ color: '#ff5a3c', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>← Volver a la app</a>
      <h1 style={{ fontSize: 22, margin: '14px 0 4px' }}>Política de Privacidad</h1>
      <p style={{ fontSize: 12, color: '#9aa1b5', marginTop: 0 }}>Última actualización: junio 2026</p>
      <div style={{ fontSize: 14, lineHeight: 1.7, color: '#2b2f3a' }}>
        <h3>1. Datos que recolectamos</h3>
        <p>Nombre, correo, teléfono, dirección y ubicación, foto de perfil y de trabajos, y el video o descripción del problema que envías. Para los maestros, además: RUT y fotos de carnet/selfie con fines de verificación.</p>
        <h3>2. Para qué los usamos</h3>
        <p>Para conectar clientes con maestros, mostrar fichas y reseñas, procesar pagos, verificar identidad, dar soporte y mejorar el servicio.</p>
        <h3>3. Con quién se comparten</h3>
        <p>Con el cliente o maestro con quien interactúas (lo necesario para coordinar el trabajo), con Mercado Pago para procesar pagos, y con proveedores de infraestructura (alojamiento, base de datos, mapas). No vendemos tus datos.</p>
        <h3>4. Fotos de verificación</h3>
        <p>Las fotos de carnet y selfie del maestro solo las revisa nuestro equipo para verificar identidad y se eliminan una vez aprobada la cuenta.</p>
        <h3>5. Tus derechos</h3>
        <p>Puedes acceder, corregir o solicitar la eliminación de tus datos y de tu cuenta escribiéndonos a hola@maestrosenlinea.cl.</p>
        <h3>6. Seguridad y retención</h3>
        <p>Aplicamos medidas razonables para proteger tu información y la conservamos solo el tiempo necesario para prestar el servicio y cumplir obligaciones legales.</p>
        <h3>7. Cookies</h3>
        <p>Usamos cookies y almacenamiento local para mantener tu sesión y mejorar la experiencia.</p>
        <h3>8. Contacto</h3>
        <p>Para cualquier consulta sobre privacidad: hola@maestrosenlinea.cl.</p>
        <p style={{ fontSize: 12, color: '#9aa1b5', marginTop: 22 }}>Este documento es un texto base y no constituye asesoría legal. Recomendamos revisarlo con un abogado antes del lanzamiento.</p>
      </div>
    </main>
  );
}
