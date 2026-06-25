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
import BandejaMaestro from '../BandejaMaestro';

// App de MAESTROS (ruta /maestros). Abierta para que cualquier maestro cree su
// cuenta y arme su ficha. Navega por pestañas: Perfil · Solicitudes · Agenda · Ganancias.
export default function Maestros() {
  const [usuario, setUsuario] = useState(null);
  const [cargado, setCargado] = useState(false);
  const [pestana, setPestana] = useState('perfil');
  const [noLeidos, setNoLeidos] = useState(0); // mensajes de clientes sin leer (badge)
  const [pedidoDestacado, setPedidoDestacado] = useState(null);
  const [perfilIncompleto, setPerfilIncompleto] = useState(false);

  useEffect(function () {
    supabase.auth.getUser().then(function (r) {
      if (r.data && r.data.user) setUsuario(r.data.user);
      setCargado(true);
    });
  }, []);

  useEffect(function () {
    try {
      var sp = new URLSearchParams(window.location.search);
      var pid = sp.get('pedido');
      // Link del WhatsApp: viene como "<pedido>.<token>" para auto-login del maestro.
      if (pid && pid.indexOf('.') >= 0) {
        var parts = pid.split('.');
        var realPid = parts[0];
        var tok = parts.slice(1).join('.');
        supabase.auth.getSession().then(function (s) {
          var haySesion = s && s.data && s.data.session;
          if (haySesion) {
            localStorage.setItem('mel_pedido_captado', realPid); setPedidoDestacado(realPid);
            try { window.history.replaceState({}, '', '/maestros?pedido=' + realPid); } catch (e2) {}
          } else {
            window.location.replace('/api/wa-login?t=' + encodeURIComponent(tok) + '&pedido=' + encodeURIComponent(realPid));
          }
        });
        return;
      }
      if (pid) { localStorage.setItem('mel_pedido_captado', pid); setPedidoDestacado(pid); }
      else { var sv = localStorage.getItem('mel_pedido_captado'); if (sv) setPedidoDestacado(sv); }
    } catch (e) {}
  }, []);

  useEffect(function () { if (usuario && pedidoDestacado) setPestana('solicitudes'); }, [usuario, pedidoDestacado]);

  useEffect(function () {
    if (!usuario) return;
    supabase.from('maestros').select('descripcion, galeria').eq('id', usuario.id).maybeSingle().then(function (r) {
      if (r.data) {
        var sinDesc = !(r.data.descripcion && r.data.descripcion.trim());
        var sinGal = !(r.data.galeria && r.data.galeria.length);
        setPerfilIncompleto(sinDesc || sinGal);
      }
    });
  }, [usuario, pestana]);

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

  function tabStM(on) { return { flex: 'none', width: 62, textAlign: 'center', fontSize: 10, fontWeight: 700, color: on ? '#2563eb' : '#9aa1b5', cursor: 'pointer' }; }
  function icoM(d, on) { return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={on ? '#2563eb' : '#9aa1b5'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto 4px' }}>{d}</svg>; }

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
          {perfilIncompleto && (
            <div className="body" style={{ paddingTop: 10, paddingBottom: 0 }}>
              <div onClick={function () { setPestana('perfil'); window.scrollTo(0, 0); }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: '#fff4e5', border: '1.5px solid #f0a020', borderRadius: 14, padding: '12px 14px' }}>
                <span style={{ fontSize: 18 }}>{'\u2728'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#9a5b00' }}>Completa tu perfil para ganar más pegas</div>
                  <div style={{ fontSize: 11.5, color: '#b35900', marginTop: 2 }}>Sube fotos de tus trabajos y verifícate. Toca para ir a Perfil.</div>
                </div>
                <span style={{ color: '#9a5b00', fontSize: 18 }}>{'\u203A'}</span>
              </div>
            </div>
          )}
          <PresupuestosMaestro usuario={usuario} pedidoDestacado={pedidoDestacado} />
        </div>
      )}

      {pestana === 'agenda' && <div style={{ paddingBottom: 90 }}><AgendaMaestro usuario={usuario} /></div>}

      {pestana === 'ganancias' && <div style={{ paddingBottom: 90 }}><GananciasMaestro usuario={usuario} /></div>}

      {pestana === 'mensajes' && <div style={{ paddingBottom: 90 }}><BandejaMaestro usuario={usuario} /></div>}

      <div className="tabbar" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around' }}>
          <div style={tabStM(pestana === 'agenda')} onClick={function () { setPestana('agenda'); window.scrollTo(0, 0); }}>
            {icoM(<g><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></g>, pestana === 'agenda')}Agenda
          </div>
          <div style={tabStM(pestana === 'ganancias')} onClick={function () { setPestana('ganancias'); window.scrollTo(0, 0); }}>
            {icoM(<g><path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></g>, pestana === 'ganancias')}Ganancias
          </div>
        </div>
        <div style={{ flex: 'none', width: 70, textAlign: 'center', cursor: 'pointer' }} onClick={function () { setPestana('solicitudes'); window.scrollTo(0, 0); }}>
          <div style={{ width: 54, height: 54, margin: '-28px auto 3px', borderRadius: 18, background: 'linear-gradient(135deg,#22d3ee,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 18px rgba(37,99,235,.45)', border: '4px solid #fff' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></svg>
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: '#2563eb' }}>Cotizaciones</span>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around' }}>
          <div style={tabStM(pestana === 'mensajes')} onClick={function () { setPestana('mensajes'); window.scrollTo(0, 0); }}>
            <span style={{ position: 'relative', display: 'inline-block' }}>
              {icoM(<g><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" /></g>, pestana === 'mensajes')}
              {noLeidos > 0 && <span style={{ position: 'absolute', top: -4, right: 4, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 800, borderRadius: 999, minWidth: 15, height: 15, lineHeight: '15px', padding: '0 3px', textAlign: 'center', boxSizing: 'border-box' }}>{noLeidos > 9 ? '9+' : noLeidos}</span>}
            </span>Mensajes
          </div>
          <div style={tabStM(pestana === 'perfil')} onClick={function () { setPestana('perfil'); window.scrollTo(0, 0); }}>
            {icoM(<g><path d="M20 21a8 8 0 1 0-16 0" /><circle cx="12" cy="7" r="4" /></g>, pestana === 'perfil')}Perfil
          </div>
        </div>
      </div>

      </main>
  );
}
