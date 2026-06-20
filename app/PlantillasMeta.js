'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Panel admin: crear plantillas de WhatsApp (se envían a Meta para aprobación)
// y ver las existentes con su estado (aprobada / pendiente / rechazada).
export default function PlantillasMeta() {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('MARKETING');
  const [idioma, setIdioma] = useState('es');
  const [cuerpo, setCuerpo] = useState('');
  const [pie, setPie] = useState('');
  const [ejemplos, setEjemplos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState(null);

  function tok() { return supabase.auth.getSession().then(function (s) { return s.data && s.data.session ? s.data.session.access_token : null; }); }

  function cargar() {
    setCargando(true);
    tok().then(function (t) {
      fetch('/api/wa-templates', { headers: { Authorization: 'Bearer ' + t } })
        .then(function (r) { return r.json(); })
        .then(function (j) { setLista(j.templates || []); setCargando(false); })
        .catch(function () { setCargando(false); });
    });
  }
  useEffect(cargar, []);

  // Detectar variables {{n}} en el cuerpo
  var vars = (cuerpo.match(/\{\{\s*\d+\s*\}\}/g) || []);
  useEffect(function () {
    setEjemplos(function (p) { var a = p.slice(0, vars.length); while (a.length < vars.length) a.push(''); return a; });
  }, [cuerpo]);

  function crear() {
    if (!nombre.trim()) { setMsg('Pon un nombre.'); return; }
    if (!cuerpo.trim()) { setMsg('Escribe el cuerpo del mensaje.'); return; }
    setEnviando(true); setMsg(null);
    tok().then(function (t) {
      fetch('/api/wa-template-create', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ name: nombre, category: categoria, language: idioma, body: cuerpo, footer: pie, ejemplos: ejemplos }) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          setEnviando(false);
          if (j.error) { setMsg('Error: ' + j.error); return; }
          setMsg('✓ Enviada a Meta como "' + j.name + '" (estado: ' + (j.status || 'PENDING') + '). Meta la revisa en ~24-48 h.');
          setNombre(''); setCuerpo(''); setPie('');
          setTimeout(cargar, 800);
        })
        .catch(function (e) { setEnviando(false); setMsg('Error: ' + e.message); });
    });
  }

  var card = { background: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, border: '1px solid #eef0f5' };
  var inp = { width: '100%', padding: 10, border: '1.5px solid #e4e4ef', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', marginBottom: 10 };
  var lbl = { fontSize: 12.5, fontWeight: 700, color: '#5b6275', display: 'block', marginBottom: 4 };
  function chipEstado(s) {
    var b = '#f1efe8', c = '#5f5e5a';
    if (s === 'APPROVED') { b = '#e1f5ee'; c = '#0f6e56'; }
    else if (s === 'PENDING') { b = '#fef3d6'; c = '#854f0b'; }
    else if (s === 'REJECTED') { b = '#fcebeb'; c = '#a32d2d'; }
    return { fontSize: 11, fontWeight: 800, padding: '2px 9px', borderRadius: 999, background: b, color: c };
  }
  function textoEs(s) { return s === 'APPROVED' ? 'Aprobada' : s === 'PENDING' ? 'Pendiente' : s === 'REJECTED' ? 'Rechazada' : (s || '—'); }

  return (
    <div>
      <div style={card}>
        <b style={{ fontSize: 15 }}>{'\u{1F4DD} Crear plantilla de WhatsApp'}</b>
        <div style={{ fontSize: 12, color: '#9aa1b5', margin: '4px 0 12px', lineHeight: 1.45 }}>Se envía a Meta para aprobación (~24-48 h). Usa {'{{1}}'}, {'{{2}}'}… para partes variables (ej: nombre, comuna).</div>
        <a href="https://business.facebook.com/wa/manage/message-templates/" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', background: '#fff', color: '#2563eb', border: '1.5px solid #2563eb', borderRadius: 10, padding: '7px 13px', fontWeight: 800, fontSize: 12.5, marginBottom: 12 }}>{'\u2197 Abrir WhatsApp Manager en Meta'}</a>

        <label style={lbl}>Nombre (sin espacios, minúsculas)</label>
        <input style={inp} value={nombre} placeholder="invitacion_maestro" onChange={function (e) { setNombre(e.target.value); }} />

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Categoría</label>
            <select style={inp} value={categoria} onChange={function (e) { setCategoria(e.target.value); }}>
              <option value="MARKETING">Marketing</option>
              <option value="UTILITY">Utilidad</option>
            </select>
          </div>
          <div style={{ width: 120 }}>
            <label style={lbl}>Idioma</label>
            <select style={inp} value={idioma} onChange={function (e) { setIdioma(e.target.value); }}>
              <option value="es">es</option>
              <option value="es_CL">es_CL</option>
            </select>
          </div>
        </div>

        <label style={lbl}>Cuerpo del mensaje</label>
        <textarea style={{ ...inp, minHeight: 90, resize: 'vertical' }} value={cuerpo} placeholder={'Hola {{1}}, un cliente en {{2}} necesita tu servicio. Súmate gratis a MaestrosEnLínea.'} onChange={function (e) { setCuerpo(e.target.value); }} />

        {vars.length > 0 && (
          <div style={{ background: '#f7f8fb', borderRadius: 10, padding: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: '#5b6275', fontWeight: 700, marginBottom: 6 }}>{'Ejemplos para Meta (' + vars.length + ' variable' + (vars.length > 1 ? 's' : '') + ')'}</div>
            {vars.map(function (v, i) {
              return <input key={i} style={{ ...inp, marginBottom: 6 }} value={ejemplos[i] || ''} placeholder={'Ejemplo para ' + v} onChange={function (e) { var val = e.target.value; setEjemplos(function (p) { var a = p.slice(); a[i] = val; return a; }); }} />;
            })}
          </div>
        )}

        <label style={lbl}>Pie (opcional)</label>
        <input style={inp} value={pie} placeholder="MaestrosEnLínea.cl" onChange={function (e) { setPie(e.target.value); }} />

        <button onClick={crear} disabled={enviando} style={{ background: 'linear-gradient(135deg,#22d3ee,#2563eb)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 22px', fontWeight: 800, fontSize: 14.5, cursor: 'pointer', opacity: enviando ? 0.6 : 1 }}>{enviando ? 'Enviando…' : 'Enviar a Meta para aprobación'}</button>
        {msg && <p style={{ fontSize: 13, marginTop: 10, color: msg.indexOf('Error') >= 0 ? '#b3261e' : '#0d9456', lineHeight: 1.4 }}>{msg}</p>}
      </div>

      <div style={{ fontSize: 13, fontWeight: 800, color: '#16294f', margin: '4px 0 10px' }}>{'Tus plantillas' + (cargando ? ' (cargando…)' : ' (' + lista.length + ')')}</div>
      {!cargando && lista.length === 0 && <div style={{ textAlign: 'center', color: '#9aa1b5', fontSize: 13.5, padding: '24px 14px' }}>Aún no tienes plantillas. Crea la primera arriba.</div>}
      {lista.map(function (t, i) {
        var body = (t.components || []).filter(function (c) { return c.type === 'BODY'; })[0];
        return (
          <div key={i} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#16294f' }}>{t.name}</div>
                <div style={{ fontSize: 11.5, color: '#9aa1b5' }}>{(t.category || '') + ' · ' + (t.language || '')}</div>
              </div>
              <span style={chipEstado(t.status)}>{textoEs(t.status)}</span>
            </div>
            {body && body.text && <div style={{ fontSize: 12.5, color: '#5b6275', marginTop: 8, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{body.text}</div>}
          </div>
        );
      })}
    </div>
  );
}
