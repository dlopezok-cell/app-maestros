// app/api/wa-templates/route.js
// Lista las plantillas de mensajes creadas en Meta (WhatsApp Cloud API) para
// la cuenta de WhatsApp de la campaña, para que el panel las reconozca.
// Seguridad: solo el admin (sesión de Supabase) puede consultarlas.
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const ADMIN_EMAIL = 'dlopezok@gmail.com';
const GRAPH = 'https://graph.facebook.com/v21.0';
// WhatsApp Business Account (WABA) del número de la campaña (Andrea). No es secreto.
const WABA_ID = process.env.WHATSAPP_WABA_ID || '3112654475791357';

export async function GET(req) {
  try {
    const token = process.env.WHATSAPP_TOKEN;
    if (!token) return Response.json({ error: 'Falta WHATSAPP_TOKEN en Vercel.' }, { status: 200 });

    // Validar admin
    const authHeader = req.headers.get('authorization') || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) return Response.json({ error: 'No autorizado' }, { status: 401 });
    const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const ures = await supa.auth.getUser(jwt);
    const user = ures && ures.data ? ures.data.user : null;
    if (!user || user.email !== ADMIN_EMAIL) return Response.json({ error: 'No autorizado' }, { status: 401 });

    const url = GRAPH + '/' + WABA_ID + '/message_templates?fields=name,language,status,category,components&limit=250&access_token=' + encodeURIComponent(token);
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok) {
      const m = data && data.error ? data.error.message : 'Error de Meta';
      return Response.json({ error: m }, { status: 200 });
    }
    const items = (data.data || []).map(function (t) {
      return { name: t.name, language: t.language, status: t.status, category: t.category, components: t.components || [] };
    });
    return Response.json({ ok: true, templates: items }, { status: 200 });
  } catch (e) {
    return Response.json({ error: e.message || 'Error inesperado' }, { status: 200 });
  }
}
