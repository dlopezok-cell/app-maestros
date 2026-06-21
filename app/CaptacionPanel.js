'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Panel admin "Captación auto": revisa los maestros que la IA encontró en Google Maps
// para cada pedido, y aprueba el envío del WhatsApp (cola de aprobación).
export default function CaptacionPanel() {
  const [cfg, setCfg] = useState({ captacion_activa: false, captacion_max: 10, captacion_msg_si: '', captacion_msg_no: '', captacion_test: '', captacion_hora_ini: '10:00', captacion_hora_fin: '18:00' });
  const [cola, setCola] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState(null);
  const [abiertos, setAbiertos] = useState({});

  function cargar() {
    setCargando(true);
    supabase.from('home_config').select('*').eq('id', 1).maybeSingle()
      .then(function (r) { if (r.data) setCfg({ captacion_activa: !!r.data.captacion_activa, captacion_max: r.data.captacion_max || 10, captacion_msg_si: r.data.captacion_msg_si || '', captacion_msg_no: r.data.captacion_msg_no || '', captacion_test: r.data.captacion_test || '', captacion_hora_ini: r.data.captacion_hora_ini || '10:00', captacion_hora_fin: r.data.captacion_hora_fin || '18:00' }); });
    supabase.from('captacion_cola').select('*').order('creado_en', { ascending: false }).limit(500)
      .then(function (r) { setCola(r.data || []); setCargando(false); });
  }
  useEffect(cargar, []);

  function guardarCfg(extra) {
    var fila = Object.assign({ id: 1 }, cfg, extra || {});
    setCfg(function (p) { return Object.assign({}, p, extra || {}); });
    supabase.from('home_config').upsert(fila, { onConflict: 'id' }).then(function (r) {
      if (r.error && /captacion_hora/.test(r.error.message || '')) {
        var f2 = Object.assign({}, fila); delete f2.captacion_hora_ini; delete f2.captacion_hora_fin;
        supabase.from('home_config').upsert(f2, { onConflict: 'id' }).then(function (r2) {
          setMsg(r2.error ? ('Error: ' + r2.error.message) : 'Guardado ✓ (el horario se podrá editar en breve)');
          setTimeout(function () { setMsg(null); }, 3500);
        });
        return;
      }
      setMsg(r.error ? ('Error: ' + r.error.message) : 'Guardado ✓');
      setTimeout(function () { setMsg(null); }, 2500);
    });
  }
  function toggle() { guardarCfg({ captacion_activa: !cfg.captacion_activa }); }


  // Agrupar por pedido
  var grupos = {};
  cola.forEach(function (r) { var k = r.presupuesto_id || 'sin'; (grupos[k] = grupos[k] || []).push(r); });
  var claves = Object.keys(grupos);

  var card = { background: '#fff', borderRadius: 14, padding: 14, marginBottom: 14, border: '1px solid #eef0f5' };
  var estN = function (sx) { return cola.filter(function (r) { return r.estado === sx; }).length; };
  var mContactados = estN('enviado') + estN('detalle_enviado') + estN('no_interesado');
  var mRespondieron = estN('detalle_enviado') + estN('no_interesado');
  var mInteresados = estN('detalle_enviado');
  var mNoInteresados = estN('no_interesado');
  var mPct = function (a, b) { return b > 0 ? Math.round(a * 100 / b) + '%' : '—'; };
  function Metr(pp) { return (<div style={{ background: '#f6f7fb', borderRadius: 12, padding: '12px 14px' }}><div style={{ fontSize: 23, fontWeight: 800, color: pp.c }}>{pp.n}</div><div style={{ fontSize: 11.5, color: '#7c8499', marginTop: 2, lineHeight: 1.3 }}>{pp.l}</div></div>); }
  var chip = function (bg, col) { return { fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: bg, color: col }; };

  return (
    <div>
      <div style={card}>
        <b style={{ fontSize: 14 }}>Embudo de captación</b>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 12 }}>
          <Metr n={mContactados} l="Invitados" c="#2563eb" />
          <Metr n={mRespondieron} l={'Respondieron · ' + mPct(mRespondieron, mContactados)} c="#0f6e56" />
          <Metr n={mInteresados} l={'Interesados ✓ · ' + mPct(mInteresados, mContactados)} c="#0d9456" />
          <Metr n={mNoInteresados} l="No interesados" c="#7c8499" />
        </div>
      </div>
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
        <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: cfg.captacion_test ? '#fff4e5' : '#f6f7fb', border: cfg.captacion_test ? '1.5px solid #f0a020' : '1px solid #eef0f5' }}>
          <label style={{ fontSize: 12.5, fontWeight: 800, color: cfg.captacion_test ? '#9a5b00' : '#5b6275' }}>🧪 Número de prueba</label>
          <div style={{ fontSize: 11.5, color: '#7c8499', margin: '3px 0 8px', lineHeight: 1.45 }}>Si pones un número aquí, los mensajes van <b>solo a ese número</b> y NO se busca ni contacta a maestros reales. Déjalo vacío para operar normal.</div>
          <input type="text" value={cfg.captacion_test} placeholder="Ej: 56912345678" onChange={function (e) { var v = e.target.value; setCfg(function (p) { return Object.assign({}, p, { captacion_test: v }); }); }} style={{ width: 220, maxWidth: '100%', padding: 9, border: '1.5px solid #e4e4ef', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }} />
          {cfg.captacion_test ? <div style={{ fontSize: 12, fontWeight: 800, color: '#b35900', marginTop: 8 }}>⚠️ MODO PRUEBA ACTIVO — nadie real recibe mensajes.</div> : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0' }}>
          <label style={{ fontSize: 12.5, fontWeight: 700, color: '#5b6275' }}>Máx. por pedido</label>
          <input type="number" min="1" max="20" value={cfg.captacion_max} onChange={function (e) { var v = e.target.value; setCfg(function (p) { return Object.assign({}, p, { captacion_max: v }); }); }} style={{ width: 80, padding: 9, border: '1.5px solid #e4e4ef', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }} />
        </div>
        <div style={{ padding: 12, borderRadius: 10, background: '#f6f7fb', border: '1px solid #eef0f5', marginBottom: 4 }}>
          <label style={{ fontSize: 12.5, fontWeight: 800, color: '#5b6275' }}>🕒 Horario de envío</label>
          <div style={{ fontSize: 11.5, color: '#7c8499', margin: '3px 0 10px', lineHeight: 1.45 }}>Solo se envía dentro de este horario (todos los días). Lo que llegue fuera, queda <b>programado</b> y sale al abrir la ventana.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#5b6275' }}>Desde</span>
            <input type="time" value={cfg.captacion_hora_ini} onChange={function (e) { var v = e.target.value; setCfg(function (p) { return Object.assign({}, p, { captacion_hora_ini: v }); }); }} style={{ padding: 9, border: '1.5px solid #e4e4ef', borderRadius: 10, fontSize: 15, boxSizing: 'border-box' }} />
            <span style={{ fontSize: 13, color: '#5b6275' }}>hasta</span>
            <input type="time" value={cfg.captacion_hora_fin} onChange={function (e) { var v = e.target.value; setCfg(function (p) { return Object.assign({}, p, { captacion_hora_fin: v }); }); }} style={{ padding: 9, border: '1.5px solid #e4e4ef', borderRadius: 10, fontSize: 15, boxSizing: 'border-box' }} />
          </div>
        </div>
        <label style={{ fontSize: 12.5, fontWeight: 700, color: '#5b6275' }}>Primer mensaje · plantilla de Meta (solo lectura)</label>
        <div style={{ width: '100%', padding: 12, border: '1.5px dashed #cbd0dd', background: '#f6f7fb', borderRadius: 10, fontSize: 13, color: '#3a4252', lineHeight: 1.5, boxSizing: 'border-box', marginTop: 6, whiteSpace: 'pre-wrap' }}>{'Hola \u{1F44B} Mi nombre es Diego y tengo una plataforma llamada MaestrosEnL\u00EDnea.cl, que ayuda a clientes a buscar maestros en su zona. Justo tengo un cliente en {comuna} que necesita un {oficio}. \u00BFTe parece si te paso lo que necesita para que le hagas un presupuesto desde la misma app? Sumarte es gratis \u{1F64C}'}</div>
        <div style={{ fontSize: 11.5, color: '#9aa1b5', marginTop: 6, lineHeight: 1.45 }}>Es la plantilla aprobada <b>tengo_un_cliente</b>. Para editarla se hace en Meta (pestaña 📝 Plantillas WA).</div>
        <div style={{ height: 1, background: '#eef0f5', margin: '18px 0 14px' }} />
        <b style={{ fontSize: 14 }}>Respuestas automáticas del bot</b>
        <div style={{ fontSize: 12, color: '#7c8499', marginTop: 4, lineHeight: 1.5 }}>Cuando el maestro <b>responde</b> al primer mensaje, la IA detecta si le interesa y envía uno de estos dos. Variables: <code>{'{oficio}'}</code> <code>{'{comuna}'}</code> <code>{'{pedido}'}</code> <code>{'{link}'}</code>. <b>Las fotos y videos que subió el cliente se envían automáticamente</b> justo después del mensaje de aceptación.</div>

        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#0d9456', marginTop: 14 }}>✅ Si el maestro acepta / pide info</label>
        <textarea value={cfg.captacion_msg_si} placeholder={'¡Gracias por responder! 🙌 El cliente necesita *{oficio}* en *{comuna}*.\n\n“{pedido}”\n\nPara ver el detalle y enviarle tu presupuesto, súmate gratis acá 👉 {link}'} onChange={function (e) { var v = e.target.value; setCfg(function (p) { return Object.assign({}, p, { captacion_msg_si: v }); }); }} style={{ width: '100%', minHeight: 110, resize: 'vertical', padding: 10, border: '1.5px solid #e4e4ef', borderRadius: 10, fontSize: 13.5, boxSizing: 'border-box', marginTop: 6 }} />

        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#b3261e', marginTop: 12 }}>🚫 Si el maestro no quiere</label>
        <textarea value={cfg.captacion_msg_no} placeholder={'¡Sin problema! 🙌 Si más adelante quieres recibir clientes de tu zona, acá estamos: {link}'} onChange={function (e) { var v = e.target.value; setCfg(function (p) { return Object.assign({}, p, { captacion_msg_no: v }); }); }} style={{ width: '100%', minHeight: 70, resize: 'vertical', padding: 10, border: '1.5px solid #e4e4ef', borderRadius: 10, fontSize: 13.5, boxSizing: 'border-box', marginTop: 6 }} />

        <button onClick={function () { guardarCfg({ captacion_max: Number(cfg.captacion_max) || 10 }); }} style={{ marginTop: 10, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Guardar</button>
        {msg && <span style={{ marginLeft: 12, fontSize: 13, color: msg.indexOf('Error') >= 0 ? '#b3261e' : '#0d9456' }}>{msg}</span>}
      </div>

      <div style={{ fontSize: 13, fontWeight: 800, color: '#16294f', margin: '4px 0 10px' }}>{'Cola de captación' + (cargando ? ' (cargando...)' : '')}</div>
      {!cargando && claves.length === 0 && <div style={{ textAlign: 'center', color: '#9aa1b5', fontSize: 13.5, padding: '34px 14px', lineHeight: 1.6 }}>Aún no hay maestros encolados. Cuando un cliente deje un pedido (con la captación encendida), aparecerán aquí.</div>}

      {claves.map(function (k, idx) {
        var g = grupos[k];
        var g0 = g[0];
        var abierto = (abiertos[k] !== undefined) ? abiertos[k] : (idx === 0);
        return (
          <div key={k} style={card}>
            <div onClick={function () { setAbiertos(function (p) { var cur = (p[k] !== undefined) ? p[k] : (idx === 0); var o = Object.assign({}, p); o[k] = !cur; return o; }); }} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, cursor: 'pointer' }}>
              <div style={{ display: 'flex', gap: 9, minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: 12, color: '#9aa1b5', marginTop: 3, flexShrink: 0, transition: '.15s', transform: abierto ? 'rotate(90deg)' : 'none' }}>{'\u25B6'}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#16294f', textTransform: 'capitalize' }}>{(g0.oficio || 'pedido') + (g0.comuna ? (' · ' + g0.comuna) : '')}</div>
                  {g0.pedido_texto && <div style={{ fontSize: 12.5, color: '#5b6275', fontStyle: 'italic', margin: '2px 0 3px', lineHeight: 1.35 }}>{'\u201C' + g0.pedido_texto + '\u201D'}</div>}
                  <div style={{ fontSize: 11, color: '#9aa1b5' }}>{g.length + ' encontrados'}</div>
                </div>
              </div>
            </div>
            {abierto && <div style={{ marginTop: 8 }} />}
            {abierto && g.map(function (r) {
              var est = r.estado;
              var ec = est === 'detalle_enviado' ? chip('#e1f5ee', '#0f6e56') : est === 'no_interesado' ? chip('#f1efe8', '#5f5e5a') : est === 'enviado' ? chip('#e6f1fb', '#185fa5') : est === 'programado' ? chip('#faeeda', '#854f0b') : est === 'error' ? chip('#fcebeb', '#a32d2d') : est === 'descartado' ? chip('#f1efe8', '#5f5e5a') : chip('#fef3d6', '#854f0b');
              var et = est === 'detalle_enviado' ? 'Interesado ✓' : est === 'no_interesado' ? 'No interesado' : est === 'enviado' ? 'Invitado' : est === 'programado' ? 'Programado ⏰' : est === 'error' ? 'Error' : est === 'descartado' ? 'Descartado' : 'Pendiente';
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid #f3f4f8' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1c1f2b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nombre || 'Sin nombre'}</div>
                    <div style={{ fontSize: 12, color: '#7c8499' }}>{r.telefono}{r.es_movil ? '' : ' · fijo'}</div>
                  </div>
                  <span style={ec}>{et}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
