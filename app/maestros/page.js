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
          <Verificacion usuario={usuario} />
          <GaleriaMaestro usuario={usuario} />
          <RegistroMaestro usuario={usuario} />
          <div className="body" style={{ paddingTop: 4, paddingBottom: 90 }}>
            <button className="gbtn full" style={{ background: '#fff', color: '#b3261e', border: '1.5px solid #f0c8c2', boxShadow: 'none' }} onClick={salir}>Cerrar sesión</button>
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
