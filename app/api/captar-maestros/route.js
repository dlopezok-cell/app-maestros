// app/api/captar-maestros/route.js
// Cuando un cliente deja un pedido, busca en Google Maps maestros del rubro en su
// comuna y los ENCOLA en captacion_cola (estado 'pendiente'). NO envía nada: el
// admin revisa y aprueba el envío desde el panel (Captación auto).
// Disparado desde el cliente tras crear el presupuesto (fire-and-forget).
// Variables (Vercel): GOOGLE_MAPS_SERVER_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL.
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
const BASE = 'https://maps.googleapis.com/maps/api/place';
const LINK = 'https://www.maestrosenlinea.cl/unete';

function aWhatsapp(tel) {
  var d = String(tel || '').replace(/\D/g, '');
  if (d.indexOf('56') === 0) d = d.slice(2);
  if (d.length > 9) d = d.slice(-9);
  return d ? '56' + d : '';
}
function esMovil(w) { return /^569\d{8}$/.test(w); }
function admin() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); }

export async function POST(req) {
  try {
    const body = await req.json().catch(function () { return {}; });
    const pid = body.presupuesto_id;
    if (!pid) return Response.json({ error: 'falta presupuesto_id' }, { status: 200 });
    const sb = admin();

    const cfgr = await sb.from('home_config').select('captacion_activa,captacion_max,captacion_mensaje').eq('id', 1).maybeSingle();
    const cfg = cfgr.data || {};
    if (!cfg.captacion_activa) return Response.json({ ok: true, skipped: 'inactivo' }, { status: 200 });
    const max = Math.min(20, Math.max(1, Number(cfg.captacion_max) || 10));
    const tmpl = cfg.captacion_mensaje || 'Hola {nombre}, un cliente en {comuna} busca {oficio}. Súmate a MaestrosEnLínea: {link}';

    const pr = await sb.from('presupuestos').select('id,oficio,comuna,creado_en,titulo,descripcion').eq('id', pid).maybeSingle();
    const p = pr.data;
    if (!p) return Response.json({ error: 'no existe' }, { status: 200 });
    if (p.creado_en) { var age = Date.now() - new Date(p.creado_en).getTime(); if (age > 15 * 60 * 1000) return Response.json({ ok: true, skipped: 'viejo' }, { status: 200 }); }
    if (!p.oficio || !p.comuna) return Response.json({ ok: true, skipped: 'sin oficio o comuna' }, { status: 200 });

    const ya = await sb.from('captacion_cola').select('id', { count: 'exact', head: true }).eq('presupuesto_id', pid);
    if ((ya.count || 0) > 0) return Response.json({ ok: true, skipped: 'ya encolado' }, { status: 200 });

    const key = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) return Response.json({ error: 'falta GOOGLE_MAPS_SERVER_KEY' }, { status: 200 });

    // Texto que escribió el cliente (para mostrar en la cola del admin)
    const pedidoTexto = (((p.titulo && p.titulo.trim()) ? p.titulo.trim() : (p.descripcion || '').trim()) || '').slice(0, 140) || null;

    // Buscamos al oficio como PERSONA / servicio "a domicilio", no como tienda/marca
    const query = p.oficio + ' a domicilio en ' + p.comuna + ', Chile';
    const ts = await fetch(BASE + '/textsearch/json?query=' + encodeURIComponent(query) + '&language=es&region=cl&key=' + encodeURIComponent(key));
    const tsd = await ts.json();
    const gStatus = tsd.status || 'SIN_STATUS';
    const gError = tsd.error_message || null;
    const places = (tsd.results || []).slice(0, 20);

    // Palabras que delatan empresas/tiendas/marcas -> se saltan para preferir particulares
    const EMPRESA = /(\bs\.?a\.?\b|\bspa\b|\bltda\b|ferreter|constructora|sherwin|behr|sodimac|\beasy\b|imperial|construmart|home ?center|homecenter|distribuidora|comercial|importadora|mayorista|f[aá]brica|tienda|academ|pinturas )/i;

    const vistos = {};
    const cand = [];
    for (let i = 0; i < places.length; i++) {
      const pl = places[i];
      try {
        const dr = await fetch(BASE + '/details/json?place_id=' + encodeURIComponent(pl.place_id) + '&fields=name,formatted_phone_number,international_phone_number,formatted_address&language=es&key=' + encodeURIComponent(key));
        const dd = await dr.json();
        const det = dd.result || {};
        const tel = det.international_phone_number || det.formatted_phone_number || '';
        const w = aWhatsapp(tel);
        if (!w) continue;
        if (vistos[w]) continue; vistos[w] = 1;
        const nombre = det.name || pl.name || '';
        if (EMPRESA.test(nombre)) continue; // saltar empresas/tiendas/marcas
        const dup = await sb.from('captacion_cola').select('id', { count: 'exact', head: true }).eq('whatsapp', w);
        if ((dup.count || 0) > 0) continue;
        cand.push({ nombre: nombre, tel: tel, w: w, movil: esMovil(w), direccion: det.formatted_address || '' });
      } catch (e) { /* salta */ }
    }
    // Preferir celulares (los particulares casi siempre tienen móvil)
    cand.sort(function (a, b) { return (b.movil ? 1 : 0) - (a.movil ? 1 : 0); });

    const rows = cand.slice(0, max).map(function (c) {
      const mensaje = tmpl.replace(/\{nombre\}/g, (c.nombre.split(' ')[0] || ''))
        .replace(/\{oficio\}/g, p.oficio).replace(/\{comuna\}/g, p.comuna).replace(/\{link\}/g, LINK);
      return { presupuesto_id: pid, oficio: p.oficio, comuna: p.comuna, nombre: c.nombre, telefono: c.tel, whatsapp: c.w, direccion: c.direccion, es_movil: c.movil, mensaje: mensaje, pedido_texto: pedidoTexto, estado: 'pendiente' };
    });
    if (rows.length) {
      let ins = await sb.from('captacion_cola').insert(rows);
      if (ins.error && /pedido_texto/.test(ins.error.message || '')) {
        // La columna pedido_texto aún no existe: reintentar sin ella.
        await sb.from('captacion_cola').insert(rows.map(function (r) { var c = Object.assign({}, r); delete c.pedido_texto; return c; }));
      }
    }
    return Response.json({ ok: true, encolados: rows.length, google_status: gStatus, google_error: gError, encontrados: places.length, candidatos: cand.length }, { status: 200 });
  } catch (e) {
    return Response.json({ error: String(e && e.message ? e.message : e) }, { status: 200 });
  }
}
