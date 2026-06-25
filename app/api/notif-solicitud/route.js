// Notifica por WhatsApp a los maestros REGISTRADOS cuyo oficio + zona (comunas que
// cubren) calzan con una solicitud nueva, con link directo para cotizar.
// Plantilla Meta: nueva_solicitud (body: nombre, oficio, comuna; botón URL: id).
// Respeta el horario (home_config.captacion_hora_ini/fin, def 10-18). Fuera de hora
// se encola 'pendiente' y lo envía el cron /api/notif-programados al abrir la ventana.
// Dedup por (tipo, presupuesto_id, maestro_id) en wa_notif.
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

const GRAPH = 'https://graph.facebook.com/v21.0';
const WABA_ID = process.env.WHATSAPP_WABA_ID || '3112654475791357';
const TEMPLATE = process.env.NOTIF_SOLICITUD_TEMPLATE || 'nueva_solicitud';

function admin() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); }

// Normaliza un teléfono chileno a formato internacional (56XXXXXXXXX) para WhatsApp.
function normFono(t) {
  let d = String(t || '').replace(/[^0-9]/g, '');
  if (!d) return '';
  if (d.indexOf('56') === 0 && d.length >= 11) return d;
  if (d.length === 9 && d[0] === '9') return '56' + d;
  if (d.length === 8) return '569' + d;
  if (d.length === 11 && d.indexOf('569') === 0) return d;
  return d.indexOf('56') === 0 ? d : '56' + d;
}

function chileMin() {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    let h = 0, m = 0; for (const p of parts) { if (p.type === 'hour') h = parseInt(p.value, 10); if (p.type === 'minute') m = parseInt(p.value, 10); }
    return (h % 24) * 60 + m;
  } catch (e) { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
}
function parseHM(v, def) { if (!v) return def; const mm = String(v).match(/(\d{1,2})\s*:?\s*(\d{2})?/); if (!mm) return def; return (parseInt(mm[1], 10) % 24) * 60 + (mm[2] ? parseInt(mm[2], 10) : 0); }
function enHorario(cfg) {
  const ini = parseHM(cfg && cfg.captacion_hora_ini, 600);
  const fin = parseHM(cfg && cfg.captacion_hora_fin, 1080);
  const now = chileMin();
  return ini <= fin ? (now >= ini && now < fin) : (now >= ini || now < fin);
}

async function langDe(token, nombre) {
  try {
    const r = await fetch(GRAPH + '/' + WABA_ID + '/message_templates?name=' + encodeURIComponent(nombre) + '&limit=5', { headers: { Authorization: 'Bearer ' + token } });
    const j = await r.json();
    const ok = (j.data || []).filter(function (t) { return t.status === 'APPROVED'; })[0] || (j.data || [])[0];
    return ok ? ok.language : 'es';
  } catch (e) { return 'es'; }
}

async function enviar(token, phoneId, lang, to, nombre, oficio, comuna, pedidoId) {
  const body = {
    messaging_product: 'whatsapp', to: to, type: 'template',
    template: {
      name: TEMPLATE, language: { code: lang },
      components: [
        { type: 'body', parameters: [ { type: 'text', text: String(nombre || 'maestro') }, { type: 'text', text: String(oficio || '') }, { type: 'text', text: String(comuna || '') } ] },
        { type: 'button', sub_type: 'url', index: '0', parameters: [ { type: 'text', text: String(pedidoId) } ] }
      ]
    }
  };
  const r = await fetch(GRAPH + '/' + phoneId + '/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(function () { return {}; });
  return { ok: r.ok && !j.error, error: j.error ? (j.error.message || 'error') : null };
}

export async function POST(req) {
  try {
    const b = await req.json().catch(function () { return {}; });
    const pid = b.presupuesto_id;
    if (!pid) return Response.json({ error: 'falta presupuesto_id' }, { status: 200 });
    const sb = admin();

    const pr = await sb.from('presupuestos').select('id, oficio, comuna, titulo').eq('id', pid).maybeSingle();
    const p = pr.data;
    if (!p || !p.oficio || !p.comuna) return Response.json({ ok: true, skipped: 'sin oficio/comuna' }, { status: 200 });

    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    const cfgr = await sb.from('home_config').select('captacion_hora_ini, captacion_hora_fin').eq('id', 1).maybeSingle();
    const dentro = enHorario(cfgr.data || {});

    // Maestros con el oficio del pedido. La zona se evalúa en JS: si el maestro definió
    // comunas, debe cubrir la del pedido; si no definió ninguna, atiende en cualquier comuna.
    const mr = await sb.from('maestros').select('id, nombre, oficios, oficio, comunas, suspendido, rating_promedio, total_trabajos');
    let maestros = (mr.data || []).filter(function (m) {
      if (m.suspendido === true) return false;
      const ofs = (m.oficios && m.oficios.length) ? m.oficios : (m.oficio ? [m.oficio] : []);
      if (ofs.indexOf(p.oficio) < 0) return false;
      const cubre = !m.comunas || m.comunas.length === 0 || m.comunas.indexOf(p.comuna) >= 0;
      return cubre;
    });

    // El teléfono del maestro vive en 'perfiles' (perfiles.id == maestros.id). Solo dejamos
    // los que tienen teléfono cargado.
    const fono = {};
    if (maestros.length) {
      const ids = maestros.map(function (m) { return m.id; });
      const pr2 = await sb.from('perfiles').select('id, telefono').in('id', ids);
      (pr2.data || []).forEach(function (pp) { const t = normFono(pp.telefono); if (t) fono[pp.id] = t; });
    }
    maestros = maestros.filter(function (m) { return !!fono[m.id]; });

    // Tope: avisar como máximo a N maestros por solicitud (def 10), priorizando los de
    // mejor calificación (rating_promedio); a igual rating, los de más trabajos hechos.
    maestros.sort(function (a, b) {
      return (b.rating_promedio || 0) - (a.rating_promedio || 0) || (b.total_trabajos || 0) - (a.total_trabajos || 0);
    });
    const MAX = parseInt(process.env.NOTIF_SOLICITUD_MAX || '10', 10) || 10;
    if (maestros.length > MAX) maestros = maestros.slice(0, MAX);

    const lang = (token && maestros.length) ? await langDe(token, TEMPLATE) : 'es';
    let enviados = 0, encolados = 0;
    for (let i = 0; i < maestros.length; i++) {
      const m = maestros[i];
      const ya = await sb.from('wa_notif').select('id', { count: 'exact', head: true }).eq('tipo', 'solicitud').eq('presupuesto_id', pid).eq('maestro_id', m.id);
      if ((ya.count || 0) > 0) continue;
      const to = fono[m.id];
      if (!to) continue;
      if (dentro && token && phoneId) {
        const res = await enviar(token, phoneId, lang, to, m.nombre, p.oficio, p.comuna, pid);
        await sb.from('wa_notif').insert({ tipo: 'solicitud', presupuesto_id: pid, maestro_id: m.id, estado: res.ok ? 'enviado' : 'error' });
        if (res.ok) enviados++;
      } else {
        await sb.from('wa_notif').insert({ tipo: 'solicitud', presupuesto_id: pid, maestro_id: m.id, estado: 'pendiente' });
        encolados++;
      }
    }
    return Response.json({ ok: true, candidatos: maestros.length, enviados: enviados, encolados: encolados, dentro_horario: dentro }, { status: 200 });
  } catch (e) {
    return Response.json({ error: (e && e.message) || 'error' }, { status: 200 });
  }
}
