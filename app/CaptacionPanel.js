'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Panel admin "Captación auto": revisa los maestros que la IA encontró en Google Maps
// para cada pedido, y aprueba el envío del WhatsApp (cola de aprobación).
export default function CaptacionPanel() {
  const [cfg, setCfg] = useState({ captacion_activa: false, captacion_max: 10, captacion_mensaje: '' });
  const [cola, setCola] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState(null);
  const [enviando, setEnviando] = useState({});

  function cargar() {
    setCargando(true);
    supabase.from('home_config').select('captacion_activa,captacion_max,captacion_mensaje').eq('id', 1).maybeSingle()
      .then(function (r) { if (r.data) setCfg({ captacion_activa: !!r.data.captacion_activa, captacion_max: r.data.captacion_max || 10, captacion_mensaje: r.data.captacion_mensaje || '' }); });
    supabase.from('captacion_cola').select('*').order('creado_en', { ascending: false }).limit(500)
      .then(function (r) { setCola(r.data || []); setCargando(false); });
  }
  useEffect(cargar, []);

  function guardarCfg(extra) {
    var fila = Object.assign({ id: 1 }, cfg, extra || {});
    setCfg(function (p) { return Object.assign({}, p, extra || {}); });
    supabase.from('home_config').upsert(fila, { onConflict: 'id' }).then(function (r) {
      setMsg(r.error ? ('Error: ' + r.error.message) : 'Guardado ✓');
      setTimeout(function () { setMsg(null); }, 2500);
    });
  }
  function toggle() { guardarCfg({ captacion_activa: !cfg.captacion_activa }); }

  function enviar(ids) {
    if (!ids.length) return;
    if (!window.confirm('¿Enviar WhatsApp a ' + ids.length + (ids.length === 1 ? ' maestro?' : ' maestros?'))) return;
    var mk = {}; ids.forEach(function (i) { mk[i] = true; }); setEnviando(function (p) { return Object.assign({}, p, mk); });
    supabase.auth.getSession().then(function (s) {
      var tok = s.data && s.data.session ? s.data.session.access_token : null;
      fetch('/api/captar-enviar', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ ids: ids }) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j.error) setMsg('Error: ' + j.error);
          else setMsg('Enviados: ' + (j.enviados || 0) + (j.errores ? (' · Errores: ' + j.errores) : ''));
          setEnviando({}); cargar(); setTimeout(function () { setMsg(null); }, 4000);
        })
        .catch(function (e) { setMsg('Error: ' + e.message); setEnviando({}); });
    });
  }
  function descartar(id) {
    supabase.from('captacion_cola').update({ estado: 'descartado' }).eq('id', id).then(function () { cargar(); });
  }

  // Agrupar por pedido
  var grupos = {};
  cola.forEach(function (r) { var k = r.presupuesto_id || 'sin'; (grupos[k] = grupos[k] || []).push(r); });
  var claves = Object.keys(grupos);

  var card = { background: '#fff', borderRadius: 14, padding: 14, marginBottom: 14, border: '1px solid #eef0f5' };
  var chip = function (bg, col) { return { fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: bg, color: col }; };

  return (
    <div>
      <div style={{ ...card, background: cfg.captacion_activa ? 'linear-gradient(160deg,#0e1a38,#13224a)' : '#fff', color: cfg.captacion_activa ? '#fff' : '#1c1f2b', border: cfg.captacion_activa ? 'none' : '1px solid #eef0f5' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <b style={{ fontSize: 15 }}>{'\u{1F3AF} Captación automática'}</b>
            <div style={{ fontSize: 12.5, color: cfg.captacion_activa ? 'rgba(255,255,255,.8)' : '#7c8499', marginTop: 4, lineHeight: 1.45 }}>
              {cfg.captacion_activa
                ? 'ENCENDIDA: por cada pedido, la IA busca maestros del rubro en Google Maps y los deja aquí para que apruebes el envío.'
                : 'APAGADA: no se buscan ni encolan maestros nuevos.'}
            </div>
          </div>
          <button onClick={toggle} style={{ flexShrink: 0, position: 'relative', width: 64, height: 34, borderRadius: 20, border: 'none', cursor: 'pointer', background: cfg.captacion_activa ? '#22d3ee' : '#cfd3df' }}>
            <span style={{ position: 'absolute', top: 4, left: cfg.captacion_activa ? 34 : 4, width: 26, height: 26, borderRadius: '50%', background: '#fff', transition: '.15s' }} />
          </button>
        </div>
      </div>

      <div style={card}>
        <b style={{ fontSize: 14 }}>Configuración</b>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0' }}>
          <label style={{ fontSize: 12.5, fontWeight: 700, color: '#5b6275' }}>Máx. por pedido</label>
          <input type="number" min="1" max="20" value={cfg.captacion_max} onChange={function (e) { var v = e.target.value; setCfg(function (p) { return Object.assign({}, p, { captacion_max: v }); }); }} style={{ width: 80, padding: 9, border: '1.5px solid #e4e4ef', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }} />
        </div>
        <label style={{ fontSize: 12.5, fontWeight: 700, color: '#5b6275' }}>Mensaje (usa {'{nombre} {oficio} {comuna} {link}'})</label>
        <textarea value={cfg.captacion_mensaje} onChange={function (e) { var v = e.target.value; setCfg(function (p) { return Object.assign({}, p, { captacion_mensaje: v }); }); }} style={{ width: '100%', minHeight: 70, resize: 'vertical', padding: 10, border: '1.5px solid #e4e4ef', borderRadius: 10, fontSize: 13.5, boxSizing: 'border-box', marginTop: 6 }} />
        <button onClick={function () { guardarCfg({ captacion_max: Number(cfg.captacion_max) || 10 }); }} style={{ marginTop: 10, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Guardar</button>
        {msg && <span style={{ marginLeft: 12, fontSize: 13, color: msg.indexOf('Error') >= 0 ? '#b3261e' : '#0d9456' }}>{msg}</span>}
      </div>

      <div style={{ fontSize: 13, fontWeight: 800, color: '#16294f', margin: '4px 0 10px' }}>{'Cola de captación' + (cargando ? ' (cargando...)' : '')}</div>
      {!cargando && claves.length === 0 && <div style={{ textAlign: 'center', color: '#9aa1b5', fontSize: 13.5, padding: '34px 14px', lineHeight: 1.6 }}>Aún no hay maestros encolados. Cuando un cliente deje un pedido (con la captación encendida), aparecerán aquí.</div>}

      {claves.map(function (k) {
        var g = grupos[k];
        var pend = g.filter(function (r) { return r.estado === 'pendiente'; });
        var g0 = g[0];
        return (
          <div key={k} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#16294f', textTransform: 'capitalize' }}>{(g0.oficio || 'pedido') + (g0.comuna ? (' · ' + g0.comuna) : '')}</div>
                <div style={{ fontSize: 11.5, color: '#9aa1b5' }}>{g.length + ' encontrados · ' + pend.length + ' pendientes'}</div>
              </div>
              {pend.length > 0 && <button onClick={function () { enviar(pend.map(function (r) { return r.id; })); }} style={{ flexShrink: 0, background: 'linear-gradient(135deg,#22d3ee,#2563eb)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 14px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>{'Enviar a los ' + pend.length}</button>}
            </div>
            {g.map(function (r) {
              var est = r.estado;
              var ec = est === 'enviado' ? chip('#e1f5ee', '#0f6e56') : est === 'error' ? chip('#fcebeb', '#a32d2d') : est === 'descartado' ? chip('#f1efe8', '#5f5e5a') : chip('#fef3d6', '#854f0b');
              var et = est === 'enviado' ? 'Enviado' : est === 'error' ? 'Error' : est === 'descartado' ? 'Descartado' : 'Pendiente';
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid #f3f4f8' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1c1f2b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nombre || 'Sin nombre'}</div>
                    <div style={{ fontSize: 12, color: '#7c8499' }}>{r.telefono}{r.es_movil ? '' : ' · fijo'}</div>
                  </div>
                  <span style={ec}>{et}</span>
                  {est === 'pendiente' && <button onClick={function () { enviar([r.id]); }} disabled={!!enviando[r.id]} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 10px', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>{enviando[r.id] ? '...' : 'Enviar'}</button>}
                  {est === 'pendiente' && <button onClick={function () { descartar(r.id); }} style={{ background: '#fff', color: '#7c8499', border: '1px solid #e4e4ef', borderRadius: 8, padding: '6px 9px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{'✕'}</button>}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
