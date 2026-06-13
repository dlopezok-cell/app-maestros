'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Verificacion from './Verificacion';
import PerfilCliente from './PerfilCliente';
import PresupuestoCliente from './PresupuestoCliente';
import PresupuestosMaestro from './PresupuestosMaestro';

const OFICIOS = [
  { id: null, emoji: '✨', nombre: 'Todos' },
  { id: 'gasfiteria', emoji: '\u{1F6B0}', nombre: 'Gasfiteria' },
  { id: 'electricidad', emoji: '⚡', nombre: 'Electricidad' },
  { id: 'cerrajeria', emoji: '\u{1F511}', nombre: 'Cerrajeria' },
  { id: 'pintura', emoji: '\u{1F3A8}', nombre: 'Pintura' },
  { id: 'calefont', emoji: '\u{1F525}', nombre: 'Calefont' },
  { id: 'limpieza', emoji: '\u{1F9F9}', nombre: 'Limpieza' },
  ];
const GRADS = [
    'linear-gradient(150deg,#3b6ef0,#7fa8ff)',
    'linear-gradient(150deg,#e9842f,#ffc06b)',
    'linear-gradient(150deg,#11a36c,#6fe0ae)',
    'linear-gradient(150deg,#7048e8,#a78bfa)',
    'linear-gradient(150deg,#d6336c,#f783ac)',
    'linear-gradient(150deg,#0e7490,#5eead4)',
  ];
const CARAS = ['\u{1F468}', '\u{1F469}', '\u{1F9D4}', '\u{1F477}', '\u{1F468}', '\u{1F469}'];

