'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

// Acceso para MAESTROS (ruta /maestros): crear cuenta o ingresar.
// Es el "metodo de registro" del maestro. La app de clientes queda aparte.
export default function AccesoMaestro() {
  const [modo, setModo] = useState('crear'); // 'crear' | 'entrar'
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState(null);
  const [ok, setOk] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [acepta, setAcepta] = useState(false);

  function crear() {
    if (!acepta) { setMsg('Para crear tu cuenta debes aceptar los Términos y la política de tolerancia cero.'); return; }
    if (!nombre.trim()) { setMsg('Escribe tu nombre'); return; }
    if (email.indexOf('@') < 1) { setMsg('Escribe un correo válido'); return; }
    if (pass.length < 6) { setMsg('La contraseña debe tener al menos 6 caracteres'); return; }
    setCargando(true);
    setMsg('Creando tu cuenta...');
    supabase.auth.signUp({
      email: email.trim(),
      password: pass,
      options: { data: { nombre: nombre.trim() } }
    }).then(function (r) {
      setCargando(false);
      if (r.error) { setMsg(r.error.message); return; }
      // correo de bienvenida (sin frenar la UI)
      try { fetch('/api/notificar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'bienvenida', email: email.trim(), nombre: nombre.trim(), rol: 'maestro' }) }); } catch (e) {}
      var sesion = r.data ? r.data.session : null;
      if (sesion) { window.location.reload(); return; } // sin confirmacion de correo
      setOk(true); // requiere confirmar correo
    });
  }

  function entrar() {
    if (email.indexOf('@') < 1 || !pass) { setMsg('Escribe tu correo y contraseña'); return; }
    setCargando(true);
    setMsg('Ingresando...');
    supabase.auth.signInWithPassword({ email: email.trim(), password: pass }).then(function (r) {
      setCargando(false);
      if (r.error) { setMsg(r.error.message); return; }
      window.location.reload();
    });
  }

  function conGoogle() {
    if (!acepta) { setMsg('Para continuar debes aceptar los Términos y la política de tolerancia cero.'); return; }
    supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } });
  }

  function recuperar() {
    var em = (email || '').trim();
    if (em.indexOf('@') < 1) { setMsg('Escribe tu correo arriba y vuelve a tocar "¿Olvidaste tu contraseña?".'); return; }
    setMsg('Enviando correo de recuperación...');
    supabase.auth.resetPasswordForEmail(em, { redirectTo: (typeof window !== 'undefined' ? window.location.origin : '') + '/recuperar' }).then(function (r) {
      if (r.error) setMsg('Error: ' + r.error.message);
      else setMsg('Te enviamos un correo para recuperar tu contraseña. Ábrelo y sigue el enlace.');
    });
  }
  function conApple() {
    if (!acepta) { setMsg('Para continuar debes aceptar los Términos y la política de tolerancia cero.'); return; }
    supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: window.location.href } });
  }

  var wrap = { minHeight: '100vh', background: 'linear-gradient(160deg,#13224a 0%,#0e1a38 55%,#0a1430 100%)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '46px 22px 36px', boxSizing: 'border-box', textAlign: 'center' };
  var inp = { width: '100%', padding: 13, borderRadius: 12, border: 'none', fontSize: 14, marginBottom: 9, boxSizing: 'border-box', color: '#1c1f2b' };
  var btnP = { width: '100%', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12, padding: 13, fontWeight: 800, fontSize: 15, cursor: 'pointer', marginBottom: 9 };
  var btnG = { width: '100%', background: '#fff', color: '#1c1f2b', border: 'none', borderRadius: 12, padding: 13, fontWeight: 800, fontSize: 14, cursor: 'pointer' };
  var feat = { display: 'flex', alignItems: 'center', gap: 11, background: 'rgba(255,255,255,.10)', borderRadius: 12, padding: '11px 13px', textAlign: 'left', fontSize: 13.5, fontWeight: 600 };

  if (ok) return (
    <main>
      <div style={wrap}>
        <div style={{ fontSize: 50, marginTop: 30 }}>{'\u{1F4E9}'}</div>
        <h1 style={{ fontSize: 24, margin: '16px 0 8px', fontWeight: 900 }}>Revisa tu correo</h1>
        <p style={{ fontSize: 15, opacity: .92, maxWidth: 400 }}>Te enviamos un enlace de confirmación a <b>{email}</b>. Ábrelo y vuelve aquí para completar tu ficha de maestro.</p>
        <button onClick={function () { setOk(false); setModo('entrar'); setMsg(null); }} style={{ ...btnG, maxWidth: 360, marginTop: 22 }}>Ya confirmé, ingresar</button>
      </div>
    </main>
  );

  return (
    <main>
      <div style={wrap}>
        <span style={{ display: 'inline-block', background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 999, padding: '6px 16px', fontWeight: 800, letterSpacing: 1.5, fontSize: 12 }}>{'\u{1F6E0} MODO MAESTRO'}</span>
        <div style={{ fontSize: 46, marginTop: 18 }}>{'\u{1F9F0}'}</div>
        <h1 style={{ fontSize: 27, lineHeight: 1.15, margin: '12px 0 6px', fontWeight: 900 }}>Ofrece tus servicios<br />en MaestrosEnLínea</h1>
        <p style={{ fontSize: 14.5, opacity: .9, maxWidth: 420, margin: '4px 0 22px' }}>Crea tu ficha, recibe solicitudes de presupuesto y consigue más trabajos cerca de ti.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 400, marginBottom: 24 }}>
          <div style={feat}><span style={{ fontSize: 19 }}>{'\u{1F4F9}'}</span><span>Recibe presupuestos por video</span></div>
          <div style={feat}><span style={{ fontSize: 19 }}>{'\u{1F4CD}'}</span><span>Aparece ante clientes cerca de ti</span></div>
          <div style={feat}><span style={{ fontSize: 19 }}>{'\u{1F6E1}'}</span><span>Verifícate y gana la confianza de los clientes</span></div>
        </div>

        <div style={{ background: 'rgba(255,255,255,.96)', borderRadius: 18, padding: 18, width: '100%', maxWidth: 400, color: '#1c1f2b' }}>
          <div style={{ display: 'flex', background: '#eef1f6', borderRadius: 12, padding: 4, marginBottom: 14 }}>
            <button onClick={function () { setModo('crear'); setMsg(null); }} style={{ flex: 1, border: 'none', borderRadius: 9, padding: '9px 0', fontWeight: 800, fontSize: 13.5, cursor: 'pointer', background: modo === 'crear' ? '#fff' : 'transparent', color: modo === 'crear' ? '#2563eb' : '#7c8499', boxShadow: modo === 'crear' ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>Crear cuenta</button>
            <button onClick={function () { setModo('entrar'); setMsg(null); }} style={{ flex: 1, border: 'none', borderRadius: 9, padding: '9px 0', fontWeight: 800, fontSize: 13.5, cursor: 'pointer', background: modo === 'entrar' ? '#fff' : 'transparent', color: modo === 'entrar' ? '#2563eb' : '#7c8499', boxShadow: modo === 'entrar' ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>Ya tengo cuenta</button>
          </div>

          {modo === 'crear' && (
            <input value={nombre} onChange={function (e) { setNombre(e.target.value); }} placeholder="Tu nombre y apellido" style={inp} />
          )}
          <input value={email} onChange={function (e) { setEmail(e.target.value); }} placeholder="Correo" type="email" style={inp} />
          <input value={pass} onChange={function (e) { setPass(e.target.value); }} placeholder="Contraseña" type="password" style={inp} />
          {modo === 'entrar' && <div style={{ textAlign: 'right', margin: '-2px 0 8px' }}><button onClick={recuperar} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}>¿Olvidaste tu contraseña?</button></div>}

          {msg && <p style={{ fontSize: 12.5, color: '#b3261e', margin: '2px 0 10px', textAlign: 'left' }}>{msg}</p>}

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, textAlign: 'left', background: '#f6f8fc', border: '1.5px solid ' + (acepta ? '#2563eb' : '#e1e6ef'), borderRadius: 12, padding: '11px 12px', marginBottom: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={acepta} onChange={function (e) { setAcepta(e.target.checked); }} style={{ width: 20, height: 20, marginTop: 1, flexShrink: 0, accentColor: '#2563eb' }} />
            <span style={{ fontSize: 12, lineHeight: 1.45, color: '#3a4256' }}>Acepto los <a href="/terminos" target="_blank" style={{ color: '#2563eb', fontWeight: 700 }}>Términos y Condiciones</a> y la <b>política de tolerancia cero</b>: no se permite contenido ofensivo ni usuarios abusivos. El contenido objetable y las cuentas que incumplan serán removidos.</span>
          </label>

          {modo === 'crear'
            ? <button onClick={crear} disabled={cargando} style={{ ...btnP, opacity: cargando ? 0.6 : 1 }}>Crear mi cuenta de maestro</button>
            : <button onClick={entrar} disabled={cargando} style={{ ...btnP, opacity: cargando ? 0.6 : 1 }}>Ingresar</button>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 10px' }}>
            <div style={{ flex: 1, height: 1, background: '#e4e4ef' }} /><span style={{ fontSize: 11, color: '#9aa1b5' }}>o</span><div style={{ flex: 1, height: 1, background: '#e4e4ef' }} />
          </div>
          <button onClick={conGoogle} style={btnG}>{'\u{1F310} Continuar con Google'}</button>
          <button onClick={conApple} style={{ width: '100%', background: '#000', color: '#fff', border: 'none', borderRadius: 12, padding: 13, fontWeight: 800, fontSize: 14, cursor: 'pointer', marginTop: 9 }}>{'\u{F8FF} Continuar con Apple'}</button>
        </div>

        <a href="/" style={{ marginTop: 22, color: 'rgba(255,255,255,.65)', fontWeight: 700, fontSize: 12.5, textDecoration: 'none' }}>← Volver a la app de clientes</a>
      </div>
    </main>
  );
}
