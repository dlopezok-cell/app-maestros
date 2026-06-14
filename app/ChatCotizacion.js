'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Chat de una cotización: hilo entre el cliente y UN maestro, atado a (presupuesto, maestro).
// Texto + fotos, en tiempo real (Supabase Realtime), y marca como leídos los del otro.
export default function ChatCotizacion({ usuario, presupuestoId, maestroId, miRol }) {
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cargado, setCargado] = useState(false);
  const finRef = useRef(null);
  const fileRef = useRef(null);

  function marcarLeidos() {
    supabase.from('mensajes').update({ leido: true })
      .eq('presupuesto_id', presupuestoId).eq('maestro_id', maestroId)
      .neq('autor_rol', miRol).eq('leido', false).then(function () {});
  }

  function cargar() {
    supabase.from('mensajes').select('*')
      .eq('presupuesto_id', presupuestoId).eq('maestro_id', maestroId)
      .order('creado_en', { ascending: true })
      .then(function (r) {
        setMensajes(r.data || []);
        setCargado(true);
        marcarLeidos();
      });
  }

  useEffect(function () {
    cargar();
    var ch = supabase.channel('chat-' + presupuestoId + '-' + maestroId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes', filter: 'presupuesto_id=eq.' + presupuestoId }, function (payload) {
        var m = payload.new;
        if (m.maestro_id !== maestroId) return;
        setMensajes(function (prev) { return prev.some(function (x) { return x.id === m.id; }) ? prev : prev.concat([m]); });
        if (m.autor_rol !== miRol) marcarLeidos();
      })
      .subscribe();
    return function () { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [presupuestoId, maestroId]);

  useEffect(function () { if (finRef.current) finRef.current.scrollIntoView({ block: 'end' }); }, [mensajes]);

  function enviar(extra) {
    var t = (texto || '').trim();
    var fotoUrl = extra && extra.foto_url ? extra.foto_url : null;
    if (!t && !fotoUrl) return;
    setEnviando(true);
    supabase.from('mensajes').insert({ presupuesto_id: presupuestoId, maestro_id: maestroId, autor_rol: miRol, texto: t || null, foto_url: fotoUrl })
      .select().single().then(function (r) {
        setEnviando(false);
        if (r.error) return;
        setTexto('');
        setMensajes(function (prev) { return prev.some(function (x) { return x.id === r.data.id; }) ? prev : prev.concat([r.data]); });
      });
  }

  function subirFoto(file) {
    if (!file) return;
    setEnviando(true);
    var path = usuario.id + '/chat_' + Date.now() + '.jpg';
    supabase.storage.from('presupuestos').upload(path, file, { upsert: true }).then(function (up) {
      if (up.error) { setEnviando(false); return; }
      var url = supabase.storage.from('presupuestos').getPublicUrl(path).data.publicUrl;
      enviar({ foto_url: url });
    });
  }

  function hora(f) { return f ? new Date(f).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : ''; }

  function reportar() {
    var motivo = window.prompt('¿Qué quieres reportar de esta conversación? (lo revisa el equipo de MaestrosEnLínea)', '');
    if (!motivo) return;
    supabase.from('denuncias').insert({ presupuesto_id: presupuestoId, maestro_id: maestroId, reportante_id: usuario.id, reportante_rol: miRol, motivo: motivo.trim() })
      .then(function (r) { window.alert(r.error ? ('No se pudo enviar: ' + r.error.message) : 'Gracias, recibimos tu reporte. Lo revisaremos.'); });
  }

  return (
    <div style={{ border: '1px solid #eef0f5', borderRadius: 14, overflow: 'hidden', marginTop: 10, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 10px 0' }}>
        <button onClick={reportar} style={{ background: 'none', border: 'none', color: '#b07a1e', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{'\u{26A0} Reportar'}</button>
      </div>
      <div style={{ maxHeight: 260, overflowY: 'auto', padding: 12, background: '#fafafc' }}>
        {!cargado && <div style={{ fontSize: 12, color: '#9aa1b5' }}>Cargando conversación...</div>}
        {cargado && mensajes.length === 0 && <div style={{ fontSize: 12, color: '#9aa1b5' }}>{miRol === 'maestro' ? 'Pregúntale al cliente lo que necesites para cotizar bien (¿qué material?, ¿qué piso?, manda una foto de cerca).' : 'Escríbele al maestro si tienes dudas sobre el presupuesto.'}</div>}
        {mensajes.map(function (m) {
          var mio = m.autor_rol === miRol;
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: mio ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
              <div style={{ maxWidth: '78%', background: mio ? '#ff5a3c' : '#fff', color: mio ? '#fff' : '#1c1f2b', border: mio ? 'none' : '1px solid #eee', borderRadius: 14, padding: '8px 11px' }}>
                {m.foto_url && <img src={m.foto_url} alt="" style={{ maxWidth: '100%', borderRadius: 10, marginBottom: m.texto ? 6 : 0, display: 'block' }} />}
                {m.texto && <div style={{ fontSize: 13.5, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{m.texto}</div>}
                <div style={{ fontSize: 9.5, opacity: 0.7, marginTop: 3, textAlign: 'right' }}>{hora(m.creado_en)}</div>
              </div>
            </div>
          );
        })}
        <div ref={finRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid #eef0f5' }}>
        <label style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 10, border: '1px solid #e4e4ef', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 17 }}>
          {'\u{1F4CE}'}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={function (e) { subirFoto(e.target.files[0]); }} />
        </label>
        <input value={texto} onChange={function (e) { setTexto(e.target.value); }} onKeyDown={function (e) { if (e.key === 'Enter') enviar(); }} placeholder="Escribe un mensaje..." style={{ flex: 1, padding: '0 12px', height: 38, border: '1px solid #e4e4ef', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }} />
        <button onClick={function () { enviar(); }} disabled={enviando} style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 10, border: 'none', background: '#ff5a3c', color: '#fff', fontSize: 16, cursor: 'pointer', opacity: enviando ? 0.6 : 1 }}>{'\u{27A4}'}</button>
      </div>
    </div>
  );
}