export default function Home() {
    const [vista, setVista] = useState('home');
    const [oficio, setOficio] = useState(null);
    const [maestros, setMaestros] = useState([]);
    const [sel, setSel] = useState(null);
    const [selIdx, setSelIdx] = useState(0);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [usuario, setUsuario] = useState(null);
    const [authTab, setAuthTab] = useState('ingresar');
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [authMsg, setAuthMsg] = useState(null);
    const [pagando, setPagando] = useState(false);
    const [volverA, setVolverA] = useState('cliente');

    function pedirLogin(volver) {
          setVolverA(volver);
          setAuthMsg(null);
          setVista('auth');
          window.scrollTo(0, 0);
    }

    function entrar() {
          setAuthMsg('Procesando...');
          const fn = authTab === 'ingresar'
            ? supabase.auth.signInWithPassword({ email: email, password: pass })
                  : supabase.auth.signUp({ email: email, password: pass });
          fn.then(function (r) {
                  if (r.error) { setAuthMsg(r.error.message); return; }
                  setUsuario(r.data.user);
                  setAuthMsg(null);
                  setVista(volverA || 'cliente');
          });
    }
    function conGoogle() {
          supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    }
    function salir() {
          supabase.auth.signOut().then(function () { setUsuario(null); setVista('home'); });
    }

    function pagar(tipo, monto, descripcion, maestroId) {
          if (!usuario) { pedirLogin(vista); return; }
          setPagando(true);
          fetch('/api/pagar', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tipo: tipo, monto: monto, descripcion: descripcion, maestroId: maestroId || null, email: usuario ? usuario.email : null }),
          })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                    if (d.init_point) { window.location.href = d.init_point; }
                    else { alert(d.error || 'No se pudo iniciar el pago'); setPagando(false); }
            })
            .catch(function () { alert('Error de conexión con el pago'); setPagando(false); });
    }

  function cargar(lat, lng) {
        supabase.rpc('maestros_cercanos', { lat: lat, lng: lng, oficio_buscado: null })
          .then(function (r) {
                    if (r.error) setError(r.error.message);
                    else setMaestros(r.data || []);
                    setCargando(false);
          });
  }

  useEffect(function () {
        supabase.auth.getUser().then(function (r) { if (r.data && r.data.user) setUsuario(r.data.user); });
        cargar(-33.43, -70.61);
        if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                          function (pos) { cargar(pos.coords.latitude, pos.coords.longitude); },
                          function () {}
                        );
        }
  }, []);

  function video(id) {
        window.open('https://meet.jit.si/maestros-demo-' + id, '_blank');
  }
    function abrir(m, i) {
          setSel(m); setSelIdx(i); setVista('detalle'); window.scrollTo(0, 0);
    }
    function agendar() {
          if (!usuario) { pedirLogin('video'); return; }
          setVista('video');
    }
    function plata(n) {
          return '$' + (n || 0).toLocaleString('es-CL');
    }

  const lista = maestros.filter(function (m) { return !oficio || m.oficio === oficio; });
    const desg = { bruto: 28000, comision: Math.round(28000 * .10 * 1.19), pasarela: Math.round(28000 * .0235 * 1.19), retencion: Math.round(28000 * .1525) };
    desg.liquido = desg.bruto - desg.comision - desg.pasarela - desg.retencion;

    function Tabs(props) {
          const act = props.act;
          return (
                <div className="tabbar">
                  <div className={'tab' + (act === 'home' ? ' on' : '')} onClick={function () { setVista('home'); }}><span className="ti">{'\u{1F3E0}'}</span>Inicio</div>
                  <div className={'tab' + (act === 'cotizar' ? ' on' : '')} onClick={function () { if (usuario) setVista('presupuesto'); else pedirLogin('presupuesto'); }}><span className="ti">{'\u{1F3A5}'}</span>Cotizar</div>
                  <div className={'tab' + (act === 'cuenta' ? ' on' : '')} onClick={function () { if (usuario) setVista('cuenta'); else pedirLogin('cuenta'); }}><span className="ti">{'\u{1F464}'}</span>Cuenta</div>
                </div>
          );
    }

  if (vista === 'home') return (
        <main>
          <div className="hero">
            <span className="locpill">{'\u{1F4CD} Cerca de ti'}</span>
          <h1>{'Hola \u{1F44B} Que arreglamos hoy?'}</h1>
          <div className="searchfloat">{'\u{1F50D} Prueba "fuga de agua"'}</div>
    </div>
        <div className="body">
            <div className="catscroll">
  {OFICIOS.map(function (o) {
                return (
                                <div key={String(o.id)} className="catv2" onClick={function () { setOficio(o.id); }}>
                                  <div className={'cico' + (oficio === o.id ? ' on' : '')}>{o.emoji}</div>
                               <div className="clbl">{o.nombre}</div>
               </div>
                           );
})}
</div>
        <div className="promo">
            <span style={{ fontSize: 28 }}>{'\u{1F4F9}'}</span>
          <div style={{ flex: 1 }}>
            <div className="pt">Tu primer diagnostico es GRATIS</div>
            <div className="pd">Videollamada con un experto, hoy mismo</div>
  </div>
          <button className="cta" onClick={function () { video('banner'); }}>Probar ahora</button>
  </div>
        <div className="seehead"><h3>{'⚡ Disponibles ahora'}</h3></div>
{cargando && <p>Buscando maestros cerca de ti...</p>}
{error && <p className="error">{error}</p>}
         <div className="cardscroll">
 {lista.map(function (m, i) {
             return (
                           <div key={m.id} className="mcard" onClick={function () { abrir(m, i); }}>
                 <div className="photo" style={{ background: GRADS[i % 6] }}>
           <img src={'https://randomuser.me/api/portraits/' + (i % 2 === 0 ? 'men/' : 'women/') + ((i * 17 + 23) % 90) + '.jpg'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                 <span className="ratepill">{'★ ' + m.rating + ' · ' + m.trabajos}</span>
  </div>
              <div className="minfo">
                  <div className="nm">{m.nombre}</div>
                <div className="mt"><span className="live"></span>{'Disponible · a ' + m.distancia_km + ' km · ' + m.oficio}</div>
                  <div className="mt">{'Diagnostico ' + plata(m.precio_videollamada) + ' · primera vez GRATIS'}</div>
  </div>
  </div>
          );
})}
  </div>
        <div className="seehead"><h3>{'\u{1F3C6} Los mejor puntuados'}</h3></div>
          <div className="cardscroll">
{lista.slice().sort(function (a, b) { return b.rating - a.rating; }).map(function (m, i) {
            return (
                          <div key={'r' + m.id} className="mcard" onClick={function () { abrir(m, i); }}>
                <div className="photo" style={{ background: GRADS[(i + 2) % 6] }}>
                <img src={'https://randomuser.me/api/portraits/' + (i % 2 === 0 ? 'women/' : 'men/') + ((i * 13 + 40) % 90) + '.jpg'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <span className="ratepill">{'★ ' + m.rating}</span>
  </div>
              <div className="minfo">
                  <div className="nm">{m.nombre}</div>
                <div className="mt">{m.oficio + ' · ' + m.trabajos + ' trabajos'}</div>
  </div>
  </div>
          );
})}
</div>
        <div className="seehead"><h3>{'\u{1F4B0} Precios convenientes'}</h3></div>
          <div className="cardscroll">
{lista.slice().sort(function (a, b) { return a.precio_videollamada - b.precio_videollamada; }).map(function (m, i) {
            return (
                          <div key={'p' + m.id} className="mcard" onClick={function () { abrir(m, i); }}>
                <div className="photo" style={{ background: GRADS[(i + 4) % 6] }}>
                <img src={'https://randomuser.me/api/portraits/' + (i % 2 === 0 ? 'men/' : 'women/') + ((i * 11 + 60) % 90) + '.jpg'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <span className="ratepill">{'Desde ' + plata(m.precio_videollamada)}</span>
  </div>
              <div className="minfo">
                  <div className="nm">{m.nombre}</div>
                <div className="mt">{'Diagnostico ' + plata(m.precio_videollamada)}</div>
  </div>
  </div>
          );
})}
</div>
{!cargando && lista.length === 0 && <p>No hay maestros de este oficio todavia.</p>}
  </div>
       <Tabs act="home" />
  </main>
   );

  if (vista === 'detalle' && sel) return (
        <main>
          <div className="dhero" style={{ background: GRADS[selIdx % 6] }}>
{CARAS[selIdx % 6]}
        <button className="dback" onClick={function () { setVista('home'); }}>{'←'}</button>
          </div>
      <div className="dsheet">
                  <h2>{sel.nombre}</h2>
        <div className="dmeta">{sel.oficio + ' · certificado · verificado'}</div>
        <div className="dbadges">
                    <span className="dbadge g">{'● Disponible ahora'}</span>
          <span className="dbadge">{'\u{1F4CD} a ' + sel.distancia_km + ' km'}</span>
          <span className="dbadge">{'\u{1F6E1} Identidad verificada'}</span>
          </div>
        <div className="statgrid">
                    <div className="sg"><div className="v">{'★ ' + sel.rating}</div><div className="k">rating</div></div>
          <div className="sg"><div className="v">{sel.trabajos}</div><div className="k">trabajos</div></div>
          <div className="sg"><div className="v">98%</div><div className="k">a tiempo</div></div>
          <div className="sg"><div className="v">{'<1 h'}</div><div className="k">respuesta</div></div>
          </div>
        <div className="seehead"><h3>Opiniones verificadas</h3></div>
                  <div className="rev2">
                    <b>{'Maria Jose P. ★★★★★'}</b>
          <div className="rverif">{'✓ Trabajo pagado en la app'}</div>
          El diagnostico por video me ahorro la visita. Llego con el repuesto exacto y en 40 minutos estaba listo.
            </div>
        <div className="rev2">
                      <b>{'Rodrigo C. ★★★★★'}</b>
          <div className="rverif">{'✓ Trabajo pagado en la app'}</div>
          El precio final fue exactamente el cotizado por videollamada. Cero sorpresas.
            </div>
            </div>
      <div className="stickycta">
                    <div style={{ flex: 1 }}>
          <div className="p1">{plata(sel.precio_videollamada)} <span style={{ fontWeight: 400, fontSize: 12, color: '#7c8499' }}>videollamada</span></div>
                      <div className="p2">primera vez GRATIS</div>
            </div>
        <button className="gbtn" onClick={agendar}>{'Agendar \u{1F4F9}'}</button>
            </div>
            </main>
  );

  if (vista === 'video' && sel) return (
        <main>
          <div className="dhero" style={{ background: GRADS[selIdx % 6] }}>
{'\u{1F4F9}'}
        <button className="dback" onClick={function () { setVista('detalle'); }}>{'←'}</button>
          </div>
      <div className="dsheet" style={{ paddingBottom: 30 }}>
        <h2>Videollamada de diagnostico</h2>
        <div className="dmeta">{'Con ' + sel.nombre + ' · gratis tu primera vez'}</div>
        <div style={{ height: 14 }}></div>
        <div className="vopt sel">
                    <div className="ve" style={{ background: '#e6efff' }}>{'\u{1F3A6}'}</div>
          <div><div className="vt">Sala de video instantanea<span className="pillg">RECOMENDADO</span></div><div className="vd">Se abre al instante, sin registrarse. Comparte el link con el maestro.</div></div>
          </div>
        <div className="vopt">
                    <div className="ve" style={{ background: '#fff1e6' }}>{'\u{1F4F1}'}</div>
          <div><div className="vt">Video en la app<span className="pillo">PRONTO</span></div><div className="vd">Con cotizacion en pantalla y grabacion integrada</div></div>
          </div>
        <button className="gbtn full" onClick={function () { video(sel.id); }}>Iniciar videollamada ahora</button>
        <button className="gbtn full" style={{ background: '#009ee3', boxShadow: 'none', opacity: pagando ? .6 : 1 }} disabled={pagando} onClick={function () { pagar('diagnostico', sel.precio_videollamada, 'Diagnóstico con ' + sel.nombre, sel.id); }}>{'\u{1F4B3} Pagar diagnóstico ' + plata(sel.precio_videollamada) + ' con Mercado Pago'}</button>
        <button className="gbtn full" style={{ background: '#fff', color: '#ff5a3c', border: '2px solid #ffd6cb', boxShadow: 'none' }} onClick={function () { setVista('track'); }}>Ver seguimiento del trabajo (demo)</button>
          </div>
          </main>
  );

  if (vista === 'track') return (
        <main>
          <div className="darkhead">
            <div className="dh1">Pedido en curso</div>
        <h2>{'Tu maestro va en camino \u{1F698}'}</h2>
        <div className="dh2">Cambio de sifon · cotizado por videollamada</div>
    </div>
      <div className="body" style={{ paddingTop: 20 }}>
        <div className="eta2"><div className="e1">Llega entre</div><div className="e2">10:12 - 10:25</div></div>
        <div className="progress"><div className="seg done"></div><div className="seg done"></div><div className="seg done"></div><div className="seg"></div></div>
        <div className="steps"><span>Confirmado</span><span>Preparando</span><span style={{ color: '#ff5a3c' }}>En camino</span><span>Trabajando</span></div>
        <div className="driver">
              <div className="da">{'\u{1F468}'}</div>
          <div style={{ flex: 1 }}>
            <div className="nm">{(sel ? sel.nombre : 'Luis Morales') + ' · ★ 4.9'}</div>
            <div className="mt">{'Pago protegido ✓ · se libera cuando confirmes'}</div>
    </div>
    </div>
        <div style={{ background: '#fff', borderRadius: 18, padding: 16, margin: '16px 0', boxShadow: '0 6px 18px rgba(20,20,40,.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div><div style={{ fontSize: 12, color: '#7c8499' }}>Total del trabajo cotizado</div><div style={{ fontSize: 24, fontWeight: 800 }}>{plata(desg.bruto)}</div></div>
            <span className="dbadge g">{'\u{1F512} Pago protegido'}</span>
          </div>
          <button className="gbtn full" style={{ background: '#009ee3', boxShadow: 'none', opacity: pagando ? .6 : 1 }} disabled={pagando} onClick={function () { pagar('trabajo', desg.bruto, 'Trabajo: ' + (sel ? sel.nombre : 'maestro'), sel ? sel.id : null); }}>{'\u{1F4B3} Pagar ' + plata(desg.bruto) + ' con Mercado Pago'}</button>
          <div style={{ fontSize: 11, color: '#9aa1b5', textAlign: 'center', marginTop: 6 }}>El dinero se libera al maestro cuando confirmes que el trabajo quedó listo.</div>
        </div>
        <button className="gbtn full" style={{ background: '#fff', color: '#ff5a3c', border: '2px solid #ffd6cb', boxShadow: 'none' }} onClick={function () { setVista('home'); }}>Volver al inicio</button>
    </div>
    </main>
  );

    if (vista === 'auth') return (
          <main>
            <div className="darkhead">
              <div className="dh1">Tu cuenta</div>
              <h2>{authTab === 'ingresar' ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}</h2>
              <div className="dh2">Ingresa para agendar, pagar y ver tus pedidos</div>
      </div>
            <div className="body" style={{ paddingTop: 18 }}>
        <div style={{ display: 'flex', background: '#fff', borderRadius: 14, padding: 4, marginBottom: 16, border: '1.5px solid #eee' }}>
          <button onClick={function () { setAuthTab('ingresar'); }} style={{ flex: 1, padding: 11, borderRadius: 11, border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer', background: authTab === 'ingresar' ? '#ff5a3c' : '#fff', color: authTab === 'ingresar' ? '#fff' : '#7c8499' }}>Ingresar</button>
                <button onClick={function () { setAuthTab('crear'); }} style={{ flex: 1, padding: 11, borderRadius: 11, border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer', background: authTab === 'crear' ? '#ff5a3c' : '#fff', color: authTab === 'crear' ? '#fff' : '#7c8499' }}>Crear cuenta</button>
      </div>
              <input value={email} onChange={function (e) { setEmail(e.target.value); }} placeholder="tucorreo@ejemplo.cl" style={{ width: '100%', padding: 13, border: '1.5px solid #ddd', borderRadius: 12, fontSize: 14, marginBottom: 10 }} />
              <input type="password" value={pass} onChange={function (e) { setPass(e.target.value); }} placeholder="Contrasena" style={{ width: '100%', padding: 13, border: '1.5px solid #ddd', borderRadius: 12, fontSize: 14, marginBottom: 10 }} />
{authMsg && <p className="error">{authMsg}</p>}
          <button className="gbtn full" onClick={entrar}>{authTab === 'ingresar' ? 'Ingresar' : 'Crear cuenta'}</button>
          <div style={{ textAlign: 'center', color: '#9aa1b5', fontSize: 12, margin: '6px 0' }}>o</div>
          <button className="gbtn full" style={{ background: '#fff', color: '#1c1f2b', border: '1.5px solid #ddd', boxShadow: 'none' }} onClick={conGoogle}>{'\u{1F310} Continuar con Google'}</button>
          <p style={{ fontSize: 11, color: '#9aa1b5', textAlign: 'center', marginTop: 8 }}>Al continuar aceptas los Terminos y la Politica de Privacidad</p>
          <button onClick={function () { setVista('home'); }} style={{ background: 'none', border: 'none', color: '#9aa1b5', fontWeight: 700, fontSize: 13, cursor: 'pointer', width: '100%', marginTop: 8 }}>Volver al inicio</button>
  </div>
  </main>
    );

    if (vista === 'presupuesto') return (
          <main>
            <div className="darkhead">
              <div className="dh1">{'\u{1F3A5} Cotizar por video'}</div>
              <h2>Muestra el problema, recibe soluciones</h2>
              <div className="dh2">Graba un video y un maestro te responde con precio · sin coordinar videollamada</div>
      </div>
      <PresupuestoCliente usuario={usuario} maestros={maestros} />
      <Tabs act="cotizar" />
          </main>
    );

    if (vista === 'cuenta') return (
          <main>
            <div className="darkhead">
              <div className="dh1">{'\u{1F464} Mi cuenta'}</div>
              <h2>{'Hola ' + (usuario ? (usuario.email || '').split('@')[0] : '')}</h2>
              <div className="dh2">Tu cuenta y tu actividad</div>
      </div>
      <div className="body" style={{ paddingTop: 18 }}>
        <div onClick={function () { setVista('gain'); }} style={{ border: '2px solid #ff5a3c', background: '#fff5f2', borderRadius: 16, padding: 14, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 18 }}>
          <span style={{ fontSize: 26 }}>{'\u{1F6E0}'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#993c1d' }}>Cambiar a modo maestro</div>
            <div style={{ fontSize: 12, color: '#b56a4f' }}>Recibe trabajos y genera ingresos</div>
          </div>
          <span style={{ color: '#993c1d', fontWeight: 800, fontSize: 18 }}>{'›'}</span>
        </div>

        <div style={{ fontSize: 12, color: '#9aa1b5', margin: '0 2px 6px' }}>Mi actividad</div>
        <div style={{ background: '#fff', border: '1.5px solid #eee', borderRadius: 16, overflow: 'hidden', marginBottom: 18 }}>
          <div onClick={function () { setVista('cliente'); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderBottom: '1px solid #f2f2f2', cursor: 'pointer' }}>
            <span style={{ fontSize: 20 }}>{'\u{1F464}'}</span>
            <span style={{ flex: 1, fontSize: 14 }}>Mi perfil y dirección</span>
            <span style={{ color: '#c5c9d6', fontSize: 18 }}>{'›'}</span>
          </div>
          <div onClick={function () { setVista('cliente'); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderBottom: '1px solid #f2f2f2', cursor: 'pointer' }}>
            <span style={{ fontSize: 20 }}>{'\u{1F4E6}'}</span>
            <span style={{ flex: 1, fontSize: 14 }}>Mis pedidos</span>
            <span style={{ color: '#c5c9d6', fontSize: 18 }}>{'›'}</span>
          </div>
          <div onClick={function () { setVista('presupuesto'); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, cursor: 'pointer' }}>
            <span style={{ fontSize: 20 }}>{'\u{1F3A5}'}</span>
            <span style={{ flex: 1, fontSize: 14 }}>Mis presupuestos</span>
            <span style={{ color: '#c5c9d6', fontSize: 18 }}>{'›'}</span>
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#9aa1b5', margin: '0 2px 6px' }}>Cuenta y soporte</div>
        <div style={{ background: '#fff', border: '1.5px solid #eee', borderRadius: 16, overflow: 'hidden', marginBottom: 18 }}>
          <div onClick={salir} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, cursor: 'pointer' }}>
            <span style={{ fontSize: 20 }}>{'\u{1F6AA}'}</span>
            <span style={{ flex: 1, fontSize: 14, color: '#b3261e' }}>Cerrar sesión</span>
          </div>
        </div>
      </div>
      <Tabs act="cuenta" />
          </main>
    );

    if (vista === 'cliente') return (
          <main>
            <div className="darkhead">
              <button onClick={function () { setVista('cuenta'); }} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 10, padding: '6px 11px', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>{'← Cuenta'}</button>
              <div className="dh1">{'\u{1F464} Mi perfil'}</div>
              <h2>{'Hola ' + (usuario ? (usuario.email || '').split('@')[0] : '')}</h2>
              <div className="dh2">Tus datos, dirección y pedidos</div>
      </div>
      <PerfilCliente usuario={usuario} />
      <Tabs act="cuenta" />
          </main>
    );

return (
        <main>
          <div className="darkhead">
            <button onClick={function () { setVista('cuenta'); }} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 10, padding: '6px 11px', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>{'← Volver a mi cuenta'}</button>
            <div className="dh1">{'\u{1F514} Modo maestro · nuevo trabajo'}</div>
        <h2>Cambio de sifon lavaplatos</h2>
        <div className="dh2">Providencia · manana 10:00 · cotizado por video {'✓'}</div>
    </div>
      <Verificacion usuario={usuario} />
      <div className="gaincard">
            <div className="biggain">
              <div className="bg1">RECIBES LIQUIDO</div>
          <div className="bg2">{plata(desg.liquido)}</div>
    </div>
        <div className="prow"><span>Precio cotizado al cliente</span><b>{plata(desg.bruto)}</b></div>
        <div className="prow"><span>Comision app (10% + IVA)</span><span className="m">{'-' + plata(desg.comision)}</span></div>
        <div className="prow"><span>Pasarela de pago (2,35% + IVA)</span><span className="m">{'-' + plata(desg.pasarela)}</span></div>
        <div className="prow"><span>Retencion SII honorarios (15,25%)</span><span className="m">{'-' + plata(desg.retencion)}</span></div>
        <div className="prow"><span>Boleta de honorarios</span><b style={{ color: '#0d9456' }}>{'se emite sola ✓'}</b></div>
    </div>
      <div className="swipe" onClick={function () { alert('Trabajo aceptado! Agendado para manana 10:00'); setVista('home'); }}>{'Aceptar trabajo · ' + plata(desg.liquido)}</div>
      <PresupuestosMaestro usuario={usuario} />
      <Tabs act="cuenta" />
    </main>
  );
}
