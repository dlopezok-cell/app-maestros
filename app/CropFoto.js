'use client';
import { useState, useRef, useEffect } from 'react';

// Recortador de foto de perfil controlado SOLO con gestos:
//   - 1 dedo: arrastrar para mover
//   - 2 dedos: pellizcar (pinch) para acercar/alejar
// (la rueda del mouse hace zoom solo para probar en computador)
// Exporta la zona del círculo a un canvas cuadrado y llama onUse(blob).
const VP = 260; // recuadro de recorte en pantalla
const OUT = 400; // tamaño final de la foto

export default function CropFoto({ src, onCancel, onUse, subiendo }) {
  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [, setTick] = useState(0);
  const geo = useRef({ zoom: 1, off: { x: 0, y: 0 } });
  const pts = useRef(new Map());
  const pan = useRef(null);
  const pinch = useRef(null);
  const stageRef = useRef(null);
  const imgRef = useRef(null);

  function cover() { return Math.max(VP / (nat.w || 1), VP / (nat.h || 1)); }
  function scale() { return cover() * geo.current.zoom; }
  function drawn() { var s = scale(); return { w: (nat.w || 1) * s, h: (nat.h || 1) * s, s: s }; }
  function clampZoom(z) { return Math.min(6, Math.max(1, z)); }
  function clampOff(o) { var d = drawn(); return { x: Math.min(0, Math.max(VP - d.w, o.x)), y: Math.min(0, Math.max(VP - d.h, o.y)) }; }
  function local(cx, cy) { var r = stageRef.current.getBoundingClientRect(); return { x: cx - r.left, y: cy - r.top }; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  function refresh() { setTick(function (t) { return t + 1; }); }

  function onLoad(e) { setNat({ w: e.target.naturalWidth, h: e.target.naturalHeight }); }

  useEffect(function () {
    if (!nat.w) return;
    geo.current.zoom = 1;
    var s = cover();
    var dw = nat.w * s, dh = nat.h * s;
    geo.current.off = clampOff({ x: (VP - dw) / 2, y: (VP - dh) / 2 });
    refresh();
    // eslint-disable-next-line
  }, [nat.w, nat.h]);

  function startGesture() {
    var a = Array.from(pts.current.values());
    if (a.length >= 2) {
      var s0 = scale(); var m0 = mid(a[0], a[1]);
      pinch.current = { d0: dist(a[0], a[1]), z0: geo.current.zoom, m0: m0, ix: (m0.x - geo.current.off.x) / s0, iy: (m0.y - geo.current.off.y) / s0 };
      pan.current = null;
    } else if (a.length === 1) {
      pan.current = { sx: a[0].x, sy: a[0].y, ox: geo.current.off.x, oy: geo.current.off.y };
      pinch.current = null;
    } else { pan.current = null; pinch.current = null; }
  }
  function down(e) { stageRef.current.setPointerCapture(e.pointerId); pts.current.set(e.pointerId, local(e.clientX, e.clientY)); startGesture(); }
  function move(e) {
    if (!pts.current.has(e.pointerId)) return;
    pts.current.set(e.pointerId, local(e.clientX, e.clientY));
    if (pinch.current && pts.current.size >= 2) {
      var a = Array.from(pts.current.values());
      var d = dist(a[0], a[1]); var m = mid(a[0], a[1]);
      geo.current.zoom = clampZoom(pinch.current.z0 * (d / pinch.current.d0));
      var sNew = scale();
      var ox = pinch.current.m0.x - pinch.current.ix * sNew + (m.x - pinch.current.m0.x);
      var oy = pinch.current.m0.y - pinch.current.iy * sNew + (m.y - pinch.current.m0.y);
      geo.current.off = clampOff({ x: ox, y: oy }); refresh();
    } else if (pan.current && pts.current.size === 1) {
      var p = local(e.clientX, e.clientY);
      geo.current.off = clampOff({ x: pan.current.ox + (p.x - pan.current.sx), y: pan.current.oy + (p.y - pan.current.sy) }); refresh();
    }
  }
  function up(e) { pts.current.delete(e.pointerId); startGesture(); }
  function wheel(e) {
    e.preventDefault();
    var p = local(e.clientX, e.clientY); var s0 = scale(); var ix = (p.x - geo.current.off.x) / s0, iy = (p.y - geo.current.off.y) / s0;
    geo.current.zoom = clampZoom(geo.current.zoom * (e.deltaY < 0 ? 1.12 : 0.89));
    var sNew = scale();
    geo.current.off = clampOff({ x: p.x - ix * sNew, y: p.y - iy * sNew }); refresh();
  }

  function usar() {
    var ratio = OUT / VP; var d = drawn();
    var c = document.createElement('canvas'); c.width = OUT; c.height = OUT;
    var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, OUT, OUT);
    ctx.drawImage(imgRef.current, geo.current.off.x * ratio, geo.current.off.y * ratio, d.w * ratio, d.h * ratio);
    c.toBlob(function (b) { if (b) onUse(b); }, 'image/jpeg', 0.9);
  }

  var d = drawn();
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,15,30,.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 340, background: '#fff', borderRadius: 20, padding: 18, boxSizing: 'border-box' }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#1c1f2b', marginBottom: 4 }}>Ajusta tu foto</div>
        <div style={{ fontSize: 12, color: '#7c8499', marginBottom: 14 }}>Arrastra con un dedo para mover y pellizca con dos dedos para acercar. Lo que quede en el círculo es lo que verán los clientes.</div>
        <div ref={stageRef}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={wheel}
          style={{ position: 'relative', width: VP, height: VP, maxWidth: '100%', margin: '0 auto', borderRadius: '50%', overflow: 'hidden', background: '#eef0f5', touchAction: 'none', cursor: 'grab', boxShadow: '0 0 0 3px #ff5a3c inset' }}>
          <img ref={imgRef} src={src} onLoad={onLoad} draggable={false} alt="" style={{ position: 'absolute', left: geo.current.off.x, top: geo.current.off.y, width: d.w, height: d.h, maxWidth: 'none', userSelect: 'none', pointerEvents: 'none' }} />
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#9aa1b5', marginTop: 12 }}>{'\u{1F446} mover · \u{1F90F} pellizcar para zoom'}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button onClick={onCancel} disabled={subiendo} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1.5px solid #ddd', background: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', color: '#5b6275' }}>Cancelar</button>
          <button onClick={usar} disabled={subiendo} style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: '#ff5a3c', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', opacity: subiendo ? 0.6 : 1 }}>{subiendo ? 'Guardando...' : 'Usar foto'}</button>
        </div>
      </div>
    </div>
  );
}
