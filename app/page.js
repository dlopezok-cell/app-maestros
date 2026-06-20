'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PresupuestoCliente from './PresupuestoCliente';
import PerfilCliente from './PerfilCliente';
import CookieBanner from './CookieBanner';
import Bienvenida from './Bienvenida';
import EliminarCuenta from './EliminarCuenta';
import HomeCliente from './HomeCliente';
import MensajesCliente from './MensajesCliente';
import ChatCotizacion from './ChatCotizacion';

const ADMIN_EMAIL = 'dlopezok@gmail.com';

// App del CLIENTE (ruta /). Inicio con maestros reales -> ficha -> pedir presupuesto.
// Pestañas: Inicio · Cotizar (PresupuestoCliente) · Cuenta (PerfilCliente).
const EMO = { gasfiteria: '\u{1F6B0}', electricidad: '⚡', cerrajeria: '\u{1F511}', pintura: '\u{1F3A8}', calefont: '\u{1F525}', limpieza: '\u{1F9F9}' };
const GRAD = ['linear-gradient(150deg,#3b6ef0,#7fa8ff)', 'linear-gradient(150deg,#1e40af,#22d3ee)', 'linear-gradient(150deg,#11a36c,#6fe0ae)', 'linear-gradient(150deg,#2563eb,#22d3ee)', 'linear-gradient(150deg,#155e75,#5eead4)', 'linear-gradient(150deg,#0e7490,#5eead4)'];

export default function Home() {
const [vista, setVista] = useState('inicio');
const [usuario, setUsuario] = useState(null);
const [cargado, setCargado] = useState(false);
const [maestros, setMaestros] = useState([]);
const [cats, setCats] = useState([]);
const [oficio, setOficio] = useState(null);
const [sel, setSel] = useState(null);
const [fichaDesde, setFichaDesde] = useState('inicio');
const [perfilCli, setPerfilCli] = useState(null);
const [chatConsulta, setChatConsulta] = useState(null);
const [maestroDirigido, setMaestroDirigido] = useState(null);
const [orden, setOrden] = useState('cerca');
const [gIdx, setGIdx] = useState(-1);
const [destinoLogin, setDestinoLogin] = useState('cuenta');
const [authTab, setAuthTab] = useState('ingresar');
const [rolPre, setRolPre] = useState(null);
const [email, setEmail] = useState('');
const [pass, setPass] = useState('');
const [authMsg, setAuthMsg] = useState(null);
const [pagoMsg, setPagoMsg] = useState(null);
const [q, setQ] = useState('');
const [buscado, setBuscado] = useState('');
const [resenas, setResenas] = useState([]);
const [portada, setPortada] = useState(undefined); // undefined = cargando
const [noLeidosCli, setNoLeidosCli] = useState(0);  // mensajes de maestros sin leer (badge)

useEffect(function () {
if (!usuario) { setPerfilCli(null); return; }
supabase.from('perfiles').select('comuna, lat, lng').eq('id', usuario.id).maybeSingle().then(function (r) { setPerfilCli(r.data || null); });
}, [usuario]);
useEffect(function () {
supabase.from('home_config').select('*').eq('id', 1).maybeSingle()
.then(function (r) { setPortada(r.data || null); });
supabase.auth.getUser().then(function (r) { setUsuario((r.data && r.data.user) || null); setCargado(true); });
if (typeof window !== 'undefined') {
var sp = new URLSearchParams(window.location.search);
// Guardar la marca de "dentro de la app" ANTES de limpiar la URL, para que el
// retorno del pago (que trae ?app=1) salte la portada "PRONTO".
if (sp.get('app') === '1') { try { window.localStorage.setItem('ml_app', '1'); } catch (e) {} }
var pg = sp.get('pago');
if (pg) { setPagoMsg(pg); setVista('mias'); window.history.replaceState({}, '', '/'); }
}
supabase.from('catalogos').select('valor, slug').eq('tipo', 'especialidad').eq('activo', true).order('orden', { ascending: true })
.then(function (r) { setCats(r.data || []); });
supabase.from('maestros').select('id, nombre, oficio, oficios, descripcion, rating_promedio, total_trabajos, foto_url, galeria, precio_videollamada, precio_visita, comunas, region, verificado, suspendido')
.then(function (r) { setMaestros(r.data || []); });
supabase.from('resenas').select('maestro_id, estrellas, comentario, creado_en')
.then(function (r) { setResenas(r.data || []); });
}, []);

useEffect(function () {
if (!usuario) return;
function contar() {
supabase.from('mensajes').select('id, presupuestos!inner(cliente_id)', { count: 'exact', head: true })
.eq('autor_rol', 'maestro').eq('leido', false).eq('presupuestos.cliente_id', usuario.id)
.then(function (r) { setNoLeidosCli(r.count || 0); });
}
contar();
var iv = setInterval(contar, 20000);
return function () { clearInterval(iv); };
}, [usuario, vista]);

function ratingDe(id) {
var rs = resenas.filter(function (x) { return x.maestro_id === id; });
if (!rs.length) return { avg: null, n: 0 };
var s = rs.reduce(function (a, x) { return a + (x.estrellas || 0); }, 0);
return { avg: Math.round(s / rs.length * 10) / 10, n: rs.length };
}

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
function conApple() {
supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined } });
}
function salir() { supabase.auth.signOut().then(function () { setUsuario(null); setVista('inicio'); }); }

