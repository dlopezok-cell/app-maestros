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

async function enviarTextoCloud(sb, to, texto) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId || !texto) return;
  let wamid = null;
  try {
    const r = await fetch(GRAPH + '/' + phoneId + '/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', to: to, type: 'text', text: { body: texto } }) });
    const d = await r.json();
    wamid = d.messages && d.messages[0] ? d.messages[0].id : null;
  } catch (e) {}
  try { await sb.from('wa_mensajes').insert({ telefono: to, direccion: 'out', texto: texto, wamid: wamid }); } catch (e) {}
}

// La IA clasifica la respuesta del maestro: si / no / duda.
async function clasificarCaptacion(texto) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return 'si';
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 5, system: 'Clasifica la respuesta de un maestro a una invitacion a una plataforma. Responde SOLO una palabra, sin puntuacion: SI (acepta, le interesa o pide mas info), NO (rechaza claramente), DUDA (pregunta algo).', messages: [{ role: 'user', content: String(texto).slice(0, 300) }] })
    });
    const j = await r.json();
    const t = (j.content && j.content[0] && j.content[0].text ? j.content[0].text : '').toUpperCase();
    if (t.indexOf('NO') >= 0) return 'no';
    if (t.indexOf('DUDA') >= 0) return 'duda';
    return 'si';
  } catch (e) { return 'si'; }
}

// Maneja la respuesta a una captación: detalles+link o cierre cordial.
async function manejarCaptacion(sb, from, texto, row) {
  const intento = await clasificarCaptacion(texto);
  if (intento === 'no') {
    await enviarTextoCloud(sb, from, '¡Sin problema! 🙌 Si más adelante quieres recibir clientes de tu zona, acá estamos: https://www.maestrosenlinea.cl/unete');
    await sb.from('captacion_cola').update({ estado: 'no_interesado' }).eq('id', row.id);
    return true;
  }
  let det = '¡Gracias por responder! 🙌 El cliente necesita *' + (row.oficio || 'un servicio') + '*' + (row.comuna ? ' en *' + row.comuna + '*' : '') + '.';
  if (row.pedido_texto) det += '\n\n“' + row.pedido_texto + '”';
  det += '\n\nPara ver el detalle completo y enviarle tu presupuesto, súmate gratis acá 👉 https://www.maestrosenlinea.cl/unete';
  await enviarTextoCloud(sb, from, det);
  await sb.from('captacion_cola').update({ estado: 'detalle_enviado' }).eq('id', row.id);
  return true;
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

    // ¿Es respuesta a una captación auto? La IA decide y manda los detalles.
    let manejadoCaptacion = false;
    if (esTexto && from) {
      try {
        const cfgH = await sb.from('home_config').select('captacion_activa').eq('id', 1).maybeSingle();
        if (cfgH.data && cfgH.data.captacion_activa) {
          const cr = await sb.from('captacion_cola').select('id, oficio, comuna, pedido_texto').eq('whatsapp', from).eq('estado', 'enviado').order('creado_en', { ascending: false }).limit(1);
          const row = cr.data && cr.data[0];
          if (row) manejadoCaptacion = await manejarCaptacion(sb, from, texto, row);
        }
      } catch (e) {}
    }

    if (!manejadoCaptacion) {
      const cfg = await sb.from('ia_config').select('activo, modelo, prompt').eq('id', 1).maybeSingle();
      const config = cfg.data || { activo: false };
      if (config.activo && esTexto && from) {
        await responderIA(sb, from, config);
      }
    }
  } catch (e) { /* nunca tirar error a Meta */ }

  return new Response('ok', { status: 200 });
}
