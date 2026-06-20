'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function Recuperar() {
  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(false);
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [msg, setMsg] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(function () {
    var sub = supabase.auth.onAuthStateChange(function (event, session) {
      if (session && session.user) setReady(true);
    });
    supabase.auth.getSession().then(function (r) { if (r.data && r.data.session) setReady(true); });
    return function () { try { sub.data.subscription.unsubscribe(); } catch (e) {} };
  }, []);

  function guardar() {
    if (!pass || pass.length < 6) { setMsg('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (pass !== pass2) { setMsg('Las contraseñas no coinciden.'); return; }
    setGuardando(true); setMsg(null);
    supabase.auth.updateUser({ password: pass }).then(function (r) {
      setGuardando(false);
      if (r.error) { setMsg('Error: ' + r.error.message); return; }
      setOk(true);
    });
  }

  var wrap = { minHeight: '100vh', background: 'linear-gradient(160deg,#13224a 0%,#0e1a38 55%,#0a1430 100%)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 22px', boxSizing: 'border-box', textAlign: 'center' };
  var inp = { width: '100%', padding: 13, borderRadius: 12, border: '1.5px solid #e4e4ef', fontSize: 16, marginBottom: 10, boxSizing: 'border-box', color: '#1c1f2b' };
  var card = { background: '#fff', borderRadius: 18, padding: 20, width: '100%', maxWidth: 380, color: '#1c1f2b', boxSizing: 'border-box' };
  var btn = { width: '100%', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12, padding: 13, fontWeight: 800, fontSize: 15, cursor: 'pointer' };

  return (
    <div style={wrap}>
      <div style={{ fontSize: 30, marginBottom: 8 }}>{'\u{1F510}'}</div>
      <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 18px' }}>Recuperar contraseña</h1>
      <div style={card}>
        {ok ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 34 }}>{'✅'}</div>
            <p style={{ fontSize: 15, fontWeight: 800, margin: '8px 0 4px' }}>¡Listo! Tu contraseña fue actualizada.</p>
            <p style={{ fontSize: 13, color: '#7c8499', margin: '0 0 16px' }}>Ya puedes ingresar con tu nueva contraseña.</p>
            <a href="/" style={{ textDecoration: 'none', display: 'block', background: '#2563eb', color: '#fff', borderRadius: 12, padding: 13, fontWeight: 800, fontSize: 14, marginBottom: 9 }}>Ir a la app de clientes</a>
            <a href="/maestros" style={{ textDecoration: 'none', display: 'block', background: '#fff', color: '#2563eb', border: '1.5px solid #dbe7fb', borderRadius: 12, padding: 13, fontWeight: 800, fontSize: 14 }}>Ir a la app de maestros</a>
          </div>
        ) : ready ? (
          <div>
            <p style={{ fontSize: 13, color: '#7c8499', margin: '0 0 14px' }}>Escribe tu nueva contraseña.</p>
            <input type="password" value={pass} onChange={function (e) { setPass(e.target.value); }} placeholder="Nueva contraseña" style={inp} />
            <input type="password" value={pass2} onChange={function (e) { setPass2(e.target.value); }} placeholder="Repite la contraseña" style={inp} />
            {msg && <p style={{ fontSize: 12.5, color: '#b3261e', margin: '2px 0 10px', textAlign: 'left' }}>{msg}</p>}
            <button onClick={guardar} disabled={guardando} style={{ ...btn, opacity: guardando ? 0.6 : 1 }}>{guardando ? 'Guardando...' : 'Guardar contraseña'}</button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 14, color: '#1c1f2b', margin: '0 0 6px', fontWeight: 700 }}>Abre el enlace desde tu correo</p>
            <p style={{ fontSize: 13, color: '#7c8499', margin: 0 }}>Para cambiar tu contraseña, toca el botón del correo de recuperación que te enviamos. Si no llegó, revisa spam o pídelo de nuevo desde el login.</p>
          </div>
        )}
      </div>
    </div>
  );
}
