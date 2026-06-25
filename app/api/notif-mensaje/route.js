// Avisa por WhatsApp al maestro cuando el CLIENTE le escribe en una cotización.
// Plantilla Meta: nuevo_mensaje (body: nombre, trabajo; botón URL: presupuesto_id).
// Enfriamiento de 30 min por (presupuesto_id, maestro_id): no repite avisos seguidos.
// Respeta horario (home_config). Fuera de hora NO posterga (un "mensaje nuevo" viejo
// no sirve); simplemente no envía.
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 30;

const GRAPH = 'https://graph.facebook.com/v21.0';
const WABA_ID = process.env.WHATSAPP_WABA_ID || '3112654475791357';
const TEMPLATE = process.env.NOTIF_MENSAJE_TEMPLATE || 'nuevo_mensaje';
const COOLDOWN_MIN = 30;

function admin() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); }
function normFono(t) { let d = String(t || '').replace(/[^0-9]/g, ''); if (!d) return ''; if (d.indexOf('56') === 0 && d.length >= 11) return d; if (d.length === 9 && d[0] === '9') return '56' + d; if (d.length === 8) return '569' + d; if (d.length === 11 && d.indexOf('569') === 0) return d; return d.indexOf('56') === 0 ? d : '56' + d; }
function chileMin() {
  try { const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()); let h = 0, m = 0; for (const p of parts) { if (p.type === 'hour') h = parseInt(p.value, 10); if (p.type === 'minute') m = parseInt(p.value, 10); } return (h % 24) * 60 + m; } catch (e) { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
}
function parseHM(v, def) { if (!v) return def; const mm = String(v).match(/(\d{1,2})\s*:?\s*(\d{2})?/); if (!mm) return def; return (parseInt(mm[1], 10) % 24) * 60 + (mm[2] ? parseInt(mm[2], 10) : 0); }
function enHorario(cfg) { const ini = parseHM(cfg && cfg.captacion_hora_ini, 600); const fin = parseHM(cfg && cfg.captacion_hora_fin, 1080); const now = chileMin(); return ini <= fin ? (now >= ini && now < fin) : (now >= ini || now < fin); }
async function langDe(token, nombre) {
  try { const r = await fetch(GRAPH + '/' + WABA_ID + '/message_templates?name=' + encodeURIComponent(nombre) + '&limit=5', { headers: { Authorization: 'Bearer ' + token } }); const j = await r.json(); const ok = (j.data || []).filter(function (t) { return t.status === 'APPROVED'; })[0] || (j.data || [])[0]; return ok ? ok.language : 'es'; } catch (e) { return 'es'; }
}

export async function POST(req) {
  try {
    const b = await req.json().catch(function () { return {}; });
    const pid = b.presupuesto_id, mid = b.maestro_id;
    if (!pid || !mid) return Response.json({ error: 'falta presupuesto_id/maestro_id' }, { status: 200 });
    const sb = admin();

    // Enfriamiento: ¿hubo aviso de mensaje en los últimos 30 min?
    const desde = new Date(Date.now() - COOLDOWN_MIN * 60 * 1000).toISOString();
    const reciente = await sb.from('wa_notif').select('id', { count: 'exact', head: true }).eq('tipo', 'mensaje').eq('presupuesto_id', pid).eq('maestro_id', mid).gte('creado_en', desde);
    if ((reciente.count || 0) > 0) return Response.json({ ok: true, skipped: 'enfriamiento' }, { status: 200 });

    const cfgr = await sb.from('home_config').select('captacion_hora_ini, captacion_hora_fin').eq('id', 1).maybeSingle();
    if (!enHorario(cfgr.data || {})) return Response.json({ ok: true, skipped: 'fuera_horario' }, { status: 200 });

    const mr = await sb.from('maestros').select('nombre').eq('id', mid).maybeSingle();
    const maestro = mr.data;
    if (!maestro) return Response.json({ ok: true, skipped: 'sin maestro' }, { status: 200 });
    // El teléfono vive en 'perfiles' (perfiles.id == maestros.id).
    const fr = await sb.from('perfiles').select('telefono').eq('id', mid).maybeSingle();
    const to = normFono(fr.data && fr.data.telefono);
    if (!to) return Response.json({ ok: true, skipped: 'sin telefono' }, { status: 200 });
    const pr = await sb.from('presupuestos').select('titulo, oficio').eq('id', pid).maybeSingle();
    const trabajo = (pr.data && (pr.data.titulo || pr.data.oficio)) || 'tu cotización';

    const token = process.env.WHATSAPP_TOKEN, phoneId = process.env.WHATSAPP_PHONE_ID;
    if (!token || !phoneId) return Response.json({ ok: true, skipped: 'sin wa' }, { status: 200 });
    const lang = await langDe(token, TEMPLATE);

    const body = {
      messaging_product: 'whatsapp', to: to, type: 'template',
      template: { name: TEMPLATE, language: { code: lang }, components: [
        { type: 'body', parameters: [ { type: 'text', text: String(maestro.nombre || 'maestro') }, { type: 'text', text: String(trabajo) } ] },
        { type: 'button', sub_type: 'url', index: '0', parameters: [ { type: 'text', text: String(pid) } ] }
      ] }
    };
    const r = await fetch(GRAPH + '/' + phoneId + '/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(function () { return {}; });
    const ok = r.ok && !j.error;
    await sb.from('wa_notif').insert({ tipo: 'mensaje', presupuesto_id: pid, maestro_id: mid, estado: ok ? 'enviado' : 'error' });
    return Response.json({ ok: ok, error: j.error ? (j.error.message || 'error') : null }, { status: 200 });
  } catch (e) {
    return Response.json({ error: (e && e.message) || 'error' }, { status: 200 });
  }
}