function nombreM(m) { return m.nombre || (m.perfiles && m.perfiles.nombre) || 'Maestro'; }
function fotoM(m) { return m.foto_url || (m.perfiles && m.perfiles.avatar_url) || null; }
function oficiosM(m) { return m.oficios && m.oficios.length ? m.oficios : (m.oficio ? [m.oficio] : []); }
function ofNombre(slug) { var c = cats.filter(function (x) { return x.slug === slug; })[0]; return c ? c.valor : (slug || ''); }
function plata(n) { return '$' + (n || 0).toLocaleString('es-CL'); }

function abrirFicha(m) { setFichaDesde(vista === 'resultados' ? 'resultados' : 'inicio'); setSel(m); setGIdx(-1); setVista('ficha'); window.scrollTo(0, 0); }
function irTab(v) {
if ((v === 'cotizar' || v === 'cuenta' || v === 'mias' || v === 'mensajes') && !usuario) { setDestinoLogin(v); setVista('acceso'); window.scrollTo(0, 0); return; }
if (v === 'cotizar') setMaestroDirigido(null);
setVista(v); window.scrollTo(0, 0);
}
function conversar(m) {
if (!usuario) { setDestinoLogin('cotizar'); setVista('acceso'); window.scrollTo(0, 0); return; }
supabase.from('presupuestos').select('id').eq('cliente_id', usuario.id).eq('es_consulta', true).contains('destinatarios', [m.id]).limit(1).maybeSingle().then(function (r) {
if (r.data && r.data.id) { setChatConsulta({ presupuestoId: r.data.id, maestroId: m.id, titulo: nombreM(m) }); return; }
supabase.from('presupuestos').insert({ cliente_id: usuario.id, oficio: (m.oficio || 'consulta'), titulo: 'Consulta', descripcion: 'Consulta directa', maestro_id: null, destinatarios: [m.id], es_consulta: true, estado: 'abierto', archivos: [] }).select('id').single().then(function (r2) {
if (r2.error) return;
setChatConsulta({ presupuestoId: r2.data.id, maestroId: m.id, titulo: nombreM(m) });
});
});
}
function pedir(m) { if (!usuario) { setDestinoLogin('cotizar'); setVista('acceso'); window.scrollTo(0, 0); return; } setMaestroDirigido(m || null); setVista('cotizar'); window.scrollTo(0, 0); }
function buscar(texto) { setQ((texto || '')); setBuscado((texto || '').trim()); setVista('resultados'); window.scrollTo(0, 0); }

