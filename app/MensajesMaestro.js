'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Chat de soporte del maestro con el equipo (admin). Tabla: mensajes_soporte.
// autor 'maestro' = el propio maestro; 'admin' = soporte.
export default function MensajesMaestro({ usuario, onBack }) {
  const [msgs, setMsgs] = useState([]);
  const [txt, setTxt] = useState('');
  const [cargado, setCargado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [vp, setVp] = useState(null);
  const finRef = useRef(null);

  // Fija el chat exactamente a la zona visible: cuando se abre el teclado en el
  // móvil, visualViewport encoge y se desplaza; anclamos top+alto a esa zona
  // para que el campo de texto y el botón de enviar queden siempre a la vista.
  useEffect(function () {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    var vv = window.visualViewport;
    function upd() { setVp({ h: vv.height, top: vv.offsetTop || 0 }); }
    upd();
    vv.addEventListener('resize', upd);
    vv.addEventListener('scroll', upd);
    return function () { vv.removeEventListener('resize', upd); vv.removeEventListener('scroll', upd); };
  }, []);

  function cargar() {
    supabase.from('mensajes_soporte').select('*').eq('maestro_id', usuario.id).order('creado_en', { ascending: true })
      .then(function (r) {
        setMsgs(r.data || []); setCargado(true);
        supabase.from('mensajes_soporte').update({ leido: true }).eq('maestro_id', usuario.id).eq('autor', 'admin').eq('leido', false).then(function () {});
        setTimeout(function () { if (finRef.current) finRef.current.scrollIntoView({ behavior: 'smooth' }); }, 60);
      });
  }
  useEffect(function () { if (usuario) cargar(); }, [usuario]);

  function enviar() {
    var t = txt.trim(); if (!t) return;
    setEnviando(true);
    supabase.from('mensajes_soporte').insert({ maestro_id: usuario.id, autor: 'maestro', texto: t }).then(function (r) {
      setEnviando(false);
      if (!r.error) { setTxt(''); cargar(); }
    });
  }
  function fecha(f) { return f ? new Date(f).toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit' }) : ''; }

  return (
    <div style={vp
      ? { position: 'fixed', left: 0, right: 0, top: vp.top + 'px', height: vp.h + 'px', zIndex: 500, background: '#fff', display: 'flex', flexDirection: 'column', minHeight: 0 }
      : { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ background: '#1c2030', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        {onBack && <button onClick={onBack} style={{ background: 'rgba(255,255,255,.14)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', fontSize: 18, cursor: 'pointer', flex: 'none' }}>{'←'}</button>}
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#ff5a3c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>{'\u{1F6E0}'}</div>
        <div><div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Soporte MaestrosEnLínea</div><div style={{ color: '#9aa1b5', fontSize: 11 }}>Escríbenos cualquier duda</div></div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', background: '#f5f6fa', padding: 16 }}>
        {!cargado && <div style={{ fontSize: 13, color: '#9aa1b5' }}>Cargando...</div>}
        {cargado && msgs.length === 0 && <div style={{ background: '#fff', borderRadius: 14, padding: '10px 13px', fontSize: 13.5, color: '#1c1f2b', maxWidth: '82%', boxShadow: '0 1px 1px rgba(0,0,0,.05)' }}>¡Bienvenido! Cualquier duda sobre tu ficha, verificación o cómo recibir más trabajos, escríbenos por aquí 👋</div>}
        {msgs.map(function (m) {
          var out = m.autor === 'maestro';
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: out ? 'flex-end' : 'flex-start', marginBottom: 9 }}>
              <div style={{ maxWidth: '82%', background: out ? '#dff5e1' : '#fff', borderRadius: 14, padding: '8px 11px', fontSize: 13.5, lineHeight: 1.45, boxShadow: '0 1px 1px rgba(0,0,0,.05)' }}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.texto}</div>
                <div style={{ fontSize: 9.5, color: '#9aa1b5', textAlign: 'right', marginTop: 3 }}>{fecha(m.creado_en)}</div>
              </div>
            </div>
          );
        })}
        <div ref={finRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid #eee', background: '#fff', alignItems: 'center' }}>
        <input value={txt} onChange={function (e) { setTxt(e.target.value); }} onKeyDown={function (e) { if (e.key === 'Enter') enviar(); }} placeholder="Escribe un mensaje..." style={{ flex: 1, background: '#f1f1f5', border: 'none', borderRadius: 999, padding: '11px 15px', fontSize: 14, outline: 'none' }} />
        <button onClick={enviar} disabled={enviando} style={{ width: 42, height: 42, borderRadius: '50%', background: '#ff5a3c', color: '#fff', border: 'none', fontSize: 16, cursor: 'pointer' }}>{'➤'}</button>
      </div>
    </div>
  );
}
