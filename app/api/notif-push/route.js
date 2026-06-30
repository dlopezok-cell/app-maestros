// Push nativo (OneSignal) al destinatario cuando llega un mensaje en el chat.
// El destinatario se identifica por su id de usuario (external_id en OneSignal),
// que la app fija con OneSignal.login(usuario.id) tras iniciar sesión.
// Inerte si faltan ONESIGNAL_APP_ID / ONESIGNAL_REST_KEY (no envía nada).
//
// Body esperado: { presupuesto_id, maestro_id, from_rol }  (from_rol = 'cliente' | 'maestro')
//  - si escribe el cliente  -> push al maestro (external_id = maestro_id)
//  - si escribe el maestro  -> push al cliente (external_id = cliente_id del presupuesto)
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 20;

const APP_ID = process.env.ONESIGNAL_APP_ID || '';
const REST_KEY = process.env.ONESIGNAL_REST_KEY || '';
const SITE = 'https://www.maestrosenlinea.cl';

function admin() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); }

export async function POST(req) {
  try {
    if (!APP_ID || !REST_KEY) return Response.json({ ok: true, skipped: 'sin onesignal' }, { status: 200 });
    const b = await req.json().catch(function () { return {}; });
    const pid = b.presupuesto_id, mid = b.maestro_id, fromRol = b.from_rol;
    if (!pid || !fromRol) return Response.json({ error: 'falta presupuesto_id/from_rol' }, { status: 200 });
    const sb = admin();

    // Datos del trabajo + resolver destinatario.
    const pr = await sb.from('presupuestos').select('cliente_id, titulo, oficio').eq('id', pid).maybeSingle();
    const ped = pr.data;
    if (!ped) return Response.json({ ok: true, skipped: 'sin pedido' }, { status: 200 });
    const trabajo = (ped.titulo || ped.oficio) || 'tu cotización';

    let dest, titulo, cuerpo, url;
    if (fromRol === 'cliente') {
      // escribió el cliente -> avisamos al maestro
      dest = mid;
      titulo = 'Nuevo mensaje';
      cuerpo = 'El cliente te escribió en "' + trabajo + '"';
      url = SITE + '/maestros?pedido=' + encodeURIComponent(pid);
    } else {
      // escribió el maestro -> avisamos al cliente
      dest = ped.cliente_id;
      titulo = 'Tu maestro respondió';
      cuerpo = 'Tienes un mensaje nuevo en "' + trabajo + '"';
      url = SITE + '/?p=' + encodeURIComponent(pid);
    }
    if (!dest) return Response.json({ ok: true, skipped: 'sin destinatario' }, { status: 200 });

    const payload = {
      app_id: APP_ID,
      include_external_user_ids: [String(dest)],
      channel_for_external_user_ids: 'push',
      headings: { en: titulo, es: titulo },
      contents: { en: cuerpo, es: cuerpo },
      url: url,
      ios_badgeType: 'Increase',
      ios_badgeCount: 1
    };
    const r = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', Authorization: 'Basic ' + REST_KEY },
      body: JSON.stringify(payload)
    });
    const j = await r.json().catch(function () { return {}; });
    const ok = r.ok && !j.errors;
    return Response.json({ ok: ok, id: j.id || null, error: j.errors ? JSON.stringify(j.errors) : null }, { status: 200 });
  } catch (e) {
    return Response.json({ error: (e && e.message) || 'error' }, { status: 200 });
  }
}
