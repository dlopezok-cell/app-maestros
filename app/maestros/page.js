'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Verificacion from '../Verificacion';
import FotoPerfilMaestro from '../FotoPerfilMaestro';
import PresupuestosMaestro from '../PresupuestosMaestro';
import RegistroMaestro from '../RegistroMaestro';

// App de MAESTROS (ruta /maestros). Separada de la app de clientes.
export default function Maestros() {
  const [usuario, setUsuario] = useState(null);
  const [cargado, setCargado] = useState(false);
  const [authTab, setAuthTab] = useState('ingresar');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [authMsg, setAuthMsg] = useState(null);

  useEffect(function () {
    supabase.auth.getUser().then(function (r) {
      if (r.data && r.data.user) setUsuario(r.data.user);
      setCargado(true);
    });
  }, []);

  function entrar() {
    setAuthMsg('Procesando...');
    var fn = authTab === 'ingresar'
      ? supabase.auth.signInWithPassword({ email: email, password: pass })
      : supabase.auth.signUp({ email: email, password: pass });
    fn.then(function (r) {
      if (r.error) { setAuthMsg(r.error.message); return; }
      setUsuario(r.data.user); setAuthMsg(null);
    });
  }
  function conGoogle() {
    supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/maestros' } });
  }
  function salir() {
    supabase.auth.signOut().then(function () { setUsuario(null); });
  }

  function plata(n) { return '$' + (n || 0).toLocaleString('es-CL'); }
  var desg = { bruto: 28000, comision: Math.round(28000 * .10 * 1.19), pasarela: Math.round(28000 * .0235 * 1.19), retencion: Math.round(28000 * .1525) };
  desg.liquido = desg.bruto - desg.comision - desg.pasarela - desg.retencion;

  if (!cargado) return <main><div className="body" style={{ paddingTop: 30 }}><p>Cargando...</p></div></main>;

  if (!usuario) return (
    <main>
      <div className="darkhead">
        <div className="dh1">{'\u{1F6E0} Modo maestro'}</div>
        <h2>Trabaja con MaestrosEnLínea</h2>
        <div className="dh2">Ingresa o crea tu cuenta de maestro para recibir trabajos</div>
      </div>
      <div className="body" style={{ paddingTop: 18 }}>
        <div style={{ display: 'flex', background: '#fff', borderRadius: 14, padding: 4, marginBottom: 16, border: '1.5px solid #eee' }}>
          <button onClick={function () { setAuthTab('ingresar'); }} style={{ flex: 1, padding: 11, borderRadius: 11, border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer', background: authTab === 'ingresar' ? '#ff5a3c' : '#fff', color: authTab === 'ingresar' ? '#fff' : '#7c8499' }}>Ingresar</button>
          <button onClick={function () { setAuthTab('crear'); }} style={{ flex: 1, padding: 11, borderRadius: 11, border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer', background: authTab === 'crear' ? '#ff5a3c' : '#fff', color: authTab === 'crear' ? '#fff' : '#7c8499' }}>Crear cuenta</button>
        </div>
        <input value={email} onChange={function (e) { setEmail(e.target.value); }} placeholder="tucorreo@ejemplo.cl" style={{ width: '100%', padding: 13, border: '1.5px solid #ddd', borderRadius: 12, fontSize: 14, marginBottom: 10 }} />
        <input type="password" value={pass} onChange={function (e) { setPass(e.target.value); }} placeholder="Contraseña" style={{ width: '100%', padding: 13, border: '1.5px solid #ddd', borderRadius: 12, fontSize: 14, marginBottom: 10 }} />
        {authMsg && <p className="error">{authMsg}</p>}
        <button className="gbtn full" onClick={entrar}>{authTab === 'ingresar' ? 'Ingresar' : 'Crear cuenta'}</button>
        <div style={{ textAlign: 'center', color: '#9aa1b5', fontSize: 12, margin: '6px 0' }}>o</div>
        <button className="gbtn full" style={{ background: '#fff', color: '#1c1f2b', border: '1.5px solid #ddd', boxShadow: 'none' }} onClick={conGoogle}>{'\u{1F310} Continuar con Google'}</button>
        <a href="/" style={{ display: 'block', textAlign: 'center', color: '#9aa1b5', fontWeight: 700, fontSize: 13, marginTop: 16, textDecoration: 'none' }}>¿Eres cliente? Ir a la app de clientes →</a>
      </div>
    </main>
  );

  return (
    <main>
      <div className="darkhead">
        <div className="dh1">{'\u{1F6E0} Modo maestro'}</div>
        <h2>{'Hola ' + (usuario.email || '').split('@')[0]}</h2>
        <div className="dh2">Tu perfil de maestro y tus trabajos</div>
      </div>

      <RegistroMaestro usuario={usuario} />
      <FotoPerfilMaestro usuario={usuario} />
      <Verificacion usuario={usuario} />

      <div className="gaincard">
        <div className="biggain">
          <div className="bg1">EJEMPLO · RECIBES LIQUIDO</div>
          <div className="bg2">{plata(desg.liquido)}</div>
        </div>
        <div className="prow"><span>Precio cotizado al cliente</span><b>{plata(desg.bruto)}</b></div>
        <div className="prow"><span>Comision app (10% + IVA)</span><span className="m">{'-' + plata(desg.comision)}</span></div>
        <div className="prow"><span>Pasarela de pago (2,35% + IVA)</span><span className="m">{'-' + plata(desg.pasarela)}</span></div>
        <div className="prow"><span>Retencion SII honorarios (15,25%)</span><span className="m">{'-' + plata(desg.retencion)}</span></div>
        <div className="prow"><span>Boleta de honorarios</span><b style={{ color: '#0d9456' }}>{'se emite sola ✓'}</b></div>
      </div>

      <PresupuestosMaestro usuario={usuario} />

      <div className="body" style={{ paddingTop: 4, paddingBottom: 34 }}>
        <button className="gbtn full" style={{ background: '#fff', color: '#b3261e', border: '1.5px solid #f0c8c2', boxShadow: 'none' }} onClick={salir}>Cerrar sesión</button>
        <a href="/" style={{ display: 'block', textAlign: 'center', color: '#9aa1b5', fontWeight: 700, fontSize: 13, marginTop: 14, textDecoration: 'none' }}>Ir a la app de clientes →</a>
      </div>
    </main>
  );
}
