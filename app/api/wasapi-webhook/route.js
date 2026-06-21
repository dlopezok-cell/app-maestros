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
const GRAPH = 'https://graph.facebook.com/v21.0';

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

async function enviarWasapiTexto(sb, waId, fromId, texto) {
  const token = process.env.WASAPI_TOKEN;
  if (!token || !texto) return null;
  const body = { message: texto, wa_id: waId };
  if (fromId) body.from_id = fromId;
  let outId = null;
  try {
    const r = await fetch(WASAPI_API + '/whatsapp-messages', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    outId = (d && d.data && d.data.wam_id) ? d.data.wam_id : null;
  } catch (e) {}
  try { await sb.from('wa_mensajes').insert({ telefono: waId, direccion: 'out', texto: texto, wamid: outId }); } catch (e) {}
  return outId;
}

// --- Envío por Meta WhatsApp Cloud (texto + media). El maestro acaba de responder,
// así que la ventana de 24h está abierta y se permite texto libre + imágenes. ---
async function enviarTextoCloud(sb, to, texto) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId || !texto) return;
  let wamid = null;
  try {
    const r = await fetch(GRAPH + '/' + phoneId + '/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', to: to, type: 'text', text: { body: texto } }) });
    const dd = await r.json();
    wamid = dd.messages && dd.messages[0] ? dd.messages[0].id : null;
  } catch (e) {}
  try { await sb.from('wa_mensajes').insert({ telefono: to, direccion: 'out', texto: texto, wamid: wamid }); } catch (e) {}
}
async function enviarMediaCloud(sb, to, url, esVideo) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId || !url) return;
  const payload = esVideo ? { messaging_product: 'whatsapp', to: to, type: 'video', video: { link: url } } : { messaging_product: 'whatsapp', to: to, type: 'image', image: { link: url } };
  try {
    await fetch(GRAPH + '/' + phoneId + '/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    await sb.from('wa_mensajes').insert({ telefono: to, direccion: 'out', texto: (esVideo ? '[video] ' : '[foto] ') + url });
  } catch (e) {}
}

// Plantillas por defecto (si el admin no las personalizó en el panel).
const DEF_SI = '\u00a1Gracias por responder! \ud83d\ude4c Te paso lo que necesita el cliente:\n\n\ud83d\udcdd {pedido}\n\n\ud83d\udc47 Te mando tambi\u00e9n las fotos y videos que subi\u00f3.\n\nSi quieres tomarlo, cr\u00e9ale un presupuesto directo en la plataforma. Solo reg\u00edstrate (es gratis y r\u00e1pido) y cot\u00edzale ac\u00e1 \ud83d\udc49 {link}';
const DEF_NO = '\u00a1Sin problema! \ud83d\ude4c Si m\u00e1s adelante quieres recibir clientes de tu zona, ac\u00e1 estamos: {link}';

function renderCaptacion(tpl, row) {
  const pedido = (row && row.pedido_texto) ? String(row.pedido_texto) : '';
  const comuna = (row && row.comuna) ? String(row.comuna) : '';
  let out = String(tpl || '')
    .replace(/\{ _en_ \}/g, comuna ? ' en ' : '')
    .replace(/\{oficio\}/g, (row && row.oficio) ? row.oficio : 'un servicio')
    .replace(/\{comuna\}/g, comuna)
    .replace(/\{pedido\}/g, pedido)
    .replace(/\{link\}/g, 'https://www.maestrosenlinea.cl/unete');
  if (!pedido) out = out.replace(/\n*\u201c\u201d\n*/g, '\n\n').replace(/\n*""\n*/g, '\n\n');
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

// Capa rápida y determinista: respuestas comunes sin llamar a la IA.
function clasificarRapido(texto) {
  const raw = String(texto || '');
  if (/[\u{1F44D}\u{1F44C}\u{1F64C}\u{2705}\u{1F646}\u{1F197}\u{1F4AA}]/u.test(raw)) return 'si';
  const t = raw.toLowerCase().replace(/[!¡.,:;()"]/g, ' ').replace(/\s+/g, ' ').trim();
  if (/^(no|nop|nel|nope|paso|negativo)$/.test(t)) return 'no';
  if (/no me interesa|no gracias|no por ahora|por ahora no|no me sirve|no puedo|no estoy interes|no quiero|ya no trabajo|no hago/.test(t)) return 'no';
  if (/\b(ok|oka|okay|okey|ya|dale|dele|listo|bueno|buena|claro|perfecto|de una|si|s[ií]|sip|sipo|obvio|por supuesto|me interesa|interesad|cu[eé]ntame|cuentame|mand[aá]|env[ií]a|env[ií]ame|pasa|p[aá]same|de acuerdo|conforme|vale|ya po|filo)\b/.test(t)) return 'si';
  return null;
}

// La IA clasifica la respuesta del maestro a la invitación: si / no / duda.
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

// Maneja la respuesta a una captación: detalles+fotos+link (por Cloud) o cierre cordial.
async function manejarCaptacion(sb, waId, fromId, texto, row, cfg) {
  const intento = await clasificarCaptacion(texto);
  if (intento === 'no') {
    const tplNo = (cfg && cfg.captacion_msg_no) ? cfg.captacion_msg_no : DEF_NO;
    await enviarTextoCloud(sb, waId, renderCaptacion(tplNo, row));
    await sb.from('captacion_cola').update({ estado: 'no_interesado' }).eq('id', row.id);
    return true;
  }
  // SI / DUDA: cargar el detalle completo del pedido (descripción + fotos/videos).
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
  await enviarTextoCloud(sb, waId, renderCaptacion(tplSi, rowFull));
  try {
    const media = (pres && Array.isArray(pres.archivos)) ? pres.archivos : [];
    let n = 0;
    for (let i = 0; i < media.length && n < 10; i++) {
      const mu = media[i] && media[i].url ? media[i].url : null;
      if (!mu) continue;
      await enviarMediaCloud(sb, waId, mu, media[i].tipo === 'video');
      n++;
    }
    if (!n && pres && pres.video_url) { await enviarMediaCloud(sb, waId, pres.video_url, true); }
  } catch (e) {}
  await sb.from('captacion_cola').update({ estado: 'detalle_enviado' }).eq('id', row.id);
  return true;
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

    // ¿Es respuesta a una captación auto? La IA decide y manda los detalles.
    let manejadoCaptacion = false;
    if (esTexto) {
      try {
        const cfgH = await sb.from('home_config').select('captacion_activa, captacion_msg_si, captacion_msg_no').eq('id', 1).maybeSingle();
        if (cfgH.data && cfgH.data.captacion_activa) {
          const cr = await sb.from('captacion_cola').select('id, presupuesto_id, oficio, comuna, pedido_texto').eq('whatsapp', tel).eq('estado', 'enviado').order('creado_en', { ascending: false }).limit(1);
          const row = cr.data && cr.data[0];
          if (row) manejadoCaptacion = await manejarCaptacion(sb, tel, fromId, texto, row, cfgH.data);
        }
      } catch (e) {}
    }

    if (!manejadoCaptacion) {
      const cfg = await sb.from('ia_config').select('activo, modelo, prompt').eq('id', 1).maybeSingle();
      const config = cfg.data || { activo: false };
      if (config.activo && esTexto) {
        await responderIA(sb, tel, fromId, config);
      }
    }
  } catch (e) { /* nunca tirar error al proveedor */ }

  return new Response('ok', { status: 200 });
}
