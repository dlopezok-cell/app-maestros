// app/api/pagar/route.js
// Crea un pago en Flow (pasarela chilena) y devuelve el link de pago.
// Mantiene el mismo contrato que antes ({ init_point }) para no tocar el frontend:
// el cliente hace window.location.href = init_point.
import crypto from 'crypto';

// Flow firma cada petición: se ordenan los parámetros por nombre, se concatenan
// como clave+valor (sin separadores) y se firma con HMAC-SHA256 (hex) usando la Secret Key.
function firmar(params, secret) {
  const keys = Object.keys(params).sort();
  let cadena = '';
  for (const k of keys) cadena += k + params[k];
  return crypto.createHmac('sha256', secret).update(cadena).digest('hex');
}

export async function POST(req) {
  const apiKey = process.env.FLOW_API_KEY;
  const secret = process.env.FLOW_SECRET_KEY;
  // Sandbox: https://sandbox.flow.cl/api   ·   Producción: https://www.flow.cl/api
  const base = process.env.FLOW_BASE || 'https://sandbox.flow.cl/api';

  if (!apiKey || !secret) {
    return Response.json(
      { error: 'Falta configurar FLOW_API_KEY y FLOW_SECRET_KEY en Vercel.' },
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
  const email = (body.email || '').trim();

  if (monto < 100) {
    return Response.json({ error: 'Monto inválido (mínimo $100 CLP).' }, { status: 400 });
  }
  if (!email || email.indexOf('@') < 0) {
    return Response.json({ error: 'Falta un correo válido para el pago. Inicia sesión e inténtalo de nuevo.' }, { status: 400 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || req.headers.get('origin') || 'https://www.maestrosenlinea.cl';
  const commerceOrder = 'ML-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

  const params = {
    apiKey,
    commerceOrder,
    subject: descripcion,
    currency: 'CLP',
    amount: String(monto),
    email,
    paymentMethod: '9', // 9 = todos los medios disponibles
    urlConfirmation: site + '/api/flow?action=confirmar',
    urlReturn: site + '/api/flow?action=retorno',
    optional: JSON.stringify({ tipo, reservaId, maestroId }),
  };
  params.s = firmar(params, secret);

  try {
    const r = await fetch(base + '/payment/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });
    const data = await r.json();
    if (!r.ok || !data.url || !data.token) {
      return Response.json({ error: (data && data.message) || 'Error creando el pago en Flow.' }, { status: 502 });
    }
    // Flow entrega url + token; el navegador debe ir a url?token=token
    return Response.json({ init_point: data.url + '?token=' + data.token, flowOrder: data.flowOrder });
  } catch (e) {
    return Response.json({ error: 'No se pudo conectar con Flow: ' + e.message }, { status: 502 });
  }
}
