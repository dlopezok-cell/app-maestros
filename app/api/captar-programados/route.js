// Envía los maestros que quedaron 'programado' (pedidos hechos fuera del horario).
// Corre por Vercel Cron al abrir la ventana; solo envía si estamos dentro del horario.
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

const GRAPH = 'https://graph.facebook.com/v21.0';
const CAPT_TEMPLATE = process.env.CAPTACION_TEMPLATE || 'tengo_un_cliente';
const LINK = 'https://www.maestrosenlinea.cl/unete';

function admin() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); }

function chileMinutos() {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    let h = 0, m = 0;
    for (const pp of parts) { if (pp.type === 'hour') h = parseInt(pp.value, 10); if (pp.type === 'minute') m = parseInt(pp.value, 10); }
    return ((h % 24) * 60) + m;
  } catch (e) { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
}
function parseHM(v, def) { if (!v) return def; const mm = String(v).match(/(\d{1,2})\s*:?\s*(\d{2})?/); if (!mm) return def; return (parseInt(mm[1], 10) % 24) * 60 + (mm[2] ? parseInt(mm[2], 10) : 0); }
function enHorario(cfg) {
  const ini = parseHM(cfg && cfg.captacion_hora_ini, 600);
  const fin = parseHM(cfg && cfg.captacion_hora_fin, 1080);
  const now = chileMinutos();
  return ini <= fin ? (now >= ini && now < fin) : (now >= ini || now < fin);
}

async function buscarPlantilla(token, nombre) {
  try {
    const waba = process.env.WHATSAPP_WABA_ID;
    const r = await fetch(GRAPH + '/' + waba + '/message_templates?name=' + encodeURIComponent(nombre) + '&limit=5', { headers: { Authorization: 'Bearer ' + token } });
    const j = await r.json();
    const t = (j.data || []).filter(function (x) { return x.status === 'APPROVED'; })[0] || (j.data || [])[0];
    if (!t) return null;
    return { language: t.language };
  } catch (e) { return null; }
}
async function enviarPlantilla(token, phoneId, lang, to, comuna, oficio) {
  try {
    const r = await fetch(GRAPH + '/' + phoneId + '/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', to: to, type: 'template', template: { name: CAPT_TEMPLATE, language: { code: lang }, components: [{ type: 'body', parameters: [{ type: 'text', text: String(comuna || '') }, { type: 'text', text: String(oficio || '') }] }] } }) });
    const d = await r.json();
    return { ok: !!(d.messages && d.messages[0]), id: d.messages && d.messages[0] ? d.messages[0].id : null, error: d.error ? (d.error.message || 'error') : null };
  } catch (e) { return { ok: false, error: String(e && e.message ? e.message : e) }; }
}

async function run() {
  const sb = admin();
  const cfg = (await sb.from('home_config').select('*').eq('id', 1).maybeSingle()).data || {};
  if (!cfg.captacion_activa) return { ok: true, skipped: 'inactivo' };
  if (!enHorario(cfg)) return { ok: true, skipped: 'fuera_de_horario' };
  const testNum = String(cfg.captacion_test || '').replace(/[^0-9]/g, '');
  const token = process.env.WHATSAPP_TOKEN, phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return { ok: true, skipped: 'sin_wa' };

  const rows = (await sb.from('captacion_cola').select('id, whatsapp, oficio, comuna, mensaje').eq('estado', 'programado').order('creado_en', { ascending: true }).limit(80)).data || [];
  const pl = await buscarPlantilla(token, CAPT_TEMPLATE);
  const lang = pl ? pl.language : 'es';

  let enviados = 0, errores = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const w = String(r.whatsapp || '').replace(/[^0-9]/g, '');
    if (!w) continue;
    if (testNum && w !== testNum) continue;
    const res = await enviarPlantilla(token, phoneId, lang, w, r.comuna, r.oficio);
    if (res.ok) {
      enviados++;
      await sb.from('captacion_cola').update({ estado: 'enviado', enviado_en: new Date().toISOString() }).eq('id', r.id);
      try { await sb.from('wa_mensajes').insert({ telefono: w, direccion: 'out', texto: r.mensaje || ('Tengo un cliente en ' + r.comuna + ' que necesita ' + r.oficio + '. ' + LINK), wamid: res.id }); } catch (e) {}
    } else {
      errores++;
      await sb.from('captacion_cola').update({ estado: 'error', error: res.error || 'error' }).eq('id', r.id);
    }
  }
  return { ok: true, candidatos: rows.length, enviados: enviados, errores: errores };
}

function authorized(req) {
  const key = process.env.CAPTACION_CRON_KEY;
  if (!key) return true;
  if (req.headers.get('x-vercel-cron')) return true;
  const u = new URL(req.url);
  const got = u.searchParams.get('key') || (req.headers.get('authorization') || '').replace('Bearer ', '');
  return got === key;
}

export async function GET(req) { if (!authorized(req)) return new Response('forbidden', { status: 403 }); const r = await run(); return Response.json(r, { status: 200 }); }
export async function POST(req) { if (!authorized(req)) return new Response('forbidden', { status: 403 }); const r = await run(); return Response.json(r, { status: 200 }); }
