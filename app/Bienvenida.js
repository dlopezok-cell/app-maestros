'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

// Pantalla "PRONTO" para el público general (la app está habilitada solo para el dueño).
// Incluye un acceso discreto para que el dueño inicie sesión y entre a la app real.
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

  var wrap = { minHeight: '100vh', background: 'linear-gradient(160deg,#ff7a45 0%,#ff5a3c 55%,#e2391c 100%)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '54px 22px 40px', boxSizing: 'border-box', textAlign: 'center' };
  var chip = { display: 'inline-block', background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.35)', borderRadius: 999, padding: '6px 16px', fontWeight: 800, letterSpacing: 2, fontSize: 13 };
  var feat = { display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,.12)', borderRadius: 14, padding: '13px 15px', textAlign: 'left', fontSize: 14, fontWeight: 600 };

  return (
    <main>
      <div style={wrap}>
        <span style={chip}>PRONTO</span>
        <div style={{ fontSize: 54, marginTop: 22 }}>{'\u{1F6E0}'}</div>
        <h1 style={{ fontSize: 30, lineHeight: 1.15, margin: '14px 0 6px', fontWeight: 900 }}>Todo en el mismo lugar<br />para tus reparaciones</h1>
        <p style={{ fontSize: 16, opacity: .95, margin: '0 0 4px', fontWeight: 700 }}>MaestrosEnLínea</p>
        <p style={{ fontSize: 15, opacity: .92, maxWidth: 440, margin: '6px 0 26px' }}>
          La primera app chilena que une clientes y maestros de verdad: encuentra al experto, pide tu presupuesto por video y agenda — todo desde tu teléfono.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 420 }}>
          <div style={feat}><span style={{ fontSize: 22 }}>{'\u{1F50D}'}</span><span>Encuentra maestros verificados cerca de ti</span></div>
          <div style={feat}><span style={{ fontSize: 22 }}>{'\u{1F3A5}'}</span><span>Pide presupuesto por video, sin compromiso</span></div>
          <div style={feat}><span style={{ fontSize: 22 }}>{'\u{1F4C5}'}</span><span>Agenda y paga protegido en la misma app</span></div>
          <div style={feat}><span style={{ fontSize: 22 }}>{'\u{2B50}'}</span><span>Opiniones reales y precios claros</span></div>
        </div>

        <div style={{ marginTop: 30, width: '100%', maxWidth: 420 }}>
          {!aviso ? (
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, margin: '0 0 10px' }}>¿Quieres ser de los primeros en probarla?</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={correo} onChange={function (e) { setCorreo(e.target.value); }} placeholder="Tu correo" style={{ flex: 1, padding: 13, borderRadius: 12, border: 'none', fontSize: 14 }} />
                <button onClick={function () { if (correo.indexOf('@') > 0) setAviso(true); }} style={{ background: '#1c1f2b', color: '#fff', border: 'none', borderRadius: 12, padding: '0 18px', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Avísenme</button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 15, fontWeight: 800, background: 'rgba(255,255,255,.15)', borderRadius: 12, padding: 14 }}>{'\u{1F389} ¡Listo! Te avisaremos apenas esté disponible.'}</p>
          )}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 34, width: '100%', maxWidth: 420 }}>
          {!login ? (
            <button onClick={function () { setLogin(true); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Acceso del equipo</button>
          ) : (
            <div style={{ background: 'rgba(255,255,255,.14)', borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Acceso del equipo</div>
              <input value={email} onChange={function (e) { setEmail(e.target.value); }} placeholder="Correo" style={{ width: '100%', padding: 12, borderRadius: 11, border: 'none', fontSize: 14, marginBottom: 8, boxSizing: 'border-box' }} />
              <input type="password" value={pass} onChange={function (e) { setPass(e.target.value); }} placeholder="Contraseña" style={{ width: '100%', padding: 12, borderRadius: 11, border: 'none', fontSize: 14, marginBottom: 8, boxSizing: 'border-box' }} />
              {msg && <p style={{ fontSize: 12, margin: '0 0 8px' }}>{msg}</p>}
              <button onClick={entrar} style={{ width: '100%', background: '#1c1f2b', color: '#fff', border: 'none', borderRadius: 11, padding: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer', marginBottom: 8 }}>Ingresar</button>
              <button onClick={conGoogle} style={{ width: '100%', background: '#fff', color: '#1c1f2b', border: 'none', borderRadius: 11, padding: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>{'\u{1F310} Continuar con Google'}</button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
