// app/api/wasapi-send/route.js
// Envío de texto libre por la línea de WhatsApp (Wasapi) desde el panel admin (inbox del embudo).
// Solo el admin (validado con su sesión de Supabase) puede llamar a esta ruta.
// Variables de entorno (Vercel): WASAPI_TOKEN, WASAPI_FROM_ID (opcional),
//   SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL.
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const ADMIN_EMAIL = 'dlopezok@gmail.com';
const WASAPI_API = 'https://api-ws.wasapi.io/api/v1';

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) return Response.json({ error: 'No autorizado (sin sesión).' }, { status: 401 });
    const sb = admin();
    const ures = await sb.auth.getUser(jwt);
    const user = ures && ures.data ? ures.data.user : null;
    if (!user || user.email !== ADMIN_EMAIL) return Response.json({ error: 'No autorizado.' }, { status: 401 });

    const body = await req.json();
    const waId = String(body.wa_id || body.telefono || '').replace(/[^0-9]/g, '');
    const texto = (body.texto || body.message || '').toString().trim();
    if (!waId || !texto) return Response.json({ error: 'Falta número o texto.' }, { status: 200 });

    const token = process.env.WASAPI_TOKEN;
    if (!token) return Response.json({ error: 'Falta WASAPI_TOKEN en Vercel.' }, { status: 200 });

    const payload = { message: texto, wa_id: waId };
    const fromId = process.env.WASAPI_FROM_ID;
    if (fromId) payload.from_id = fromId;

    let outId = null;
    let err = null;
    try {
      const r = await fetch(WASAPI_API + '/whatsapp-messages', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      outId = (d && d.data && d.data.wam_id) ? d.data.wam_id : null;
      if (!r.ok) err = (d && (d.message || d.error)) || ('HTTP ' + r.status);
    } catch (e) { err = String(e && e.message ? e.message : e); }

    await sb.from('wa_mensajes').insert({ telefono: waId, direccion: 'out', texto: texto, wamid: outId });

    if (err) return Response.json({ ok: false, error: err }, { status: 200 });
    return Response.json({ ok: true, wamid: outId }, { status: 200 });
  } catch (e) {
    return Response.json({ error: String(e && e.message ? e.message : e) }, { status: 200 });
  }
}
