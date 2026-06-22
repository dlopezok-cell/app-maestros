'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const card = { background: '#fff', borderRadius: 16, padding: 16, border: '1.5px solid #eee' };

function telFmt(t) {
  var d = ('' + (t || '')).replace(/\D/g, '');
  if (d.length === 11 && d.indexOf('569') === 0) return '+56 9 ' + d.slice(3, 7) + ' ' + d.slice(7);
  if (d.length === 9 && d[0] === '9') return '+56 9 ' + d.slice(1, 5) + ' ' + d.slice(5);
  return '+' + d;
}

export default function SoportePanel() {
  const [msgs, setMsgs] = useState([]);
  const [wa, setWa] = useState([]);
  const [perfiles, setPerfiles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('todos'); // todos | clientes | maestros | whatsapp | noleidos
  const [abierta, setAbierta] = useState(null);   // { tipo, id }
  const [txt, setTxt] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState('');
  const finRef = useRef(null);

  function cargar() {
    Promise.all([
      supabase.from('mensajes_soporte').select('*').order('creado_en', { ascending: true }),
      supabase.from('perfiles').select('id, nombre'),
      supabase.from('wa_mensajes').select('telefono, nombre, direccion, texto, creado_en').order('creado_en', { ascending: true }).limit(4000),
    ]).then(function (res) {
      setMsgs((res[0] && res[0].data) || []);
      setPerfiles((res[1] && res[1].data) || []);
      var w = ((res[2] && res[2].data) || []).filter(function (m) { return m.telefono && m.telefono.indexOf('debug') < 0; });
      setWa(w);
      setCargando(false);
      setTimeout(function () { if (finRef.current) finRef.current.scrollIntoView({ behavior: 'smooth' }); }, 60);
    }).catch(function () { setCargando(false); });
  }
  useEffect(function () { cargar(); }, []);

  function nombreDe(id) { var p = perfiles.find(function (x) { return x.id === id; }); return (p && p.nombre) || (id ? id.slice(0, 8) : '—'); }
  function fecha(f) { return f ? new Date(f).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; }

  // ---- Conversaciones de usuarios de la app (mensajes_soporte) ----
  var convs = {};
  msgs.forEach(function (m) {
    var tipo = m.cliente_id ? 'cliente' : 'maestro';
    var id = m.cliente_id || m.maestro_id;
    if (!id) return;
    var k = tipo + ':' + id;
    if (!convs[k]) convs[k] = { tipo: tipo, id: id, nombre: nombreDe(id), msgs: [], noLeidos: 0, ult: null };
    convs[k].msgs.push({ out: m.autor === 'admin', texto: m.texto, creado_en: m.creado_en });
    if (m.autor !== 'admin' && !m.leido) convs[k].noLeidos++;
    convs[k].ult = { out: m.autor === 'admin', texto: m.texto, creado_en: m.creado_en };
  });

  // ---- Conversaciones de WhatsApp (wa_mensajes), agrupadas por teléfono ----
  var waConv = {};
  wa.forEach(function (m) {
    var k = 'whatsapp:' + m.telefono;
    if (!waConv[k]) waConv[k] = { tipo: 'whatsapp', id: m.telefono, nombre: m.nombre || telFmt(m.telefono), msgs: [], noLeidos: 0, ult: null };
    if (m.nombre && (!waConv[k].nombre || waConv[k].nombre === telFmt(m.telefono))) waConv[k].nombre = m.nombre;
    waConv[k].msgs.push({ out: m.direccion === 'out', texto: m.texto, creado_en: m.creado_en });
    waConv[k].ult = { out: m.direccion === 'out', texto: m.texto, creado_en: m.creado_en };
  });
  // no leídos WhatsApp = mensajes entrantes ('in') al final, sin respuesta
  Object.keys(waConv).forEach(function (k) {
    var arr = waConv[k].msgs, c = 0;
    for (var i = arr.length - 1; i >= 0; i--) { if (arr[i].out) break; c++; }
    waConv[k].noLeidos = c;
  });

  var lista = Object.keys(convs).map(function (k) { return convs[k]; })
    .concat(Object.keys(waConv).map(function (k) { return waConv[k]; }));
  lista.sort(function (a, b) { return (a.ult && a.ult.creado_en) < (b.ult && b.ult.creado_en) ? 1 : -1; });

  function sumNL(t) { return lista.filter(function (c) { return t === 'todos' ? true : c.tipo === t; }).reduce(function (s, c) { return s + c.noLeidos; }, 0); }
  var totalNoLeidos = sumNL('todos');

  var listaFiltrada = lista.filter(function (c) {
    if (filtro === 'clientes') return c.tipo === 'cliente';
    if (filtro === 'maestros') return c.tipo === 'maestro';
    if (filtro === 'whatsapp') return c.tipo === 'whatsapp';
    if (filtro === 'noleidos') return c.noLeidos > 0;
    return true;
  });

  function convDe(a) {
    if (!a) return null;
    return a.tipo === 'whatsapp' ? waConv['whatsapp:' + a.id] : convs[a.tipo + ':' + a.id];
  }

  function abrir(c) {
    setAbierta({ tipo: c.tipo, id: c.id }); setAviso('');
    if (c.tipo !== 'whatsapp') {
      var col = c.tipo === 'cliente' ? 'cliente_id' : 'maestro_id';
      supabase.from('mensajes_soporte').update({ leido: true }).eq(col, c.id).neq('autor', 'admin').eq('leido', false).then(function () { cargar(); });
    }
    setTimeout(function () { if (finRef.current) finRef.current.scrollIntoView({ behavior: 'smooth' }); }, 120);
  }

  async function enviar() {
    var t = txt.trim(); if (!t || !abierta) return;
    setEnviando(true); setAviso('');
    if (abierta.tipo === 'whatsapp') {
      try {
        var sess = await supabase.auth.getSession();
        var jwt = sess && sess.data && sess.data.session ? sess.data.session.access_token : '';
        var r = await fetch('/api/wasapi-send', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt }, body: JSON.stringify({ wa_id: abierta.id, texto: t }) });
        var d = await r.json();
        setEnviando(false);
        if (d && d.ok) { setTxt(''); cargar(); }
        else { setAviso((d && d.error) || 'No se pudo enviar por WhatsApp.'); }
      } catch (e) { setEnviando(false); setAviso('Error: ' + (e.message || '')); }
      return;
    }
    var payload = abierta.tipo === 'cliente' ? { cliente_id: abierta.id, autor: 'admin', texto: t } : { maestro_id: abierta.id, autor: 'admin', texto: t };
    supabase.from('mensajes_soporte').insert(payload).then(function (res) {
      setEnviando(false);
      if (res.error) { setAviso('No se pudo guardar: ' + res.error.message); return; }
      setTxt(''); cargar();
    });
  }

  var convAbierta = convDe(abierta);
  var hilo = convAbierta ? convAbierta.msgs : [];

  function pillFor(tipo) {
    if (tipo === 'whatsapp') return { txt: 'WHATSAPP', bg: '#e7f9ee', col: '#1a9e4b' };
    if (tipo === 'cliente') return { txt: 'CLIENTE', bg: '#eaf1ff', col: '#2563eb' };
    return { txt: 'MAESTRO', bg: '#f0eefb', col: '#7F77DD' };
  }
  function colorAvatar(tipo) { return tipo === 'whatsapp' ? '#25D366' : tipo === 'cliente' ? '#2563eb' : '#7F77DD'; }

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
        <div style={{ fontSize: 13, color: '#7c8499', marginTop: 4 }}>Conversaciones con clientes, maestros y WhatsApp. {totalNoLeidos > 0 ? <b style={{ color: '#b3261e' }}>{totalNoLeidos + ' por responder'}</b> : 'Todo al día.'}</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {tabBtn('todos', 'Todos', totalNoLeidos)}
        {tabBtn('clientes', 'Clientes', sumNL('cliente'))}
        {tabBtn('maestros', 'Maestros', sumNL('maestro'))}
        {tabBtn('whatsapp', 'WhatsApp', sumNL('whatsapp'))}
        {tabBtn('noleidos', 'Por responder', totalNoLeidos)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: 12 }}>
        <div style={{ ...card, padding: 0, overflow: 'hidden', maxHeight: 560, overflowY: 'auto' }}>
          {cargando && <div style={{ padding: 14, fontSize: 12, color: '#9aa1b5' }}>Cargando…</div>}
          {!cargando && listaFiltrada.length === 0 && <div style={{ padding: 14, fontSize: 12, color: '#9aa1b5' }}>No hay conversaciones aquí.</div>}
          {listaFiltrada.map(function (c) {
            var on = abierta && abierta.tipo === c.tipo && abierta.id === c.id;
            var p = pillFor(c.tipo);
            return (
              <div key={c.tipo + ':' + c.id} onClick={function () { abrir(c); }} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '11px 12px', borderBottom: '1px solid #f4f4f7', cursor: 'pointer', background: on ? '#eef4ff' : '#fff' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: colorAvatar(c.tipo), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{(c.nombre || '?').charAt(0).toUpperCase()}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nombre} <span style={{ fontSize: 9.5, fontWeight: 800, color: p.col, background: p.bg, borderRadius: 999, padding: '1px 6px', marginLeft: 4 }}>{p.txt}</span></div>
                  <div style={{ fontSize: 11, color: '#9aa1b5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.ult ? (c.ult.out ? 'Tú: ' : '') + (c.ult.texto || '') : 'Sin mensajes'}</div>
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
              <b style={{ fontSize: 14, marginBottom: 8 }}>{convAbierta.nombre} <span style={{ fontSize: 10, fontWeight: 800, color: pillFor(convAbierta.tipo).col, background: pillFor(convAbierta.tipo).bg, borderRadius: 999, padding: '1px 7px', marginLeft: 4 }}>{pillFor(convAbierta.tipo).txt}</span></b>
              <div style={{ flex: 1, overflowY: 'auto', background: '#fafafc', borderRadius: 10, padding: 10, marginBottom: 10, maxHeight: 380 }}>
                {hilo.length === 0 && <div style={{ fontSize: 12, color: '#9aa1b5' }}>Aún no hay mensajes.</div>}
                {hilo.map(function (m, i) {
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: m.out ? 'flex-end' : 'flex-start', marginBottom: 7 }}>
                      <div style={{ maxWidth: '78%', background: m.out ? '#2563eb' : '#fff', color: m.out ? '#fff' : '#1c1f2b', border: m.out ? 'none' : '1px solid #eee', borderRadius: 12, padding: '7px 10px', fontSize: 13, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                        {m.texto}
                        <div style={{ fontSize: 9.5, color: m.out ? 'rgba(255,255,255,.7)' : '#9aa1b5', textAlign: 'right', marginTop: 3 }}>{fecha(m.creado_en)}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={finRef} />
              </div>
              {convAbierta.tipo === 'whatsapp' && <div style={{ fontSize: 11, color: '#1a9e4b', marginBottom: 6 }}>Tu respuesta sale por la línea oficial de WhatsApp.</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={txt} onChange={function (e) { setTxt(e.target.value); }} onKeyDown={function (e) { if (e.key === 'Enter') enviar(); }} placeholder={'Responder a ' + convAbierta.nombre + '...'} style={{ flex: 1, padding: 10, border: '1.5px solid #ddd', borderRadius: 10, fontSize: 13 }} />
                <button onClick={enviar} disabled={enviando} style={{ background: convAbierta.tipo === 'whatsapp' ? '#25D366' : '#2563eb', color: '#fff', border: 'none', borderRadius: 10, padding: '0 16px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>{enviando ? '...' : 'Enviar'}</button>
              </div>
              {aviso && <div style={{ fontSize: 12, color: '#b3261e', marginTop: 6, fontWeight: 700 }}>{aviso}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
