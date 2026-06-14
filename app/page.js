'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PresupuestoCliente from './PresupuestoCliente';
import PerfilCliente from './PerfilCliente';

// App del CLIENTE (ruta /). Inicio con maestros reales -> ficha -> pedir presupuesto.
// Pestañas: Inicio · Cotizar (PresupuestoCliente) · Cuenta (PerfilCliente).
const EMO = { gasfiteria: '\u{1F6B0}', electricidad: '⚡', cerrajeria: '\u{1F511}', pintura: '\u{1F3A8}', calefont: '\u{1F525}', limpieza: '\u{1F9F9}' };
const GRAD = ['linear-gradient(150deg,#3b6ef0,#7fa8ff)', 'linear-gradient(150deg,#e9842f,#ffc06b)', 'linear-gradient(150deg,#11a36c,#6fe0ae)', 'linear-gradient(150deg,#7048e8,#a78bfa)', 'linear-gradient(150deg,#d6336c,#f783ac)', 'linear-gradient(150deg,#0e7490,#5eead4)'];

export default function Home() {
  const [vista, setVista] = useState('inicio');
  const [usuario, setUsuario] = useState(null);
  const [cargado, setCargado] = useState(false);
  const [maestros, setMaestros] = useState([]);
  const [cats, setCats] = useState([]);
  const [oficio, setOficio] = useState(null);
  const [sel, setSel] = useState(null);
  const [gIdx, setGIdx] = useState(-1);
  const [destinoLogin, setDestinoLogin] = useState('cuenta');
  const [authTab, setAuthTab] = useState('ingresar');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [authMsg, setAuthMsg] = useState(null);

  useEffect(function () {
    supabase.auth.getUser().then(function (r) { setUsuario((r.data && r.data.user) || null); setCargado(true); });
    supabase.from('catalogos').select('valor, slug').eq('tipo', 'especialidad').eq('activo', true).order('orden', { ascending: true })
      .then(function (r) { setCats(r.data || []); });
    supabase.from('maestros').select('id, oficio, oficios, descripcion, rating_promedio, total_trabajos, foto_url, galeria, precio_videollamada, precio_visita, comuna, region, verificado, perfiles(nombre, avatar_url)')
      .then(function (r) { setMaestros(r.data || []); });
  }, []);

  function entrar() {
    setAuthMsg('Procesando...');
    var fn = authTab === 'ingresar'
      ? supabase.auth.signInWithPassword({ email: email.trim(), password: pass })
      : supabase.auth.signUp({ email: email.trim(), password: pass });
    fn.then(function (r) {
      if (r.error) { setAuthMsg(r.error.message); return; }
      if (authTab === 'crear' && (!r.data.session)) { setAuthMsg('Te enviamos un correo para confirmar tu cuenta. Ábrelo y vuelve a ingresar.'); return; }
      setUsuario(r.data.user); setAuthMsg(null); setVista(destinoLogin); window.scrollTo(0, 0);
    });
  }
  function conGoogle() {
    supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined } });
  }
  function salir() { supabase.auth.signOut().then(function () { setUsuario(null); setVista('inicio'); }); }

  function nombreM(m) { return (m.perfiles && m.perfiles.nombre) || 'Maestro'; }
  function fotoM(m) { return m.foto_url || (m.perfiles && m.perfiles.avatar_url) || null; }
  function oficiosM(m) { return m.oficios && m.oficios.length ? m.oficios : (m.oficio ? [m.oficio] : []); }
  function ofNombre(slug) { var c = cats.filter(function (x) { return x.slug === slug; })[0]; return c ? c.valor : (slug || ''); }
  function plata(n) { return '$' + (n || 0).toLocaleString('es-CL'); }

  function abrirFicha(m) { setSel(m); setGIdx(-1); setVista('ficha'); window.scrollTo(0, 0); }
  function irTab(v) {
    if ((v === 'cotizar' || v === 'cuenta') && !usuario) { setDestinoLogin(v); setVista('acceso'); window.scrollTo(0, 0); return; }
    setVista(v); window.scrollTo(0, 0);
  }
  function pedir(m) { if (!usuario) { setDestinoLogin('cotizar'); setVista('acceso'); window.scrollTo(0, 0); return; } setVista('cotizar'); window.scrollTo(0, 0); }

  var maestrosFlat = maestros.map(function (m) { return { id: m.id, nombre: nombreM(m), oficio: m.oficio, rating: m.rating_promedio || '—' }; });
  var lista = maestros.filter(function (m) { return !oficio || oficiosM(m).indexOf(oficio) >= 0; });

  function Nav() {
    return (
      <div className="tabbar">
        <div className={'tab' + (vista === 'inicio' || vista === 'ficha' ? ' on' : '')} onClick={function () { irTab('inicio'); }}><span className="ti">{'\u{1F3E0}'}</span>Inicio</div>
        <div className={'tab' + (vista === 'cotizar' ? ' on' : '')} onClick={function () { irTab('cotizar'); }}><span className="ti">{'\u{1F3A5}'}</span>Cotizar</div>
        <div className={'tab' + (vista === 'cuenta' ? ' on' : '')} onClick={function () { irTab('cuenta'); }}><span className="ti">{'\u{1F464}'}</span>Cuenta</div>
      </div>
    );
  }

  function Avatar(props) {
    var m = props.m, sz = props.size || 56;
    var f = fotoM(m);
    return f
      ? <img src={f} alt="" style={{ width: sz, height: sz, borderRadius: '50%', objectFit: 'cover' }} />
      : <div style={{ width: sz, height: sz, borderRadius: '50%', background: GRAD[(nombreM(m).charCodeAt(0) || 0) % 6], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: sz * 0.4 }}>{nombreM(m).charAt(0).toUpperCase()}</div>;
  }

  if (!cargado) return <main><div className="body" style={{ paddingTop: 30 }}><p>Cargando...</p></div></main>;

  // ---- ACCESO (login del cliente) ----
  if (vista === 'acceso') return (
    <main>
      <div className="darkhead" style={{ textAlign: 'center', paddingBottom: 20 }}>
        <div className="dh1">{'\u{1F44B} Tu cuenta'}</div>
        <h2 style={{ margin: '8px 0 2px' }}>Ingresa o crea tu cuenta</h2>
        <div className="dh2">Para pedir presupuestos y agendar</div>
      </div>
      <div className="body" style={{ paddingTop: 18 }}>
        <div style={{ display: 'flex', background: '#fff', borderRadius: 14, padding: 4, marginBottom: 16, border: '1.5px solid #eee' }}>
          <button onClick={function () { setAuthTab('ingresar'); setAuthMsg(null); }} style={{ flex: 1, padding: 11, borderRadius: 11, border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer', background: authTab === 'ingresar' ? '#ff5a3c' : '#fff', color: authTab === 'ingresar' ? '#fff' : '#7c8499' }}>Ingresar</button>
          <button onClick={function () { setAuthTab('crear'); setAuthMsg(null); }} style={{ flex: 1, padding: 11, borderRadius: 11, border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer', background: authTab === 'crear' ? '#ff5a3c' : '#fff', color: authTab === 'crear' ? '#fff' : '#7c8499' }}>Crear cuenta</button>
        </div>
        <input value={email} onChange={function (e) { setEmail(e.target.value); }} placeholder="tucorreo@ejemplo.cl" style={{ width: '100%', padding: 13, border: '1.5px solid #ddd', borderRadius: 12, fontSize: 14, marginBottom: 10, boxSizing: 'border-box' }} />
        <input type="password" value={pass} onChange={function (e) { setPass(e.target.value); }} placeholder="Contraseña" style={{ width: '100%', padding: 13, border: '1.5px solid #ddd', borderRadius: 12, fontSize: 14, marginBottom: 10, boxSizing: 'border-box' }} />
        {authMsg && <p style={{ fontSize: 13, color: authMsg.indexOf('correo') >= 0 ? '#0d9456' : '#b3261e', margin: '2px 0 8px' }}>{authMsg}</p>}
        <button className="gbtn full" onClick={entrar}>{authTab === 'ingresar' ? 'Ingresar' : 'Crear cuenta'}</button>
        <div style={{ textAlign: 'center', color: '#9aa1b5', fontSize: 12, margin: '8px 0' }}>o</div>
        <button className="gbtn full" style={{ background: '#fff', color: '#1c1f2b', border: '1.5px solid #ddd', boxShadow: 'none' }} onClick={conGoogle}>{'\u{1F310} Continuar con Google'}</button>
        <button onClick={function () { setVista('inicio'); }} style={{ background: 'none', border: 'none', color: '#9aa1b5', fontWeight: 700, fontSize: 13, cursor: 'pointer', width: '100%', marginTop: 10 }}>Volver al inicio</button>
      </div>
      <Nav />
    </main>
  );

  // ---- FICHA del maestro ----
  if (vista === 'ficha' && sel) {
    var ofs = oficiosM(sel).map(ofNombre).join(' · ');
    var gal = sel.galeria || [];
    return (
      <main>
        <div className="dhero" style={{ background: GRAD[(nombreM(sel).charCodeAt(0) || 0) % 6], display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {fotoM(sel) ? <img src={fotoM(sel)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 60, color: '#fff', fontWeight: 800 }}>{nombreM(sel).charAt(0).toUpperCase()}</span>}
          <button className="dback" onClick={function () { setVista('inicio'); }}>{'←'}</button>
        </div>
        <div className="dsheet">
          <h2>{nombreM(sel)}</h2>
          <div className="dmeta">{ofs || 'Maestro'}</div>
          <div className="dbadges">
            {sel.verificado && <span className="dbadge">{'\u{1F6E1} Identidad verificada'}</span>}
            {sel.comuna && <span className="dbadge">{'\u{1F4CD} ' + sel.comuna}</span>}
            <span className="dbadge g">{'● Disponible'}</span>
          </div>
          {sel.descripcion && <p style={{ fontSize: 14, lineHeight: 1.6, color: '#2b2f3a', margin: '12px 0' }}>{sel.descripcion}</p>}
          {gal.length > 0 && (
            <div>
              <div className="seehead"><h3>{'\u{1F4F8} Trabajos realizados'}</h3></div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {gal.map(function (u, i) { return <img key={i} src={u} alt="" onClick={function () { setGIdx(i); }} style={{ height: 130, borderRadius: 12, flexShrink: 0, cursor: 'pointer' }} />; })}
              </div>
            </div>
          )}
          <div style={{ height: 90 }} />
        </div>
        <div className="stickycta">
          <div style={{ flex: 1 }}>
            <div className="p1">{plata(sel.precio_videollamada)} <span style={{ fontWeight: 400, fontSize: 12, color: '#7c8499' }}>diagnóstico</span></div>
            <div className="p2">primera vez gratis</div>
          </div>
          <button className="gbtn" onClick={function () { pedir(sel); }}>{'Pedir presupuesto'}</button>
        </div>
        {gIdx >= 0 && gal[gIdx] && (
          <div onClick={function () { setGIdx(-1); }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.93)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
            <img src={gal[gIdx]} alt="" style={{ maxWidth: '92vw', maxHeight: '85vh', borderRadius: 12, objectFit: 'contain' }} />
          </div>
        )}
        <Nav />
      </main>
    );
  }

  // ---- COTIZAR ----
  if (vista === 'cotizar') return (
    <main>
      <div className="darkhead"><div className="dh1">{'\u{1F3A5} Pedir presupuesto'}</div><h2 style={{ margin: '8px 0 2px' }}>Cuéntanos qué necesitas</h2><div className="dh2">Graba un video, recibe presupuestos y agenda</div></div>
      <div style={{ paddingBottom: 90 }}>
        <PresupuestoCliente usuario={usuario} maestros={maestrosFlat} />
      </div>
      <Nav />
    </main>
  );

  // ---- CUENTA ----
  if (vista === 'cuenta') return (
    <main>
      <div className="darkhead"><div className="dh1">{'\u{1F464} Mi cuenta'}</div><h2 style={{ margin: '8px 0 2px' }}>{(usuario && usuario.email) || ''}</h2></div>
      <div style={{ paddingBottom: 90 }}>
        <PerfilCliente usuario={usuario} />
        <div className="body" style={{ paddingTop: 0 }}>
          <button className="gbtn full" style={{ background: '#fff', color: '#b3261e', border: '1.5px solid #f0c8c2', boxShadow: 'none' }} onClick={salir}>Cerrar sesión</button>
        </div>
      </div>
      <Nav />
    </main>
  );

  // ---- INICIO ----
  return (
    <main>
      <div className="hero">
        <span className="locpill">{'\u{1F4CD} Maestros verificados'}</span>
        <h1>{'Hola \u{1F44B} ¿Qué arreglamos hoy?'}</h1>
        <div className="searchfloat">{'\u{1F50D} Busca por especialidad'}</div>
      </div>
      <div className="body">
        <div className="catscroll">
          <div className="catv2" onClick={function () { setOficio(null); }}>
            <div className={'cico' + (oficio === null ? ' on' : '')}>{'✨'}</div>
            <div className="clbl">Todos</div>
          </div>
          {cats.map(function (c) {
            return (
              <div key={c.slug} className="catv2" onClick={function () { setOficio(c.slug); }}>
                <div className={'cico' + (oficio === c.slug ? ' on' : '')}>{EMO[c.slug] || '\u{1F6E0}'}</div>
                <div className="clbl">{c.valor}</div>
              </div>
            );
          })}
        </div>

        <div className="promo">
          <span style={{ fontSize: 28 }}>{'\u{1F3A5}'}</span>
          <div style={{ flex: 1 }}>
            <div className="pt">Pide presupuesto por video</div>
            <div className="pd">Graba el problema y recibe precios</div>
          </div>
          <button className="cta" onClick={function () { irTab('cotizar'); }}>Empezar</button>
        </div>

        <div className="seehead"><h3>{'\u{1F477} Maestros disponibles'}</h3></div>
        {lista.length === 0 && <p style={{ fontSize: 13, color: '#9aa1b5' }}>Aún no hay maestros de esta especialidad. Prueba con "Todos".</p>}
        <div className="cardscroll">
          {lista.map(function (m, i) {
            return (
              <div key={m.id} className="mcard" onClick={function () { abrirFicha(m); }}>
                <div className="photo" style={{ background: GRAD[i % 6], display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {fotoM(m) ? <img src={fotoM(m)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 40, color: '#fff', fontWeight: 800 }}>{nombreM(m).charAt(0).toUpperCase()}</span>}
                  <span className="ratepill">{'★ ' + (m.rating_promedio || '—') + ' · ' + (m.total_trabajos || 0)}</span>
                </div>
                <div className="minfo">
                  <div className="nm">{nombreM(m)}{sel ? '' : ''}{m.verificado ? ' \u{1F6E1}' : ''}</div>
                  <div className="mt">{oficiosM(m).map(ofNombre).join(' · ') || 'Maestro'}</div>
                  <div className="mt">{'Diagnóstico ' + plata(m.precio_videollamada)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Nav />
    </main>
  );
}
