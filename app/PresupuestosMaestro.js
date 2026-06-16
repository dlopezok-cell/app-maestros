'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import ChatCotizacion from './ChatCotizacion';
import MediaCarrusel from './MediaCarrusel';

var INCLUYE_OPC = ['Materiales', 'Mano de obra', 'Garantía 30 días', 'Boleta', 'Retiro de escombros', 'Visita incluida'];
var IVA = 0.19;

// Vista del maestro: solicitudes de presupuesto (videos). Responde con una cotización
// DESGLOSADA por ítem (mano de obra + materiales). La IA arranca sola leyendo el problema
// del cliente y propone los ítems; el maestro corrige. El IVA se suma siempre.
export default function PresupuestosMaestro({ usuario }) {
  const [misOficios, setMisOficios] = useState([]);
  const [esMaestro, setEsMaestro] = useState(false);
  const [items, setItems] = useState([]);
  const [cargado, setCargado] = useState(false);
  const [respId, setRespId] = useState(null);
  const [lineas, setLineas] = useState([]);       // [{tipo:'mano_obra'|'material', desc, valor}]
  const [incluye, setIncluye] = useState([]);
  const [condiciones, setCondiciones] = useState('');
  const [generando, setGenerando] = useState(false);
  const [msg, setMsg] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [noLeidos, setNoLeidos] = useState({});

  function cargar(oficios) {
    supabase.from('presupuestos').select('*, cotizaciones(*)')
      .or('maestro_id.eq.' + usuario.id + ',maestro_id.is.null')
      .order('creado_en', { ascending: false })
      .then(function (r) {
        var data = r.data || [];
        var filt = data.filter(function (p) {
          if (p.estado === 'agendado' || p.estado === 'cerrado') return false;
          if (p.maestro_id === usuario.id) return true;
          return p.maestro_id == null && oficios.indexOf(p.oficio) >= 0;
        });
        setItems(filt);
        setCargado(true);
        var ids = filt.map(function (p) { return p.id; });
        if (ids.length) {
          supabase.from('mensajes').select('presupuesto_id')
            .eq('maestro_id', usuario.id).eq('autor_rol', 'cliente').eq('leido', false).in('presupuesto_id', ids)
            .then(function (rm) {
              var u = {}; (rm.data || []).forEach(function (x) { u[x.presupuesto_id] = (u[x.presupuesto_id] || 0) + 1; });
              setNoLeidos(u);
            });
        }
      });
  }

  useEffect(function () {
    if (!usuario) return;
    supabase.from('maestros').select('oficios, oficio').eq('id', usuario.id).maybeSingle()
      .then(function (r) {
        if (r.data) {
          var ofs = r.data.oficios && r.data.oficios.length ? r.data.oficios : (r.data.oficio ? [r.data.oficio] : []);
          setEsMaestro(true); setMisOficios(ofs); cargar(ofs);
        } else { setEsMaestro(false); setCargado(true); }
      });
  }, [usuario]);

  function abrirResp(p) {
    setRespId(p.id);
    setLineas([]); setIncluye([]); setCondiciones(''); setMsg(null);
    cotizarIA(p); // la IA arranca sola
  }

  // La IA propone la cotización leyendo el problema del cliente.
  function cotizarIA(p, notas) {
    setGenerando(true); setMsg(null);
    fetch('/api/cotizar-ia', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oficio: p.oficio, descripcion: p.descripcion, notas: notas || '' })
    }).then(function (r) { return r.json(); }).then(function (d) {
      setGenerando(false);
      if (d && d.items && d.items.length) {
        setLineas(d.items);
        setIncluye(d.incluye && d.incluye.length ? d.incluye : ['Materiales', 'Mano de obra']);
        setCondiciones(d.condiciones || 'Validez 15 días. No incluye obras no descritas.');
      } else if (!lineas.length) {
        // si la IA no devolvió nada, dejamos una línea de mano de obra para empezar
        setLineas([{ tipo: 'mano_obra', desc: 'Mano de obra', valor: 0 }]);
      }
    }).catch(function () { setGenerando(false); if (!lineas.length) setLineas([{ tipo: 'mano_obra', desc: 'Mano de obra', valor: 0 }]); });
  }

  function setLinea(i, campo, val) {
    setLineas(function (p) { return p.map(function (x, k) { if (k !== i) return x; var o = Object.assign({}, x); o[campo] = campo === 'valor' ? (parseInt((val + '').replace(/[^0-9]/g, ''), 10) || 0) : val; return o; }); });
  }
  function addLinea() { setLineas(function (p) { return p.concat([{ tipo: 'material', desc: '', valor: 0 }]); }); }
  function delLinea(i) { setLineas(function (p) { return p.filter(function (x, k) { return k !== i; }); }); }
  function toggleInc(x) { setIncluye(function (p) { return p.indexOf(x) >= 0 ? p.filter(function (y) { return y !== x; }) : p.concat([x]); }); }

  function neto() { return lineas.reduce(function (a, x) { return a + (Number(x.valor) || 0); }, 0); }
  function ivaMonto() { return Math.round(neto() * IVA); }
  function total() { return neto() + ivaMonto(); }

  function responder(p) {
    var n = neto();
    if (n <= 0) { setMsg('Agrega al menos un ítem con su precio.'); return; }
    setEnviando(true);
    var resumen = (incluye.length ? 'Incluye: ' + incluye.join(', ') + '. ' : '') + (condiciones || '');
    var detalle = { items: lineas.filter(function (x) { return x.desc && Number(x.valor) > 0; }), incluye: incluye, condiciones: condiciones, neto: n, iva: ivaMonto() };
    supabase.from('cotizaciones').insert({
      presupuesto_id: p.id,
      maestro_id: usuario.id,
      monto: total(),
      mensaje: resumen.trim() || null,
      detalle: detalle,
    }).then(function (r) {
      if (r.error) { setMsg('Error: ' + r.error.message); setEnviando(false); return; }
      try {
        fetch('/api/notificar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'cotizacion', presupuestoId: p.id, maestroId: usuario.id, monto: total() }) });
      } catch (e) {}
      setEnviando(false); setRespId(null);
      cargar(misOficios);
    });
  }

  function abrirChat(p) {
    setChatId(chatId === p.id ? null : p.id);
    setNoLeidos(function (prev) { var n = Object.assign({}, prev); n[p.id] = 0; return n; });
  }

  function fecha(f) { return f ? new Date(f).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; }
  function plata(n) { return '$' + (n || 0).toLocaleString('es-CL'); }

  const card = { background: '#fff', borderRadius: 18, padding: 16, margin: '0 16px 14px', border: '1.5px solid #eee' };
  const inp = { width: '100%', padding: 11, border: '1.5px solid #ddd', borderRadius: 10, fontSize: 14, background: '#fff' };

  if (!cargado) return null;
  if (!esMaestro) {
    return (
      <div style={{ ...card, marginTop: 14 }}>
        <b style={{ fontSize: 14 }}>{'\u{1F3A5} Cotizaciones'}</b>
        <div style={{ fontSize: 12, color: '#9aa1b5', marginTop: 6 }}>Cuando completes tu ficha como maestro, aquí verás los videos de clientes que piden presupuesto en tu especialidad.</div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14 }}>
      {items.length === 0 && <div style={card}><div style={{ fontSize: 13, color: '#9aa1b5' }}>No hay solicitudes nuevas por ahora. Te avisaremos cuando llegue un video.</div></div>}
      {items.map(function (p) {
        var yaRespondi = (p.cotizaciones || []).length > 0;
        var nl = noLeidos[p.id] || 0;
        var abierto = respId === p.id;
        return (
          <div key={p.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ fontSize: 14 }}>{(p.oficio || 'servicio').charAt(0).toUpperCase() + (p.oficio || '').slice(1)}</b>
              <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 8, background: p.maestro_id ? '#eef4ff' : '#fff5f2', color: p.maestro_id ? '#3b6ef0' : '#ff5a3c', fontWeight: 800 }}>{p.maestro_id ? 'PARA TI' : 'ABIERTO'}</span>
            </div>
            <div style={{ fontSize: 13, color: '#5b6275', margin: '4px 0' }}>{p.descripcion}</div>
            <div style={{ fontSize: 11, color: '#9aa1b5' }}>{['\u{1F4CD} ' + (p.comuna || 'comuna no indicada'), fecha(p.creado_en)].filter(Boolean).join(' · ')}</div>
            <div style={{ fontSize: 10.5, color: '#b6bccb', marginTop: 2 }}>La dirección exacta y el teléfono aparecen en tu Agenda cuando el cliente paga.</div>
            <MediaCarrusel items={(p.archivos && p.archivos.length) ? p.archivos : (p.video_url ? [{ url: p.video_url, tipo: 'video' }] : [])} alto={240} />

            {yaRespondi && <div style={{ fontSize: 12, color: '#0d9456', fontWeight: 700, marginTop: 8 }}>{'✓ Ya enviaste tu cotización'}</div>}

            {!yaRespondi && !abierto && (
              <button className="gbtn full" style={{ marginTop: 10 }} onClick={function () { abrirResp(p); }}>{'✨ Cotizar este trabajo'}</button>
            )}

            {!yaRespondi && abierto && (
              <div style={{ marginTop: 10, background: '#fafbfe', border: '1px solid #eef0f5', borderRadius: 14, padding: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 800, color: '#3C3489' }}>{'✨ Cotización'}</div>
                  <button type="button" onClick={function () { cotizarIA(p); }} disabled={generando} style={{ background: 'none', border: 'none', color: '#534AB7', fontWeight: 800, fontSize: 12, cursor: 'pointer', opacity: generando ? 0.5 : 1 }}>{generando ? 'Pensando…' : '↻ Sugerir con IA'}</button>
                </div>

                {generando && !lineas.length && <div style={{ fontSize: 12, color: '#7c8499', padding: '6px 0' }}>La IA está leyendo el problema y armando tu cotización…</div>}

                {lineas.map(function (l, i) {
                  return (
                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 7 }}>
                      <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{l.tipo === 'mano_obra' ? '\u{1F6E0}️' : '\u{1F4E6}'}</span>
                      <input value={l.desc} onChange={function (e) { setLinea(i, 'desc', e.target.value); }} placeholder={l.tipo === 'mano_obra' ? 'Mano de obra' : 'Material'} style={{ ...inp, flex: 1, padding: 8, fontSize: 13 }} />
                      <input value={l.valor ? l.valor : ''} onChange={function (e) { setLinea(i, 'valor', e.target.value); }} inputMode="numeric" placeholder="$" style={{ ...inp, width: 78, padding: 8, fontSize: 13, textAlign: 'right' }} />
                      <button type="button" onClick={function () { delLinea(i); }} style={{ border: 'none', background: 'none', color: '#c2c7d4', fontSize: 16, cursor: 'pointer', width: 18 }}>{'×'}</button>
                    </div>
                  );
                })}
                <button type="button" onClick={addLinea} style={{ background: 'none', border: '1px dashed #cbd0dd', borderRadius: 9, padding: '6px 10px', fontSize: 12, fontWeight: 700, color: '#5b6275', cursor: 'pointer', marginBottom: 10 }}>{'+ Agregar material'}</button>

                <div style={{ background: '#fff', border: '1px solid #eef0f5', borderRadius: 10, padding: '9px 11px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#7c8499', marginBottom: 3 }}><span>Neto</span><span>{plata(neto())}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#7c8499', marginBottom: 6 }}><span>IVA (19%)</span><span>{plata(ivaMonto())}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid #eef0f5', paddingTop: 7 }}><span style={{ fontSize: 13, fontWeight: 800 }}>Total al cliente</span><span style={{ fontSize: 19, fontWeight: 800 }}>{plata(total())}</span></div>
                  <div style={{ fontSize: 10, color: '#9aa1b5', textAlign: 'right', marginTop: 2 }}>Todos los valores incluyen IVA</div>
                </div>

                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#5b6275', marginBottom: 5 }}>Incluye</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {INCLUYE_OPC.map(function (x) {
                    var on = incluye.indexOf(x) >= 0;
                    return <span key={x} onClick={function () { toggleInc(x); }} style={{ fontSize: 11.5, borderRadius: 999, padding: '5px 10px', cursor: 'pointer', background: on ? '#e1f5ee' : '#fff', color: on ? '#0f6e56' : '#7c8499', border: '1px solid ' + (on ? '#bfe6cf' : '#e4e4ef'), fontWeight: on ? 800 : 600 }}>{(on ? '✓ ' : '') + x}</span>;
                  })}
                </div>

                <textarea value={condiciones} onChange={function (e) { setCondiciones(e.target.value); }} placeholder="Condiciones: validez, qué no incluye…" rows={2} style={{ ...inp, resize: 'vertical', fontSize: 13, marginBottom: 8 }} />

                {msg && <p style={{ fontSize: 12, color: '#b3261e', margin: '2px 0' }}>{msg}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={function () { setRespId(null); }} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1.5px solid #ddd', background: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#5b6275' }}>Cancelar</button>
                  <button className="gbtn" style={{ flex: 2, opacity: enviando ? 0.6 : 1 }} disabled={enviando} onClick={function () { responder(p); }}>{enviando ? 'Enviando...' : 'Enviar cotización'}</button>
                </div>
              </div>
            )}

            <button onClick={function () { abrirChat(p); }} style={{ width: '100%', marginTop: 10, background: chatId === p.id ? '#fff5f2' : '#fff', color: '#ff5a3c', border: '1.5px solid #ffd6cb', borderRadius: 12, padding: 11, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
              {'\u{1F4AC} Conversación' + (nl > 0 ? ' · ' + nl + ' nuevo' + (nl > 1 ? 's' : '') : '')}
            </button>
            {chatId === p.id && <ChatCotizacion usuario={usuario} presupuestoId={p.id} maestroId={usuario.id} miRol="maestro" titulo={p.cliente_nombre || 'Cliente'} onClose={function () { setChatId(null); }} />}
          </div>
        );
      })}
    </div>
  );
}
