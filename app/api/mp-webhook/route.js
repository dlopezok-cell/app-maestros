// app/api/mp-webhook/route.js
// Mercado Pago llama aquí cuando cambia un pago. Verificamos el pago y,
// si está aprobado, lo registramos en la tabla "pagos" con el desglose de comisiones.
import { createClient } from '@supabase/supabase-js';

function desglose(monto) {
  const comision = Math.round(monto * 0.10 * 1.19);
  const pasarela = Math.round(monto * 0.0235 * 1.19);
  const retencion = Math.round(monto * 0.1525);
  return { comision, pasarela, retencion, liquido: monto - comision - pasarela - retencion };
}

export async function POST(req) {
  const token = process.env.MP_ACCESS_TOKEN;
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Identificar el id de pago (MP lo manda en query ?data.id= o en el body)
  let paymentId = null;
  const url = new URL(req.url);
  paymentId = url.searchParams.get('data.id') || url.searchParams.get('id');
  if (!paymentId) {
    try {
      const b = await req.json();
      if (b && b.data && b.data.id) paymentId = b.data.id;
      else if (b && b.id && b.type === 'payment') paymentId = b.id;
    } catch {}
  }
  // Respondemos 200 siempre para que MP no reintente infinito ante notificaciones que no son de pago
  if (!paymentId || !token) return new Response('ok', { status: 200 });

  try {
    const r = await fetch('https://api.mercadopago.com/v1/payments/' + paymentId, {
      headers: { Authorization: 'Bearer ' + token },
    });
    const pago = await r.json();
    if (!r.ok || pago.status !== 'approved') return new Response('ok', { status: 200 });

    let ref = {};
    try { ref = JSON.parse(pago.external_reference || '{}'); } catch {}
    const monto = Math.round(Number(ref.monto) || pago.transaction_amount || 0);
    const d = desglose(monto);

    if (supaUrl && serviceKey) {
      const admin = createClient(supaUrl, serviceKey);
      await admin.from('pagos').upsert(
        {
          mp_payment_id: String(paymentId),
          reserva_id: ref.reservaId || null,
          maestro_id: ref.maestroId || null,
          tipo: ref.tipo || 'trabajo',
          email: ref.email || pago.payer?.email || null,
          descripcion: pago.description || null,
          monto_bruto: monto,
          comision_plataforma: d.comision,
          costo_pasarela: d.pasarela,
          retencion_sii: d.retencion,
          liquido_maestro: d.liquido,
          estado: 'pagado',
        },
        { onConflict: 'mp_payment_id' }
      );
      // Si el pago corresponde a una reserva, marcarla como pagada
      if (ref.reservaId) {
        await admin.from('reservas').update({ estado: 'pagado' }).eq('id', ref.reservaId);
      }
    }
  } catch (e) {
    // Ante cualquier error igual respondemos 200; MP reintenta segun su politica
  }
  return new Response('ok', { status: 200 });
}

// MP a veces verifica el endpoint con GET
export async function GET() {
  return new Response('ok', { status: 200 });
}
