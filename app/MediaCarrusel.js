'use client';
import { useState } from 'react';

// Carrusel de media (fotos + videos) del problema. Recibe `items`: lista de
// { url, tipo:'video'|'foto' }. Si hay 1, muestra ese; si hay más, carrusel
// deslizable con flechas, puntos y contador. Lo usan cliente y maestro.
function tipoDe(it) {
  if (it && it.tipo) return it.tipo;
  var u = (it && (it.url || it)) || '';
  return /\.(mp4|mov|webm|m4v|3gp|avi|mkv)(\?|$)/i.test(u) ? 'video' : 'foto';
}
function urlDe(it) { return (it && (it.url || it)) || ''; }

export default function MediaCarrusel({ items, alto }) {
  const [idx, setIdx] = useState(0);
  var lista = (items || []).filter(function (x) { return urlDe(x); });
  if (lista.length === 0) return null;
  var i = Math.min(idx, lista.length - 1);
  var actual = lista[i];
  var es = tipoDe(actual);
  var h = alto || 240;

  function ir(n) { setIdx((n + lista.length) % lista.length); }

  var arrow = { position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.85)', border: 'none', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1c1f2b', zIndex: 2 };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
        {es === 'video'
          ? <video key={urlDe(actual)} src={urlDe(actual)} controls playsInline style={{ width: '100%', maxHeight: h, display: 'block', background: '#000' }} />
          : <img src={urlDe(actual)} alt="" style={{ width: '100%', maxHeight: h, objectFit: 'contain', display: 'block', background: '#000' }} />}

        {lista.length > 1 && (
          <span style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 8, padding: '3px 9px', zIndex: 2 }}>{(i + 1) + '/' + lista.length}</span>
        )}
        <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 10.5, fontWeight: 700, borderRadius: 8, padding: '3px 8px', zIndex: 2 }}>{es === 'video' ? '🎥 Video' : '🖼️ Foto'}</span>

        {lista.length > 1 && (
          <div>
            <button onClick={function () { ir(i - 1); }} style={{ ...arrow, left: 8 }}>{'‹'}</button>
            <button onClick={function () { ir(i + 1); }} style={{ ...arrow, right: 8 }}>{'›'}</button>
          </div>
        )}
      </div>

      {lista.length > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
          {lista.map(function (x, k) {
            return <div key={k} onClick={function () { setIdx(k); }} style={{ width: k === i ? 18 : 7, height: 7, borderRadius: 5, background: k === i ? '#ff5a3c' : '#cfd3df', cursor: 'pointer', transition: 'width .15s' }} />;
          })}
        </div>
      )}
    </div>
  );
}
