'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import ChatCotizacion from './ChatCotizacion';
import MediaCarrusel from './MediaCarrusel';

var INCLUYE_OPC = ['Materiales', 'Mano de obra', 'Visita técnica', 'Retiro de escombros'];
var VALIDEZ_OPC = ['15 días', '30 días'];
var GARANTIA_OPC = ['Sin garantía', '1 mes', '2 meses', '3 meses'];
var IVA = 0.19;

// Vista del maestro: LISTA de solicitudes -> DETALLE a pantalla completa -> CONSTRUCTOR
// de cotización a pantalla completa (barra fija Total + Enviar). Validez y garantía van
// como chips. El botón "Redactar" llama a la IA, que devuelve una cotización formal en un
// pop-up; el maestro la usa o la edita. El IVA se suma siempre.
export default function PresupuestosMaestro({ usuario }) {
  const [misOficios, setMisOficios] = useState([]);
  const [esMaestro, setEsMaestro] = useState(false);
  const [items, setItems] = useState([]);
  const [cargado, setCargado] = useState(false);

  const [vista, setVista] = useState('lista');   // 'lista' | 'detalle' | 'cotizar'
  const [sel, setSel] = useState(null);
  const [filtro, setFiltro] = useState('nuevas');

  const [lineas, setLineas] = useState([]);       // [{tipo:'mano_obra'|'material', desc, valor}]
  const [incluye, setIncluye] = useState([]);
  const [validez, setValidez] = useState('15 días');
  const [garantia, setGarantia] = useState('1 mes');
  const [modo, setModo] = useState('abierto');   // 'abierto' = ve cada ítem; 'cerrado' = agrupado
  const [descripcion, setDescripcion] = useState('');
  const [generando, setGenerando] = useState(false);
  const [propuestaIA, setPropuestaIA] = useState(null); // cotización formal propuesta (pop-up)
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

  function abrirDetalle(p) { setSel(p); setVista('detalle'); setMsg(null); window.scrollTo(0, 0); }
  function volverLista() { setVista('lista'); setSel(null); }

  function abrirCotizar(p) {
    setSel(p); setVista('cotizar');
    setLineas([{ tipo: 'mano_obra', desc: 'Mano de obra', valor: 0 }]);
    setIncluye(['Mano de obra']);
    setValidez('15 días'); setGarantia('1 mes');
    setModo('abierto'); setDescripcion(''); setPropuestaIA(null); setMsg(null);
  }

  // Limpia el texto de mano de obra ("Mano de obra (por hora)" -> "Mano de obra").
  function limpiarMO(desc, tipo) {
    if (tipo !== 'mano_obra') return desc;
    var d = (desc || '').replace(/\s*\([^)]*\)/g, '').trim();
    if (/hora/i.test(d)) d = 'Mano de obra'; // nada de "por hora" / "primera hora"
    return d || 'Mano de obra';
  }
  function parseValidez(t) { var m = (t || '').match(/(\d+)\s*d[ií]a/i); if (m) { var v = m[1] + ' días'; return VALIDEZ_OPC.indexOf(v) >= 0 ? v : null; } return null; }
  function parseGarantia(t) {
    if (!t) return null;
    if (/sin garant/i.test(t)) return 'Sin garantía';
    var m = t.match(/(\d+)\s*mes/i);
    if (m) { var n = m[1]; var g = n + (n === '1' ? ' mes' : ' meses'); return GARANTIA_OPC.indexOf(g) >= 0 ? g : null; }
    return null;
  }

  // "Redactar": la IA lee el problema y propone una cotización formal (pop-up).
  function redactarIA(p) {
    setGenerando(true); setMsg(null);
    supabase.from('mensajes').select('autor_rol, texto, creado_en').eq('presupuesto_id', p.id).eq('maestro_id', usuario.id).order('creado_en', { ascending: true }).limit(40)
      .then(function (rm) {
        var conv = (rm.data || []).filter(function (m) { return m.texto; }).map(function (m) { return (m.autor_rol === 'cliente' ? 'Cliente: ' : 'Maestro: ') + m.texto; }).join('\n');
        return fetch('/api/cotizar-ia', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oficio: p.oficio, descripcion: p.descripcion, descMaestro: descripcion, incluye: incluye, items: lineas, conversacion: conv })
        });
      }).then(function (r) { return r.json(); }).then(function (d) {
      setGenerando(false);
      // La IA NO cambia los ítems ni los precios: esos los pone el maestro directo.
      // Solo propone la descripción y sugiere incluye/validez/garantía.
      var its = lineas;
      var inc = (d && d.incluye ? d.incluye : []).filter(function (x) { return INCLUYE_OPC.indexOf(x) >= 0; });
      if (!inc.length) inc = incluye;
      var net = its.reduce(function (a, x) { return a + (Number(x.valor) || 0); }, 0);
      var iv = Math.round(net * IVA);
      setPropuestaIA({
        items: its, incluye: inc,
        descripcion: (d && d.descripcion) ? d.descripcion : '',
        validez: parseValidez(d && d.condiciones) || validez,
        garantia: parseGarantia(d && d.condiciones) || garantia,
        neto: net, iva: iv, total: net + iv,
      });
    }).catch(function () { setGenerando(false); setMsg('No se pudo redactar con IA. Inténtalo de nuevo.'); });
  }

  function usarPropuesta() {
    if (!propuestaIA) return;
    // NO tocamos los ítems ni los precios (los pone el maestro). Solo descripción + sugerencias.
    setIncluye(propuestaIA.incluye);
    setDescripcion(propuestaIA.descripcion);
    setValidez(propuestaIA.validez);
    setGarantia(propuestaIA.garantia);
    setPropuestaIA(null);
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
    var cond = 'Validez ' + validez + (garantia && garantia !== 'Sin garantía' ? '. Garantía ' + garantia : '');
    var resumen = (incluye.length ? 'Incluye: ' + incluye.join(', ') + '. ' : '') + cond;
    var detalle = {
      items: lineas.filter(function (x) { return x.desc && Number(x.valor) > 0; }),
      incluye: incluye, validez: validez, garantia: garantia, condiciones: cond,
      neto: n, iva: ivaMonto(), modo: modo, descripcion: (descripcion || '').trim(),
    };
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
      setEnviando(false); setVista('lista'); setSel(null);
      cargar(misOficios);
    });
  }

  function abrirChat(p) {
    setChatId(p.id);
    setNoLeidos(function (prev) { var n = Object.assign({}, prev); n[p.id] = 0; return n; });
  }

  function fecha(f) { return f ? new Date(f).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; }
  function fechaCorta(f) { return new Date(f || Date.now()).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }); }
  function plata(n) { return '$' + (n || 0).toLocaleString('es-CL'); }
  function mediaDe(p) { return (p.archivos && p.archivos.length) ? p.archivos : (p.video_url ? [{ url: p.video_url, tipo: 'video' }] : []); }
  function yaRespondida(p) { return (p.cotizaciones || []).length > 0; }
  function ofTit(p) { return (p.oficio || 'servicio').charAt(0).toUpperCase() + (p.oficio || '').slice(1); }
  function tituloDe(p) { return (p && p.titulo && p.titulo.trim()) ? p.titulo : ofTit(p); }
  function clienteDe(p) { return (p && p.cliente_nombre && p.cliente_nombre.trim()) ? p.cliente_nombre.trim() : 'Cliente'; }

  const inp = { width: '100%', padding: 11, border: '1.5px solid #ddd', borderRadius: 10, fontSize: 14, background: '#fff' };
  const pantalla = { position: 'fixed', inset: 0, zIndex: 250, background: '#fff', display: 'flex', flexDirection: 'column' };
  const topbar = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px', paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))', borderBottom: '1px solid #eef0f5', background: '#fff', flexShrink: 0 };
  const scroll = { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' };
  const bottombar = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', paddingBottom: 'calc(22px + env(safe-area-inset-bottom, 0px))', borderTop: '1px solid #eef0f5', background: '#fff', flexShrink: 0 };
  const back = { border: 'none', background: 'none', color: '#ff5a3c', fontSize: 26, fontWeight: 700, cursor: 'pointer', lineHeight: 1, padding: '0 2px' };
  const lab = { fontSize: 11.5, fontWeight: 700, color: '#5b6275', marginBottom: 7 };

  function Chip(props) {
    var on = props.on;
    return <span onClick={props.onClick} style={{ fontSize: 11.5, borderRadius: 999, padding: '6px 11px', cursor: 'pointer', background: on ? props.bg : '#fff', color: on ? props.col : '#7c8499', border: '1px solid ' + (on ? props.bd : '#e4e4ef'), fontWeight: on ? 800 : 600 }}>{(on ? '✓ ' : '') + props.label}</span>;
  }

  if (!cargado) return null;
  if (!esMaestro) {
    return (
      <div style={{ background: '#fff', borderRadius: 18, padding: 16, margin: '14px 16px', border: '1.5px solid #eee' }}>
        <b style={{ fontSize: 14 }}>{'\u{1F3A5} Cotizaciones'}</b>
        <div style={{ fontSize: 12, color: '#9aa1b5', marginTop: 6 }}>Cuando completes tu ficha como maestro, aquí verás los videos de clientes que piden presupuesto en tu especialidad.</div>
      </div>
    );
  }

  function Badge(p) {
    var resp = yaRespondida(p);
    var txt = resp ? 'Cotizada' : (p.maestro_id ? 'PARA TI' : 'ABIERTO');
    var bg = resp ? '#e1f5ee' : (p.maestro_id ? '#fff5f2' : '#eef4ff');
    var col = resp ? '#0f6e56' : (p.maestro_id ? '#ff5a3c' : '#3b6ef0');
    return <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 7, background: bg, color: col, whiteSpace: 'nowrap' }}>{txt}</span>;
  }

  function Thumb(p) {
    var m = mediaDe(p)[0];
    var box = { width: 48, height: 48, borderRadius: 10, flexShrink: 0, background: '#19222f', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' };
    if (m && m.tipo !== 'video') return <div style={box}><img src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
    return <div style={box}><span style={{ color: '#fff', fontSize: 16 }}>{'▶'}</span></div>;
  }

  // ---------- LISTA ----------
  if (vista === 'lista') {
    var nuevas = items.filter(function (p) { return !yaRespondida(p); });
    var cotizadas = items.filter(function (p) { return yaRespondida(p); });
    var listaF = filtro === 'cotizadas' ? cotizadas : nuevas;
    function Tab(props) {
      var on = filtro === props.id;
      return (
        <button onClick={function () { setFiltro(props.id); }} style={{ border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 800, padding: '7px 13px', borderRadius: 999, background: on ? '#ff5a3c' : '#f2f3f7', color: on ? '#fff' : '#7c8499' }}>
          {props.label}{props.n > 0 ? ' ' + props.n : ''}
        </button>
      );
    }
    return (
      <div style={{ paddingBottom: 90 }}>
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px 6px' }}>
          <Tab id="nuevas" label="Nuevas" n={nuevas.length} />
          <Tab id="cotizadas" label="Cotizadas" n={cotizadas.length} />
        </div>

        {listaF.length === 0 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 16, margin: '8px 16px', border: '1.5px solid #eee', fontSize: 13, color: '#9aa1b5' }}>
            {filtro === 'nuevas' ? 'No hay solicitudes nuevas por ahora. Te avisaremos cuando llegue un video.' : 'Aún no has enviado cotizaciones.'}
          </div>
        )}

        <div style={{ padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: 9 }}>
          {listaF.map(function (p) {
            var nl = noLeidos[p.id] || 0;
            return (
              <div key={p.id} onClick={function () { abrirDetalle(p); }} style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#fff', border: '1.5px solid #eef0f5', borderRadius: 14, padding: 10, cursor: 'pointer' }}>
                {Thumb(p)}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <b style={{ fontSize: 13.5 }}>{tituloDe(p)}</b>
                    {Badge(p)}
                  </div>
                  <div style={{ fontSize: 12, color: '#5b6275', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '1px 0' }}>{p.descripcion || 'Sin descripción'}</div>
                  <div style={{ fontSize: 10.5, color: '#9aa1b5' }}>{ofTit(p) + ' · ' + (p.comuna || 'comuna no indicada') + ' · ' + fecha(p.creado_en)}</div>
                </div>
                {nl > 0
                  ? <span style={{ background: '#ff5a3c', color: '#fff', fontSize: 10.5, fontWeight: 800, borderRadius: 999, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 }}>{nl}</span>
                  : <span style={{ color: '#c5c9d6', fontSize: 20, flexShrink: 0 }}>{'›'}</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------- DETALLE ----------
  if (vista === 'detalle' && sel) {
    var resp = yaRespondida(sel);
    return (
      <div style={pantalla}>
        <div style={topbar}>
          <button onClick={volverLista} style={back}>{'‹'}</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tituloDe(sel)}</div>
            <div style={{ fontSize: 11, color: '#9aa1b5' }}>{ofTit(sel) + ' · ' + (sel.comuna || 'comuna no indicada') + ' · ' + fecha(sel.creado_en)}</div>
          </div>
          {Badge(sel)}
        </div>

        <div style={scroll}>
          <MediaCarrusel items={mediaDe(sel)} alto={300} />
          <div style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#5b6275', marginBottom: 4 }}>Lo que pide el cliente</div>
            <div style={{ fontSize: 14, color: '#2b2f3a', lineHeight: 1.55 }}>{sel.descripcion || 'Sin descripción.'}</div>
            <div style={{ fontSize: 10.5, color: '#b6bccb', marginTop: 12, background: '#f7f9fc', border: '1px solid #eef0f5', borderRadius: 10, padding: '9px 11px' }}>{'\u{1F512}'} La dirección exacta y el teléfono aparecen en tu Agenda cuando el cliente paga.</div>
            {resp && <div style={{ fontSize: 13, color: '#0d9456', fontWeight: 800, marginTop: 14 }}>{'✓ Ya enviaste tu cotización'}</div>}
          </div>
        </div>

        <div style={bottombar}>
          <button onClick={function () { abrirChat(sel); }} style={{ flex: 1, background: '#fff', color: '#ff5a3c', border: '1.5px solid #ffd6cb', borderRadius: 12, padding: 13, fontWeight: 800, fontSize: 13.5, cursor: 'pointer' }}>{'\u{1F4AC} Conversar' + ((noLeidos[sel.id] || 0) > 0 ? ' · ' + noLeidos[sel.id] : '')}</button>
          {!resp && <button className="gbtn" style={{ flex: 1.4, padding: 13 }} onClick={function () { abrirCotizar(sel); }}>{'✨ Cotizar este trabajo'}</button>}
        </div>

        {chatId === sel.id && <ChatCotizacion usuario={usuario} presupuestoId={sel.id} maestroId={usuario.id} miRol="maestro" titulo={sel.cliente_nombre || 'Cliente'} onClose={function () { setChatId(null); }} />}
      </div>
    );
  }

  // ---------- COTIZAR ----------
  if (vista === 'cotizar' && sel) {
    return (
      <div style={pantalla}>
        <div style={topbar}>
          <button onClick={function () { setVista('detalle'); }} style={back}>{'‹'}</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tituloDe(sel)}</div>
            <div style={{ fontSize: 11, color: '#9aa1b5' }}>{ofTit(sel) + ' · ' + clienteDe(sel)}</div>
          </div>
        </div>

        <div style={scroll}>
          <div style={{ padding: '14px 16px 18px' }}>
            <div style={lab}>Precio</div>
            {lineas.map(function (l, i) {
              return (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{l.tipo === 'mano_obra' ? '\u{1F6E0}️' : '\u{1F4E6}'}</span>
                  <input value={l.desc} onChange={function (e) { setLinea(i, 'desc', e.target.value); }} placeholder={l.tipo === 'mano_obra' ? 'Mano de obra' : 'Ítem / material'} style={{ ...inp, flex: 1, padding: 9, fontSize: 13.5 }} />
                  <input value={l.valor ? l.valor : ''} onChange={function (e) { setLinea(i, 'valor', e.target.value); }} inputMode="numeric" placeholder="$" style={{ ...inp, width: 84, padding: 9, fontSize: 13.5, textAlign: 'right' }} />
                  <button type="button" onClick={function () { delLinea(i); }} style={{ border: 'none', background: 'none', color: '#c2c7d4', fontSize: 18, cursor: 'pointer', width: 18 }}>{'×'}</button>
                </div>
              );
            })}
            <button type="button" onClick={addLinea} style={{ background: 'none', border: '1px dashed #cbd0dd', borderRadius: 9, padding: '7px 11px', fontSize: 12.5, fontWeight: 700, color: '#5b6275', cursor: 'pointer', marginBottom: 16 }}>{'+ Agregar ítem'}</button>

            <div style={{ background: '#f7f9fc', border: '1px solid #eef0f5', borderRadius: 12, padding: '10px 12px', marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#7c8499', marginBottom: 3 }}><span>Neto</span><span>{plata(neto())}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#7c8499' }}><span>IVA (19%)</span><span>{plata(ivaMonto())}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid #e7eaf1', marginTop: 7, paddingTop: 7 }}><span style={{ fontSize: 13, fontWeight: 800 }}>Total al cliente</span><span style={{ fontSize: 20, fontWeight: 800 }}>{plata(total())}</span></div>
              <div style={{ fontSize: 10, color: '#9aa1b5', textAlign: 'right', marginTop: 2 }}>Todos los valores incluyen IVA</div>
            </div>

            <div style={lab}>Incluye</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              {INCLUYE_OPC.map(function (x) {
                return <Chip key={x} label={x} on={incluye.indexOf(x) >= 0} bg="#e1f5ee" col="#0f6e56" bd="#bfe6cf" onClick={function () { toggleInc(x); }} />;
              })}
            </div>

            <div style={lab}>Validez de la cotización</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              {VALIDEZ_OPC.map(function (x) {
                return <Chip key={x} label={x} on={validez === x} bg="#e6f1fb" col="#185fa5" bd="#a9cdf2" onClick={function () { setValidez(x); }} />;
              })}
            </div>

            <div style={lab}>Garantía</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              {GARANTIA_OPC.map(function (x) {
                return <Chip key={x} label={x} on={garantia === x} bg="#e6f1fb" col="#185fa5" bd="#a9cdf2" onClick={function () { setGarantia(x); }} />;
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
              <span style={lab}>Descripción del trabajo</span>
              <button type="button" onClick={function () { redactarIA(sel); }} disabled={generando} style={{ background: '#fff', border: '1.5px solid #cbc5f0', color: '#534AB7', fontWeight: 800, fontSize: 12, cursor: 'pointer', borderRadius: 999, padding: '5px 13px', opacity: generando ? 0.6 : 1 }}>{generando ? 'Redactando…' : '\u{2728} Redactar'}</button>
            </div>
            <textarea value={descripcion} onChange={function (e) { setDescripcion(e.target.value); }} placeholder="Describe el trabajo (la ve el cliente). O toca Redactar y la IA te propone una cotización." rows={3} style={{ ...inp, resize: 'vertical', fontSize: 13.5 }} />

            {msg && <p style={{ fontSize: 12.5, color: '#b3261e', margin: '12px 0 0' }}>{msg}</p>}
          </div>
        </div>

        <div style={bottombar}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: '#9aa1b5' }}>Total al cliente</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{plata(total())}</div>
          </div>
          <button className="gbtn" style={{ flex: 1.3, padding: 13, opacity: enviando ? 0.6 : 1 }} disabled={enviando} onClick={function () { responder(sel); }}>{enviando ? 'Enviando...' : 'Enviar cotización'}</button>
        </div>

        {/* Pop-up: cotización formal propuesta por la IA */}
        {propuestaIA && (
          <div onClick={function () { setPropuestaIA(null); }} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(25,34,47,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={function (e) { e.stopPropagation(); }} style={{ width: '100%', maxWidth: 360, maxHeight: '88vh', overflowY: 'auto', background: '#fff', borderRadius: 14, border: '1px solid #e7eaf1' }}>
              <div style={{ background: '#19222F', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ color: '#fff', fontSize: 18 }}>{'\u{1F9ED}'}</span><span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>MaestrosEnLínea</span></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>COTIZACIÓN</div><div style={{ fontSize: 10, color: '#9aa6b4' }}>{fechaCorta()}</div></div>
              </div>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11, borderBottom: '1px solid #eef0f5', paddingBottom: 9, marginBottom: 11 }}>
                  <div style={{ minWidth: 0 }}><div style={{ color: '#9aa1b5', fontSize: 9.5 }}>Para</div><div style={{ fontWeight: 800 }}>{clienteDe(sel)}</div></div>
                  <div style={{ textAlign: 'right', minWidth: 0 }}><div style={{ color: '#9aa1b5', fontSize: 9.5 }}>Trabajo</div><div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tituloDe(sel)}</div></div>
                </div>
                <div style={{ background: '#eeedfe', borderRadius: 8, padding: '7px 9px', marginBottom: 11, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 12 }}>{'\u{2728}'}</span>
                  <span style={{ fontSize: 10, color: '#3C3489', lineHeight: 1.4 }}>Redacté la descripción según el cliente y la conversación. Los precios y los ítems los defines tú.</span>
                </div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#7c8499', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Detalle de costos</div>
                {propuestaIA.items.map(function (it, ix) {
                  return <div key={ix} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '6px 0', borderBottom: '1px solid #f1f3f7' }}><span>{(it.tipo === 'mano_obra' ? '\u{1F6E0}️ ' : '\u{1F4E6} ') + it.desc}</span><span style={{ fontWeight: 700 }}>{plata(it.valor)}</span></div>;
                })}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#7c8499', marginTop: 8 }}><span>Neto</span><span>{plata(propuestaIA.neto)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#7c8499' }}><span>IVA (19%)</span><span>{plata(propuestaIA.iva)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', background: '#f7f9fc', borderRadius: 9, padding: '8px 11px', marginTop: 7 }}><span style={{ fontSize: 13, fontWeight: 800 }}>Total</span><span style={{ fontSize: 19, fontWeight: 800 }}>{plata(propuestaIA.total)}</span></div>

                <div style={{ fontSize: 10, fontWeight: 800, color: '#7c8499', textTransform: 'uppercase', letterSpacing: 0.4, margin: '14px 0 4px' }}>Trabajo a realizar</div>
                <div style={{ fontSize: 12.5, color: '#2b2f3a', lineHeight: 1.5 }}>{propuestaIA.descripcion || 'Trabajo según lo conversado con el cliente.'}</div>

                {propuestaIA.incluye && propuestaIA.incluye.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    {propuestaIA.incluye.map(function (x) { return <span key={x} style={{ fontSize: 11, background: '#e1f5ee', color: '#0f6e56', borderRadius: 999, padding: '4px 9px' }}>{'✓ ' + x}</span>; })}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 16, borderTop: '1px solid #eef0f5', marginTop: 13, paddingTop: 10 }}>
                  <div><div style={{ fontSize: 9.5, color: '#9aa1b5' }}>Validez</div><div style={{ fontSize: 12.5, fontWeight: 800 }}>{propuestaIA.validez}</div></div>
                  <div><div style={{ fontSize: 9.5, color: '#9aa1b5' }}>Garantía</div><div style={{ fontSize: 12.5, fontWeight: 800 }}>{propuestaIA.garantia}</div></div>
                </div>

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

  return null;
}
