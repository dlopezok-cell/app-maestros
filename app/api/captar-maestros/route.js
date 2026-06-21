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

export const maxDuration = 60;
const GRAPH = 'https://graph.facebook.com/v21.0';
const WABA_ID = process.env.WHATSAPP_WABA_ID || '3112654475791357';
const CAPT_TEMPLATE = process.env.CAPTACION_TEMPLATE || 'tengo_un_cliente';

// Busca idioma + cuerpo de una plantilla APROBADA de Meta.
async function buscarPlantilla(token, nombre) {
  try {
    const r = await fetch(GRAPH + '/' + WABA_ID + '/message_templates?name=' + encodeURIComponent(nombre) + '&fields=name,language,status,components&access_token=' + encodeURIComponent(token));
    const d = await r.json();
    const t = (d.data || []).filter(function (x) { return x.status === 'APPROVED'; })[0];
    if (!t) return null;
    const body = (t.components || []).filter(function (c) { return c.type === 'BODY'; })[0];
    return { language: t.language, body: body && body.text ? body.text : '' };
  } catch (e) { return null; }
}

// Envía la plantilla por WhatsApp Cloud con [comuna, oficio].
async function enviarPlantilla(token, phoneId, lang, to, comuna, oficio) {
  const payload = {
    messaging_product: 'whatsapp', to: to, type: 'template',
    template: { name: CAPT_TEMPLATE, language: { code: lang }, components: [ { type: 'body', parameters: [ { type: 'text', text: String(comuna || '') }, { type: 'text', text: String(oficio || '') } ] } ] }
  };
  try {
    const r = await fetch(GRAPH + '/' + phoneId + '/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const d = await r.json();
    if (!r.ok) return { ok: false, error: (d && d.error ? d.error.message : 'Error de Meta') };
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e && e.message ? e.message : e) }; }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(function () { return {}; });
    const pid = body.presupuesto_id;
    if (!pid) return Response.json({ error: 'falta presupuesto_id' }, { status: 200 });
    const sb = admin();

    const cfgr = await sb.from('home_config').select('captacion_activa,captacion_max,captacion_mensaje,captacion_test').eq('id', 1).maybeSingle();
    const cfg = cfgr.data || {};
    if (!cfg.captacion_activa) return Response.json({ ok: true, skipped: 'inactivo' }, { status: 200 });
    const max = Math.min(20, Math.max(1, Number(cfg.captacion_max) || 10));
    const tmpl = cfg.captacion_mensaje || 'Hola {nombre}, un cliente en {comuna} busca {oficio}. Súmate a MaestrosEnLínea: {link}';

    const pr = await sb.from('presupuestos').select('id,oficio,comuna,creado_en,titulo,descripcion').eq('id', pid).maybeSingle();
    const p = pr.data;
    if (!p) return Response.json({ error: 'no existe' }, { status: 200 });
    if (p.creado_en) { var age = Date.now() - new Date(p.creado_en).getTime(); if (age > 15 * 60 * 1000) return Response.json({ ok: true, skipped: 'viejo' }, { status: 200 }); }
    if (!p.oficio || !p.comuna) return Response.json({ ok: true, skipped: 'sin oficio o comuna' }, { status: 200 });

    // === MODO PRUEBA ===
    // Si hay un número de prueba configurado, NO se busca en Google ni se contacta
    // a maestros reales: la plantilla se envía SOLO a ese número para probar el flujo.
    const testNum = String(cfg.captacion_test || '').replace(/[^0-9]/g, '');
    if (testNum) {
      const pedidoTextoT = (((p.titulo && p.titulo.trim()) ? p.titulo.trim() : (p.descripcion || '').trim()) || '').slice(0, 140) || null;
      const waTokenT = process.env.WHATSAPP_TOKEN;
      const phoneIdT = process.env.WHATSAPP_PHONE_ID;
      const plantillaT = (waTokenT && phoneIdT) ? await buscarPlantilla(waTokenT, CAPT_TEMPLATE) : null;
      const langT = plantillaT ? plantillaT.language : 'es';
      const txtT = (plantillaT && plantillaT.body)
        ? plantillaT.body.replace(/\{\{\s*1\s*\}\}/g, p.comuna).replace(/\{\{\s*2\s*\}\}/g, p.oficio)
        : ('Tengo un cliente en ' + p.comuna + ' que necesita ' + p.oficio + '. Súmate gratis a MaestrosEnLínea: ' + LINK);
      let estadoT = 'pendiente';
      let errT = null;
      if (plantillaT) {
        const resT = await enviarPlantilla(waTokenT, phoneIdT, langT, testNum, p.comuna, p.oficio);
        estadoT = resT.ok ? 'enviado' : 'error';
        errT = resT.ok ? null : (resT.error || 'error');
        if (resT.ok) { try { await sb.from('wa_mensajes').insert({ telefono: testNum, direccion: 'out', texto: txtT }); } catch (e) {} }
      } else {
        errT = 'sin_plantilla';
      }
      // Limpia filas de prueba previas de ese número para poder repetir la prueba.
      try { await sb.from('captacion_cola').delete().eq('whatsapp', testNum).eq('nombre', 'PRUEBA'); } catch (e) {}
      const rowT = { presupuesto_id: pid, oficio: p.oficio, comuna: p.comuna, nombre: 'PRUEBA', telefono: testNum, whatsapp: testNum, direccion: '', es_movil: true, mensaje: txtT, pedido_texto: pedidoTextoT, estado: estadoT, error: errT };
      let insT = await sb.from('captacion_cola').insert(rowT);
      if (insT.error && /pedido_texto/.test(insT.error.message || '')) { const r2 = Object.assign({}, rowT); delete r2.pedido_texto; await sb.from('captacion_cola').insert(r2); }
      return Response.json({ ok: true, modo: 'prueba', enviado_a: testNum, estado: estadoT, plantilla: plantillaT ? (CAPT_TEMPLATE + '/' + langT) : 'sin_plantilla', error: errT }, { status: 200 });
    }

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

    const seleccion = cand.slice(0, max);

    // Envío AUTOMÁTICO de la plantilla aprobada por WhatsApp Cloud.
    const waToken = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    const plantilla = (waToken && phoneId) ? await buscarPlantilla(waToken, CAPT_TEMPLATE) : null;
    const lang = plantilla ? plantilla.language : 'es';
    function textoPlantilla(comuna, oficio) {
      if (plantilla && plantilla.body) return plantilla.body.replace(/\{\{\s*1\s*\}\}/g, comuna).replace(/\{\{\s*2\s*\}\}/g, oficio);
      return 'Tengo un cliente en ' + comuna + ' que necesita ' + oficio + '. Súmate gratis a MaestrosEnLínea: ' + LINK;
    }

    const rows = [];
    for (let i = 0; i < seleccion.length; i++) {
      const c = seleccion[i];
      let estado = 'pendiente';
      let errMsg = null;
      if (plantilla) {
        const res = await enviarPlantilla(waToken, phoneId, lang, c.w, p.comuna, p.oficio);
        estado = res.ok ? 'enviado' : 'error';
        errMsg = res.ok ? null : (res.error || 'error');
        if (res.ok) { try { await sb.from('wa_mensajes').insert({ telefono: c.w, direccion: 'out', texto: textoPlantilla(p.comuna, p.oficio) }); } catch (e) {} }
      }
      rows.push({ presupuesto_id: pid, oficio: p.oficio, comuna: p.comuna, nombre: c.nombre, telefono: c.tel, whatsapp: c.w, direccion: c.direccion, es_movil: c.movil, mensaje: textoPlantilla(p.comuna, p.oficio), pedido_texto: pedidoTexto, estado: estado, error: errMsg });
    }
    if (rows.length) {
      let ins = await sb.from('captacion_cola').insert(rows);
      if (ins.error && /pedido_texto/.test(ins.error.message || '')) {
        await sb.from('captacion_cola').insert(rows.map(function (r) { var c = Object.assign({}, r); delete c.pedido_texto; return c; }));
      }
    }
    const enviados = rows.filter(function (r) { return r.estado === 'enviado'; }).length;
    return Response.json({ ok: true, encolados: rows.length, enviados: enviados, plantilla: plantilla ? (CAPT_TEMPLATE + '/' + lang) : 'sin_plantilla', google_status: gStatus, google_error: gError, encontrados: places.length, candidatos: cand.length }, { status: 200 });
  } catch (e) {
    return Response.json({ error: String(e && e.message ? e.message : e) }, { status: 200 });
  }
}
