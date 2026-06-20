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
  const [noLeidos, setNoLeidos] = useState(0); // mensajes de clientes sin leer (badge)

  useEffect(function () {
    supabase.auth.getUser().then(function (r) {
      if (r.data && r.data.user) setUsuario(r.data.user);
      setCargado(true);
    });
  }, []);

  useEffect(function () {
    if (!usuario) return;
    function contar() {
      supabase.from('mensajes').select('id', { count: 'exact', head: true })
        .eq('maestro_id', usuario.id).eq('autor_rol', 'cliente').eq('leido', false)
        .then(function (r) { setNoLeidos(r.count || 0); });
    }
    contar();
    var iv = setInterval(contar, 20000);
    return function () { clearInterval(iv); };
  }, [usuario, pestana]);

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
        <span className="ti" style={{ position: 'relative', display: 'inline-block' }}>
          {props.icono}
          {props.badge > 0 && <span style={{ position: 'absolute', top: -5, right: -11, background: '#2563eb', color: '#fff', fontSize: 9, fontWeight: 800, borderRadius: 999, minWidth: 15, height: 15, lineHeight: '15px', padding: '0 3px', textAlign: 'center', boxSizing: 'border-box' }}>{props.badge > 9 ? '9+' : props.badge}</span>}
        </span>
        {props.nombre}
      </div>
    );
  }

  return (
    <main>
      {pestana === 'perfil' && (
        <div>
          <CabeceraMaestro usuario={usuario} />
          <div className="body" style={{ paddingTop: 12, paddingBottom: 0 }}>
            <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, background: '#0f1320', borderRadius: 16, padding: '14px 15px' }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Cambiar a modo Cliente</div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.6)' }}>Busca y contrata maestros</div>
              </div>
              <span style={{ color: '#fff', fontSize: 20 }}>{'\u203A'}</span>
            </a>
          </div>
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
        <Tab id="perfil" icono={<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto' }}><path d="M20 21a8 8 0 1 0-16 0" /><circle cx="12" cy="7" r="4" /></svg>} nombre="Perfil" />
        <Tab id="solicitudes" icono={<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto' }}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></svg>} nombre="Cotizaciones" badge={noLeidos} />
        <Tab id="agenda" icono={<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto' }}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></svg>} nombre="Agenda" />
        <Tab id="ganancias" icono={<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto' }}><path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>} nombre="Ganancias" />
      </div>
    </main>
  );
}
