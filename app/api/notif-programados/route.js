// Cron: envía los avisos de 'nueva_solicitud' que quedaron 'pendiente' (creados fuera
// de horario). Corre al abrir la ventana; solo envía si estamos dentro del horario.
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

const GRAPH = 'https://graph.facebook.com/v21.0';
const WABA_ID = process.env.WHATSAPP_WABA_ID || '3112654475791357';
const TEMPLATE = process.env.NOTIF_SOLICITUD_TEMPLATE || 'nueva_solicitud_link';
const LINK = 'https://www.maestrosenlinea.cl/maestros?pedido=';

function admin() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); }
function normFono(t) { let d = String(t || '').replace(/[^0-9]/g, ''); if (!d) return ''; if (d.indexOf('56') === 0 && d.length >= 11) return d; if (d.length === 9 && d[0] === '9') return '56' + d; if (d.length === 8) return '569' + d; if (d.length === 11 && d.indexOf('569') === 0) return d; return d.indexOf('56') === 0 ? d : '56' + d; }
function chileMin() { try { const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()); let h = 0, m = 0; for (const p of parts) { if (p.type === 'hour') h = parseInt(p.value, 10); if (p.type === 'minute') m = parseInt(p.value, 10); } return (h % 24) * 60 + m; } catch (e) { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); } }
function parseHM(v, def) { if (!v) return def; const mm = String(v).match(/(\d{1,2})\s*:?\s*(\d{2})?/); if (!mm) return def; return (parseInt(mm[1], 10) % 24) * 60 + (mm[2] ? parseInt(mm[2], 10) : 0); }
function enHorario(cfg) { const ini = parseHM(cfg && cfg.captacion_hora_ini, 600); const fin = parseHM(cfg && cfg.captacion_hora_fin, 1080); const now = chileMin(); return ini <= fin ? (now >= ini && now < fin) : (now >= ini || now < fin); }
async function langDe(token, nombre) { try { const r = await fetch(GRAPH + '/' + WABA_ID + '/message_templates?name=' + encodeURIComponent(nombre) + '&limit=5', { headers: { Authorization: 'Bearer ' + token } }); const j = await r.json(); const ok = (j.data || []).filter(function (t) { return t.status === 'APPROVED'; })[0] || (j.data || [])[0]; return ok ? ok.language : 'es'; } catch (e) { return 'es'; } }

async function run() {
  const sb = admin();
  const cfgr = await sb.from('home_config').select('captacion_hora_ini, captacion_hora_fin').eq('id', 1).maybeSingle();
  if (!enHorario(cfgr.data || {})) return { ok: true, skipped: 'fuera_horario' };
  const token = process.env.WHATSAPP_TOKEN, phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return { ok: true, skipped: 'sin wa' };

  const pend = await sb.from('wa_notif').select('id, presupuesto_id, maestro_id').eq('tipo', 'solicitud').eq('estado', 'pendiente').order('creado_en', { ascending: true }).limit(100);
  const rows = pend.data || [];
  if (!rows.length) return { ok: true, enviados: 0 };
  const lang = await langDe(token, TEMPLATE);
  let enviados = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const pr = await sb.from('presupuestos').select('oficio, comuna').eq('id', row.presupuesto_id).maybeSingle();
    const mr = await sb.from('maestros').select('nombre').eq('id', row.maestro_id).maybeSingle();
    const fr = await sb.from('perfiles').select('telefono').eq('id', row.maestro_id).maybeSingle();
    const p = pr.data, m = mr.data;
    const to = normFono(fr.data && fr.data.telefono);
    if (!p || !m || !to) { await sb.from('wa_notif').update({ estado: 'error' }).eq('id', row.id); continue; }
    const body = { messaging_product: 'whatsapp', to: to, type: 'template', template: { name: TEMPLATE, language: { code: lang }, components: [
      { type: 'body', parameters: [ { type: 'text', text: String(m.nombre || 'maestro') }, { type: 'text', text: String(p.oficio || '') }, { type: 'text', text: String(p.comuna || '') }, { type: 'text', text: LINK + String(row.presupuesto_id) } ] }
    ] } };
    const r = await fetch(GRAPH + '/' + phoneId + '/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(function () { return {}; });
    const ok = r.ok && !j.error;
    await sb.from('wa_notif').update({ estado: ok ? 'enviado' : 'error' }).eq('id', row.id);
    if (ok) enviados++;
  }
  return { ok: true, enviados: enviados };
}

export async function GET() { return Response.json(await run(), { status: 200 }); }
export async function POST() { return Response.json(await run(), { status: 200 }); }
