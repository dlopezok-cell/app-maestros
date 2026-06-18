'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Agente IA de WhatsApp: editar el prompt/persona, prender o apagar las respuestas
// automáticas, probar la respuesta y ver las conversaciones que registró el webhook.
const ORANGE = '#FF4D2E';
const WA = '#0d9456';

export default function AgenteIA() {
  const [tab, setTab] = useState('config'); // config | conversaciones
  const [activo, setActivo] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState('');
  // probar
  const [test, setTest] = useState('');
  const [reply, setReply] = useState('');
  const [probando, setProbando] = useState(false);
  // conversaciones
  const [mensajes, setMensajes] = useState([]);
  const [sel, setSel] = useState('');

  useEffect(function () { cargar(); }, []);

  async function jwt() {
    var s = await supabase.auth.getSession();
    return s && s.data && s.data.session ? s.data.session.access_token : null;
  }

  async function cargar() {
    setCargando(true);
    var c = await supabase.from('ia_config').select('*').eq('id', 1).maybeSingle();
    if (c.data) { setActivo(!!c.data.activo); setPrompt(c.data.prompt || ''); }
    var m = await supabase.from('wa_mensajes').select('*').order('creado_en', { ascending: true }).limit(1000);
    setMensajes(m.data || []);
    setCargando(false);
  }

  async function guardarPrompt() {
    setMsg('Guardando…');
    var r = await supabase.from('ia_config').upsert({ id: 1, prompt: prompt, actualizado_en: new Date().toISOString() }, { onConflict: 'id' });
    setMsg(r.error ? ('Error: ' + r.error.message) : 'Prompt guardado ✓');
  }

  async function alternarActivo() {
    var nuevo = !activo;
    if (nuevo && typeof window !== 'undefined' && !window.confirm('Vas a ACTIVAR las respuestas automáticas. El agente responderá solo a los maestros que escriban. ¿Continuar?')) return;
    setActivo(nuevo);
    var r = await supabase.from('ia_config').upsert({ id: 1, activo: nuevo, actualizado_en: new Date().toISOString() }, { onConflict: 'id' });
    if (r.error) { setActivo(!nuevo); setMsg('Error: ' + r.error.message); return; }
    setMsg(nuevo ? 'Agente ACTIVADO: responde solo.' : 'Agente en pausa: solo registra, no responde.');
  }

  async function probar() {
    if (!test.trim()) { setMsg('Escribe un mensaje de prueba.'); return; }
    setProbando(true); setReply('');
    try {
      var token = await jwt();
      var r = await fetch('/api/ia-test', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ mensaje: test, prompt: prompt }) });
      var d = await r.json();
      if (d.ok) setReply(d.reply); else setMsg(d.error || 'No se pudo probar.');
    } catch (e) { setMsg('Error: ' + e.message); }
    setProbando(false);
  }

  function copiar(t) { if (navigator.clipboard) navigator.clipboard.writeText(t); setMsg('Respuesta copiada.'); }

  // Agrupar conversaciones por teléfono.
  var hilos = {};
  mensajes.forEach(function (m) {
    if (!hilos[m.telefono]) hilos[m.telefono] = { telefono: m.telefono, nombre: '', ultimo: m.creado_en, items: [] };
    hilos[m.telefono].items.push(m);
    if (m.nombre) hilos[m.telefono].nombre = m.nombre;
    hilos[m.telefono].ultimo = m.creado_en;
  });
  var listaHilos = Object.keys(hilos).map(function (k) { return hilos[k]; }).sort(function (a, b) { return a.ultimo < b.ultimo ? 1 : -1; });
  var hiloSel = sel && hilos[sel] ? hilos[sel] : null;

  var box = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, marginBottom: 14 };
  var input = { fontSize: 14, padding: '9px 11px', border: '1px solid #e5e7eb', borderRadius: 9, background: '#fff', width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg,#FF7A4D,#FF4D2E)', color: '#fff', borderRadius: 14, padding: '14px 18px', marginBottom: 14 }}>
        <span style={{ fontSize: 22 }}>{'\u{1F916}'}</span>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Agente IA de WhatsApp</div>
          <div style={{ fontSize: 13, opacity: .9 }}>Responde solo los mensajes de los maestros, en la voz de Andrea.</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[['config', '\u{2699}\u{FE0F} Configuración'], ['conversaciones', '\u{1F4AC} Conversaciones']].map(function (t) {
          var on = tab === t[0];
          return <button key={t[0]} onClick={function () { setTab(t[0]); }} style={{ fontSize: 13, fontWeight: 800, padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: on ? ORANGE : '#fff', color: on ? '#fff' : '#6b7280', boxShadow: on ? 'none' : 'inset 0 0 0 1.5px #e5e7eb' }}>{t[1]}</button>;
        })}
      </div>

      {msg && <div style={{ fontSize: 12, color: ORANGE, marginBottom: 10 }}>{msg}</div>}

      {tab === 'config' && (
        <div>
          {/* Estado on/off */}
          <div style={Object.assign({}, box, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' })}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{activo ? 'Respuestas automáticas: ACTIVADAS' : 'Respuestas automáticas: EN PAUSA'}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{activo ? 'El agente responde solo a quien escriba.' : 'Solo registra las conversaciones. No responde nada hasta que lo actives.'}</div>
            </div>
            <button onClick={alternarActivo} style={{ background: activo ? '#b3261e' : WA, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>{activo ? 'Pausar agente' : 'Activar agente'}</button>
          </div>

          {/* Prompt */}
          <div style={box}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Prompt del agente (persona + reglas + datos)</div>
            <textarea value={prompt} onChange={function (e) { setPrompt(e.target.value); }} rows={16} style={Object.assign({}, input, { fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical' })} />
            <button onClick={guardarPrompt} style={{ background: ORANGE, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 10 }}>Guardar prompt</button>
          </div>

          {/* Probar */}
          <div style={box}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Probar respuesta (no envía nada)</div>
            <textarea value={test} onChange={function (e) { setTest(e.target.value); }} rows={2} placeholder="Escribe un mensaje como si fueras un maestro… ej: ¿de dónde sacaste mi número?" style={Object.assign({}, input, { fontFamily: 'inherit', resize: 'vertical' })} />
            <button onClick={probar} disabled={probando} style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 8, opacity: probando ? .6 : 1 }}>{probando ? 'Pensando…' : 'Probar'}</button>
            {reply && (
              <div style={{ marginTop: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Respuesta sugerida:</div>
                <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{reply}</div>
                <button onClick={function () { copiar(reply); }} style={{ marginTop: 8, border: '1px solid #bbf7d0', background: '#fff', color: WA, borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Copiar</button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'conversaciones' && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 300, flexShrink: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', maxHeight: 560, overflowY: 'auto' }}>
            {listaHilos.length === 0 && <div style={{ padding: 14, fontSize: 13, color: '#9ca3af' }}>Aún no hay conversaciones. Aparecerán aquí cuando lleguen mensajes al webhook.</div>}
            {listaHilos.map(function (h) {
              var ult = h.items[h.items.length - 1];
              var on = sel === h.telefono;
              return (
                <div key={h.telefono} onClick={function () { setSel(h.telefono); }} style={{ padding: '10px 12px', borderBottom: '1px solid #f1f1f1', cursor: 'pointer', background: on ? '#fff7f5' : '#fff' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.nombre || ('+' + h.telefono)}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(ult.direccion === 'out' ? 'Andrea: ' : '') + (ult.texto || '')}</div>
                </div>
              );
            })}
          </div>
          <div style={{ flex: 1, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 14, minHeight: 300, maxHeight: 560, overflowY: 'auto' }}>
            {!hiloSel && <div style={{ fontSize: 13, color: '#9ca3af' }}>Elige una conversación de la izquierda.</div>}
            {hiloSel && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>{hiloSel.nombre || ('+' + hiloSel.telefono)} <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 400 }}>· +{hiloSel.telefono}</span></div>
                {hiloSel.items.map(function (m) {
                  var out = m.direccion === 'out';
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: out ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
                      <div style={{ maxWidth: '78%', background: out ? '#d9fdd3' : '#f1f1f3', borderRadius: 10, padding: '7px 11px', fontSize: 14, whiteSpace: 'pre-wrap' }}>{m.texto}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 12 }}>El agente solo responde a quien te escribió (dentro de la ventana de 24h de WhatsApp). Las respuestas también aparecen en tu app de WhatsApp Business. Mantenlo en pausa hasta que pruebes el prompt.</div>
    </div>
  );
}
