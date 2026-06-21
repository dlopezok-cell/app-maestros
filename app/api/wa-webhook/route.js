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

// Envía una imagen o video por su URL (Cloud API). Best-effort.
async function enviarMediaCloud(sb, to, url, esVideo) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId || !url) return;
  const payload = esVideo
    ? { messaging_product: 'whatsapp', to: to, type: 'video', video: { link: url } }
    : { messaging_product: 'whatsapp', to: to, type: 'image', image: { link: url } };
  try {
    await fetch(GRAPH + '/' + phoneId + '/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    await sb.from('wa_mensajes').insert({ telefono: to, direccion: 'out', texto: (esVideo ? '[video] ' : '[foto] ') + url });
  } catch (e) {}
}

// Capa rápida y determinista: cubre las respuestas más comunes sin llamar a la IA.
function clasificarRapido(texto) {
  const raw = String(texto || '');
  // Emojis de aprobación => SÍ
  if (/[\u{1F44D}\u{1F44C}\u{1F64C}\u{2705}\u{1F646}\u{1F197}\u{1F4AA}]/u.test(raw)) return 'si';
  const t = raw.toLowerCase().replace(/[!¡.,:;()"]/g, ' ').replace(/\s+/g, ' ').trim();
  // Negativos claros
  if (/^(no|nop|nel|nope|paso|negativo)$/.test(t)) return 'no';
  if (/no me interesa|no gracias|no por ahora|por ahora no|no me sirve|no puedo|no estoy interes|no quiero|ya no trabajo|no hago/.test(t)) return 'no';
  // Positivos comunes (acepta o pide info)
  if (/\b(ok|oka|okay|okey|ya|dale|dele|listo|bueno|buena|claro|perfecto|de una|si|s[ií]|sip|sipo|obvio|por supuesto|me interesa|interesad|cu[eé]ntame|cuentame|mand[aá]|env[ií]a|env[ií]ame|pasa|p[aá]same|de acuerdo|conforme|vale|ya po|filo)\b/.test(t)) return 'si';
  return null; // que decida la IA
}

// La IA clasifica la respuesta del maestro: si / no / duda.
async function clasificarCaptacion(texto) {
  const rapido = clasificarRapido(texto);
  if (rapido) return rapido;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return 'si';
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 5, system: 'Eres un clasificador. Un maestro (gasfiter, electricista, etc.) recibio una invitacion para atender a un cliente. Clasifica SU respuesta. Responde SOLO una palabra: SI = acepta, muestra interes, dice ok/dale/ya/listo/bueno/claro, da las gracias positivamente, o pide mas informacion del trabajo. NO = rechaza claramente, no le interesa, no puede, no trabaja eso. DUDA = solo hace una pregunta sin aceptar ni rechazar. Ante la duda entre SI y NO, responde SI.', messages: [{ role: 'user', content: String(texto).slice(0, 300) }] })
    });
    const j = await r.json();
    const t = (j.content && j.content[0] && j.content[0].text ? j.content[0].text : '').toUpperCase();
    if (t.indexOf('NO') >= 0) return 'no';
    if (t.indexOf('DUDA') >= 0) return 'duda';
    return 'si';
  } catch (e) { return 'si'; }
}

// Plantillas por defecto (si el admin no las ha personalizado).
const DEF_SI = '\u00a1Gracias por responder! \ud83d\ude4c Te paso lo que necesita el cliente:\n\n\ud83d\udcdd {pedido}\n\n\ud83d\udc47 Te mando tambi\u00e9n las fotos y videos que subi\u00f3.\n\nSi quieres tomarlo, cr\u00e9ale un presupuesto directo en la plataforma. Solo reg\u00edstrate (es gratis y r\u00e1pido) y cot\u00edzale ac\u00e1 \ud83d\udc49 {link}';
const DEF_NO = '\u00a1Sin problema! \ud83d\ude4c Si m\u00e1s adelante quieres recibir clientes de tu zona, ac\u00e1 estamos: {link}';

// Reemplaza {oficio} {comuna} {pedido} {link} y limpia líneas vacías si falta el pedido.
function renderCaptacion(tpl, row) {
  const pedido = (row && row.pedido_texto) ? String(row.pedido_texto) : '';
  const comuna = (row && row.comuna) ? String(row.comuna) : '';
  let out = String(tpl || '')
    .replace(/\{ _en_ \}/g, comuna ? ' en ' : '')
    .replace(/\{oficio\}/g, (row && row.oficio) ? row.oficio : 'un servicio')
    .replace(/\{comuna\}/g, comuna)
    .replace(/\{pedido\}/g, pedido)
    .replace(/\{link\}/g, (row && row.presupuesto_id) ? 'https://www.maestrosenlinea.cl/maestros?pedido=' + row.presupuesto_id : 'https://www.maestrosenlinea.cl/maestros');
  if (!pedido) {
    // quita comillas o líneas que quedaron vacías
    out = out.replace(/\n*\u201c\u201d\n*/g, '\n\n').replace(/\n*""\n*/g, '\n\n');
  }
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

// Maneja la respuesta a una captación: detalles+link o cierre cordial.
async function manejarCaptacion(sb, from, texto, row, cfg) {
  const intento = await clasificarCaptacion(texto);
  if (intento === 'no') {
    const tplNo = (cfg && cfg.captacion_msg_no) ? cfg.captacion_msg_no : DEF_NO;
    await enviarTextoCloud(sb, from, renderCaptacion(tplNo, row));
    await sb.from('captacion_cola').update({ estado: 'no_interesado' }).eq('id', row.id);
    return true;
  }
  // SI / DUDA: cargamos el detalle completo del pedido (descripción + fotos/videos).
  let pres = null;
  try {
    if (row.presupuesto_id) {
      const pr = await sb.from('presupuestos').select('descripcion,titulo,archivos,video_url').eq('id', row.presupuesto_id).maybeSingle();
      pres = pr.data;
    }
  } catch (e) {}
  const detalle = pres ? (((pres.descripcion && pres.descripcion.trim()) ? pres.descripcion.trim() : (pres.titulo && pres.titulo.trim() ? pres.titulo.trim() : '')) || '') : '';
  const rowFull = Object.assign({}, row, { pedido_texto: detalle || row.pedido_texto });
  const tplSi = (cfg && cfg.captacion_msg_si) ? cfg.captacion_msg_si : DEF_SI;
  await enviarTextoCloud(sb, from, renderCaptacion(tplSi, rowFull));
  // Enviar las fotos y videos que subió el cliente (hasta 10).
  try {
    const media = (pres && Array.isArray(pres.archivos)) ? pres.archivos : [];
    let n = 0;
    for (let i = 0; i < media.length && n < 10; i++) {
      const mu = media[i] && media[i].url ? media[i].url : null;
      if (!mu) continue;
      await enviarMediaCloud(sb, from, mu, media[i].tipo === 'video');
      n++;
    }
    if (!n && pres && pres.video_url) { await enviarMediaCloud(sb, from, pres.video_url, true); }
  } catch (e) {}
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
        const cfgH = await sb.from('home_config').select('captacion_activa, captacion_msg_si, captacion_msg_no').eq('id', 1).maybeSingle();
        if (cfgH.data && cfgH.data.captacion_activa) {
          const cr = await sb.from('captacion_cola').select('id, presupuesto_id, oficio, comuna, pedido_texto').eq('whatsapp', from).eq('estado', 'enviado').order('creado_en', { ascending: false }).limit(1);
          const row = cr.data && cr.data[0];
          if (row) manejadoCaptacion = await manejarCaptacion(sb, from, texto, row, cfgH.data);
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
