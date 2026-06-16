// app/api/flow/route.js
// Maneja dos cosas de Flow según ?action=:
//  - confirmar: webhook servidor-a-servidor. Flow avisa que un pago cambió; verificamos
//    su estado real con getStatus y, si está pagado, lo registramos en la tabla "pagos".
//  - retorno: el navegador del usuario vuelve aquí tras pagar; lo redirigimos a la app.
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function firmar(params, secret) {
  const keys = Object.keys(params).sort();
  let cadena = '';
  for (const k of keys) cadena += k + params[k];
  return crypto.createHmac('sha256', secret).update(cadena).digest('hex');
}

// Mismo desglose de comisiones que usaba Mercado Pago.
function desglose(monto) {
  const comision = Math.round(monto * 0.10 * 1.19);
  const pasarela = Math.round(monto * 0.0235 * 1.19);
  const retencion = Math.round(monto * 0.1525);
  return { comision, pasarela, retencion, liquido: monto - comision - pasarela - retencion };
}

async function estadoFlow(token) {
  const apiKey = process.env.FLOW_API_KEY;
  const secret = process.env.FLOW_SECRET_KEY;
  const base = process.env.FLOW_BASE || 'https://sandbox.flow.cl/api';
  const params = { apiKey, token };
  params.s = firmar(params, secret);
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(base + '/payment/getStatus?' + qs);
  return await r.json();
}

async function registrarSiPagado(token) {
  const st = await estadoFlow(token);
  // status: 1 pendiente, 2 pagado, 3 rechazado, 4 anulado
  if (!st || st.status !== 2) return st;

  const monto = Math.round(Number(st.amount) || 0);
  const d = desglose(monto);
  let opt = {};
  try { opt = JSON.parse(st.optional || '{}'); } catch {}

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supaUrl && serviceKey) {
    const admin = createClient(supaUrl, serviceKey);
    await admin.from('pagos').upsert(
      {
        mp_payment_id: 'flow_' + (st.flowOrder || st.commerceOrder),
        reserva_id: opt.reservaId || null,
        maestro_id: opt.maestroId || null,
        tipo: opt.tipo || 'trabajo',
        email: st.payer || null,
        descripcion: st.subject || null,
        monto_bruto: monto,
        comision_plataforma: d.comision,
        costo_pasarela: d.pasarela,
        retencion_sii: d.retencion,
        liquido_maestro: d.liquido,
        estado: 'pagado',
      },
      { onConflict: 'mp_payment_id' }
    );
    if (opt.reservaId) {
      await admin.from('reservas').update({ estado: 'pagado' }).eq('id', opt.reservaId);
    }
  }
  return st;
}

export async function POST(req) {
  const action = new URL(req.url).searchParams.get('action');

  let token = null;
  try {
    const form = await req.formData();
    token = form.get('token');
  } catch {}

  if (action === 'retorno') {
    // El usuario vuelve desde Flow. Revisamos estado y lo mandamos de regreso a la app.
    const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.maestrosenlinea.cl';
    let estado = 'pendiente';
    try {
      if (token) {
        const st = await estadoFlow(token);
        estado = st && st.status === 2 ? 'ok' : (st && st.status === 3 ? 'fallo' : 'pendiente');
        // Aseguramos el registro también aquí, por si el webhook se demora.
        if (st && st.status === 2) await registrarSiPagado(token);
      }
    } catch {}
    return Response.redirect(site + '/?pago=' + estado, 303);
  }

  // action === 'confirmar' (webhook). Respondemos 200 siempre para que Flow no reintente sin fin.
  try {
    if (token) await registrarSiPagado(token);
  } catch {}
  return new Response('ok', { status: 200 });
}

export async function GET() {
  // Health check / verificación de endpoint.
  return new Response('ok', { status: 200 });
}
