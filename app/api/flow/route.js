// app/api/flow/route.js
// Webhook + retorno de Flow. Empareja el pago con la reserva por flow_order
// (commerceOrder guardado al crear el pago), marca la reserva como pagada,
// cierra el presupuesto, avisa por correo y registra el pago (best-effort).
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const SITE = 'https://www.maestrosenlinea.cl';

function firmar(params, secret) {
  const keys = Object.keys(params).sort();
  let cadena = '';
  for (const k of keys) cadena += k + params[k];
  return crypto.createHmac('sha256', secret).update(cadena).digest('hex');
}

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

// Aplica el pago a partir de un estado YA verificado como pagado (status 2).
async function aplicarPago(st) {
  if (!st || st.status !== 2) { console.log('flow: estado no pagado', st && st.status); return; }
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !serviceKey) { console.error('flow: faltan envs de Supabase'); return; }
  const admin = createClient(supaUrl, serviceKey);

  const monto = Math.round(Number(st.amount) || 0);
  let opt = {};
  try { opt = JSON.parse(st.optional || '{}'); } catch {}
  const commerceOrder = st.commerceOrder || null;
  console.log('flow.aplicarPago', { commerceOrder, reservaId: opt.reservaId, monto });

  // 1) Marcar la reserva pagada (atómico, idempotente). Empareja por flow_order o por id.
  let q = admin.from('reservas').update({ estado: 'pagado' }).eq('estado', 'pendiente_pago');
  if (commerceOrder) q = q.eq('flow_order', commerceOrder);
  else if (opt.reservaId) q = q.eq('id', opt.reservaId);
  else { console.error('flow: sin commerceOrder ni reservaId'); }
  const upd = await q.select('id, presupuesto_id, maestro_id');
  if (upd.error) console.error('flow: error update reserva', upd.error.message);
  const reserva = (upd.data && upd.data[0]) || null;

  if (reserva) {
    if (reserva.presupuesto_id) {
      try { await admin.from('presupuestos').update({ estado: 'cerrado' }).eq('id', reserva.presupuesto_id); }
      catch (e) { console.error('flow: error cerrar presupuesto', e && e.message); }
    }
    try {
      await fetch(SITE + '/api/notificar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'trabajo_pagado', reservaId: reserva.id, monto }) });
    } catch (e) { console.error('flow: error notificar', e && e.message); }
  } else {
    console.log('flow: reserva ya pagada o no encontrada (idempotente)');
  }

  // 2) Registrar el pago (idempotente, best-effort).
  try {
    const d = desglose(monto);
    const rp = await admin.from('pagos').upsert({
      mp_payment_id: 'flow_' + (st.flowOrder || st.commerceOrder),
      reserva_id: (reserva && reserva.id) || opt.reservaId || null,
      maestro_id: (reserva && reserva.maestro_id) || opt.maestroId || null,
      tipo: opt.tipo || 'trabajo',
      email: st.payer || null,
      descripcion: st.subject || null,
      monto_bruto: monto,
      comision_plataforma: d.comision,
      costo_pasarela: d.pasarela,
      retencion_sii: d.retencion,
      liquido_maestro: d.liquido,
      estado: 'pagado',
    }, { onConflict: 'mp_payment_id' });
    if (rp.error) console.error('flow: error upsert pago', rp.error.message);
  } catch (e) { console.error('flow: throw upsert pago', e && e.message); }
}

export async function POST(req) {
  const action = new URL(req.url).searchParams.get('action');
  let token = null;
  try { const form = await req.formData(); token = form.get('token'); } catch {}

  if (action === 'retorno') {
    let estado = 'pendiente';
    try {
      if (token) {
        const st = await estadoFlow(token);
        estado = st && st.status === 2 ? 'ok' : (st && st.status === 3 ? 'fallo' : 'pendiente');
        if (st && st.status === 2) await aplicarPago(st);
      }
    } catch (e) { console.error('flow.retorno error', e && e.message); }
    return Response.redirect(SITE + '/?app=1&pago=' + estado, 303);
  }

  // confirmar (webhook). Respondemos 200 siempre.
  try {
    if (token) { const st = await estadoFlow(token); await aplicarPago(st); }
  } catch (e) { console.error('flow.confirmar error', e && e.message); }
  return new Response('ok', { status: 200 });
}

export async function GET() { return new Response('ok', { status: 200 }); }
