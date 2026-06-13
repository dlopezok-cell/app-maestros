// app/api/pagar/route.js
// Crea una preferencia de pago en Mercado Pago (Checkout Pro) y devuelve el link de pago.
// El dinero entra a TU cuenta de Mercado Pago; el reparto al maestro se hace aparte.

export async function POST(req) {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    return Response.json(
      { error: 'Falta configurar MP_ACCESS_TOKEN en Vercel.' },
      { status: 500 }
    );
  }

  let body;
  try { body = await req.json(); } catch { body = {}; }

  const monto = Math.round(Number(body.monto) || 0);
  const tipo = body.tipo === 'diagnostico' ? 'diagnostico' : 'trabajo';
  const descripcion = (body.descripcion || (tipo === 'diagnostico' ? 'Diagnóstico por videollamada' : 'Trabajo a domicilio')).slice(0, 120);
  const reservaId = body.reservaId || null;
  const maestroId = body.maestroId || null;
  const email = body.email || null;

  if (monto < 100) {
    return Response.json({ error: 'Monto inválido (mínimo $100 CLP).' }, { status: 400 });
  }

  // El sitio publico (para volver tras pagar y para el webhook)
  const site = process.env.NEXT_PUBLIC_SITE_URL || req.headers.get('origin') || 'https://app-maestros-three.vercel.app';

  // Toda la info viaja en external_reference; el webhook la usa al confirmar el pago.
  const ref = JSON.stringify({ tipo, monto, reservaId, maestroId, email });

  const preferencia = {
    items: [
      {
        title: descripcion,
        quantity: 1,
        unit_price: monto,
        currency_id: 'CLP',
      },
    ],
    external_reference: ref,
    back_urls: {
      success: site + '/?pago=ok',
      failure: site + '/?pago=fallo',
      pending: site + '/?pago=pendiente',
    },
    auto_return: 'approved',
    notification_url: site + '/api/mp-webhook',
    statement_descriptor: 'MAESTROSENLINEA',
  };

  try {
    const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify(preferencia),
    });
    const data = await r.json();
    if (!r.ok) {
      return Response.json({ error: data.message || 'Error creando el pago en Mercado Pago.' }, { status: 502 });
    }
    // init_point = produccion; sandbox_init_point = pruebas
    return Response.json({
      init_point: data.init_point || data.sandbox_init_point,
      preference_id: data.id,
    });
  } catch (e) {
    return Response.json({ error: 'No se pudo conectar con Mercado Pago: ' + e.message }, { status: 502 });
  }
}
