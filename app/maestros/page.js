'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Verificacion from '../Verificacion';
import FotoPerfilMaestro from '../FotoPerfilMaestro';
import PresupuestosMaestro from '../PresupuestosMaestro';
import RegistroMaestro from '../RegistroMaestro';
import Bienvenida from '../Bienvenida';

const OWNER = 'dlopezok@gmail.com';

// App de MAESTROS (ruta /maestros). Separada de la app de clientes.
export default function Maestros() {
  const [usuario, setUsuario] = useState(null);
  const [cargado, setCargado] = useState(false);

  useEffect(function () {
    supabase.auth.getUser().then(function (r) {
      if (r.data && r.data.user) setUsuario(r.data.user);
      setCargado(true);
    });
  }, []);

  function salir() {
    supabase.auth.signOut().then(function () { setUsuario(null); });
  }

  function plata(n) { return '$' + (n || 0).toLocaleString('es-CL'); }
  var desg = { bruto: 28000, comision: Math.round(28000 * .10 * 1.19), pasarela: Math.round(28000 * .0235 * 1.19), retencion: Math.round(28000 * .1525) };
  desg.liquido = desg.bruto - desg.comision - desg.pasarela - desg.retencion;

  if (!cargado) return <main><div className="body" style={{ paddingTop: 30 }}><p>Cargando...</p></div></main>;

  if (!usuario || (usuario.email || '').toLowerCase() !== OWNER) return <Bienvenida />;

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

      <div style={{ background: '#fff', borderRadius: 16, padding: 16, margin: '14px 16px', border: '1.5px solid #eee' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 26 }}>{'\u{1F9D1}\u{200D}\u{1F4BB}'}</span>
          <div style={{ flex: 1 }}>
            <b style={{ fontSize: 14 }}>Verificación biométrica (reconocimiento facial)</b>
            <div style={{ fontSize: 12, color: '#7c8499', marginTop: 2 }}>Validación automática de tu rostro contra tu carnet, en segundos. Te da una insignia de mayor confianza.</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#a9710a', background: '#fff3dc', borderRadius: 8, padding: '4px 9px', whiteSpace: 'nowrap' }}>PRONTO</span>
        </div>
      </div>

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
