'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

// Para cambiar la imagen de heroe: pega aqui el link de una foto.
// Si queda vacio ('') se muestra la ilustracion.
const HERO_IMG = '';

// Pantalla "PRONTO" para el publico. El acceso del equipo esta oculto:
// se abre tocando el logo (el icono de herramientas, arriba a la izquierda).
export default function Bienvenida() {
  const [login, setLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState(null);
  const [correo, setCorreo] = useState('');
  const [aviso, setAviso] = useState(false);

  function entrar() {
    setMsg('Procesando...');
    supabase.auth.signInWithPassword({ email: email, password: pass }).then(function (r) {
      if (r.error) { setMsg(r.error.message); return; }
      window.location.reload();
    });
  }
  function conGoogle() {
    supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } });
  }

  var col = { width: '100%', maxWidth: 440, margin: '0 auto' };
  var card = { background: '#f5f5f7', borderRadius: 12, padding: '11px 12px' };
  var chip = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f5f5f7', borderRadius: 10, padding: '9px 11px', fontSize: 12.5, color: '#41434d', fontWeight: 600 };

  // ----- Acceso del equipo (oculto, se abre tocando el logo) -----
  if (login) return (
    <main>
      <div style={{ minHeight: '100vh', background: '#fff', color: '#16181f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 22px', boxSizing: 'border-box' }}>
        <div style={{ ...col, maxWidth: 360, background: '#f5f5f7', borderRadius: 18, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12, textAlign: 'center' }}>Acceso del equipo</div>
          <input value={email} onChange={function (e) { setEmail(e.target.value); }} placeholder="Correo" style={{ width: '100%', padding: 13, borderRadius: 12, border: '1.5px solid #e4e4ea', fontSize: 14, marginBottom: 9, boxSizing: 'border-box' }} />
          <input type="password" value={pass} onChange={function (e) { setPass(e.target.value); }} placeholder="Contrasena" style={{ width: '100%', padding: 13, borderRadius: 12, border: '1.5px solid #e4e4ea', fontSize: 14, marginBottom: 9, boxSizing: 'border-box' }} />
          {msg && <p style={{ fontSize: 12, color: '#b3261e', margin: '0 0 9px' }}>{msg}</p>}
          <button onClick={entrar} style={{ width: '100%', background: '#16181f', color: '#fff', border: 'none', borderRadius: 12, padding: 13, fontWeight: 800, fontSize: 14, cursor: 'pointer', marginBottom: 9 }}>Ingresar</button>
          <button onClick={conGoogle} style={{ width: '100%', background: '#fff', color: '#16181f', border: '1.5px solid #e4e4ea', borderRadius: 12, padding: 13, fontWeight: 800, fontSize: 14, cursor: 'pointer', marginBottom: 9 }}>{'\u{1F310} Continuar con Google'}</button>
          <button onClick={function () { setLogin(false); setMsg(null); }} style={{ width: '100%', background: 'none', border: 'none', color: '#9aa1b5', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Volver</button>
        </div>
      </div>
    </main>
  );

  // ----- Landing publica -----
  return (
    <main>
      <div style={{ minHeight: '100vh', background: '#fff', color: '#16181f', padding: '20px 18px 44px', boxSizing: 'border-box' }}>
        <div style={col}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div onClick={function () { setLogin(true); }} title="Acceso del equipo" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
              <span style={{ fontSize: 22 }}>{'\u{1F6E0}'}</span>
              <span style={{ fontSize: 15, fontWeight: 800 }}>MaestrosEnLínea</span>
            </div>
            <span style={{ background: '#fdece7', color: '#c0341a', fontSize: 11, fontWeight: 800, letterSpacing: 1.5, padding: '5px 12px', borderRadius: 999 }}>PRONTO</span>
          </div>

          <div style={{ textAlign: 'center', margin: '8px 0 16px' }}>
            <h1 style={{ fontSize: 27, lineHeight: 1.15, fontWeight: 900, margin: 0 }}>El maestro ideal para tu <span style={{ color: '#ff5a3c' }}>reparación</span></h1>
            <p style={{ fontSize: 14.5, color: '#8a8d98', lineHeight: 1.45, margin: '9px auto 0', maxWidth: 380 }}>Encuentra expertos verificados, pide tu presupuesto por video y agenda — todo desde tu teléfono.</p>
          </div>

          <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: '#fff5f1', border: '1px solid #ffe1d6' }}>
            {HERO_IMG
              ? <img src={HERO_IMG} alt="MaestrosEnLínea" style={{ width: '100%', display: 'block' }} />
              : (
                <svg viewBox="0 0 320 168" style={{ display: 'block', width: '100%', height: 'auto' }} role="img" aria-label="Casa con videollamada y herramientas">
                  <rect width="320" height="168" fill="#fff5f1" />
                  <rect x="44" y="74" width="126" height="74" rx="8" fill="#ffe1d6" />
                  <path d="M44 76 L107 36 L170 76 Z" fill="#ff8a6b" />
                  <rect x="92" y="100" width="30" height="48" rx="4" fill="#ff5a3c" />
                  <rect x="132" y="94" width="24" height="20" rx="4" fill="#fff" />
                  <circle cx="222" cy="70" r="46" fill="#16181f" />
                  <rect x="199" y="55" width="46" height="31" rx="6" fill="#fff" />
                  <path d="M245 64 l15 -9 v23 l-15 -9 z" fill="#fff" />
                  <circle cx="222" cy="118" r="15" fill="#fdce3f" />
                  <path d="M216 118 l4 4 l7 -8" stroke="#16181f" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="248" y="116" width="42" height="11" rx="5" fill="#c9ccd6" />
                  <rect x="241" y="110" width="15" height="22" rx="4" fill="#9aa0ad" />
                </svg>
              )}
            <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6, background: '#fff', borderRadius: 999, padding: '6px 11px', boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}><span>{'\u{1F6E1}'}</span><span style={{ fontSize: 11.5, fontWeight: 700 }}>Identidad verificada</span></div>
            <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', alignItems: 'center', gap: 6, background: '#16181f', color: '#fff', borderRadius: 999, padding: '6px 11px' }}><span>{'\u{1F3A5}'}</span><span style={{ fontSize: 11.5, fontWeight: 700 }}>Cotiza por video</span></div>
          </div>

          <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
            <div style={{ flex: 1, ...card, textAlign: 'center' }}><div style={{ fontSize: 19 }}>{'\u{1F6E1}'}</div><div style={{ fontSize: 11, color: '#41434d', fontWeight: 600, marginTop: 2 }}>Verificación 1 a 1</div></div>
            <div style={{ flex: 1, ...card, textAlign: 'center' }}><div style={{ fontSize: 19 }}>{'\u{1F512}'}</div><div style={{ fontSize: 11, color: '#41434d', fontWeight: 600, marginTop: 2 }}>Pago protegido</div></div>
            <div style={{ flex: 1, ...card, textAlign: 'center' }}><div style={{ fontSize: 19 }}>{'\u{1F680}'}</div><div style={{ fontSize: 11, color: '#41434d', fontWeight: 600, marginTop: 2 }}>Lanzamiento 2026</div></div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 11 }}>Cómo funciona</div>
            {[['1', 'Busca el oficio que necesitas'], ['2', 'Manda un video y recibe presupuesto'], ['3', 'Agenda y paga protegido en la app']].map(function (p) {
              return (
                <div key={p[0]} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 999, background: '#fdece7', color: '#c0341a', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{p[0]}</div>
                  <span style={{ fontSize: 13.5, color: '#41434d' }}>{p[1]}</span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 11 }}>Por qué confiar</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              <div style={chip}><span>{'\u{1FAAA}'}</span><span>Carnet verificado</span></div>
              <div style={chip}><span>{'\u{1F512}'}</span><span>Pago protegido</span></div>
              <div style={chip}><span>{'\u{1F9FE}'}</span><span>Precios claros</span></div>
              <div style={chip}><span>{'\u{1F4AC}'}</span><span>Chat en la app</span></div>
            </div>
          </div>

          <a href="/maestros" style={{ textDecoration: 'none' }}>
            <div style={{ marginTop: 18, background: '#16181f', borderRadius: 14, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 11 }}>
              <span style={{ fontSize: 20 }}>{'\u{1F9F0}'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#fff', fontWeight: 800 }}>¿Eres maestro?</div>
                <div style={{ fontSize: 11, color: '#a9adb8' }}>Súmate gratis y recibe trabajos.</div>
              </div>
              <span style={{ background: '#ff5a3c', color: '#fff', fontSize: 12, fontWeight: 800, borderRadius: 10, padding: '8px 12px' }}>Quiero unirme</span>
            </div>
          </a>

          <div style={{ marginTop: 22 }}>
            {!aviso ? (
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 800, textAlign: 'center', margin: '0 0 10px' }}>¿Quieres ser de los primeros en probarla?</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={correo} onChange={function (e) { setCorreo(e.target.value); }} placeholder="Tu correo" style={{ flex: 1, padding: 13, borderRadius: 12, border: '1.5px solid #e4e4ea', fontSize: 14, boxSizing: 'border-box' }} />
                  <button onClick={function () { if (correo.indexOf('@') > 0) setAviso(true); }} style={{ background: '#16181f', color: '#fff', border: 'none', borderRadius: 12, padding: '0 18px', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Avísenme</button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 14, fontWeight: 800, background: '#f2fbf6', color: '#0d9456', borderRadius: 12, padding: 14, textAlign: 'center' }}>{'\u{1F389} ¡Listo! Te avisaremos apenas esté disponible.'}</p>
            )}
            <div style={{ textAlign: 'center', fontSize: 11, color: '#b3b6bf', marginTop: 12 }}>Santiago, Chile · 2026</div>
          </div>

        </div>
      </div>
    </main>
  );
}
