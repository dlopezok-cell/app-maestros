// app/api/wa-template-create/route.js
// Crea una plantilla de WhatsApp en Meta (queda PENDIENTE de aprobación de Meta).
// Solo el admin (sesión Supabase). Reusa WHATSAPP_TOKEN y WHATSAPP_WABA_ID.
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
const ADMIN_EMAIL = 'dlopezok@gmail.com';
const GRAPH = 'https://graph.facebook.com/v21.0';
const WABA_ID = process.env.WHATSAPP_WABA_ID || '3112654475791357';

function admin() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); }

export async function POST(req) {
  try {
    const token = process.env.WHATSAPP_TOKEN;
    if (!token) return Response.json({ error: 'Falta WHATSAPP_TOKEN en Vercel.' }, { status: 200 });

    const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!jwt) return Response.json({ error: 'No autorizado.' }, { status: 401 });
    const sb = admin();
    const ures = await sb.auth.getUser(jwt);
    const user = ures && ures.data ? ures.data.user : null;
    if (!user || user.email !== ADMIN_EMAIL) return Response.json({ error: 'No autorizado.' }, { status: 401 });

    const b = await req.json().catch(function () { return {}; });
    // Normalizar nombre: minúsculas, sólo a-z 0-9 _
    let name = String(b.name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    name = name.replace(/[^a-z0-9_ ]/g, '').trim().replace(/\s+/g, '_').slice(0, 60);
    const category = (b.category === 'UTILITY') ? 'UTILITY' : 'MARKETING';
    const language = (b.language || 'es').trim();
    const body = String(b.body || '').trim();
    const footer = String(b.footer || '').trim();
    const ejemplos = Array.isArray(b.ejemplos) ? b.ejemplos.map(function (x) { return String(x || '').trim(); }) : [];

    if (!name) return Response.json({ error: 'Falta el nombre de la plantilla.' }, { status: 200 });
    if (!body) return Response.json({ error: 'Falta el cuerpo del mensaje.' }, { status: 200 });

    // Variables {{n}} en el cuerpo
    const vars = (body.match(/\{\{\s*\d+\s*\}\}/g) || []);
    const components = [];
    const bodyComp = { type: 'BODY', text: body };
    if (vars.length > 0) {
      const ej = [];
      for (let i = 0; i < vars.length; i++) ej.push(ejemplos[i] || ('ejemplo' + (i + 1)));
      bodyComp.example = { body_text: [ej] };
    }
    components.push(bodyComp);
    if (footer) components.push({ type: 'FOOTER', text: footer.slice(0, 60) });

    const payload = { name: name, language: language, category: category, components: components, allow_category_change: true };

    const r = await fetch(GRAPH + '/' + WABA_ID + '/message_templates?access_token=' + encodeURIComponent(token), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!r.ok) {
      const m = data && data.error ? (data.error.error_user_msg || data.error.message) : 'Error de Meta';
      return Response.json({ error: m }, { status: 200 });
    }
    return Response.json({ ok: true, id: data.id || null, status: data.status || 'PENDING', category: data.category || category, name: name }, { status: 200 });
  } catch (e) {
    return Response.json({ error: String(e && e.message ? e.message : e) }, { status: 200 });
  }
}
