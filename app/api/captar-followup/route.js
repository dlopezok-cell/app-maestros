// Follow-up automático: reenvía la plantilla aprobada a maestros que fueron
// invitados (estado 'enviado') hace 24-96h y NO respondieron (sin un 2º saliente).
// Se dispara una vez al día por Vercel Cron (ver vercel.json) o manual (?key=).
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

const GRAPH = 'https://graph.facebook.com/v21.0';
const CAPT_TEMPLATE = process.env.CAPTACION_TEMPLATE || 'tengo_un_cliente';

function admin() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); }

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
  const cfg = (await sb.from('home_config').select('captacion_activa, captacion_test').eq('id', 1).maybeSingle()).data || {};
  if (!cfg.captacion_activa) return { ok: true, skipped: 'inactivo' };
  const testNum = String(cfg.captacion_test || '').replace(/[^0-9]/g, '');
  const token = process.env.WHATSAPP_TOKEN, phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return { ok: true, skipped: 'sin_wa' };

  const ahora = Date.now();
  const desde = new Date(ahora - 96 * 3600 * 1000).toISOString();
  const hasta = new Date(ahora - 24 * 3600 * 1000).toISOString();
  const rows = (await sb.from('captacion_cola').select('id, whatsapp, oficio, comuna, creado_en').eq('estado', 'enviado').gte('creado_en', desde).lte('creado_en', hasta).order('creado_en', { ascending: true }).limit(40)).data || [];

  const pl = await buscarPlantilla(token, CAPT_TEMPLATE);
  const lang = pl ? pl.language : 'es';

  let enviados = 0, saltados = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const w = String(r.whatsapp || '').replace(/[^0-9]/g, '');
    if (!w) { continue; }
    if (testNum && w !== testNum) { saltados++; continue; }
    const cnt = await sb.from('wa_mensajes').select('id', { count: 'exact', head: true }).eq('telefono', w).eq('direccion', 'out');
    if ((cnt.count || 0) >= 2) { saltados++; continue; }
    const res = await enviarPlantilla(token, phoneId, lang, w, r.comuna, r.oficio);
    if (res.ok) { enviados++; try { await sb.from('wa_mensajes').insert({ telefono: w, direccion: 'out', texto: '[seguimiento] Tengo un cliente en ' + r.comuna + ' que necesita ' + r.oficio, wamid: res.id }); } catch (e) {} }
  }
  return { ok: true, candidatos: rows.length, enviados: enviados, saltados: saltados };
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
