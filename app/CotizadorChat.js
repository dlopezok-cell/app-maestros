'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Cotizador abierto DESDE el chat (botón "Cotizar este trabajo" del menú +).
// Mismo cotizador del maestro (ítems, IVA, incluye, validez, garantía, Redactar IA).
// Al enviar: 1) registra la cotización (tabla cotizaciones, igual que la pestaña),
// 2) dibuja la cotización como imagen PNG (canvas, sin librerías) y la publica en el
// chat como un mensaje con imagen, para que al cliente le llegue ahí mismo.

var INCLUYE_OPC = ['Materiales', 'Mano de obra', 'Visita técnica', 'Retiro de escombros'];
var VALIDEZ_OPC = ['15 días', '30 días'];
var GARANTIA_OPC = ['Sin garantía', '1 mes', '2 meses', '3 meses'];
var IVA = 0.19;
var FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export default function CotizadorChat({ usuario, presupuestoId, maestroId, titulo, onClose }) {
  const [pres, setPres] = useState(null);
  const [lineas, setLineas] = useState([{ tipo: 'mano_obra', desc: 'Mano de obra', valor: 0 }]);
  const [incluye, setIncluye] = useState(['Mano de obra']);
  const [validez, setValidez] = useState('15 días');
  const [garantia, setGarantia] = useState('1 mes');
  const [descripcion, setDescripcion] = useState('');
  const [comisionPct, setComisionPct] = useState(0);
  const [generando, setGenerando] = useState(false);
  const [propuestaIA, setPropuestaIA] = useState(null);
  const [msg, setMsg] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(function () {
    supabase.from('presupuestos').select('id, titulo, oficio, descripcion, cliente_nombre, es_consulta').eq('id', presupuestoId).maybeSingle()
      .then(function (r) { if (r.data) setPres(r.data); });
    supabase.from('home_config').select('comision_pct').eq('id', 1).maybeSingle().then(function (r) { if (r.data && r.data.comision_pct != null) setComisionPct(Number(r.data.comision_pct)); });
  }, [presupuestoId]);

  function plata(n) { return '$' + (n || 0).toLocaleString('es-CL'); }
  function neto() { return lineas.reduce(function (a, x) { return a + (Number(x.valor) || 0); }, 0); }
  function ivaMonto() { return Math.round(neto() * IVA); }
  function comisionMonto() { return Math.round(neto() * (comisionPct / 100)); }
  function total() { return neto() + ivaMonto() + comisionMonto(); }
  function ofTit(p) { if (p && p.es_consulta) return 'Consulta'; return ((p && p.oficio) || 'servicio').charAt(0).toUpperCase() + ((p && p.oficio) || '').slice(1); }
  function tituloDe(p) { return (p && p.titulo && p.titulo.trim()) ? p.titulo : ofTit(p); }
  function clienteDe() { return (titulo && titulo.trim()) ? titulo.trim() : ((pres && pres.cliente_nombre) || 'Cliente'); }

  function setLinea(i, campo, val) {
    setLineas(function (p) { return p.map(function (x, k) { if (k !== i) return x; var o = Object.assign({}, x); o[campo] = campo === 'valor' ? (parseInt((val + '').replace(/[^0-9]/g, ''), 10) || 0) : val; return o; }); });
  }
  function addLinea() { setLineas(function (p) { return p.concat([{ tipo: 'material', desc: '', valor: 0 }]); }); }
  function delLinea(i) { setLineas(function (p) { return p.filter(function (x, k) { return k !== i; }); }); }
  function toggleInc(x) { setIncluye(function (p) { return p.indexOf(x) >= 0 ? p.filter(function (y) { return y !== x; }) : p.concat([x]); }); }

  function parseValidez(t) { var m = (t || '').match(/(\d+)\s*d[ií]a/i); if (m) { var v = m[1] + ' días'; return VALIDEZ_OPC.indexOf(v) >= 0 ? v : null; } return null; }
  function parseGarantia(t) {
    if (!t) return null;
    if (/sin garant/i.test(t)) return 'Sin garantía';
    var m = t.match(/(\d+)\s*mes/i);
    if (m) { var n = m[1]; var g = n + (n === '1' ? ' mes' : ' meses'); return GARANTIA_OPC.indexOf(g) >= 0 ? g : null; }
    return null;
  }

  function redactarIA() {
    if (!pres) return;
    setGenerando(true); setMsg(null);
    supabase.from('mensajes').select('autor_rol, texto, creado_en').eq('presupuesto_id', presupuestoId).eq('maestro_id', maestroId).order('creado_en', { ascending: true }).limit(40)
      .then(function (rm) {
        var conv = (rm.data || []).filter(function (m) { return m.texto; }).map(function (m) { return (m.autor_rol === 'cliente' ? 'Cliente: ' : 'Maestro: ') + m.texto; }).join('\n');
        return fetch('/api/cotizar-ia', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oficio: pres.oficio, descripcion: pres.descripcion, descMaestro: descripcion, incluye: incluye, items: lineas, conversacion: conv })
        });
      }).then(function (r) { return r.json(); }).then(function (d) {
        setGenerando(false);
        var its = lineas;
        var inc = (d && d.incluye ? d.incluye : []).filter(function (x) { return INCLUYE_OPC.indexOf(x) >= 0; });
        if (!inc.length) inc = incluye;
        var net = its.reduce(function (a, x) { return a + (Number(x.valor) || 0); }, 0);
        var iv = Math.round(net * IVA);
        var com = Math.round(net * (comisionPct / 100));
        setPropuestaIA({
          items: its, incluye: inc,
          descripcion: (d && d.descripcion) ? d.descripcion : '',
          validez: parseValidez(d && d.condiciones) || validez,
          garantia: parseGarantia(d && d.condiciones) || garantia,
          neto: net, iva: iv, comision: com, total: net + iv + com,
        });
      }).catch(function () { setGenerando(false); setMsg('No se pudo redactar con IA. Inténtalo de nuevo.'); });
  }
  function usarPropuesta() {
    if (!propuestaIA) return;
    setIncluye(propuestaIA.incluye);
    setDescripcion(propuestaIA.descripcion);
    setValidez(propuestaIA.validez);
    setGarantia(propuestaIA.garantia);
    setPropuestaIA(null);
  }

  // ---------- Imagen PNG de la cotización (canvas, sin librerías) ----------
  function generarBlob() {
    var W = 680, ML = 32, MR = W - 32, cw = W - 64;
    var fechaStr = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
    var its = lineas.filter(function (x) { return x.desc && Number(x.valor) > 0; });
    var d = { cliente: clienteDe(), trabajo: tituloDe(pres), items: its, neto: neto(), iva: ivaMonto(), comision: comisionMonto(), total: total(), tuRecibes: neto() + ivaMonto(), incluye: incluye, validez: validez, garantia: garantia, descripcion: (descripcion || '').trim() };

    function lineSeg(ctx, x1, y1, x2, y2, color) { ctx.beginPath(); ctx.strokeStyle = color || '#eef0f5'; ctx.lineWidth = 1; ctx.moveTo(x1, y1 + 0.5); ctx.lineTo(x2, y2 + 0.5); ctx.stroke(); }
    function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function wrap(ctx, text, maxW, font) {
      ctx.font = font; var words = (text || '').split(/\s+/); var lines = []; var cur = '';
      for (var i = 0; i < words.length; i++) { var t = cur ? cur + ' ' + words[i] : words[i]; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = words[i]; } else { cur = t; } }
      if (cur) lines.push(cur); return lines.length ? lines : [''];
    }
    function trunc(ctx, text, maxW, font) { ctx.font = font; if (ctx.measureText(text).width <= maxW) return text; var t = text; while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1); return t + '…'; }

    function render(ctx) {
      function T(t, x, y, o) { o = o || {}; ctx.font = (o.w ? o.w + ' ' : '') + (o.s || 13) + 'px ' + FONT; ctx.fillStyle = o.c || '#1c2030'; ctx.textAlign = o.a || 'left'; ctx.fillText(t, x, y); }
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, 4000);
      ctx.fillStyle = '#19222F'; ctx.fillRect(0, 0, W, 76);
      T('MaestrosEnLínea', ML, 47, { w: 'bold', s: 22, c: '#ffffff' });
      T('COTIZACIÓN', MR, 35, { w: 'bold', s: 14, c: '#ffffff', a: 'right' });
      T(fechaStr, MR, 56, { s: 11, c: '#9aa6b4', a: 'right' });
      var y = 106;
      T('PARA', ML, y, { s: 10, c: '#9aa1b5', w: 'bold' });
      T('TRABAJO', MR, y, { s: 10, c: '#9aa1b5', w: 'bold', a: 'right' });
      T(d.cliente, ML, y + 21, { s: 15, w: 'bold' });
      T(trunc(ctx, d.trabajo, 250, 'bold 14px ' + FONT), MR, y + 21, { s: 14, w: 'bold', a: 'right' });
      y += 44; lineSeg(ctx, ML, y, MR, y); y += 24;
      T('DETALLE DE COSTOS', ML, y, { s: 11, c: '#7c8499', w: 'bold' }); y += 22;
      d.items.forEach(function (it) {
        T(trunc(ctx, it.desc, cw - 110, '13.5px ' + FONT), ML, y + 15, { s: 13.5 });
        T(plata(it.valor), MR, y + 15, { s: 13.5, w: 'bold', a: 'right' });
        lineSeg(ctx, ML, y + 26, MR, y + 26, '#f1f3f7'); y += 26;
      });
      y += 12;
      function kv(k, v) { T(k, MR - 150, y + 14, { s: 12.5, c: '#7c8499' }); T(v, MR, y + 14, { s: 12.5, c: '#7c8499', a: 'right' }); y += 22; }
      kv('Neto', plata(d.neto));
      kv('IVA (19%)', plata(d.iva));
      if (d.comision > 0) kv('MaestrosEnLínea (' + comisionPct + '%)', plata(d.comision));
      y += 8;
      rr(ctx, ML, y, cw, 54, 12); ctx.fillStyle = '#f2f5fa'; ctx.fill();
      T('Total al cliente', ML + 16, y + 26, { s: 14, w: 'bold' });
      T(plata(d.total), MR - 16, y + 31, { s: 22, w: 'bold', a: 'right' });
      T('Tú recibes ' + plata(d.tuRecibes), MR - 16, y + 47, { s: 11, c: '#0d9456', a: 'right' });
      y += 54 + 24;
      if (d.incluye.length) {
        T('INCLUYE', ML, y, { s: 11, c: '#7c8499', w: 'bold' }); y += 20;
        var incLines = wrap(ctx, d.incluye.map(function (x) { return '•  ' + x; }).join('     '), cw, '13px ' + FONT);
        incLines.forEach(function (ln) { T(ln, ML, y + 13, { s: 13, c: '#2b2f3a' }); y += 20; });
        y += 10;
      }
      T('Validez', ML, y + 12, { s: 9.5, c: '#9aa1b5', w: 'bold' });
      T(d.validez, ML, y + 31, { s: 13, w: 'bold' });
      T('Garantía', ML + 190, y + 12, { s: 9.5, c: '#9aa1b5', w: 'bold' });
      T(d.garantia, ML + 190, y + 31, { s: 13, w: 'bold' });
      y += 46;
      if (d.descripcion) {
        T('TRABAJO A REALIZAR', ML, y, { s: 11, c: '#7c8499', w: 'bold' }); y += 19;
        var dl = wrap(ctx, d.descripcion, cw, '13px ' + FONT);
        dl.forEach(function (ln) { T(ln, ML, y + 14, { s: 13, c: '#2b2f3a' }); y += 19; });
        y += 8;
      }
      y += 12; lineSeg(ctx, ML, y, MR, y); y += 20;
      T('Cotización generada en MaestrosEnLínea · ' + fechaStr, ML, y, { s: 10, c: '#9aa1b5' });
      return y + 16;
    }

    return new Promise(function (resolve) {
      var tmp = document.createElement('canvas'); tmp.width = W; tmp.height = 3000;
      var bottom = render(tmp.getContext('2d'));
      var H = Math.ceil(bottom);
      var c = document.createElement('canvas'); var DPR = 2;
      c.width = W * DPR; c.height = H * DPR;
      var ctx = c.getContext('2d'); ctx.scale(DPR, DPR);
      render(ctx);
      c.toBlob(function (b) { resolve(b); }, 'image/png');
    });
  }

  function enviar() {
    var n = neto();
    if (n <= 0) { setMsg('Agrega al menos un ítem con su precio.'); return; }
    if (!pres) { setMsg('Cargando el trabajo, espera un segundo…'); return; }
    setEnviando(true); setMsg(null);
    var cond = 'Validez ' + validez + (garantia && garantia !== 'Sin garantía' ? '. Garantía ' + garantia : '');
    var resumen = (incluye.length ? 'Incluye: ' + incluye.join(', ') + '. ' : '') + cond;
    var detalle = {
      items: lineas.filter(function (x) { return x.desc && Number(x.valor) > 0; }),
      incluye: incluye, validez: validez, garantia: garantia, condiciones: cond,
      neto: n, iva: ivaMonto(), comision: comisionMonto(), descripcion: (descripcion || '').trim(),
    };
    // 1) registrar la cotización (igual que la pestaña Cotizaciones)
    supabase.from('cotizaciones').insert({
      presupuesto_id: presupuestoId, maestro_id: maestroId, monto: total(), mensaje: resumen.trim() || null, detalle: detalle,
    }).then(function (rc) {
      if (rc.error) { setMsg('Error al registrar: ' + rc.error.message); setEnviando(false); return; }
      // 2) generar imagen y publicarla en el chat
      generarBlob().then(function (blob) {
        if (!blob) { finalizar(null); return; }
        var path = usuario.id + '/cotizacion_' + Date.now() + '.png';
        supabase.storage.from('presupuestos').upload(path, blob, { contentType: 'image/png', upsert: true }).then(function (up) {
          if (up.error) { finalizar(null); return; }
          var url = supabase.storage.from('presupuestos').getPublicUrl(path).data.publicUrl;
          finalizar(url);
        }).catch(function () { finalizar(null); });
      }).catch(function () { finalizar(null); });
    });

    function finalizar(url) {
      var payload = { presupuesto_id: presupuestoId, maestro_id: maestroId, autor_rol: 'maestro', texto: 'Cotización: ' + plata(total()) };
      if (url) { payload.media_url = url; payload.media_tipo = 'imagen'; }
      supabase.from('mensajes').insert(payload).then(function () {
        try { fetch('/api/notificar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'cotizacion', presupuestoId: presupuestoId, maestroId: maestroId, monto: total() }) }); } catch (e) {}
        setEnviando(false);
        if (onClose) onClose();
      });
    }
  }

  // ---------- UI ----------
  var inp = { width: '100%', padding: 11, border: '1.5px solid #ddd', borderRadius: 10, fontSize: 16, background: '#fff', boxSizing: 'border-box' };
  var lab = { fontSize: 11.5, fontWeight: 700, color: '#5b6275', marginBottom: 7 };
  function Chip(props) {
    var on = props.on;
    return <span onClick={props.onClick} style={{ fontSize: 12.5, borderRadius: 999, padding: '7px 12px', cursor: 'pointer', background: on ? props.bg : '#fff', color: on ? props.col : '#7c8499', border: '1px solid ' + (on ? props.bd : '#e4e4ef'), fontWeight: on ? 800 : 600 }}>{(on ? '✓ ' : '') + props.label}</span>;
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))', borderBottom: '1px solid #eef0f5', background: '#fff', flexShrink: 0 }}>
        <button onClick={onClose} style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: 26, fontWeight: 700, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>{'‹'}</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tituloDe(pres)}</div>
          <div style={{ fontSize: 11, color: '#9aa1b5' }}>{ofTit(pres) + ' · ' + clienteDe()}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ padding: '14px 16px 18px' }}>
          <div style={lab}>Precio</div>
          {lineas.map(function (l, i) {
            return (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{l.tipo === 'mano_obra' ? '\u{1F6E0}️' : '\u{1F4E6}'}</span>
                <input value={l.desc} onChange={function (e) { setLinea(i, 'desc', e.target.value); }} placeholder={l.tipo === 'mano_obra' ? 'Mano de obra' : 'Ítem / material'} style={{ ...inp, flex: 1, padding: 9 }} />
                <input value={l.valor ? l.valor : ''} onChange={function (e) { setLinea(i, 'valor', e.target.value); }} inputMode="numeric" placeholder="$" style={{ ...inp, width: 90, padding: 9, textAlign: 'right' }} />
                <button type="button" onClick={function () { delLinea(i); }} style={{ border: 'none', background: 'none', color: '#c2c7d4', fontSize: 18, cursor: 'pointer', width: 18 }}>{'×'}</button>
              </div>
            );
          })}
          <button type="button" onClick={addLinea} style={{ background: 'none', border: '1px dashed #cbd0dd', borderRadius: 9, padding: '7px 11px', fontSize: 12.5, fontWeight: 700, color: '#5b6275', cursor: 'pointer', marginBottom: 16 }}>{'+ Agregar ítem'}</button>

          <div style={{ background: '#f7f9fc', border: '1px solid #eef0f5', borderRadius: 12, padding: '10px 12px', marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#7c8499', marginBottom: 3 }}><span>Neto</span><span>{plata(neto())}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#7c8499' }}><span>IVA (19%)</span><span>{plata(ivaMonto())}</span></div>
            {comisionMonto() > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#7c8499' }}><span>{'MaestrosEnLínea (' + comisionPct + '%)'}</span><span>{plata(comisionMonto())}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid #e7eaf1', marginTop: 7, paddingTop: 7 }}><span style={{ fontSize: 13, fontWeight: 800 }}>Total al cliente</span><span style={{ fontSize: 20, fontWeight: 800 }}>{plata(total())}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#0d9456', marginTop: 5 }}><span>Tú recibes</span><span style={{ fontWeight: 800 }}>{plata(neto() + ivaMonto())}</span></div>
          </div>

          <div style={lab}>Incluye</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
            {INCLUYE_OPC.map(function (x) { return <Chip key={x} label={x} on={incluye.indexOf(x) >= 0} bg="#e1f5ee" col="#0f6e56" bd="#bfe6cf" onClick={function () { toggleInc(x); }} />; })}
          </div>

          <div style={lab}>Validez de la cotización</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
            {VALIDEZ_OPC.map(function (x) { return <Chip key={x} label={x} on={validez === x} bg="#e6f1fb" col="#185fa5" bd="#a9cdf2" onClick={function () { setValidez(x); }} />; })}
          </div>

          <div style={lab}>Garantía</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
            {GARANTIA_OPC.map(function (x) { return <Chip key={x} label={x} on={garantia === x} bg="#e6f1fb" col="#185fa5" bd="#a9cdf2" onClick={function () { setGarantia(x); }} />; })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
            <span style={lab}>Descripción del trabajo</span>
            <button type="button" onClick={redactarIA} disabled={generando} style={{ background: '#fff', border: '1.5px solid #cbc5f0', color: '#534AB7', fontWeight: 800, fontSize: 12, cursor: 'pointer', borderRadius: 999, padding: '5px 13px', opacity: generando ? 0.6 : 1 }}>{generando ? 'Redactando…' : '\u{2728} Redactar'}</button>
          </div>
          <textarea value={descripcion} onChange={function (e) { setDescripcion(e.target.value); }} placeholder="Describe el trabajo (la ve el cliente). O toca Redactar y la IA te propone una cotización." rows={3} style={{ ...inp, resize: 'vertical' }} />

          {msg && <p style={{ fontSize: 12.5, color: '#b3261e', margin: '12px 0 0' }}>{msg}</p>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', paddingBottom: 'calc(22px + env(safe-area-inset-bottom, 0px))', borderTop: '1px solid #eef0f5', background: '#fff', flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: '#9aa1b5' }}>Total al cliente</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{plata(total())}</div>
        </div>
        <button className="gbtn" style={{ flex: 1.4, padding: 13, opacity: enviando ? 0.6 : 1 }} disabled={enviando} onClick={enviar}>{enviando ? 'Enviando…' : 'Enviar al cliente'}</button>
      </div>

      {propuestaIA && (
        <div onClick={function () { setPropuestaIA(null); }} style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(25,34,47,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={function (e) { e.stopPropagation(); }} style={{ width: '100%', maxWidth: 360, maxHeight: '88vh', overflowY: 'auto', background: '#fff', borderRadius: 14, border: '1px solid #e7eaf1' }}>
            <div style={{ background: '#19222F', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ color: '#fff', fontSize: 18 }}>{'\u{1F9ED}'}</span><span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>MaestrosEnLínea</span></div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>COTIZACIÓN</div>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ background: '#eeedfe', borderRadius: 8, padding: '7px 9px', marginBottom: 11, fontSize: 10, color: '#2563eb', lineHeight: 1.4 }}>{'\u{2728}'} Redacté la descripción según el cliente y la conversación. Los precios y los ítems los defines tú.</div>
              {propuestaIA.items.map(function (it, ix) {
                return <div key={ix} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '6px 0', borderBottom: '1px solid #f1f3f7' }}><span>{it.desc}</span><span style={{ fontWeight: 700 }}>{plata(it.valor)}</span></div>;
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#7c8499', marginTop: 8 }}><span>Neto</span><span>{plata(propuestaIA.neto)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#7c8499' }}><span>IVA (19%)</span><span>{plata(propuestaIA.iva)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', background: '#f7f9fc', borderRadius: 9, padding: '8px 11px', marginTop: 7 }}><span style={{ fontSize: 13, fontWeight: 800 }}>Total</span><span style={{ fontSize: 19, fontWeight: 800 }}>{plata(propuestaIA.total)}</span></div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#7c8499', textTransform: 'uppercase', letterSpacing: 0.4, margin: '14px 0 4px' }}>Trabajo a realizar</div>
              <div style={{ fontSize: 12.5, color: '#2b2f3a', lineHeight: 1.5 }}>{propuestaIA.descripcion || 'Trabajo según lo conversado con el cliente.'}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={function () { setPropuestaIA(null); }} style={{ flex: 1, padding: 12, borderRadius: 11, border: '1.5px solid #ddd', background: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', color: '#5b6275' }}>Editar</button>
                <button className="gbtn" style={{ flex: 1.4, padding: 12 }} onClick={usarPropuesta}>Usar esta cotización</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
