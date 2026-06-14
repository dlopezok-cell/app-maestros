'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Cabecera de perfil del maestro (estilo profesional): avatar grande editable,
// nombre, especialidades y la insignia de verificación. La foto se sube al bucket
// publico "avatares" y la URL queda en perfiles.avatar_url.
// Al elegir foto se abre un recortador (arrastrar para mover + zoom) para que
// la imagen calce bien dentro del círculo. Se exporta a un canvas cuadrado.
const NOMBRE_OFICIO = { gasfiteria: 'Gasfitería', electricidad: 'Electricidad', cerrajeria: 'Cerrajería', pintura: 'Pintura', calefont: 'Calefont', limpieza: 'Limpieza' };
const VP = 260;   // tamaño del recuadro de recorte en pantalla
const OUT = 400;  // tamaño final (px) de la foto

export default function CabeceraMaestro({ usuario }) {
  const [url, setUrl] = useState(null);
  const [nombre, setNombre] = useState('');
  const [oficios, setOficios] = useState([]);
  const [estado, setEstado] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [cargado, setCargado] = useState(false);

  // --- recorte de avatar ---
  const [cropSrc, setCropSrc] = useState(null);
  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);
  const imgElRef = useRef(null);

  useEffect(function () {
    if (!usuario) return;
    Promise.all([
      supabase.from('perfiles').select('nombre, avatar_url').eq('id', usuario.id).maybeSingle(),
      supabase.from('maestros').select('oficios, oficio').eq('id', usuario.id).maybeSingle(),
      supabase.from('verificaciones').select('estado').eq('user_id', usuario.id).maybeSingle()
    ]).then(function (res) {
      var p = res[0].data, m = res[1].data, v = res[2].data;
      if (p) { setNombre(p.nombre || ''); setUrl(p.avatar_url || null); }
      if (m) { setOficios(m.oficios && m.oficios.length ? m.oficios : (m.oficio ? [m.oficio] : [])); }
      setEstado(v ? v.estado : null);
      setCargado(true);
    });
  }, [usuario]);

  function cover() { return Math.max(VP / (nat.w || 1), VP / (nat.h || 1)); }
  function drawn() { var s = cover() * zoom; return { w: (nat.w || 1) * s, h: (nat.h || 1) * s, s: s }; }
  function clampOff(o) {
    var d = drawn();
    var minX = VP - d.w, minY = VP - d.h;
    return { x: Math.min(0, Math.max(minX, o.x)), y: Math.min(0, Math.max(minY, o.y)) };
  }

  function elegir(file) {
    if (!file) return;
    setZoom(1); setOff({ x: 0, y: 0 }); setNat({ w: 0, h: 0 });
    setCropSrc(URL.createObjectURL(file));
  }
  function onImgLoad(e) { setNat({ w: e.target.naturalWidth, h: e.target.naturalHeight }); }

  // al cargar la imagen, centrar
  useEffect(function () {
    if (!nat.w) return;
    var d = drawn();
    setOff(clampOff({ x: (VP - d.w) / 2, y: (VP - d.h) / 2 }));
    // eslint-disable-next-line
  }, [nat.w, nat.h]);

  // al cambiar zoom, mantener dentro de límites
  useEffect(function () {
    if (!nat.w) return;
    setOff(function (o) { return clampOff(o); });
    // eslint-disable-next-line
  }, [zoom]);

  function point(e) { var t = e.touches && e.touches[0] ? e.touches[0] : e; return { x: t.clientX, y: t.clientY }; }
  function onDown(e) { var p = point(e); dragRef.current = { sx: p.x, sy: p.y, ox: off.x, oy: off.y }; }
  function onMove(e) {
    if (!dragRef.current) return;
    var p = point(e);
    setOff(clampOff({ x: dragRef.current.ox + (p.x - dragRef.current.sx), y: dragRef.current.oy + (p.y - dragRef.current.sy) }));
  }
  function onUp() { dragRef.current = null; }

  function confirmarCrop() {
    setSubiendo(true);
    var ratio = OUT / VP;
    var img = imgElRef.current;
    var d = drawn();
    var canvas = document.createElement('canvas');
    canvas.width = OUT; canvas.height = OUT;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, OUT, OUT);
    ctx.drawImage(img, off.x * ratio, off.y * ratio, d.w * ratio, d.h * ratio);
    canvas.toBlob(function (blob) {
      var ruta = usuario.id + '/perfil_' + Date.now() + '.jpg';
      supabase.storage.from('avatares').upload(ruta, blob, { upsert: true, contentType: 'image/jpeg' }).then(function (r) {
        if (r.error) { setSubiendo(false); return; }
        var pub = supabase.storage.from('avatares').getPublicUrl(ruta);
        supabase.from('perfiles').update({ avatar_url: pub.data.publicUrl }).eq('id', usuario.id).then(function () {
          setUrl(pub.data.publicUrl);
          setSubiendo(false);
          setCropSrc(null);
        });
      });
    }, 'image/jpeg', 0.9);
  }

  if (!usuario || !cargado) return <div className="darkhead"><div className="dh2">Cargando tu perfil...</div></div>;

  var inicial = (nombre || usuario.email || '?').trim().charAt(0).toUpperCase();
  var oficiosTxt = oficios.map(function (o) { return NOMBRE_OFICIO[o] || o; }).join(' · ');
  var d = drawn();

  return (
    <div className="darkhead" style={{ textAlign: 'center', paddingBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: '#ff8a6b' }}>{'\u{1F6E0} MODO MAESTRO'}</div>
      <div style={{ position: 'relative', width: 108, height: 108, margin: '14px auto 12px' }}>
        <div style={{ width: 108, height: 108, borderRadius: '50%', overflow: 'hidden', background: '#ff5a3c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 42, border: '3px solid rgba(255,255,255,.55)' }}>
          {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : inicial}
        </div>
        <label style={{ position: 'absolute', bottom: 2, right: 2, width: 34, height: 34, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.35)', opacity: subiendo ? 0.5 : 1 }}>
          <span style={{ fontSize: 15 }}>{'\u{1F4F7}'}</span>
          <input type="file" accept="image/*" style={{ display: 'none' }} disabled={subiendo} onChange={function (e) { elegir(e.target.files[0]); e.target.value = ''; }} />
        </label>
      </div>
      <h2 style={{ margin: '0 0 4px' }}>{nombre || (usuario.email || '').split('@')[0]}</h2>
      <div style={{ color: '#b9c0d4', fontSize: 13 }}>{oficiosTxt || 'Completa tu ficha de maestro abajo'}</div>
      {estado === 'aprobado'
        ? <div style={{ display: 'inline-block', marginTop: 12, background: 'rgba(13,148,86,.20)', color: '#7ee2b0', borderRadius: 999, padding: '5px 13px', fontSize: 12, fontWeight: 800 }}>{'\u{1F6E1} Identidad verificada'}</div>
        : estado === 'pendiente'
          ? <div style={{ display: 'inline-block', marginTop: 12, background: 'rgba(255,170,60,.18)', color: '#ffce8a', borderRadius: 999, padding: '5px 13px', fontSize: 12, fontWeight: 800 }}>{'\u{23F3} Verificación en revisión'}</div>
          : <div style={{ display: 'inline-block', marginTop: 12, background: 'rgba(255,255,255,.12)', color: '#cdd3e3', borderRadius: 999, padding: '5px 13px', fontSize: 12, fontWeight: 700 }}>{'\u{23F3} Verificación pendiente'}</div>}

      {/* ----- Recortador de foto ----- */}
      {cropSrc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,15,30,.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 340, background: '#fff', borderRadius: 20, padding: 18, boxSizing: 'border-box' }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#1c1f2b', marginBottom: 4 }}>Ajusta tu foto</div>
            <div style={{ fontSize: 12, color: '#7c8499', marginBottom: 14 }}>Arrastra para mover y usa la barra para acercar. Lo que quede dentro del círculo es lo que verán los clientes.</div>
            <div
              onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
              onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
              style={{ position: 'relative', width: VP, height: VP, maxWidth: '100%', margin: '0 auto', borderRadius: '50%', overflow: 'hidden', background: '#eef0f5', cursor: 'grab', touchAction: 'none', boxShadow: '0 0 0 3px #ff5a3c inset' }}>
              <img ref={imgElRef} src={cropSrc} onLoad={onImgLoad} draggable={false} alt=""
                style={{ position: 'absolute', left: off.x, top: off.y, width: d.w, height: d.h, maxWidth: 'none', userSelect: 'none', pointerEvents: 'none' }} />
            </div>
            <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={function (e) { setZoom(parseFloat(e.target.value)); }} style={{ width: '100%', marginTop: 16, accentColor: '#ff5a3c' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={function () { setCropSrc(null); }} disabled={subiendo} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1.5px solid #ddd', background: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', color: '#5b6275' }}>Cancelar</button>
              <button onClick={confirmarCrop} disabled={subiendo} style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: '#ff5a3c', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', opacity: subiendo ? 0.6 : 1 }}>{subiendo ? 'Guardando...' : 'Usar foto'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
