'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import ChatCotizacion from './ChatCotizacion';

// Vista del maestro: solicitudes de presupuesto (videos) abiertas de su oficio
// y las que le fueron dirigidas. Responde con monto + mensaje y puede chatear.
// Ubicación por etapas: aquí solo ve la COMUNA; la dirección exacta aparece en
// la Agenda cuando el cliente agenda.
export default function PresupuestosMaestro({ usuario }) {
  const [miOficio, setMiOficio] = useState(null);
  const [esMaestro, setEsMaestro] = useState(false);
  const [items, setItems] = useState([]);
  const [cargado, setCargado] = useState(false);
  const [respId, setRespId] = useState(null);
  const [monto, setMonto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [msg, setMsg] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [noLeidos, setNoLeidos] = useState({});

  function cargar(oficio) {
    supabase.from('presupuestos').select('*, cotizaciones(*)')
      .or('maestro_id.eq.' + usuario.id + ',maestro_id.is.null')
      .order('creado_en', { ascending: false })
      .then(function (r) {
        var data = r.data || [];
        var filt = data.filter(function (p) {
          return p.maestro_id === usuario.id || (p.maestro_id == null && p.oficio === oficio);
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
    supabase.from('maestros').select('oficio').eq('id', usuario.id).maybeSingle()
      .then(function (r) {
        if (r.data) { setEsMaestro(true); setMiOficio(r.data.oficio); cargar(r.data.oficio); }
        else { setEsMaestro(false); setCargado(true); }
      });
  }, [usuario]);

  function abrirResp(id) { setRespId(id); setMonto(''); setMensaje(''); setMsg(null); }

  function responder(p) {
    if (!mensaje.trim() && !monto) { setMsg('Escribe un mensaje o un monto'); return; }
    setEnviando(true);
    supabase.from('cotizaciones').insert({
      presupuesto_id: p.id,
      maestro_id: usuario.id,
      monto: monto ? parseInt(monto, 10) : null,
      mensaje: mensaje.trim() || null,
    }).then(function (r) {
      if (r.error) { setMsg('Error: ' + r.error.message); setEnviando(false); return; }
      setEnviando(false); setRespId(null);
      cargar(miOficio);
    });
  }

  function abrirChat(p) {
    setChatId(chatId === p.id ? null : p.id);
    setNoLeidos(function (prev) { var n = Object.assign({}, prev); n[p.id] = 0; return n; });
  }

  function fecha(f) { return f ? new Date(f).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; }

  const card = { background: '#fff', borderRadius: 18, padding: 16, margin: '0 16px 14px', border: '1.5px solid #eee' };
  const inp = { width: '100%', padding: 11, border: '1.5px solid #ddd', borderRadius: 10, fontSize: 14, marginBottom: 8, background: '#fff' };

  if (!cargado) return null;
  if (!esMaestro) {
    return (
      <div style={{ ...card, marginTop: 14 }}>
        <b style={{ fontSize: 14 }}>{'\u{1F3A5} Cotizaciones'}</b>
        <div style={{ fontSize: 12, color: '#9aa1b5', marginTop: 6 }}>Cuando completes tu ficha como maestro, aquí verás los videos de clientes que piden presupuesto en tu oficio.</div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14 }}>
      {items.length === 0 && <div style={card}><div style={{ fontSize: 13, color: '#9aa1b5' }}>No hay solicitudes nuevas por ahora. Te avisaremos cuando llegue un video.</div></div>}
      {items.map(function (p) {
        var yaRespondi = (p.cotizaciones || []).length > 0;
        var nl = noLeidos[p.id] || 0;
        return (
          <div key={p.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ fontSize: 14 }}>{(p.oficio || 'servicio').charAt(0).toUpperCase() + (p.oficio || '').slice(1)}</b>
              <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 8, background: p.maestro_id ? '#eef4ff' : '#fff5f2', color: p.maestro_id ? '#3b6ef0' : '#ff5a3c', fontWeight: 800 }}>{p.maestro_id ? 'PARA TI' : 'ABIERTO'}</span>
            </div>
            <div style={{ fontSize: 13, color: '#5b6275', margin: '4px 0' }}>{p.descripcion}</div>
            <div style={{ fontSize: 11, color: '#9aa1b5' }}>{['\u{1F4CD} ' + (p.comuna || 'comuna no indicada'), fecha(p.creado_en)].filter(Boolean).join(' · ')}</div>
            <div style={{ fontSize: 10.5, color: '#b6bccb', marginTop: 2 }}>La dirección exacta y el teléfono aparecen en tu Agenda cuando el cliente agenda.</div>
            {p.video_url && <video src={p.video_url} controls style={{ width: '100%', borderRadius: 12, marginTop: 8, background: '#000', maxHeight: 240 }} />}

            {yaRespondi && <div style={{ fontSize: 12, color: '#0d9456', fontWeight: 700, marginTop: 8 }}>{'✓ Ya enviaste tu presupuesto'}</div>}

            {!yaRespondi && respId !== p.id && (
              <button className="gbtn full" style={{ marginTop: 10 }} onClick={function () { abrirResp(p.id); }}>Responder con presupuesto</button>
            )}

            {!yaRespondi && respId === p.id && (
              <div style={{ marginTop: 10 }}>
                <input type="number" inputMode="numeric" value={monto} onChange={function (e) { setMonto(e.target.value); }} placeholder="Monto estimado (ej: 28000)" style={inp} />
                <textarea value={mensaje} onChange={function (e) { setMensaje(e.target.value); }} placeholder="Tu solución u observaciones (ej: es el sifón, lo cambio en 30 min, incluye repuesto)" rows={3} style={{ ...inp, resize: 'vertical' }} />
                {msg && <p style={{ fontSize: 12, color: '#b3261e', margin: '2px 0' }}>{msg}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={function () { setRespId(null); }} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1.5px solid #ddd', background: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#5b6275' }}>Cancelar</button>
                  <button className="gbtn" style={{ flex: 2, opacity: enviando ? 0.6 : 1 }} disabled={enviando} onClick={function () { responder(p); }}>{enviando ? 'Enviando...' : 'Enviar presupuesto'}</button>
                </div>
              </div>
            )}

            <button onClick={function () { abrirChat(p); }} style={{ width: '100%', marginTop: 10, background: chatId === p.id ? '#fff5f2' : '#fff', color: '#ff5a3c', border: '1.5px solid #ffd6cb', borderRadius: 12, padding: 11, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
              {'\u{1F4AC} Conversación' + (nl > 0 ? ' · ' + nl + ' nuevo' + (nl > 1 ? 's' : '') : '')}
            </button>
            {chatId === p.id && <ChatCotizacion usuario={usuario} presupuestoId={p.id} maestroId={usuario.id} miRol="maestro" />}
          </div>
        );
      })}
    </div>
  );
}
