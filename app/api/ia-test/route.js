// app/api/ia-test/route.js
// Genera una respuesta del agente "Andrea" para un mensaje dado, SIN enviarla.
// Sirve para probar el prompt y como asistente "sugiere y tú envías".
// Seguridad: solo admin / usuario de panel activo.
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
const ADMIN_EMAIL = 'dlopezok@gmail.com';

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) return Response.json({ error: 'No autorizado' }, { status: 401 });
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const ures = await sb.auth.getUser(jwt);
    const user = ures && ures.data ? ures.data.user : null;
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });
    if (user.email !== ADMIN_EMAIL) {
      const pu = await sb.from('panel_usuarios').select('activo').eq('email', user.email).maybeSingle();
      if (!pu.data || !pu.data.activo) return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const mensaje = (body.mensaje || '').trim();
    if (!mensaje) return Response.json({ error: 'Escribe un mensaje de prueba.' }, { status: 200 });

    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return Response.json({ error: 'Falta ANTHROPIC_API_KEY en el servidor.' }, { status: 200 });

    // Prompt actual del agente (lo que el admin guardó).
    const cfg = await sb.from('ia_config').select('modelo, prompt').eq('id', 1).maybeSingle();
    const config = cfg.data || {};
    const promptCfg = body.prompt || config.prompt || '';

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: config.modelo || 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: promptCfg,
        messages: [{ role: 'user', content: mensaje }]
      })
    });
    const j = await r.json();
    if (!r.ok) return Response.json({ error: (j.error && j.error.message) || 'Error de IA' }, { status: 200 });
    let texto = '';
    if (j.content && j.content[0] && j.content[0].text) texto = j.content[0].text.trim();
    return Response.json({ ok: true, reply: texto }, { status: 200 });
  } catch (e) {
    return Response.json({ error: e.message || 'Error inesperado' }, { status: 200 });
  }
}
