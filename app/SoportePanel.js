'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const card = { background: '#fff', borderRadius: 16, padding: 16, border: '1.5px solid #eee' };

export default function SoportePanel() {
  const [msgs, setMsgs] = useState([]);
  const [perfiles, setPerfiles] = useState([]);
  const [maestrosIds, setMaestrosIds] = useState({});
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('todos'); // todos | clientes | maestros | noleidos
  const [abierta, setAbierta] = useState(null);   // { tipo, id }
  const [txt, setTxt] = useState('');
  const [enviando, setEnviando] = useState(false);
  const finRef = useRef(null);

  function cargar() {
    Promise.all([
      supabase.from('mensajes_soporte').select('*').order('creado_en', { ascending: true }),
      supabase.from('perfiles').select('id, nombre'),
      supabase.from('maestros').select('id'),
    ]).then(function (res) {
      setMsgs((res[0] && res[0].data) || []);
      setPerfiles((res[1] && res[1].data) || []);
      var mi = {}; ((res[2] && res[2].data) || []).forEach(function (m) { mi[m.id] = true; });
      setMaestrosIds(mi);
      setCargando(false);
      setTimeout(function () { if (finRef.current) finRef.current.scrollIntoView({ behavior: 'smooth' }); }, 60);
    }).catch(function () { setCargando(false); });
  }
  useEffect(function () { cargar(); }, []);

  function nombreDe(id) { var p = perfiles.find(function (x) { return x.id === id; }); return (p && p.nombre) || (id ? id.slice(0, 8) : '—'); }
  function fecha(f) { return f ? new Date(f).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; }

  // Agrupar en conversaciones
  var convs = {};
  msgs.forEach(function (m) {
    var tipo = m.cliente_id ? 'cliente' : 'maestro';
    var id = m.cliente_id || m.maestro_id;
    if (!id) return;
    var k = tipo + ':' + id;
    if (!convs[k]) convs[k] = { tipo: tipo, id: id, msgs: [], noLeidos: 0, ult: null };
    convs[k].msgs.push(m);
    if (m.autor !== 'admin' && !m.leido) convs[k].noLeidos++;
    convs[k].ult = m;
  });
  var lista = Object.keys(convs).map(function (k) { return convs[k]; });
  lista.sort(function (a, b) { return (a.ult && a.ult.creado_en) < (b.ult && b.ult.creado_en) ? 1 : -1; });

  var totalNoLeidos = lista.reduce(function (s, c) { return s + c.noLeidos; }, 0);
  var noLeidosCli = lista.filter(function (c) { return c.tipo === 'cliente'; }).reduce(function (s, c) { return s + c.noLeidos; }, 0);
  var noLeidosMae = totalNoLeidos - noLeidosCli;

  var listaFiltrada = lista.filter(function (c) {
    if (filtro === 'clientes') return c.tipo === 'cliente';
    if (filtro === 'maestros') return c.tipo === 'maestro';
    if (filtro === 'noleidos') return c.noLeidos > 0;
    return true;
  });

  function abrir(c) {
    setAbierta({ tipo: c.tipo, id: c.id });
    var col = c.tipo === 'cliente' ? 'cliente_id' : 'maestro_id';
    supabase.from('mensajes_soporte').update({ leido: true }).eq(col, c.id).neq('autor', 'admin').eq('leido', false).then(function () { cargar(); });
    setTimeout(function () { if (finRef.current) finRef.current.scrollIntoView({ behavior: 'smooth' }); }, 120);
  }

  function enviar() {
    var t = txt.trim(); if (!t || !abierta) return;
    setEnviando(true);
    var payload = abierta.tipo === 'cliente' ? { cliente_id: abierta.id, autor: 'admin', texto: t } : { maestro_id: abierta.id, autor: 'admin', texto: t };
    supabase.from('mensajes_soporte').insert(payload).then(function (r) {
      setEnviando(false);
      if (!r.error) { setTxt(''); cargar(); }
    });
  }

  var convAbierta = abierta ? convs[abierta.tipo + ':' + abierta.id] : null;
  var hilo = convAbierta ? convAbierta.msgs : [];

  var tabBtn = function (id, label, n) {
    var on = filtro === id;
    return (
      <button onClick={function () { setFiltro(id); }} style={{ fontSize: 12.5, fontWeight: 700, padding: '6px 12px', borderRadius: 999, border: '1.5px solid ' + (on ? '#2563eb' : '#e1e4ec'), background: on ? '#2563eb' : '#fff', color: on ? '#fff' : '#5b6275', cursor: 'pointer' }}>
        {label}{n > 0 ? <span style={{ background: on ? 'rgba(255,255,255,.25)' : '#fdecec', color: on ? '#fff' : '#b3261e', borderRadius: 999, padding: '0 6px', marginLeft: 6, fontSize: 10.5, fontWeight: 800 }}>{n}</span> : null}
      </button>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>🛟 Soporte</h2>
        <div style={{ fontSize: 13, color: '#7c8499', marginTop: 4 }}>Conversaciones de soporte con clientes y maestros. {totalNoLeidos > 0 ? <b style={{ color: '#b3261e' }}>{totalNoLeidos + ' sin leer'}</b> : 'Todo al día.'}</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {tabBtn('todos', 'Todos', totalNoLeidos)}
        {tabBtn('clientes', 'Clientes', noLeidosCli)}
        {tabBtn('maestros', 'Maestros', noLeidosMae)}
        {tabBtn('noleidos', 'No leídos', totalNoLeidos)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 12 }}>
        <div style={{ ...card, padding: 0, overflow: 'hidden', maxHeight: 540, overflowY: 'auto' }}>
          {cargando && <div style={{ padding: 14, fontSize: 12, color: '#9aa1b5' }}>Cargando…</div>}
          {!cargando && listaFiltrada.length === 0 && <div style={{ padding: 14, fontSize: 12, color: '#9aa1b5' }}>No hay conversaciones aquí.</div>}
          {listaFiltrada.map(function (c) {
            var on = abierta && abierta.tipo === c.tipo && abierta.id === c.id;
            var color = c.tipo === 'cliente' ? '#2563eb' : '#7F77DD';
            return (
              <div key={c.tipo + ':' + c.id} onClick={function () { abrir(c); }} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '11px 12px', borderBottom: '1px solid #f4f4f7', cursor: 'pointer', background: on ? '#eef4ff' : '#fff' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{nombreDe(c.id).charAt(0).toUpperCase()}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{nombreDe(c.id)} <span style={{ fontSize: 9.5, fontWeight: 800, color: color, background: c.tipo === 'cliente' ? '#eaf1ff' : '#f0eefb', borderRadius: 999, padding: '1px 6px', marginLeft: 4 }}>{c.tipo === 'cliente' ? 'CLIENTE' : 'MAESTRO'}</span></div>
                  <div style={{ fontSize: 11, color: '#9aa1b5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.ult ? (c.ult.autor === 'admin' ? 'Tú: ' : '') + c.ult.texto : 'Sin mensajes'}</div>
                </div>
                {c.noLeidos > 0 && <span style={{ background: '#2563eb', color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 999, padding: '0 6px' }}>{c.noLeidos}</span>}
              </div>
            );
          })}
        </div>

        <div style={{ ...card, display: 'flex', flexDirection: 'column', minHeight: 480 }}>
          {!convAbierta && <div style={{ fontSize: 13, color: '#9aa1b5' }}>Elige una conversación para ver y responder.</div>}
          {convAbierta && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <b style={{ fontSize: 14, marginBottom: 8 }}>{nombreDe(convAbierta.id)} <span style={{ fontSize: 11, color: '#9aa1b5', fontWeight: 600 }}>· {convAbierta.tipo === 'cliente' ? 'Cliente' : 'Maestro'}</span></b>
              <div style={{ flex: 1, overflowY: 'auto', background: '#fafafc', borderRadius: 10, padding: 10, marginBottom: 10, maxHeight: 380 }}>
                {hilo.length === 0 && <div style={{ fontSize: 12, color: '#9aa1b5' }}>Aún no hay mensajes. Escríbele abajo.</div>}
                {hilo.map(function (m) {
                  var out = m.autor === 'admin';
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: out ? 'flex-end' : 'flex-start', marginBottom: 7 }}>
                      <div style={{ maxWidth: '78%', background: out ? '#2563eb' : '#fff', color: out ? '#fff' : '#1c1f2b', border: out ? 'none' : '1px solid #eee', borderRadius: 12, padding: '7px 10px', fontSize: 13, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                        {m.texto}
                        <div style={{ fontSize: 9.5, color: out ? 'rgba(255,255,255,.7)' : '#9aa1b5', textAlign: 'right', marginTop: 3 }}>{fecha(m.creado_en)}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={finRef} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={txt} onChange={function (e) { setTxt(e.target.value); }} onKeyDown={function (e) { if (e.key === 'Enter') enviar(); }} placeholder={'Responder a ' + nombreDe(convAbierta.id) + '...'} style={{ flex: 1, padding: 10, border: '1.5px solid #ddd', borderRadius: 10, fontSize: 13 }} />
                <button onClick={enviar} disabled={enviando} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, padding: '0 16px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Enviar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
