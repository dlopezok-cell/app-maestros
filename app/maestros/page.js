'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import CabeceraMaestro from '../CabeceraMaestro';
import Verificacion from '../Verificacion';
import RegistroMaestro from '../RegistroMaestro';
import GaleriaMaestro from '../GaleriaMaestro';
import PresupuestosMaestro from '../PresupuestosMaestro';
import AgendaMaestro from '../AgendaMaestro';
import GananciasMaestro from '../GananciasMaestro';
import AccesoMaestro from '../AccesoMaestro';
import ComunicadosBanner from '../ComunicadosBanner';
import EliminarCuenta from '../EliminarCuenta';

// App de MAESTROS (ruta /maestros). Abierta para que cualquier maestro cree su
// cuenta y arme su ficha. Navega por pestañas: Perfil · Solicitudes · Agenda · Ganancias.
export default function Maestros() {
  const [usuario, setUsuario] = useState(null);
  const [cargado, setCargado] = useState(false);
  const [pestana, setPestana] = useState('perfil');

  useEffect(function () {
    supabase.auth.getUser().then(function (r) {
      if (r.data && r.data.user) setUsuario(r.data.user);
      setCargado(true);
    });
  }, []);

  function salir() {
    supabase.auth.signOut().then(function () { setUsuario(null); });
  }

  if (!cargado) return <main><div className="body" style={{ paddingTop: 30 }}><p>Cargando...</p></div></main>;

  // Sin sesion -> pantalla de acceso del maestro (crear cuenta / ingresar)
  if (!usuario) return <AccesoMaestro />;

  function Tab(props) {
    var on = pestana === props.id;
    return (
      <div className={'tab' + (on ? ' on' : '')} onClick={function () { setPestana(props.id); window.scrollTo(0, 0); }}>
        <span className="ti">{props.icono}</span>{props.nombre}
      </div>
    );
  }

  return (
    <main>
      {pestana === 'perfil' && (
        <div>
          <CabeceraMaestro usuario={usuario} />
          <ComunicadosBanner segmento="maestros" />

          {/* Paso 1: Ficha */}
          <div className="body" style={{ paddingTop: 12, paddingBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#ede9fb', color: '#534ab7', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
              <b style={{ fontSize: 15 }}>Tu ficha de maestro</b>
            </div>
            <div style={{ fontSize: 12, color: '#9aa1b5', marginTop: 2 }}>Oficios, descripción, precios y zonas.</div>
          </div>
          <RegistroMaestro usuario={usuario} />

          {/* Paso 2: Galería */}
          <div className="body" style={{ paddingTop: 12, paddingBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#f0f0f3', color: '#5f5e5a', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
              <b style={{ fontSize: 15 }}>Tus trabajos</b>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9aa1b5' }}>opcional</span>
            </div>
            <div style={{ fontSize: 12, color: '#9aa1b5', marginTop: 2 }}>Sube fotos de tus trabajos cuando quieras.</div>
          </div>
          <GaleriaMaestro usuario={usuario} />

          {/* Paso 3: Verificación (al final) */}
          <div className="body" style={{ paddingTop: 12, paddingBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#fdeccd', color: '#b07a1e', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
              <b style={{ fontSize: 15 }}>Verifica tu identidad</b>
            </div>
            <div style={{ fontSize: 12, color: '#9aa1b5', marginTop: 2 }}>El último paso para activar tu sello verificado.</div>
          </div>
          <Verificacion usuario={usuario} />

          <div className="body" style={{ paddingTop: 4, paddingBottom: 90 }}>
            <button className="gbtn full" style={{ background: '#fff', color: '#b3261e', border: '1.5px solid #f0c8c2', boxShadow: 'none' }} onClick={salir}>Cerrar sesión</button>
            <EliminarCuenta redirigir="/maestros" />
            <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12 }}>
              <a href="/privacidad" style={{ color: '#9aa1b5', textDecoration: 'none' }}>Privacidad</a>
              <span style={{ color: '#d4d7e0', margin: '0 8px' }}>·</span>
              <a href="/terminos" style={{ color: '#9aa1b5', textDecoration: 'none' }}>Términos</a>
            </div>
          </div>
        </div>
      )}

      {pestana === 'solicitudes' && (
        <div style={{ paddingBottom: 90 }}>
          <div className="body" style={{ paddingTop: 16, paddingBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>{'\u{1F4CB}'}</span>
              <b style={{ fontSize: 16 }}>Cotizaciones</b>
            </div>
          </div>
          <PresupuestosMaestro usuario={usuario} />
        </div>
      )}

      {pestana === 'agenda' && <div style={{ paddingBottom: 90 }}><AgendaMaestro usuario={usuario} /></div>}

      {pestana === 'ganancias' && <div style={{ paddingBottom: 90 }}><GananciasMaestro usuario={usuario} /></div>}

      <div className="tabbar">
        <Tab id="perfil" icono={'\u{1F6E0}'} nombre="Perfil" />
        <Tab id="solicitudes" icono={'\u{1F4CB}'} nombre="Cotizaciones" />
        <Tab id="agenda" icono={'\u{1F4C5}'} nombre="Agenda" />
        <Tab id="ganancias" icono={'\u{1F4B0}'} nombre="Ganancias" />
      </div>
    </main>
  );
}
