'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import CotizadorChat from './CotizadorChat';

// Chat cliente <-> maestro, a pantalla completa, con look propio de la marca.
// Texto + imagen + video + audio (grabado), sonido y notificación al recibir.
// Oculta datos de contacto hasta el pago (modelo Airbnb). Solo in-app.
export default function ChatCotizacion({ usuario, presupuestoId, maestroId, miRol, titulo, onClose }) {
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [oculto, setOculto] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [cotizarOpen, setCotizarOpen] = useState(false);
  const [zoomImg, setZoomImg] = useState(null);
  const [grabando, setGrabando] = useState(false);
  const [vp, setVp] = useState(null);
  const finRef = useRef(null);
  const imgRef = useRef(null);
  const vidRef = useRef(null);
  const recRef = useRef(null);
  const inpRef = useRef(null);

  // Fija el chat a la zona visible real: al abrir el teclado en el móvil,
  // visualViewport encoge y se desplaza; anclamos top+alto para que el campo
  // de texto y el botón de enviar queden siempre a la vista (sin zoom).
  useEffect(function () {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    var vv = window.visualViewport;
    function upd() { setVp({ h: vv.height, top: vv.offsetTop || 0 }); }
    upd();
    vv.addEventListener('resize', upd);
    vv.addEventListener('scroll', upd);
    return function () { vv.removeEventListener('resize', upd); vv.removeEventListener('scroll', upd); };
  }, []);

  var otro = miRol === 'cliente' ? (titulo || 'Maestro') : (titulo || 'Cliente');
  var inicial = (otro || '?').charAt(0).toUpperCase();
  var GRAD = ['linear-gradient(135deg,#ff8a6b,#ff5a3c)', 'linear-gradient(135deg,#7048e8,#a78bfa)', 'linear-gradient(135deg,#11a36c,#6fe0ae)', 'linear-gradient(135deg,#3b6ef0,#7fa8ff)', 'linear-gradient(135deg,#e9842f,#ffc06b)'];
  var avBg = GRAD[(inicial.charCodeAt(0) || 0) % GRAD.length];

  function beep() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext; var ctx = new Ctx();
      function tono(f, t, d) { var o = ctx.createOscillator(); var g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.32, ctx.currentTime + t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + d); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + d + 0.02); }
      tono(880, 0, 0.16); tono(1320, 0.15, 0.2);
    } catch (e) {}
  }
  function notificar(texto) {
    try {
      if (typeof Notification === 'undefined') return;
      if (Notification.permission === 'granted' && document.hidden) {
        new Notification(otro, { body: texto || 'Te envió un mensaje', icon: '/icon.png' });
      }
    } catch (e) {}
  }

  function marcarLeidos() {
    supabase.from('mensajes').update({ leido: true })
      .eq('presupuesto_id', presupuestoId).eq('maestro_id', maestroId)
      .neq('autor_rol', miRol).eq('leido', false).then(function () {});
  }

  function cargar() {
    supabase.from('mensajes').select('*')
      .eq('presupuesto_id', presupuestoId).eq('maestro_id', maestroId)
      .order('creado_en', { ascending: true })
      .then(function (r) { setMensajes(r.data || []); setCargado(true); marcarLeidos(); });
  }

  useEffect(function () {
    try { if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission(); } catch (e) {}
    cargar();
    var ch = supabase.channel('chat-' + presupuestoId + '-' + maestroId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes', filter: 'presupuesto_id=eq.' + presupuestoId }, function (payload) {
        var m = payload.new;
        if (m.maestro_id !== maestroId) return;
        setMensajes(function (prev) { return prev.some(function (x) { return x.id === m.id; }) ? prev : prev.concat([m]); });
        if (m.autor_rol !== miRol) { marcarLeidos(); beep(); notificar(m.texto); }
      })
      .subscribe();
    return function () { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [presupuestoId, maestroId]);

  useEffect(function () { if (finRef.current) finRef.current.scrollIntoView({ block: 'end' }); }, [mensajes]);

  // Oculta datos de contacto (correos, links, @usuarios, teléfonos 8+ dígitos)
  function limpiar(s) {
    if (!s) return s;
    var out = s;
    out = out.replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi, '•••');
    out = out.replace(/\b(?:https?:\/\/|www\.)\S+/gi, '•••');
    out = out.replace(/@[a-z0-9_.]{2,}/gi, '•••');
    out = out.replace(/[+(]?\d[\d\s().\-]{6,}\d/g, function (m) { return m.replace(/\D/g, '').length >= 8 ? '•••' : m; });
    return out;
  }

  function insertar(extra) {
    var payload = Object.assign({ presupuesto_id: presupuestoId, maestro_id: maestroId, autor_rol: miRol }, extra);
    return supabase.from('mensajes').insert(payload).select().single().then(function (r) {
      setEnviando(false);
      if (r.error) return;
      setMensajes(function (prev) { return prev.some(function (x) { return x.id === r.data.id; }) ? prev : prev.concat([r.data]); });
    });
  }

  function enviarTexto() {
    var raw = (texto || '').trim();
    var t = limpiar(raw);
    if (!t) return;
    if (t !== raw) { setOculto(true); setTimeout(function () { setOculto(false); }, 5000); }
    setEnviando(true); setTexto('');
    insertar({ texto: t });
  }

  function subir(fileOrBlob, tipo, ext, mime) {
    setEnviando(true);
    var path = usuario.id + '/chat_' + Date.now() + '.' + ext;
    supabase.storage.from('presupuestos').upload(path, fileOrBlob, { contentType: mime, upsert: true }).then(function (up) {
      if (up.error) { setEnviando(false); return; }
      var url = supabase.storage.from('presupuestos').getPublicUrl(path).data.publicUrl;
      insertar({ media_url: url, media_tipo: tipo });
    });
  }

  function elegir(e, tipo) {
    setAttachOpen(false);
    var f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    var ext = (f.name.split('.').pop() || (tipo === 'video' ? 'mp4' : 'jpg')).toLowerCase();
    subir(f, tipo, ext, f.type || (tipo === 'video' ? 'video/mp4' : 'image/jpeg'));
  }

  function grabar() {
    if (recRef.current) { try { recRef.current.stop(); } catch (e) {} return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) { alert('Tu navegador no soporta grabar audio.'); return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var mr = new MediaRecorder(stream); var chunks = [];
      mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      mr.onstop = function () {
        var blob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach(function (t) { t.stop(); });
        recRef.current = null; setGrabando(false);
        if (blob.size > 0) subir(blob, 'audio', 'webm', 'audio/webm');
      };
      mr.start(); recRef.current = mr; setGrabando(true);
    }).catch(function () { alert('No pudimos acceder al micrófono. Revisa los permisos.'); });
  }

  function hora(f) { return f ? new Date(f).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : ''; }
  function dia(f) { return f ? new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : ''; }
  function reportar() {
    var motivo = window.prompt('¿Qué quieres reportar de esta conversación? (lo revisa el equipo)', '');
    if (!motivo) return;
    supabase.from('denuncias').insert({ presupuesto_id: presupuestoId, maestro_id: maestroId, reportante_id: usuario.id, reportante_rol: miRol, motivo: motivo.trim() })
      .then(function (r) { window.alert(r.error ? ('No se pudo enviar: ' + r.error.message) : 'Gracias, recibimos tu reporte.'); });
  }

  var ico = { width: 42, height: 42, borderRadius: '50%', border: 'none', background: '#f3f3f8', color: '#5b6275', fontSize: 19, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' };

  function burbujaMedia(m, mio) {
    var tipo = m.media_tipo;
    var url = m.media_url || m.foto_url;
    if (!url) return null;
    if (!tipo && m.foto_url) tipo = 'imagen';
    if (tipo === 'audio') return <audio src={url} controls style={{ width: 210, maxWidth: '64vw', height: 38 }} />;
    if (tipo === 'video') return <video src={url} controls playsInline style={{ width: 210, maxWidth: '64vw', borderRadius: 12, display: 'block', background: '#000' }} />;
    return <img src={url} alt="" onClick={function () { setZoomImg(url); }} style={{ width: 210, maxWidth: '64vw', borderRadius: 12, display: 'block', cursor: 'pointer' }} />;
  }

  return (
    <div style={Object.assign(
      { position: 'fixed', left: 0, right: 0, zIndex: 300, display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg,#f7f5fc,#f3f1f9)' },
      vp ? { top: vp.top + 'px', height: vp.h + 'px' } : { top: 0, bottom: 0 }
    )}>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px', paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))', background: '#fff', boxShadow: '0 2px 12px rgba(20,20,50,.06)' }}>
        <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 26, color: '#ff5a3c', cursor: 'pointer', fontWeight: 700, lineHeight: 1, padding: '0 2px' }}>{'‹'}</button>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: avBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{inicial}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{otro}</div>
          <div style={{ fontSize: 11, color: '#27c46b', fontWeight: 700 }}>en línea</div>
        </div>
        <button onClick={reportar} title="Reportar" style={{ border: 'none', background: '#f3f3f8', width: 36, height: 36, borderRadius: '50%', fontSize: 15, cursor: 'pointer', color: '#8a5a00' }}>{'⚠'}</button>
      </div>

      {/* Aviso de privacidad */}
      <div style={{ background: oculto ? '#fff3cd' : '#fbf7ee', color: oculto ? '#8a5a00' : '#8a7a3a', fontSize: 10.5, lineHeight: 1.4, padding: '6px 12px', textAlign: 'center' }}>
        {oculto ? '⚠️ Ocultamos un dato de contacto. El teléfono y la dirección se comparten al pagar.' : '🔒 Mantén la conversación aquí. Teléfonos y correos se ocultan hasta pagar.'}
      </div>

      {/* Mensajes */}
      <div onTouchStart={function () { if (inpRef.current) inpRef.current.blur(); }} style={{ flex: 1, overflowY: 'auto', padding: '14px 12px 6px' }}>
        {!cargado && <div style={{ fontSize: 13, color: '#9aa1b5', textAlign: 'center', marginTop: 20 }}>Cargando conversación...</div>}
        {cargado && mensajes.length === 0 && (
          <div style={{ background: '#fff', color: '#6b7184', fontSize: 12.5, lineHeight: 1.5, borderRadius: 14, padding: '12px 14px', textAlign: 'center', maxWidth: 300, margin: '12px auto', boxShadow: '0 2px 10px rgba(20,20,50,.06)' }}>
            {miRol === 'maestro' ? 'Pregúntale al cliente lo que necesites para cotizar bien: ¿qué material?, ¿qué piso?, pídele una foto o video de cerca.' : 'Escríbele al maestro, mándale fotos, un video o un audio para explicar mejor el problema. 👋'}
          </div>
        )}
        {mensajes.map(function (m, i) {
          var mio = m.autor_rol === miRol;
          var prev = mensajes[i - 1];
          var nuevoDia = !prev || dia(prev.creado_en) !== dia(m.creado_en);
          var media = burbujaMedia(m, mio);
          return (
            <div key={m.id}>
              {nuevoDia && <div style={{ textAlign: 'center', margin: '8px 0 12px' }}><span style={{ background: '#e7e3f3', color: '#6b6391', fontSize: 10.5, fontWeight: 700, borderRadius: 10, padding: '4px 12px' }}>{dia(m.creado_en)}</span></div>}
              <div style={{ display: 'flex', justifyContent: mio ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                <div style={{ maxWidth: '80%', borderRadius: 20, borderBottomRightRadius: mio ? 7 : 20, borderBottomLeftRadius: mio ? 20 : 7, padding: media ? '5px 5px 4px' : '9px 13px', background: mio ? 'linear-gradient(150deg,#ff6a3d,#ff4d2e)' : '#fff', color: mio ? '#fff' : '#1c1f2b', boxShadow: '0 2px 8px rgba(20,20,50,.07)' }}>
                  {media}
                  {m.texto && <div style={{ fontSize: 14, lineHeight: 1.4, whiteSpace: 'pre-wrap', padding: media ? '4px 8px 0' : 0 }}>{m.texto}</div>}
                  <div style={{ fontSize: 10, marginTop: 4, opacity: 0.75, textAlign: 'right', padding: media ? '0 8px' : 0, color: mio ? 'rgba(255,255,255,.9)' : '#9aa1b5' }}>{hora(m.creado_en)}{mio && <span style={{ marginLeft: 4 }}>{m.leido ? '✓✓' : '✓'}</span>}</div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={finRef} />
      </div>

      {/* Menú adjuntar */}
      {attachOpen && (
        <div style={{ position: 'absolute', bottom: 70, left: 12, background: '#fff', borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,.2)', padding: 6, zIndex: 5 }}>
          {miRol === 'maestro' && <button onClick={function () { setAttachOpen(false); setCotizarOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: 200, border: 'none', background: '#fff5f2', padding: '11px 12px', borderRadius: 10, fontSize: 13.5, fontWeight: 800, color: '#ff5a3c', cursor: 'pointer', marginBottom: 4 }}>{'🧾'} Cotizar este trabajo</button>}
          <button onClick={function () { if (imgRef.current) imgRef.current.click(); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: 200, border: 'none', background: 'none', padding: '11px 12px', borderRadius: 10, fontSize: 13.5, fontWeight: 700, color: '#1c1f2b', cursor: 'pointer' }}>{'🖼️'} Foto</button>
          <button onClick={function () { if (vidRef.current) vidRef.current.click(); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: 180, border: 'none', background: 'none', padding: '11px 12px', borderRadius: 10, fontSize: 13.5, fontWeight: 700, color: '#1c1f2b', cursor: 'pointer' }}>{'🎥'} Video</button>
        </div>
      )}

      {/* Barra de entrada */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', background: '#fff', boxShadow: '0 -2px 12px rgba(20,20,50,.06)' }}>
        <button onClick={function () { setAttachOpen(!attachOpen); }} style={ico}>{attachOpen ? '×' : '＋'}</button>
        <input ref={inpRef} value={texto} onChange={function (e) { setTexto(e.target.value); }} onKeyDown={function (e) { if (e.key === 'Enter') enviarTexto(); }} placeholder={grabando ? 'Grabando audio…' : 'Escribe un mensaje'} disabled={grabando} style={{ flex: 1, height: 42, border: 'none', borderRadius: 22, padding: '0 16px', fontSize: 16, background: grabando ? '#ffecec' : '#f3f3f8', color: grabando ? '#d3422a' : '#1c1f2b', outline: 'none', boxSizing: 'border-box' }} />
        {texto.trim()
          ? <button onMouseDown={function (e) { e.preventDefault(); }} onClick={enviarTexto} disabled={enviando} style={{ width: 46, height: 46, borderRadius: '50%', border: 'none', background: 'linear-gradient(150deg,#ff6a3d,#ff4d2e)', color: '#fff', fontSize: 19, cursor: 'pointer', flexShrink: 0, opacity: enviando ? 0.6 : 1, boxShadow: '0 6px 16px rgba(255,90,60,.4)' }}>{'➤'}</button>
          : <button onClick={grabar} title="Grabar audio" style={{ width: 46, height: 46, borderRadius: '50%', border: 'none', background: grabando ? '#d3422a' : 'linear-gradient(150deg,#ff6a3d,#ff4d2e)', color: '#fff', fontSize: 19, cursor: 'pointer', flexShrink: 0, boxShadow: '0 6px 16px rgba(255,90,60,.35)' }}>{grabando ? '⏹' : '🎤'}</button>}
        <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={function (e) { elegir(e, 'imagen'); }} />
        <input ref={vidRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={function (e) { elegir(e, 'video'); }} />
      </div>

      {cotizarOpen && <CotizadorChat usuario={usuario} presupuestoId={presupuestoId} maestroId={maestroId} titulo={otro} onClose={function () { setCotizarOpen(false); }} />}

      {zoomImg && (
        <div onClick={function () { setZoomImg(null); }} style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(0,0,0,.92)', overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '60px 12px 40px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          <img src={zoomImg} alt="" onClick={function (e) { e.stopPropagation(); }} style={{ width: '100%', maxWidth: 560, height: 'auto', display: 'block', borderRadius: 8 }} />
          <button onClick={function () { setZoomImg(null); }} style={{ position: 'fixed', top: 'calc(14px + env(safe-area-inset-top, 0px))', right: 16, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,.18)', color: '#fff', border: 'none', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>{'×'}</button>
        </div>
      )}
    </div>
  );
}
