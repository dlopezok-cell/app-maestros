'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Chat de una cotización (cliente <-> un maestro), estilo WhatsApp. Solo in-app
// (no envía correos): texto + fotos en tiempo real (Supabase Realtime).
export default function ChatCotizacion({ usuario, presupuestoId, maestroId, miRol, titulo }) {
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cargado, setCargado] = useState(false);
  const finRef = useRef(null);
  const fileRef = useRef(null);

  var otro = miRol === 'cliente' ? (titulo || 'Maestro') : (titulo || 'Cliente');
  var inicial = (otro || '?').charAt(0).toUpperCase();

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
  function dia(f) { return f ? new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : ''; }

  function reportar() {
    var motivo = window.prompt('¿Qué quieres reportar de esta conversación? (lo revisa el equipo de MaestrosEnLínea)', '');
    if (!motivo) return;
    supabase.from('denuncias').insert({ presupuesto_id: presupuestoId, maestro_id: maestroId, reportante_id: usuario.id, reportante_rol: miRol, motivo: motivo.trim() })
      .then(function (r) { window.alert(r.error ? ('No se pudo enviar: ' + r.error.message) : 'Gracias, recibimos tu reporte. Lo revisaremos.'); });
  }

  var chatBg = '#e6ddd3';
  var patron = 'radial-gradient(rgba(0,0,0,.018) 1px, transparent 1px)';

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', marginTop: 10, border: '1px solid #e3e3e8', boxShadow: '0 4px 16px rgba(0,0,0,.06)' }}>
      {/* Encabezado */}
      <div style={{ background: '#075e54', color: '#fff', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px' }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#cfe9e3', color: '#075e54', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{inicial}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{otro}</div>
          <div style={{ fontSize: 10.5, opacity: .85 }}>{'\u{1F512} Chat protegido · sin datos de contacto'}</div>
        </div>
        <button onClick={reportar} title="Reportar" style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', borderRadius: 8, padding: '5px 9px' }}>{'\u{26A0}'}</button>
      </div>

      {/* Mensajes */}
      <div style={{ maxHeight: 300, overflowY: 'auto', padding: '12px 10px', background: chatBg, backgroundImage: patron, backgroundSize: '18px 18px' }}>
        {!cargado && <div style={{ fontSize: 12, color: '#5b6275', textAlign: 'center' }}>Cargando conversación...</div>}
        {cargado && mensajes.length === 0 && (
          <div style={{ background: '#fff7d6', color: '#6b5e1e', fontSize: 11.5, lineHeight: 1.45, borderRadius: 10, padding: '8px 11px', textAlign: 'center', maxWidth: 280, margin: '6px auto' }}>
            {miRol === 'maestro' ? 'Pregúntale al cliente lo que necesites para cotizar bien: ¿qué material?, ¿qué piso?, pídele una foto de cerca.' : 'Escríbele al maestro si tienes dudas sobre el presupuesto. 👋'}
          </div>
        )}
        {mensajes.map(function (m, i) {
          var mio = m.autor_rol === miRol;
          var prev = mensajes[i - 1];
          var nuevoDia = !prev || dia(prev.creado_en) !== dia(m.creado_en);
          return (
            <div key={m.id}>
              {nuevoDia && (
                <div style={{ textAlign: 'center', margin: '8px 0' }}>
                  <span style={{ background: '#d6e8e2', color: '#3d5a54', fontSize: 10.5, fontWeight: 700, borderRadius: 8, padding: '3px 10px' }}>{dia(m.creado_en)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: mio ? 'flex-end' : 'flex-start', marginBottom: 4 }}>
                <div style={{ maxWidth: '80%', background: mio ? '#dcf8c6' : '#fff', color: '#1c1f2b', borderRadius: 12, borderTopRightRadius: mio ? 3 : 12, borderTopLeftRadius: mio ? 12 : 3, padding: '6px 9px 5px', boxShadow: '0 1px 1px rgba(0,0,0,.08)' }}>
                  {m.foto_url && <img src={m.foto_url} alt="" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: m.texto ? 5 : 0, display: 'block' }} />}
                  {m.texto && <span style={{ fontSize: 13.5, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{m.texto}</span>}
                  <span style={{ fontSize: 10, color: '#7c8a86', marginLeft: 8, float: 'right', position: 'relative', top: 4 }}>
                    {hora(m.creado_en)}{mio && <span style={{ marginLeft: 3, color: m.leido ? '#34b7f1' : '#9aa6a2', fontWeight: 700 }}>{'✓✓'}</span>}
                  </span>
                  <div style={{ clear: 'both' }} />
                </div>
              </div>
            </div>
          );
        })}
        <div ref={finRef} />
      </div>

      {/* Barra de entrada */}
      <div style={{ display: 'flex', gap: 8, padding: 9, background: '#f0f0f0', alignItems: 'center' }}>
        <label style={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18, color: '#54656f' }}>
          {'\u{1F4CE}'}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={function (e) { subirFoto(e.target.files[0]); }} />
        </label>
        <input value={texto} onChange={function (e) { setTexto(e.target.value); }} onKeyDown={function (e) { if (e.key === 'Enter') enviar(); }} placeholder="Escribe un mensaje" style={{ flex: 1, padding: '0 14px', height: 40, border: 'none', borderRadius: 20, fontSize: 14, boxSizing: 'border-box', background: '#fff', outline: 'none' }} />
        <button onClick={function () { enviar(); }} disabled={enviando} style={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', border: 'none', background: '#25d366', color: '#fff', fontSize: 17, cursor: 'pointer', opacity: enviando ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{'➤'}</button>
      </div>
    </div>
  );
}
