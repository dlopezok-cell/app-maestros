// app/api/wa-webhook/route.js
// Webhook de WhatsApp Cloud API: recibe mensajes entrantes, los registra y
// (si el agente está activo) responde con IA en la voz de "Andrea".
// Variables de entorno (Vercel):
//   WHATSAPP_TOKEN          token del número (System User) — ya existe
//   WHATSAPP_PHONE_ID       Phone Number ID — ya existe
//   WHATSAPP_VERIFY_TOKEN   palabra secreta para verificar el webhook en Meta
//   WHATSAPP_APP_SECRET     (recomendado) secreto de la app de Meta, para validar firma
//   ANTHROPIC_API_KEY       clave de Anthropic — ya existe
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const runtime = 'nodejs';

const GRAPH = 'https://graph.facebook.com/v21.0';

// --- Verificación del webhook (Meta hace un GET la primera vez) ---
export async function GET(req) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const verify = process.env.WHATSAPP_VERIFY_TOKEN || 'maestros-verify';
  if (mode === 'subscribe' && token === verify) {
    return new Response(challenge || '', { status: 200, headers: { 'content-type': 'text/plain' } });
  }
  return new Response('forbidden', { status: 403 });
}

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Construye mensajes alternados user/assistant para Anthropic (fusiona consecutivos del mismo rol).
function armarMensajes(hist) {
  const out = [];
  for (let i = 0; i < hist.length; i++) {
    const role = hist[i].direccion === 'in' ? 'user' : 'assistant';
    const txt = (hist[i].texto || '').trim();
    if (!txt) continue;
    if (out.length && out[out.length - 1].role === role) {
      out[out.length - 1].content += '\n' + txt;
    } else {
      out.push({ role: role, content: txt });
    }
  }
  while (out.length && out[0].role !== 'user') out.shift(); // debe empezar con user
  return out;
}

async function responderIA(sb, from, config) {
  // Historial reciente para dar contexto.
  const hist = await sb.from('wa_mensajes').select('direccion, texto').eq('telefono', from).order('creado_en', { ascending: true }).limit(20);
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

  // Enviar por la API de WhatsApp.
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  let wamid = null;
  try {
    const r2 = await fetch(GRAPH + '/' + phoneId + '/messages', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: from, type: 'text', text: { body: texto } })
    });
    const d2 = await r2.json();
    wamid = d2.messages && d2.messages[0] ? d2.messages[0].id : null;
  } catch (e) {}
  await sb.from('wa_mensajes').insert({ telefono: from, direccion: 'out', texto: texto, wamid: wamid });
}

export async function POST(req) {
  // Leemos el cuerpo crudo para poder validar la firma de Meta.
  const raw = await req.text();
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (secret) {
    const sig = req.headers.get('x-hub-signature-256') || '';
    const esperado = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
    if (sig !== esperado) return new Response('forbidden', { status: 403 });
  }

  let body;
  try { body = JSON.parse(raw); } catch (e) { return new Response('ok', { status: 200 }); }

  try {
    const sb = admin();
    const entry = body.entry && body.entry[0];
    const change = entry && entry.changes && entry.changes[0];
    const value = change && change.value;
    const msg = value && value.messages && value.messages[0];
    if (!msg) return new Response('ok', { status: 200 }); // estados de entrega u otros eventos

    const from = String(msg.from || '').replace(/[^0-9]/g, '');
    const wamid = msg.id || null;

    // Dedup: si ya procesamos este wamid, salir.
    if (wamid) {
      const dup = await sb.from('wa_mensajes').select('id').eq('wamid', wamid).maybeSingle();
      if (dup.data) return new Response('ok', { status: 200 });
    }

    let nombre = '';
    try { nombre = (value.contacts && value.contacts[0] && value.contacts[0].profile && value.contacts[0].profile.name) || ''; } catch (e) {}

    let texto = '';
    let esTexto = false;
    if (msg.type === 'text' && msg.text) { texto = msg.text.body || ''; esTexto = true; }
    else if (msg.type === 'button' && msg.button) { texto = msg.button.text || ''; esTexto = true; }
    else if (msg.type === 'interactive' && msg.interactive) {
      const it = msg.interactive;
      texto = (it.button_reply && it.button_reply.title) || (it.list_reply && it.list_reply.title) || '';
      esTexto = !!texto;
    } else {
      texto = '[' + (msg.type || 'mensaje') + ']';
    }

    await sb.from('wa_mensajes').insert({ telefono: from, nombre: nombre, direccion: 'in', texto: texto, wamid: wamid });

    const cfg = await sb.from('ia_config').select('activo, modelo, prompt').eq('id', 1).maybeSingle();
    const config = cfg.data || { activo: false };
    if (config.activo && esTexto && from) {
      await responderIA(sb, from, config);
    }
  } catch (e) { /* nunca tirar error a Meta */ }

  return new Response('ok', { status: 200 });
}
