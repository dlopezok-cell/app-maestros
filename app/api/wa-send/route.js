// app/api/wa-send/route.js
// Envía plantillas aprobadas por la WhatsApp Cloud API de Meta.
// Seguridad: solo el admin (validado con su sesión de Supabase) puede llamar a esta ruta.
// Config (variables de entorno en Vercel):
//   WHATSAPP_TOKEN     -> token de acceso (System User, permanente)
//   WHATSAPP_PHONE_ID  -> Phone Number ID del número
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const ADMIN_EMAIL = 'dlopezok@gmail.com';
const GRAPH = 'https://graph.facebook.com/v21.0';

export async function POST(req) {
  try {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    if (!token || !phoneId) {
      return Response.json({ error: 'Falta configurar WHATSAPP_TOKEN o WHATSAPP_PHONE_ID en Vercel.' }, { status: 200 });
    }

    // 1) Validar que quien llama es el admin (sesión de Supabase)
    const authHeader = req.headers.get('authorization') || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) return Response.json({ error: 'No autorizado (sin sesión).' }, { status: 401 });
    const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const ures = await supa.auth.getUser(jwt);
    const user = ures && ures.data ? ures.data.user : null;
    if (!user || user.email !== ADMIN_EMAIL) return Response.json({ error: 'No autorizado.' }, { status: 401 });

    // 2) Datos del mensaje
    const body = await req.json();
    const to = String(body.to || '').replace(/[^0-9]/g, '');
    const template = (body.template || '').trim();
    const lang = (body.lang || 'es').trim();
    const params = Array.isArray(body.params) ? body.params : [];
    if (!to || !template) return Response.json({ error: 'Faltan datos (número o nombre de plantilla).' }, { status: 200 });

    const components = [];
    if (params.length) {
      components.push({
        type: 'body',
        parameters: params.map(function (p) { return { type: 'text', text: String(p) }; })
      });
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'template',
      template: { name: template, language: { code: lang }, components: components }
    };

    // 3) Enviar a Meta
    const r = await fetch(GRAPH + '/' + phoneId + '/messages', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await r.json();
    if (!r.ok) {
      const m = data && data.error ? data.error.message : 'Error de Meta';
      return Response.json({ error: m }, { status: 200 });
    }
    return Response.json({ ok: true, id: data.messages && data.messages[0] ? data.messages[0].id : null }, { status: 200 });
  } catch (e) {
    return Response.json({ error: e.message || 'Error inesperado' }, { status: 200 });
  }
}
