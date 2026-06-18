// app/api/wasapi-webhook/route.js
// Webhook para WASAPI (BSP de WhatsApp). Recibe mensajes entrantes de la línea de
// maestros, los registra en wa_mensajes y (si el agente está activo) responde con IA
// en la voz de "Andrea", enviando la respuesta por la API de Wasapi.
//
// Variables de entorno (Vercel):
//   WASAPI_TOKEN     Bearer token de la API de Wasapi (Llaves API en app.wasapi.io)  [requerido para responder]
//   WASAPI_FROM_ID   (opcional) from_id de la línea de maestros en Wasapi (fallback si el webhook no lo trae)
//   WASAPI_DEBUG     (opcional) si = '1', guarda el payload crudo para inspeccionar el formato
//   ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL  (ya existen)
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const WASAPI_API = 'https://api-ws.wasapi.io/api/v1';

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Algunos webhooks hacen un GET de verificación; respondemos OK.
export async function GET() {
  return new Response('ok', { status: 200, headers: { 'content-type': 'text/plain' } });
}

// Busca un valor en varias rutas posibles del payload (Wasapi puede anidar en data/message/contact).
function pick(obj, paths) {
  for (const p of paths) {
    const parts = p.split('.');
    let v = obj;
    let ok = true;
    for (const k of parts) {
      if (v && typeof v === 'object' && k in v) v = v[k];
      else { ok = false; break; }
    }
    if (ok && v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

// Construye mensajes alternados user/assistant para Anthropic.
function armarMensajes(hist) {
  const out = [];
  for (let i = 0; i < hist.length; i++) {
    const role = hist[i].direccion === 'in' ? 'user' : 'assistant';
    const txt = (hist[i].texto || '').trim();
    if (!txt) continue;
    if (out.length && out[out.length - 1].role === role) out[out.length - 1].content += '\n' + txt;
    else out.push({ role: role, content: txt });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

async function responderIA(sb, waId, fromId, config) {
  const hist = await sb.from('wa_mensajes').select('direccion, texto').eq('telefono', waId).order('creado_en', { ascending: true }).limit(20);
  const mensajes = armarMensajes(hist.data || []);
  if (!mensajes.length) return;

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return;
  let texto = '';
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: config.modelo || 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: config.prompt || '',
        messages: mensajes
      })
    });
    const j = await r.json();
    if (j.content && j.content[0] && j.content[0].text) texto = j.content[0].text.trim();
  } catch (e) { return; }
  if (!texto) return;

  // Enviar por la API de Wasapi.
  const token = process.env.WASAPI_TOKEN;
  if (!token) return;
  const body = { message: texto, wa_id: waId };
  if (fromId) body.from_id = fromId;
  let outId = null;
  try {
    const r2 = await fetch(WASAPI_API + '/whatsapp-messages', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    });
    const d2 = await r2.json();
    outId = (d2 && d2.data && d2.data.wam_id) ? d2.data.wam_id : null;
  } catch (e) {}
  await sb.from('wa_mensajes').insert({ telefono: waId, direccion: 'out', texto: texto, wamid: outId });
}

export async function POST(req) {
  const raw = await req.text();
  let body;
  try { body = JSON.parse(raw); } catch (e) { return new Response('ok', { status: 200 }); }

  try {
    const sb = admin();

    // DEBUG: guardar el payload crudo una vez para conocer el formato exacto.
    if (process.env.WASAPI_DEBUG === '1') {
      try { await sb.from('wa_mensajes').insert({ telefono: 'debug-wasapi', direccion: 'in', texto: '[RAW] ' + raw.slice(0, 1500) }); } catch (e) {}
    }

    // Algunos webhooks de Wasapi envuelven en data/payload/message.
    const d = body.data || body.payload || body;

    // Dirección: solo respondemos a entrantes. Si viene type 'out' o from_me, ignorar la respuesta.
    const tipo = pick(body, ['type', 'data.type', 'direction', 'data.direction']);
    const esEntrante = !(tipo === 'out' || tipo === 'outbound' || body.from_me === true);

    // Número del cliente (remitente).
    const waId = pick(body, [
      'wa_id', 'data.wa_id', 'contact.wa_id', 'data.contact.wa_id',
      'from', 'data.from', 'phone', 'data.phone', 'contact.phone'
    ]);

    // Texto del mensaje.
    let texto = pick(body, [
      'message', 'data.message', 'text', 'data.text', 'body', 'data.body',
      'message.text.body', 'data.message.text.body'
    ]);

    // Nombre del contacto.
    const nombre = pick(body, [
      'contact.full_name', 'data.contact.full_name', 'contact.name', 'data.contact.name',
      'name', 'data.name', 'profile.name'
    ]) || '';

    // from_id de la línea (para responder por la misma). Fallback a env.
    const fromId = pick(body, ['from_id', 'data.from_id', 'whatsapp_id', 'data.whatsapp_id']) || process.env.WASAPI_FROM_ID || null;

    // wamid para dedup.
    const wamid = pick(body, ['wam_id', 'data.wam_id', 'id', 'data.id', 'message_id', 'data.message_id']);

    if (!waId || !esEntrante) return new Response('ok', { status: 200 });

    const esTexto = typeof texto === 'string' && texto.trim().length > 0;
    if (!esTexto) texto = '[' + (pick(body, ['message_type', 'data.message_type', 'type']) || 'mensaje') + ']';

    const tel = String(waId).replace(/[^0-9]/g, '');

    // Dedup por wamid.
    if (wamid) {
      const dup = await sb.from('wa_mensajes').select('id').eq('wamid', String(wamid)).maybeSingle();
      if (dup.data) return new Response('ok', { status: 200 });
    }

    await sb.from('wa_mensajes').insert({ telefono: tel, nombre: nombre, direccion: 'in', texto: texto, wamid: wamid ? String(wamid) : null });

    const cfg = await sb.from('ia_config').select('activo, modelo, prompt').eq('id', 1).maybeSingle();
    const config = cfg.data || { activo: false };
    if (config.activo && esTexto) {
      await responderIA(sb, tel, fromId, config);
    }
  } catch (e) { /* nunca tirar error al proveedor */ }

  return new Response('ok', { status: 200 });
}