var maestrosFlat = maestros.map(function (m) { return { id: m.id, nombre: nombreM(m), oficio: m.oficio, oficios: m.oficios, descripcion: m.descripcion, region: m.region, comunas: m.comunas, verificado: m.verificado, suspendido: m.suspendido, rating: m.rating_promedio || '—' }; });
function _norm(x) { return (x || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function coincideBusqueda(texto, q) {
  var T = _norm(texto), Q = _norm(q).trim();
  if (!Q) return true;
  if (T.indexOf(Q) >= 0) return true;
  var tw = T.split(/[^a-z0-9]+/).filter(Boolean);
  var qw = Q.split(/[^a-z0-9]+/).filter(Boolean);
  return qw.every(function (w) {
    if (w.length < 3) return T.indexOf(w) >= 0;
    return tw.some(function (t) {
      if (t.indexOf(w) >= 0 || w.indexOf(t) >= 0) return true;
      var n = Math.min(t.length, w.length), k = 0;
      while (k < n && t[k] === w[k]) k++;
      return k >= 4;
    });
  });
}
var lista = maestros.filter(function (m) {
if (m.suspendido) return false;
if (!m.verificado) return false;
if (oficio && oficiosM(m).indexOf(oficio) < 0) return false;
if (q.trim()) {
var t = nombreM(m) + ' ' + oficiosM(m).map(ofNombre).join(' ') + ' ' + oficiosM(m).join(' ') + ' ' + (Array.isArray(m.comunas) ? m.comunas.join(' ') : (m.comunas || ''));
if (!coincideBusqueda(t, q)) return false;
}
return true;
});
function resultadosLista() {
var cComuna = perfilCli ? _norm(perfilCli.comuna || '') : '';
var cRegion = '';
if (cComuna) { for (var i = 0; i < maestros.length; i++) { var mm = maestros[i]; var cs = (Array.isArray(mm.comunas) ? mm.comunas : []).map(_norm); if (cs.indexOf(cComuna) >= 0) { cRegion = _norm(mm.region || ''); break; } } }
var lr = lista.slice();
if (cRegion) lr = lr.filter(function (m) { return _norm(m.region || '') === cRegion; });
function cerca(m) { var cs = (Array.isArray(m.comunas) ? m.comunas : []).map(_norm); return (cComuna && cs.indexOf(cComuna) >= 0) ? 1 : 0; }
if (orden === 'rating') lr.sort(function (a, b) { return (b.rating_promedio || 0) - (a.rating_promedio || 0) || (b.total_trabajos || 0) - (a.total_trabajos || 0); });
else lr.sort(function (a, b) { var d = cerca(b) - cerca(a); if (d) return d; return (b.rating_promedio || 0) - (a.rating_promedio || 0) || (b.total_trabajos || 0) - (a.total_trabajos || 0); });
return lr;
}

function Nav() {
var AZ = '#2563eb', GR = '#9aa1b5';
function ico(d, on) {
return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={on ? AZ : GR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto 4px' }}>{d}</svg>;
}
var onIni = (vista === 'inicio' || vista === 'ficha' || vista === 'resultados'), onMias = (vista === 'mias'), onMsg = (vista === 'mensajes'), onCta = (vista === 'cuenta');
function tabSt(on) { return { flex: 'none', width: 62, textAlign: 'center', fontSize: 10, fontWeight: 700, color: on ? AZ : GR, cursor: 'pointer' }; }
return (
<div className="tabbar" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
<div style={{ flex: 1, display: 'flex', justifyContent: 'space-around' }}>
<div style={tabSt(onIni)} onClick={function () { irTab('inicio'); }}>
{ico(<g><path d="M3 9.5 12 3l9 6.5" /><path d="M5 10v10h14V10" /><path d="M9.5 20v-6h5v6" /></g>, onIni)}Inicio
</div>
<div style={tabSt(onMias)} onClick={function () { irTab('mias'); }}>
{ico(<g><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></g>, onMias)}Cotizaciones
</div>
</div>
<div style={{ flex: 'none', width: 70, textAlign: 'center', cursor: 'pointer' }} onClick={function () { irTab('cotizar'); }}>
<div style={{ width: 54, height: 54, margin: '-28px auto 3px', borderRadius: 18, background: 'linear-gradient(135deg,#22d3ee,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 18px rgba(37,99,235,.45)', border: '4px solid #fff' }}>
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" /><path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6Z" /></svg>
</div>
<span style={{ fontSize: 10.5, fontWeight: 800, color: '#2563eb' }}>Cotizar</span>
</div>
<div style={{ flex: 1, display: 'flex', justifyContent: 'space-around' }}>
<div style={tabSt(onMsg)} onClick={function () { irTab('mensajes'); }}>
<span style={{ position: 'relative', display: 'inline-block' }}>
{ico(<g><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" /></g>, onMsg)}
{noLeidosCli > 0 && <span style={{ position: 'absolute', top: -4, right: 4, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 800, borderRadius: 999, minWidth: 15, height: 15, lineHeight: '15px', padding: '0 3px', textAlign: 'center', boxSizing: 'border-box' }}>{noLeidosCli > 9 ? '9+' : noLeidosCli}</span>}
</span>Mensajes
</div>
<div style={tabSt(onCta)} onClick={function () { irTab('cuenta'); }}>
{usuario
  ? <div style={{ width: 24, height: 24, borderRadius: '50%', background: onCta ? '#2563eb' : '#c5cad6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, margin: '0 auto 4px' }}>{((usuario.email || '?').charAt(0) || '?').toUpperCase()}</div>
  : ico(<g><path d="M20 21a8 8 0 1 0-16 0" /><circle cx="12" cy="7" r="4" /></g>, onCta)}Perfil
</div>
</div>
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

if (!cargado || portada === undefined) return <main><div className="body" style={{ paddingTop: 30 }}><p>Cargando...</p></div></main>;

// Portada "PRONTO": si está activa y quien mira no es el admin, mostramos la portada de lanzamiento.
// Excepción: dentro de la app nativa (iOS/Android) siempre mostramos el marketplace real,
// para que la web pública pueda seguir en "PRONTO" mientras la app funciona normal.
var esAdmin = usuario && usuario.email === ADMIN_EMAIL;
var esApp = false;
if (typeof window !== 'undefined') {
var qs = window.location.search || '';
if (/(^|[?&])app=1/.test(qs)) { try { window.localStorage.setItem('ml_app', '1'); } catch (e) {} }
var flag = false; try { flag = window.localStorage.getItem('ml_app') === '1'; } catch (e) {}
esApp = !!window.Capacitor || /(^|[?&])app=1/.test(qs) || flag;
}
if (portada && portada.portada_activa && !esAdmin && !esApp) return <Bienvenida config={portada} />;

// ---- ACCESO (login del cliente) ----
if (vista === 'acceso') return (
<main>
{!rolPre ? (
<div>
<div className="darkhead" style={{ textAlign: 'center', paddingBottom: 20 }}>
<div className="dh1">{'\u{1F44B} Bienvenido'}</div>
<h2 style={{ margin: '8px 0 2px' }}>¿Cómo quieres empezar?</h2>
<div className="dh2">Elige una opción. Podrás cambiarla después.</div>
</div>
<div className="body" style={{ paddingTop: 18 }}>
<button onClick={function () { setRolPre('cliente'); setAuthMsg(null); }} style={{ width: '100%', textAlign: 'left', background: '#fff', border: '2px solid #2563eb', borderRadius: 16, padding: 15, display: 'flex', alignItems: 'center', gap: 13, marginBottom: 12, cursor: 'pointer' }}>
<div style={{ width: 46, height: 46, borderRadius: 13, background: '#e6f1fb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#185fa5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
</div>
<div style={{ flex: 1 }}>
<div style={{ fontSize: 15, fontWeight: 800, color: '#1c1f2b' }}>Busco un maestro</div>
<div style={{ fontSize: 12, color: '#7c8499', marginTop: 1 }}>Cotiza y agenda servicios para tu hogar</div>
</div>
<span style={{ color: '#c5cad6', fontSize: 20 }}>{'\u203A'}</span>
</button>
<a href="/maestros" style={{ textDecoration: 'none', boxSizing: 'border-box', width: '100%', textAlign: 'left', background: '#fff', border: '1.5px solid #eee', borderRadius: 16, padding: 15, display: 'flex', alignItems: 'center', gap: 13, cursor: 'pointer' }}>
<div style={{ width: 46, height: 46, borderRadius: 13, background: '#e1f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#0f6e56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.2 5.2L3 18l3 3 6.5-6.5a4 4 0 0 0 5.2-5.2l-2.4 2.4-2.1-.6-.6-2.1z" /></svg>
</div>
<div style={{ flex: 1 }}>
<div style={{ fontSize: 15, fontWeight: 800, color: '#1c1f2b' }}>Quiero trabajar como maestro</div>
<div style={{ fontSize: 12, color: '#7c8499', marginTop: 1 }}>Recibe trabajos y envía cotizaciones</div>
</div>
<span style={{ color: '#c5cad6', fontSize: 20 }}>{'\u203A'}</span>
</a>
<button onClick={function () { setVista('inicio'); }} style={{ background: 'none', border: 'none', color: '#9aa1b5', fontWeight: 700, fontSize: 13, cursor: 'pointer', width: '100%', marginTop: 14 }}>Volver al inicio</button>
</div>
</div>
) : (
<div>
<div className="darkhead" style={{ textAlign: 'center', paddingBottom: 20 }}>
<div className="dh1">{'\u{1F44B} Tu cuenta'}</div>
<h2 style={{ margin: '8px 0 2px' }}>Ingresa o crea tu cuenta</h2>
<div className="dh2">Para pedir presupuestos y agendar</div>
</div>
<div className="body" style={{ paddingTop: 18 }}>
<button onClick={function () { setRolPre(null); setAuthMsg(null); }} style={{ background: 'none', border: 'none', color: '#9aa1b5', fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12 }}>{'\u2190 Cambiar'}</button>
<div style={{ display: 'flex', background: '#fff', borderRadius: 14, padding: 4, marginBottom: 16, border: '1.5px solid #eee' }}>
<button onClick={function () { setAuthTab('ingresar'); setAuthMsg(null); }} style={{ flex: 1, padding: 11, borderRadius: 11, border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer', background: authTab === 'ingresar' ? '#2563eb' : '#fff', color: authTab === 'ingresar' ? '#fff' : '#7c8499' }}>Ingresar</button>
<button onClick={function () { setAuthTab('crear'); setAuthMsg(null); }} style={{ flex: 1, padding: 11, borderRadius: 11, border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer', background: authTab === 'crear' ? '#2563eb' : '#fff', color: authTab === 'crear' ? '#fff' : '#7c8499' }}>Crear cuenta</button>
</div>
<input value={email} onChange={function (e) { setEmail(e.target.value); }} placeholder="tucorreo@ejemplo.cl" style={{ width: '100%', padding: 13, border: '1.5px solid #ddd', borderRadius: 12, fontSize: 14, marginBottom: 10, boxSizing: 'border-box' }} />
<input type="password" value={pass} onChange={function (e) { setPass(e.target.value); }} placeholder="Contraseña" style={{ width: '100%', padding: 13, border: '1.5px solid #ddd', borderRadius: 12, fontSize: 14, marginBottom: 10, boxSizing: 'border-box' }} />
{authMsg && <p style={{ fontSize: 13, color: authMsg.indexOf('correo') >= 0 ? '#0d9456' : '#b3261e', margin: '2px 0 8px' }}>{authMsg}</p>}
<button className="gbtn full" onClick={entrar}>{authTab === 'ingresar' ? 'Ingresar' : 'Crear cuenta'}</button>
<div style={{ textAlign: 'center', color: '#9aa1b5', fontSize: 12, margin: '8px 0' }}>o</div>
<button className="gbtn full" style={{ background: '#fff', color: '#1c1f2b', border: '1.5px solid #ddd', boxShadow: 'none' }} onClick={conGoogle}>{'\u{1F310} Continuar con Google'}</button>
<button className="gbtn full" style={{ background: '#000', color: '#fff', border: 'none', boxShadow: 'none', marginTop: 9 }} onClick={conApple}>{'\u{F8FF} Continuar con Apple'}</button>
<button onClick={function () { setVista('inicio'); }} style={{ background: 'none', border: 'none', color: '#9aa1b5', fontWeight: 700, fontSize: 13, cursor: 'pointer', width: '100%', marginTop: 10 }}>Volver al inicio</button>
</div>
</div>
)}
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
<button className="dback" onClick={function () { setVista(fichaDesde || 'inicio'); }}>{'←'}</button>
</div>
<div className="dsheet">
<h2>{nombreM(sel)}</h2>
<div className="dmeta">{ofs || 'Maestro'}</div>
<div className="dbadges">
{sel.verificado && <span className="dbadge">{'\u{1F6E1} Identidad verificada'}</span>}
{Array.isArray(sel.comunas) && sel.comunas.length > 0 && <span className="dbadge">{'\u{1F4CD} ' + sel.comunas.join(', ')}</span>}
<span className="dbadge g">{'● Disponible'}</span>
</div>
<div style={{ display: 'flex', gap: 10, margin: '14px 0 6px' }}>
<button onClick={function () { conversar(sel); }} style={{ flex: 1, background: '#fff', color: '#2563eb', border: '2px solid #dbe7fb', borderRadius: 14, fontWeight: 800, fontSize: 14, cursor: 'pointer', padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>{'💬 Conversar'}</button>
<button className="gbtn" style={{ flex: 1 }} onClick={function () { pedir(sel); }}>{'Pedir presupuesto'}</button>
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
{(function () {
var rs = resenas.filter(function (x) { return x.maestro_id === sel.id; });
var rt = ratingDe(sel.id);
return (
<div>
<div className="seehead"><h3>{'⭐ Reseñas' + (rt.avg ? ' · ' + rt.avg + ' (' + rt.n + ')' : '')}</h3></div>
{rs.length === 0 && <p style={{ fontSize: 13, color: '#9aa1b5' }}>Aún sin reseñas. Sé el primero en calificarlo después de tu trabajo.</p>}
{rs.map(function (re, i) {
return (
<div key={i} style={{ borderTop: i ? '1px solid #f1f1f1' : 'none', padding: '10px 0' }}>
<div style={{ fontSize: 14, color: '#f5a623' }}>{'★'.repeat(re.estrellas || 0) + '☆'.repeat(Math.max(0, 5 - (re.estrellas || 0)))}</div>
{re.comentario && <div style={{ fontSize: 13, color: '#444', marginTop: 2 }}>{re.comentario}</div>}
</div>
);
})}
</div>
);
})()}
<div style={{ height: 90 }} />
</div>
{gIdx >= 0 && gal[gIdx] && (
<div onClick={function () { setGIdx(-1); }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.93)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
<img src={gal[gIdx]} alt="" style={{ maxWidth: '92vw', maxHeight: '85vh', borderRadius: 12, objectFit: 'contain' }} />
</div>
)}
{chatConsulta && (
<ChatCotizacion usuario={usuario} presupuestoId={chatConsulta.presupuestoId} maestroId={chatConsulta.maestroId} miRol="cliente" titulo={chatConsulta.titulo} onClose={function () { setChatConsulta(null); }} />
)}
<Nav />
</main>
);
}

// ---- COTIZAR (solo crear una cotización nueva) ----
if (vista === 'resultados') { var lr = resultadosLista(); return (
<main>
<div style={{ background: '#0e1a38', padding: '14px 16px 16px' }}>
<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
<button onClick={function () { setVista('inicio'); }} style={{ background: 'rgba(255,255,255,.14)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: '50%', fontSize: 18, cursor: 'pointer' }}>{'\u2190'}</button>
<div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, background: '#fff', borderRadius: 30, padding: '8px 15px' }}>
<span style={{ color: '#9aa1b5', fontSize: 16 }}>{'\u{1F50D}'}</span>
<input value={q} onChange={function (e) { setQ(e.target.value); }} placeholder="Buscar maestro u oficio" enterKeyHint="search" style={{ border: 'none', outline: 'none', width: '100%', fontSize: 16, color: '#1c1f2b', background: 'transparent' }} />
</div>
</div>
</div>
<div style={{ padding: '14px 16px 96px' }}>
<div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
<button onClick={function () { setOrden('cerca'); }} style={{ fontSize: 12.5, fontWeight: 700, border: 'none', borderRadius: 20, padding: '7px 13px', cursor: 'pointer', background: orden === 'cerca' ? '#2563eb' : '#fff', color: orden === 'cerca' ? '#fff' : '#5b6275', boxShadow: orden === 'cerca' ? 'none' : 'inset 0 0 0 1px #e4e4ef' }}>{'\u{1F4CD} Más cerca de ti'}</button>
<button onClick={function () { setOrden('rating'); }} style={{ fontSize: 12.5, fontWeight: 700, border: 'none', borderRadius: 20, padding: '7px 13px', cursor: 'pointer', background: orden === 'rating' ? '#2563eb' : '#fff', color: orden === 'rating' ? '#fff' : '#5b6275', boxShadow: orden === 'rating' ? 'none' : 'inset 0 0 0 1px #e4e4ef' }}>{'⭐ Mejor evaluados'}</button>
</div>
<div style={{ fontSize: 13, color: '#7c8499', fontWeight: 700, marginBottom: 10 }}>{lr.length + (lr.length === 1 ? ' maestro' : ' maestros') + (q.trim() ? (' para \u201c' + q.trim() + '\u201d') : '')}</div>
{lr.length === 0 && <div style={{ textAlign: 'center', color: '#9aa1b5', fontSize: 14, padding: '44px 14px', lineHeight: 1.6 }}>{'No encontramos maestros' + (q.trim() ? (' para \u201c' + q.trim() + '\u201d') : '') + '. Prueba otra palabra, o graba un video y te cotizan.'}</div>}
{lr.map(function (m) {
var f = fotoM(m);
var a = oficiosM(m).map(ofNombre);
return (
<div key={m.id} onClick={function () { abrirFicha(m); }} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #eef1f7', borderRadius: 14, padding: '11px 13px', marginBottom: 10, cursor: 'pointer' }}>
<div style={{ width: 54, height: 54, borderRadius: '50%', overflow: 'hidden', background: '#e6efff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontWeight: 800, fontSize: 20, flex: 'none' }}>{f ? <img src={f} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : nombreM(m).charAt(0).toUpperCase()}</div>
<div style={{ minWidth: 0, flex: 1 }}>
<div style={{ fontSize: 15.5, fontWeight: 800, color: '#16294f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombreM(m)}</div>
<div style={{ fontSize: 12.5, color: '#7c8499', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(a.slice(0, 3).join(' \u00b7 ') + (a.length > 3 ? ' +' + (a.length - 3) : '')) || 'Maestro'}</div>
{Array.isArray(m.comunas) && m.comunas.length > 0 && <div style={{ fontSize: 11.5, color: '#9aa1b5', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{'\u{1F4CD} ' + m.comunas.slice(0, 3).join(', ')}</div>}
</div>
<span style={{ color: '#22d3ee', fontWeight: 800, fontSize: 18 }}>{'\u203a'}</span>
</div>
);
})}
</div>
<Nav />
</main>
); }

if (vista === 'cotizar') return (
<main>
<div className="darkhead"><div className="dh1">{'➕ Pedir presupuesto'}</div><h2 style={{ margin: '8px 0 2px' }}>Cuéntanos qué necesitas</h2><div className="dh2">Graba un video, recibe presupuestos y agenda</div></div>
<div style={{ paddingBottom: 90 }}>
<PresupuestoCliente usuario={usuario} maestros={maestrosFlat} modo="crear" descripcionInicial={buscado} maestroDirigido={maestroDirigido} />
</div>
<Nav />
</main>
);

// ---- MIS COTIZACIONES (seguimiento de lo enviado) ----
if (vista === 'mias') return (
<main>
<div className="darkhead"><div className="dh1">{'\u{1F4CB} Cotizaciones'}</div><h2 style={{ margin: '8px 0 2px' }}>Tus solicitudes enviadas</h2><div className="dh2">Sigue el estado, chatea y agenda con los maestros</div></div>
{pagoMsg && (
<div className="body" style={{ paddingTop: 14, paddingBottom: 0 }}>
<div style={{ background: pagoMsg === 'ok' ? '#f2fbf6' : '#eef4ff', border: '1px solid ' + (pagoMsg === 'ok' ? '#bce5cf' : '#dbe7fb'), borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
<span style={{ fontSize: 20 }}>{pagoMsg === 'ok' ? '✅' : pagoMsg === 'pendiente' ? '\u{23F3}' : '⚠️'}</span>
<div style={{ flex: 1, fontSize: 13, color: pagoMsg === 'ok' ? '#0d9456' : '#b07a1e' }}>{pagoMsg === 'ok' ? '¡Pago realizado! Tu trabajo quedó agendado. El maestro lo verá en su agenda.' : pagoMsg === 'pendiente' ? 'Tu pago quedó pendiente. Te confirmaremos en cuanto se acredite.' : 'El pago no se completó. Puedes intentar agendar de nuevo.'}</div>
<button onClick={function () { setPagoMsg(null); }} style={{ background: 'none', border: 'none', color: '#9aa1b5', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>{'✕'}</button>
</div>
</div>
)}
<div style={{ paddingBottom: 90 }}>
<PresupuestoCliente usuario={usuario} maestros={maestrosFlat} modo="lista" />
</div>
<Nav />
</main>
);


if (vista === 'mensajes') return (
<main>
<div className="darkhead"><div className="dh1">{'\u{1F4AC} Mensajes'}</div><h2 style={{ margin: '8px 0 2px' }}>Tus conversaciones</h2><div className="dh2">Chatea con los maestros que te cotizaron</div></div>
<div style={{ paddingBottom: 90, minHeight: 300 }}>
<MensajesCliente usuario={usuario} maestros={maestrosFlat} />
</div>
<Nav />
</main>
);
// ---- CUENTA ----
if (vista === 'cuenta') return (
<main>
<div className="darkhead"><div className="dh1">{'\u{1F464} Mi cuenta'}</div><h2 style={{ margin: '8px 0 2px' }}>{(usuario && usuario.email) || ''}</h2></div>
<div style={{ paddingBottom: 90 }}>
<div className="body" style={{ paddingBottom: 0 }}>
<a href="/maestros" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, background: '#0f1320', borderRadius: 16, padding: '14px 15px' }}>
<div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.2 5.2L3 18l3 3 6.5-6.5a4 4 0 0 0 5.2-5.2l-2.4 2.4-2.1-.6-.6-2.1z" /></svg>
</div>
<div style={{ flex: 1 }}>
<div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Cambiar a modo Maestro</div>
<div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.6)' }}>Recibe trabajos y cotiza</div>
</div>
<span style={{ color: '#fff', fontSize: 20 }}>{'\u203A'}</span>
</a>
</div>
<PerfilCliente usuario={usuario} />
<div className="body" style={{ paddingTop: 0 }}>
<button className="gbtn full" style={{ background: '#fff', color: '#b3261e', border: '1.5px solid #f0c8c2', boxShadow: 'none' }} onClick={salir}>Cerrar sesión</button>
<EliminarCuenta redirigir="/" />
<div style={{ textAlign: 'center', marginTop: 14, fontSize: 12 }}>
<a href="/privacidad" style={{ color: '#9aa1b5', textDecoration: 'none' }}>Privacidad</a>
<span style={{ color: '#d4d7e0', margin: '0 8px' }}>·</span>
<a href="/terminos" style={{ color: '#9aa1b5', textDecoration: 'none' }}>Términos</a>
</div>
</div>
</div>
<Nav />
</main>
);

// ---- INICIO ----
return (
<main>
<HomeCliente
cats={cats} oficio={oficio} setOficio={setOficio}
q={q} setQ={setQ} lista={lista} EMO={EMO} plata={plata}
nombreM={nombreM} fotoM={fotoM} oficiosM={oficiosM} ofNombre={ofNombre} ratingDe={ratingDe}
onMaestro={abrirFicha} onCotizar={function () { irTab('cotizar'); }} onBuscar={buscar}
/>
<CookieBanner />
<Nav />
</main>
);
}
