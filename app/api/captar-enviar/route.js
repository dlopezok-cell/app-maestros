// app/api/captar-enviar/route.js
// El admin aprueba y envía por WhatsApp (Wasapi) los maestros encolados en
// captacion_cola. Marca cada fila como 'enviado' o 'error'. Solo admin / panel activo.
// Variables (Vercel): WASAPI_TOKEN, WASAPI_FROM_ID (opcional), SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL.
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
const ADMIN_EMAIL = 'dlopezok@gmail.com';
const WASAPI_API = 'https://api-ws.wasapi.io/api/v1';
function admin() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); }

export async function POST(req) {
  try {
    const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!jwt) return Response.json({ error: 'No autorizado.' }, { status: 401 });
    const sb = admin();
    const ures = await sb.auth.getUser(jwt);
    const user = ures && ures.data ? ures.data.user : null;
    if (!user) return Response.json({ error: 'No autorizado.' }, { status: 401 });
    if (user.email !== ADMIN_EMAIL) {
      const pu = await sb.from('panel_usuarios').select('activo').eq('email', user.email).maybeSingle();
      if (!pu.data || !pu.data.activo) return Response.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const body = await req.json().catch(function () { return {}; });
    const ids = Array.isArray(body.ids) ? body.ids : (body.id ? [body.id] : []);
    if (!ids.length) return Response.json({ error: 'sin ids' }, { status: 200 });

    const token = process.env.WASAPI_TOKEN;
    if (!token) return Response.json({ error: 'Falta WASAPI_TOKEN en Vercel.' }, { status: 200 });
    const fromId = process.env.WASAPI_FROM_ID;

    const rowsr = await sb.from('captacion_cola').select('*').in('id', ids).eq('estado', 'pendiente');
    const rows = rowsr.data || [];
    let enviados = 0, errores = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const payload = { message: r.mensaje, wa_id: r.whatsapp };
      if (fromId) payload.from_id = fromId;
      let err = null, wamid = null;
      try {
        const resp = await fetch(WASAPI_API + '/whatsapp-messages', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });
        const d = await resp.json();
        wamid = (d && d.data && d.data.wam_id) ? d.data.wam_id : null;
        if (!resp.ok) err = (d && (d.message || d.error)) || ('HTTP ' + resp.status);
      } catch (e) { err = String(e && e.message ? e.message : e); }
      if (err) { errores++; await sb.from('captacion_cola').update({ estado: 'error', error: err }).eq('id', r.id); }
      else {
        enviados++;
        await sb.from('captacion_cola').update({ estado: 'enviado', enviado_en: new Date().toISOString(), error: null }).eq('id', r.id);
        try { await sb.from('wa_mensajes').insert({ telefono: r.whatsapp, direccion: 'out', texto: r.mensaje, wamid: wamid }); } catch (e) {}
      }
    }
    return Response.json({ ok: true, enviados: enviados, errores: errores }, { status: 200 });
  } catch (e) {
    return Response.json({ error: String(e && e.message ? e.message : e) }, { status: 200 });
  }
}
