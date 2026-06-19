'use client';
import { useState } from 'react';

// Carrusel de media (fotos + videos) del problema. Recibe `items`: lista de
// { url, tipo:'video'|'foto' }. Si hay 1, muestra ese; si hay más, carrusel
// deslizable con flechas, puntos y contador. Botón para ver en pantalla completa.
function tipoDe(it) {
  if (it && it.tipo) return it.tipo;
  var u = (it && (it.url || it)) || '';
  return /\.(mp4|mov|webm|m4v|3gp|avi|mkv)(\?|$)/i.test(u) ? 'video' : 'foto';
}
function urlDe(it) { return (it && (it.url || it)) || ''; }

export default function MediaCarrusel({ items, alto }) {
  const [idx, setIdx] = useState(0);
  const [full, setFull] = useState(false);
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
          : <img src={urlDe(actual)} alt="" onClick={function () { setFull(true); }} style={{ width: '100%', maxHeight: h, objectFit: 'contain', display: 'block', background: '#000', cursor: 'zoom-in' }} />}

        {lista.length > 1 && (
          <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 8, padding: '3px 9px', zIndex: 2 }}>{(i + 1) + '/' + lista.length}</span>
        )}

        <button onClick={function () { setFull(true); }} aria-label="Pantalla completa" title="Pantalla completa" style={{ position: 'absolute', top: 8, right: 8, zIndex: 3, width: 32, height: 32, borderRadius: 9, border: 'none', background: 'rgba(0,0,0,.5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 17, lineHeight: 1 }}>{'⤢'}</button>

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
            return <div key={k} onClick={function () { setIdx(k); }} style={{ width: k === i ? 18 : 7, height: 7, borderRadius: 5, background: k === i ? '#2563eb' : '#cfd3df', cursor: 'pointer', transition: 'width .15s' }} />;
          })}
        </div>
      )}

      {full && (
        <div onClick={function () { setFull(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.93)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
          <button onClick={function (e) { e.stopPropagation(); setFull(false); }} aria-label="Cerrar" style={{ position: 'absolute', top: 14, left: 14, width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.18)', color: '#fff', fontSize: 22, fontWeight: 700, cursor: 'pointer', lineHeight: 1, zIndex: 3 }}>{'✕'}</button>
          {lista.length > 1 && (
            <div>
              <button onClick={function (e) { e.stopPropagation(); ir(i - 1); }} style={{ ...arrow, left: 10, width: 44, height: 44, fontSize: 24, background: 'rgba(255,255,255,.22)', color: '#fff' }}>{'‹'}</button>
              <button onClick={function (e) { e.stopPropagation(); ir(i + 1); }} style={{ ...arrow, right: 10, width: 44, height: 44, fontSize: 24, background: 'rgba(255,255,255,.22)', color: '#fff' }}>{'›'}</button>
            </div>
          )}
          <div onClick={function (e) { e.stopPropagation(); }} style={{ maxWidth: '100%', maxHeight: '100%' }}>
            {es === 'video'
              ? <video key={'f' + urlDe(actual)} src={urlDe(actual)} controls autoPlay playsInline style={{ maxWidth: '100%', maxHeight: '90vh', display: 'block', borderRadius: 6, background: '#000' }} />
              : <img src={urlDe(actual)} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', display: 'block', borderRadius: 6 }} />}
          </div>
        </div>
      )}
    </div>
  );
}
