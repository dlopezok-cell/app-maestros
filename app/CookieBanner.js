'use client';
import { useState, useEffect } from 'react';

// Aviso de cookies. Se muestra una vez; al aceptar guarda en localStorage.
export default function CookieBanner() {
  const [show, setShow] = useState(false);
  useEffect(function () {
    try { if (!localStorage.getItem('cookies_ok')) setShow(true); } catch (e) {}
  }, []);
  if (!show) return null;
  function aceptar() { try { localStorage.setItem('cookies_ok', '1'); } catch (e) {} setShow(false); }
  return (
    <div style={{ position: 'fixed', left: 12, right: 12, bottom: 78, zIndex: 150, background: '#1c2030', color: '#fff', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 8px 30px rgba(0,0,0,.3)', maxWidth: 760, margin: '0 auto', boxSizing: 'border-box' }}>
      <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.45 }}>Usamos cookies para que la app funcione y mejorar tu experiencia. Al continuar aceptas nuestros <a href="/terminos" style={{ color: '#ff8a6b' }}>Términos</a> y <a href="/privacidad" style={{ color: '#ff8a6b' }}>Privacidad</a>.</div>
      <button onClick={aceptar} style={{ background: '#ff5a3c', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontWeight: 800, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>Aceptar</button>
    </div>
  );
}
