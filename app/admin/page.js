'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import CampanaMaestros from '../CampanaMaestros';
import InfluencersPanel from '../InfluencersPanel';
import UsuariosPanel from '../UsuariosPanel';
import MapsExtractor from '../MapsExtractor';
import AgenteIA from '../AgenteIA';
import EmbudoMaestros from '../EmbudoMaestros';

const ADMIN_EMAIL = 'dlopezok@gmail.com';

// Categorías para agrupar las pestañas y dar acceso por grupo a otros usuarios.
const CATEGORIAS = [
  { id: 'resumen', nombre: 'Resumen', icono: '\u{1F4CA}' },
  { id: 'marketing', nombre: 'Marketing', icono: '\u{1F4E3}' },
  { id: 'operaciones', nombre: 'Operaciones', icono: '\u{1F6E0}' },
  { id: 'finanzas', nombre: 'Finanzas', icono: '\u{1F4B0}' },
  { id: 'comunidad', nombre: 'Comunidad', icono: '\u{1F465}' },
  { id: 'config', nombre: 'Configuración', icono: '⚙️' },
];
const TODAS_CATS = CATEGORIAS.map(function (c) { return c.id; });

const SECCIONES = [
  { id: 'resumen', icono: '\u{1F4CA}', nombre: 'Resumen', cat: 'resumen' },
  { id: 'comunicados', icono: '\u{1F4E2}', nombre: 'Comunicados', cat: 'resumen' },
  { id: 'campana', icono: '\u{1F4E3}', nombre: 'Campaña', cat: 'marketing' },
  { id: 'extraer', icono: '\u{1F5FA}\u{FE0F}', nombre: 'Extraer de Maps', cat: 'marketing' },
  { id: 'agenteia', icono: '\u{1F916}', nombre: 'Agente IA', cat: 'marketing' },
  { id: 'influencers', icono: '\u{1F517}', nombre: 'Influencers', cat: 'marketing' },
  { id: 'leads', icono: '\u{1F9F2}', nombre: 'Leads', cat: 'marketing' },
  { id: 'pedidos', icono: '\u{1F9FE}', nombre: 'Pedidos', cat: 'operaciones' },
  { id: 'reservas', icono: '\u{1F4C5}', nombre: 'Reservas', cat: 'operaciones' },
  { id: 'mensajes', icono: '\u{1F4AC}', nombre: 'Mensajes', cat: 'operaciones' },
  { id: 'disputas', icono: '\u{1F6A9}', nombre: 'Disputas', cat: 'operaciones' },
  { id: 'pagos', icono: '\u{1F4B0}', nombre: 'Pagos', cat: 'finanzas' },
  { id: 'liberar', icono: '\u{1F513}', nombre: 'Por liberar', cat: 'finanzas' },
  { id: 'comision', icono: '\u{1F4B8}', nombre: 'Comisión', cat: 'finanzas' },
  { id: 'embudo', icono: '\u{1F5C2}\u{FE0F}', nombre: 'Embudo', cat: 'comunidad' },
  { id: 'clientes', icono: '\u{1F465}', nombre: 'Clientes', cat: 'comunidad' },
  { id: 'portada', icono: '\u{1FAA7}', nombre: 'Portada', cat: 'config' },
  { id: 'lanzamiento', icono: '\u{1F680}', nombre: 'Lanzamiento', cat: 'config' },
  { id: 'catalogos', icono: '\u{1F4D1}', nombre: 'Catálogos', cat: 'config' },
  { id: 'usuarios', icono: '\u{1F464}', nombre: 'Usuarios', cat: 'config', soloSuper: true },
  { id: 'resenas', icono: '⭐', nombre: 'Reseñas', cat: 'config' },
];

// Primera sección visible según las categorías permitidas.
function primeraSeccion(cats, esSuper) {
  for (var i = 0; i < SECCIONES.length; i++) {
    var s = SECCIONES[i];
    if (s.soloSuper && !esSuper) continue;
    if (esSuper || cats.indexOf(s.cat) >= 0) return s.id;
  }
  return 'resumen';
}

// Detecta intentos de pasar contacto fuera de la plataforma
function flagContacto(txt) {
  if (!txt) return false;
  const t = ('' + txt).toLowerCase();
  if (/\d[\d\s.\-]{7,}\d/.test(t)) return true;
  if (t.indexOf('@') >= 0) return true;
  if (/whats|wsp|whatsapp|telegram|instagram|fono|llamame|escribeme/.test(t)) return true;
  return false;
}

export default function Admin() {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [seccion, setSeccion] = useState('resumen');
  // permisos: super admin ve todo; otros usuarios ven solo sus categorías
  const [esSuper, setEsSuper] = useState(false);
  const [cats, setCats] = useState([]);
  const [sinPermiso, setSinPermiso] = useState(false);
  // login propio del panel
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [authMsg, setAuthMsg] = useState(null);
  const [entrando, setEntrando] = useState(false);
  const [verifs, setVerifs] = useState([]);
  const [maestros, setMaestros] = useState([]);
  const [perfiles, setPerfiles] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [porLiberar, setPorLiberar] = useState([]);
  const [liberandoId, setLiberandoId] = useState(null);
  const [portada, setPortada] = useState({ portada_activa: true, titulo: '', subtitulo: '', foto_url: '', badge: 'PRONTO', comision_pct: 0, prelanzamiento: true, aviso_titulo: 'Estamos por lanzar', aviso_texto: 'Ya puedes crear tu cuenta y explorar c\u00f3mo funciona. \u00a1S\u00e9 de los primeros!' });
  const [portadaMsg, setPortadaMsg] = useState(null);
  const [interesados, setInteresados] = useState([]);
  const [resenas, setResenas] = useState([]);
  const [mensajes, setMensajes] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [denuncias, setDenuncias] = useState([]);
  const [comunicados, setComunicados] = useState([]);
  const [listaEspera, setListaEspera] = useState([]);
  const [catalogos, setCatalogos] = useState([]);
  const [nuevoCat, setNuevoCat] = useState({ especialidad: '', tipo: '', ofrece: '' });
  const [msop, setMsop] = useState([]);
  const [chatMaestro, setChatMaestro] = useState(null);
  const [chatTxt, setChatTxt] = useState('');
  const [hilo, setHilo] = useState(null);
  const [pedido, setPedido] = useState(null);
  const [maestroDet, setMaestroDet] = useState(null);
  const [verDet, setVerDet] = useState(null); // ver datos de un maestro en verificación (sin ficha)
  const [urls, setUrls] = useState({});
  const [busca, setBusca] = useState('');
  const [msg, setMsg] = useState(null);
  // form comunicado
  const [cTitulo, setCTitulo] = useState('');
  const [cCuerpo, setCCuerpo] = useState('');
  const [cSegmento, setCSegmento] = useState('maestros');

  useEffect(function () {
    supabase.auth.getUser().then(function (r) {
      var u = r.data.user || null;
      setUsuario(u);
      if (!u) { setCargando(false); return; }
      resolverAcceso(u);
    });
  }, []);

  // Decide qué puede ver el usuario: super admin = todo; otros = sus categorías.
  function resolverAcceso(u) {
    if (u.email === ADMIN_EMAIL) {
      setEsSuper(true);
      setCats(TODAS_CATS);
      setSeccion('resumen');
      cargarTodo();
      return;
    }
    supabase.from('panel_usuarios').select('categorias, activo').eq('email', u.email).maybeSingle().then(function (res) {
      if (res.data && res.data.activo) {
        var cs = res.data.categorias || [];
        setCats(cs);
        setSeccion(primeraSeccion(cs, false));
        cargarTodo();
      } else {
        setSinPermiso(true);
        setCargando(false);
      }
    });
  }

  function cargarPorLiberar() {
    supabase.rpc('pagos_por_liberar').then(function (r) { setPorLiberar(r.error ? [] : (r.data || [])); });
  }

  function cargarPortada() {
    supabase.from('home_config').select('*').eq('id', 1).maybeSingle()
      .then(function (r) { if (r.data) setPortada(r.data); });
  }

  function cargarInteresados() {
    supabase.from('maestros_interesados').select('*').order('creado_en', { ascending: false })
      .then(function (r) { setInteresados(r.error ? [] : (r.data || [])); });
  }

  function marcarContactado(it) {
    supabase.from('maestros_interesados').update({ contactado: !it.contactado }).eq('id', it.id)
      .then(function () { cargarInteresados(); });
  }

  function cancelarReservaAdmin(r) {
    var pagada = ['pagado', 'retenido', 'completado'].indexOf((r.estado || '').toLowerCase()) >= 0;
    var aviso = pagada
      ? '¿Cancelar esta reserva PAGADA? Recuerda hacer el reembolso de ' + plata(r.precio_cotizado) + ' al cliente en MercadoPago.'
      : '¿Cancelar esta reserva? (no había pago)';
    if (typeof window !== 'undefined' && !window.confirm(aviso)) return;
    supabase.rpc('cancelar_reserva', { p_reserva_id: r.id }).then(function (res) {
      if (res.error) { setMsg('Error al cancelar: ' + res.error.message); return; }
      cargarTodo();
    });
  }

  function guardarPortada(extra) {
    var fila = Object.assign({ id: 1 }, portada, extra || {});
    fila.actualizado_en = new Date().toISOString();
    setPortadaMsg('Guardando...');
    supabase.from('home_config').upsert(fila, { onConflict: 'id' }).select().single()
      .then(function (r) {
        if (r.error) { setPortadaMsg('Error: ' + r.error.message); return; }
        setPortada(r.data); setPortadaMsg('Guardado ✓');
        setTimeout(function () { setPortadaMsg(null); }, 2500);
      });
  }

  function togglePortada() {
    var nuevo = !portada.portada_activa;
    setPortada(function (p) { return Object.assign({}, p, { portada_activa: nuevo }); });
    guardarPortada({ portada_activa: nuevo });
  }

  function liberarPago(reservaId) {
    setLiberandoId(reservaId);
    supabase.rpc('liberar_pago', { p_reserva_id: reservaId }).then(function (r) {
      setLiberandoId(null);
      if (r.error) { setMsg('Error al liberar: ' + r.error.message); return; }
      cargarPorLiberar();
    });
  }

  function cargarTodo() {
    cargarPorLiberar();
    cargarPortada();
    cargarInteresados();
    Promise.all([
      supabase.from('verificaciones').select('*').order('creado_at', { ascending: false }),
      supabase.from('maestros').select('*'),
      supabase.from('perfiles').select('*').order('creado_en', { ascending: false }),
      supabase.from('reservas').select('*').order('creado_en', { ascending: false }).limit(50),
      supabase.from('pagos').select('*').order('creado_en', { ascending: false }).limit(50),
      supabase.from('resenas').select('*').order('creado_en', { ascending: false }).limit(25),
      supabase.from('mensajes').select('*').order('creado_en', { ascending: true }).limit(2000),
      supabase.from('presupuestos').select('*').order('creado_en', { ascending: false }),
      supabase.from('cotizaciones').select('*'),
      supabase.from('denuncias').select('*').order('creado_en', { ascending: false }),
      supabase.from('comunicados').select('*').order('creado_en', { ascending: false }),
      supabase.from('lista_espera').select('*').order('creado_en', { ascending: false }),
      supabase.from('catalogos').select('*').order('tipo', { ascending: true }).order('orden', { ascending: true }),
      supabase.from('mensajes_soporte').select('*').order('creado_en', { ascending: true }),
    ]).then(function (rs) {
      setVerifs(rs[0].data || []);
      setMaestros(rs[1].data || []);
      setPerfiles(rs[2].data || []);
      setReservas(rs[3].data || []);
      setPagos(rs[4].data || []);
      setResenas(rs[5].data || []);
      setMensajes(rs[6].data || []);
      setPresupuestos(rs[7].data || []);
      setCotizaciones(rs[8].data || []);
      setDenuncias(rs[9].data || []);
      setComunicados(rs[10].data || []);
      setListaEspera(rs[11].data || []);
      setCatalogos(rs[12].data || []);
      setMsop(rs[13].data || []);
      setCargando(false);
      (rs[0].data || []).forEach(function (v) {
        if (!v.carnet_path || v.estado !== 'pendiente') return;
        Promise.all([
          supabase.storage.from('verificaciones').createSignedUrl(v.carnet_path, 3600),
          supabase.storage.from('verificaciones').createSignedUrl(v.selfie_path, 3600),
        ]).then(function (us) {
          setUrls(function (prev) {
            const n = { ...prev };
            n[v.id] = { carnet: us[0].data ? us[0].data.signedUrl : null, selfie: us[1].data ? us[1].data.signedUrl : null };
            return n;
          });
        });
      });
    });
  }

  function entrar(e) {
    if (e) e.preventDefault();
    setEntrando(true); setAuthMsg(null);
    supabase.auth.signInWithPassword({ email: email.trim(), password: pass }).then(function (r) {
      setEntrando(false);
      if (r.error) { setAuthMsg('Correo o contraseña incorrectos'); return; }
      const u = r.data && r.data.user;
      setUsuario(u || null);
      if (u) { setCargando(true); resolverAcceso(u); }
    });
  }
  function conEnlace(e) {
    if (e) e.preventDefault();
    if (!email.trim()) { setAuthMsg('Escribe tu correo'); return; }
    setEntrando(true); setAuthMsg(null);
    const base = (typeof window !== 'undefined' ? window.location.origin : 'https://www.maestrosenlinea.cl');
    supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: base + '/admin' } }).then(function (r) {
      setEntrando(false);
      if (r.error) { setAuthMsg(r.error.message); return; }
      setAuthMsg('Te enviamos un enlace de acceso a ' + email.trim() + '. Ábrelo en este dispositivo para entrar.');
    });
  }
  function conGoogle() {
    const base = (typeof window !== 'undefined' ? window.location.origin : 'https://www.maestrosenlinea.cl');
    supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: base + '/admin' } });
  }
  function salir() {
    supabase.auth.signOut().then(function () { setUsuario(null); });
  }

  function nombreDe(id) {
    const p = perfiles.find(function (x) { return x.id === id; });
    return p ? (p.nombre || (id ? id.slice(0, 8) : '—')) : (id ? id.slice(0, 8) : '—');
  }
  function plata(n) { return '$' + (n || 0).toLocaleString('es-CL'); }
  function fecha(f) { return f ? new Date(f).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'; }

  function aprobar(v) {
    supabase.from('verificaciones').update({ estado: 'aprobado', revisado_at: new Date().toISOString(), notas: null }).eq('id', v.id)
      .then(function (r) {
        if (r.error) { setMsg(r.error.message); return; }
        supabase.storage.from('verificaciones').remove([v.carnet_path, v.selfie_path]);
        supabase.from('maestros').update({ verificado: true }).eq('id', v.user_id).then(function () { cargarTodo(); });
      });
  }
  function rechazar(v) {
    const motivo = window.prompt('Motivo del rechazo (lo vera el maestro):', 'Fotos poco legibles');
    if (motivo === null) return;
    supabase.from('verificaciones').update({ estado: 'rechazado', revisado_at: new Date().toISOString(), notas: motivo }).eq('id', v.id)
      .then(function (r) { if (r.error) setMsg(r.error.message); else cargarTodo(); });
  }
  function suspender(m, valor) {
    supabase.from('maestros').update({ suspendido: valor, disponible: !valor }).eq('id', m.id)
      .then(function (r) { if (r.error) setMsg(r.error.message); else cargarTodo(); });
  }
  function aprobarMaestro(m) {
    const v = verifs.find(function (x) { return x.user_id === m.id && x.estado === 'pendiente'; });
    if (v) { aprobar(v); return; }
    supabase.from('maestros').update({ verificado: true }).eq('id', m.id)
      .then(function (r) { if (r.error) setMsg(r.error.message); else cargarTodo(); });
  }
  function mensajeMaestro(m) {
    const txt = window.prompt('Mensaje para ' + nombreDe(m.id) + ' (le llega por correo):', '');
    if (txt === null || !txt.trim()) return;
    fetch('/api/notificar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'admin_mensaje', maestroId: m.id, mensaje: txt.trim() }) })
      .then(function () { setMsg('Mensaje enviado a ' + nombreDe(m.id) + ' ✓'); })
      .catch(function () { setMsg('No se pudo enviar el mensaje'); });
  }
  function eliminarMaestro(m) {
    if (!window.confirm('¿Eliminar definitivamente a este maestro? Se borra su ficha de la plataforma. Esta acción no se puede deshacer.')) return;
    supabase.from('maestros').delete().eq('id', m.id)
      .then(function (r) { if (r.error) setMsg('No se pudo eliminar: ' + r.error.message); else cargarTodo(); });
  }
  function eliminarCliente(p) {
    if (!window.confirm('¿Eliminar definitivamente a este cliente? Se borra su perfil de la plataforma. Esta acción no se puede deshacer.')) return;
    supabase.from('perfiles').delete().eq('id', p.id)
      .then(function (r) { if (r.error) setMsg('No se pudo eliminar: ' + r.error.message); else cargarTodo(); });
  }
  function resolverDenuncia(d) {
    const nota = window.prompt('Nota de resolución (queda en el registro):', '');
    if (nota === null) return;
    supabase.from('denuncias').update({ estado: 'resuelta', nota_admin: nota, resuelto_en: new Date().toISOString() }).eq('id', d.id)
      .then(function (r) { if (r.error) setMsg(r.error.message); else cargarTodo(); });
  }
  function publicarComunicado() {
    if (!cTitulo.trim() || !cCuerpo.trim()) { setMsg('Escribe título y mensaje'); return; }
    supabase.from('comunicados').insert({ titulo: cTitulo.trim(), cuerpo: cCuerpo.trim(), segmento: cSegmento, activo: true })
      .then(function (r) {
        if (r.error) { setMsg('Error: ' + r.error.message); return; }
        setCTitulo(''); setCCuerpo(''); cargarTodo();
      });
  }
  function toggleComunicado(c) {
    supabase.from('comunicados').update({ activo: !c.activo }).eq('id', c.id)
      .then(function (r) { if (r.error) setMsg(r.error.message); else cargarTodo(); });
  }
  function borrarComunicado(c) {
    if (!window.confirm('¿Borrar este comunicado?')) return;
    supabase.from('comunicados').delete().eq('id', c.id)
      .then(function (r) { if (r.error) setMsg(r.error.message); else cargarTodo(); });
  }
  function borrarLead(e) {
    if (!window.confirm('¿Borrar este lead (' + e.email + ')? Esta acción no se puede deshacer.')) return;
    supabase.from('lista_espera').delete().eq('id', e.id)
      .then(function (r) { if (r.error) setMsg('No se pudo borrar: ' + r.error.message); else cargarTodo(); });
  }
  function slugify(s) {
    return ('' + s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 40);
  }
  function agregarCatalogo(tipo) {
    var valor = (nuevoCat[tipo] || '').trim();
    if (!valor) return;
    var maxOrden = catalogos.filter(function (c) { return c.tipo === tipo; }).reduce(function (m, c) { return Math.max(m, c.orden || 0); }, 0);
    var fila = { tipo: tipo, valor: valor, orden: maxOrden + 1, activo: true };
    if (tipo === 'especialidad') fila.slug = slugify(valor);
    supabase.from('catalogos').insert(fila).then(function (r) {
      if (r.error) { setMsg('No se pudo agregar: ' + r.error.message); return; }
      setNuevoCat(function (p) { var n = { ...p }; n[tipo] = ''; return n; });
      cargarTodo();
    });
  }
  function quitarCatalogo(c) {
    if (!window.confirm('¿Quitar "' + c.valor + '" del catálogo?')) return;
    supabase.from('catalogos').delete().eq('id', c.id)
      .then(function (r) { if (r.error) setMsg('No se pudo quitar: ' + r.error.message); else cargarTodo(); });
  }
  function eliminarPedido(p) {
    if (!window.confirm('¿Eliminar este pedido y toda su conversación y cotizaciones? No se puede deshacer.')) return;
    supabase.rpc('admin_borrar_pedido', { p_id: p.id })
      .then(function (r) { if (r.error) setMsg('No se pudo eliminar: ' + r.error.message); else cargarTodo(); });
  }
  function abrirChatMaestro(mid) {
    setChatMaestro(mid);
    supabase.from('mensajes_soporte').update({ leido: true }).eq('maestro_id', mid).eq('autor', 'maestro').eq('leido', false).then(function () {});
  }
  function enviarSoporte() {
    if (!chatMaestro || !chatTxt.trim()) return;
    supabase.from('mensajes_soporte').insert({ maestro_id: chatMaestro, autor: 'admin', texto: chatTxt.trim() })
      .then(function (r) { if (r.error) { setMsg(r.error.message); return; } setChatTxt(''); cargarTodo(); });
  }

  const wrap = { maxWidth: 1150, margin: '0 auto', padding: 16 };
  const card = { background: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, border: '1.5px solid #eee' };
  const th = { textAlign: 'left', fontWeight: 700, padding: '6px 6px', color: '#7c8499', fontSize: 12 };
  const td = { padding: '8px 6px', fontSize: 13, borderTop: '1px solid #f1f1f1' };
  const inp = { width: '100%', padding: 10, border: '1.5px solid #ddd', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', marginBottom: 8 };
  const btnS = { fontSize: 12, padding: '5px 10px', borderRadius: 8, border: '1.5px solid #ddd', background: '#fff', cursor: 'pointer', fontWeight: 700 };
  const tag = function (texto, tipo) {
    const c = tipo === 'ok' ? ['#f2fbf6', '#0d9456'] : tipo === 'mal' ? ['#eef4ff', '#b3261e'] : ['#eef4ff', '#b07a1e'];
    return <span style={{ background: c[0], color: c[1], borderRadius: 8, padding: '3px 9px', fontSize: 11, fontWeight: 800 }}>{texto}</span>;
  };
  const kpi = function (titulo, valor, color) {
    return <div style={{ ...card, marginBottom: 0 }}><div style={{ fontSize: 12, color: '#7c8499' }}>{titulo}</div><div style={{ fontSize: 25, fontWeight: 800, color: color || '#1c1f2b' }}>{valor}</div></div>;
  };

  if (cargando) return <main style={wrap}><p>Cargando panel...</p></main>;

  // ---- Sin sesión: pantalla de acceso PROPIA del panel ----
  if (!usuario) return (
    <main>
      <div className="darkhead" style={{ textAlign: 'center', paddingBottom: 22 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: '#22d3ee' }}>{'\u{1F6E0} PANEL DE ADMINISTRACIÓN'}</div>
        <h2 style={{ margin: '12px 0 2px' }}>MaestrosEnLínea</h2>
        <div style={{ color: '#b9c0d4', fontSize: 13 }}>Acceso solo para el equipo</div>
      </div>
      <div className="body" style={{ maxWidth: 380, margin: '0 auto', paddingTop: 20 }}>
        <form onSubmit={entrar}>
          <input type="email" value={email} onChange={function (e) { setEmail(e.target.value); }} placeholder="Correo" style={{ ...inp, padding: 12 }} />
          <input type="password" value={pass} onChange={function (e) { setPass(e.target.value); }} placeholder="Contraseña" style={{ ...inp, padding: 12 }} />
          {authMsg && <p style={{ color: '#b3261e', fontSize: 13, margin: '2px 0 8px' }}>{authMsg}</p>}
          <button type="submit" className="gbtn full" disabled={entrando} style={{ opacity: entrando ? 0.6 : 1 }}>{entrando ? 'Entrando...' : 'Entrar al panel'}</button>
        </form>
        <div style={{ textAlign: 'center', color: '#9aa1b5', fontSize: 12, margin: '14px 0 10px' }}>o</div>
        <button onClick={conEnlace} disabled={entrando} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1.5px solid #e4e4ef', background: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 10 }}>{'\u{2709}\u{FE0F} Entrar con enlace por correo'}</button>
        <button onClick={conGoogle} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1.5px solid #e4e4ef', background: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{'\u{1F310} Continuar con Google'}</button>
      </div>
    </main>
  );

  // ---- Con sesión pero sin permisos de panel ----
  if (sinPermiso || (!esSuper && cats.length === 0)) return (
    <main style={wrap}>
      <h2>Acceso restringido</h2>
      <p style={{ color: '#7c8499', fontSize: 14 }}>La cuenta <b>{usuario.email}</b> no tiene acceso al panel. Pide al administrador que te habilite.</p>
      <button onClick={salir} style={{ ...btnS, marginTop: 10, padding: '8px 14px' }}>Cerrar sesión</button>
    </main>
  );

  // ---- métricas ----
  const pendientes = verifs.filter(function (v) { return v.estado === 'pendiente'; });
  const verifSinFicha = pendientes.filter(function (v) { return !maestros.some(function (m) { return m.id === v.user_id; }); });
  const soporteNoLeidos = msop.filter(function (m) { return m.autor === 'maestro' && !m.leido; }).length;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const reservasHoy = reservas.filter(function (r) { return new Date(r.creado_en) >= hoy; }).length;
  const comisionMes = pagos.filter(function (p) { return new Date(p.creado_en) >= inicioMes; })
    .reduce(function (s, p) { return s + (p.comision_plataforma || 0); }, 0);
  const activos = maestros.filter(function (m) { return !m.suspendido; }).length;
  const disputasAbiertas = denuncias.filter(function (d) { return d.estado === 'abierta'; }).length;

  // embudo
  const totalSolic = presupuestos.length;
  const presConCotiz = {};
  cotizaciones.forEach(function (c) { presConCotiz[c.presupuesto_id] = true; });
  const solicCotizadas = Object.keys(presConCotiz).length;
  const totalReservas = reservas.length;
  const convPct = totalSolic ? Math.round(totalReservas / totalSolic * 100) : 0;
  const gmv = reservas.reduce(function (s, r) { return s + (r.precio_cotizado || 0); }, 0);

  // tiempo a primera cotización (horas, promedio)
  const primeraCotizDe = {};
  cotizaciones.forEach(function (c) {
    if (!c.creado_en) return;
    const t = new Date(c.creado_en).getTime();
    if (!primeraCotizDe[c.presupuesto_id] || t < primeraCotizDe[c.presupuesto_id]) primeraCotizDe[c.presupuesto_id] = t;
  });
  let sumaHoras = 0, nTiempos = 0;
  presupuestos.forEach(function (p) {
    if (primeraCotizDe[p.id] && p.creado_en) {
      const h = (primeraCotizDe[p.id] - new Date(p.creado_en).getTime()) / 3600000;
      if (h >= 0) { sumaHoras += h; nTiempos++; }
    }
  });
  const tiempoMedio = nTiempos ? (sumaHoras / nTiempos) : null;
  const tiempoTxt = tiempoMedio === null ? '—' : tiempoMedio < 1 ? Math.round(tiempoMedio * 60) + ' min' : (Math.round(tiempoMedio * 10) / 10) + ' h';

  // top comunas / oficios (demanda)
  function topDe(campo) {
    const m = {};
    presupuestos.forEach(function (p) { const k = p[campo] || '—'; m[k] = (m[k] || 0) + 1; });
    return Object.keys(m).map(function (k) { return { k: k, n: m[k] }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 6);
  }
  const topComunas = topDe('comuna');
  const topOficios = topDe('oficio');

  // por maestro
  const cotizPorM = {}; cotizaciones.forEach(function (c) { cotizPorM[c.maestro_id] = (cotizPorM[c.maestro_id] || 0) + 1; });
  const reservasPorM = {}; reservas.forEach(function (r) { reservasPorM[r.maestro_id] = (reservasPorM[r.maestro_id] || 0) + 1; });

  const maestrosFiltrados = maestros.filter(function (m) {
    if (!busca) return true;
    const n = (nombreDe(m.id) + ' ' + (m.oficio || '')).toLowerCase();
    return n.indexOf(busca.toLowerCase()) >= 0;
  });

  // pipeline de onboarding
  const verifPorUser = {}; verifs.forEach(function (v) { if (!verifPorUser[v.user_id]) verifPorUser[v.user_id] = v.estado; });
  function etapaDe(m) {
    if (m.suspendido) return 'Suspendido';
    if (m.verificado) return 'Activo';
    if (verifPorUser[m.id] === 'pendiente') return 'En revisión';
    return 'Sin verificar';
  }
  const etapas = { 'Sin verificar': [], 'En revisión': [], 'Activo': [], 'Suspendido': [] };
  maestros.forEach(function (m) { (etapas[etapaDe(m)] = etapas[etapaDe(m)] || []).push(m); });
  const perfMaestros = perfiles.filter(function (p) { return p.rol === 'maestro'; });
  const maestroIds = {}; maestros.forEach(function (m) { maestroIds[m.id] = true; });
  const sinFicha = perfMaestros.filter(function (p) { return !maestroIds[p.id]; });
  const sinFichaResto = sinFicha.filter(function (p) { var v = verifs.find(function (x) { return x.user_id === p.id; }); return !v || v.estado !== 'pendiente'; });

  // hilos de conversación
  const presById = {};
  presupuestos.forEach(function (p) { presById[p.id] = p; });
  const hilosMap = {};
  mensajes.forEach(function (m) {
    const k = m.presupuesto_id + '|' + m.maestro_id;
    if (!hilosMap[k]) hilosMap[k] = { key: k, presupuesto_id: m.presupuesto_id, maestro_id: m.maestro_id, msgs: [], flag: false };
    hilosMap[k].msgs.push(m);
    if (flagContacto(m.texto)) hilosMap[k].flag = true;
  });
  const hilos = Object.keys(hilosMap).map(function (k) { return hilosMap[k]; }).sort(function (a, b) {
    const la = a.msgs[a.msgs.length - 1].creado_en, lb = b.msgs[b.msgs.length - 1].creado_en;
    return la < lb ? 1 : -1;
  });
  const hilosFlag = hilos.filter(function (h) { return h.flag; }).length;
  const porLiberarCount = porLiberar.filter(function (x) { return x.trabajo_confirmado && !x.liberado; }).length;

  return (
    <main style={wrap}>
      <style>{`body{max-width:100% !important}@media (max-width:640px){.tcards thead{display:none}.tcards,.tcards tbody,.tcards tr{display:block;width:100%}.tcards tr{border:1px solid #e7ebf2;border-radius:12px;margin:0 0 10px;padding:8px 12px;background:#fff}.tcards td{display:block;border:none !important;padding:5px 0 !important;font-size:13px}.tcards td[data-l]{display:flex;justify-content:space-between;gap:12px;align-items:center}.tcards td[data-l]::before{content:attr(data-l);color:#9aa1b5;font-weight:600;font-size:12px}}`}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>{'\u{1F6E0} Panel de administración'}</h2>
          <span style={{ fontSize: 12, color: '#9aa1b5' }}>{usuario.email}</span>
        </div>
        <button onClick={salir} style={{ background: 'none', border: '1.5px solid #f0c8c2', color: '#b3261e', fontWeight: 800, fontSize: 12, cursor: 'pointer', borderRadius: 10, padding: '6px 12px' }}>Cerrar sesión</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        {CATEGORIAS.filter(function (categoria) { return esSuper || cats.indexOf(categoria.id) >= 0; }).map(function (categoria) {
          var secs = SECCIONES.filter(function (s) { return s.cat === categoria.id && (esSuper || !s.soloSuper); });
          if (!secs.length) return null;
          return (
            <div key={categoria.id} style={{ marginBottom: 8 }}>
              {esSuper && <div style={{ fontSize: 10, fontWeight: 800, color: '#b3b8c6', textTransform: 'uppercase', letterSpacing: '.05em', margin: '2px 2px 4px' }}>{categoria.icono + ' ' + categoria.nombre}</div>}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {secs.map(function (s) {
                  const on = seccion === s.id;
                  const badge = s.id === 'maestros' ? pendientes.length : s.id === 'disputas' ? disputasAbiertas : s.id === 'mensajes' ? soporteNoLeidos : s.id === 'liberar' ? porLiberarCount : 0;
                  return (
                    <button key={s.id} onClick={function () { setSeccion(s.id); }}
                      style={{ fontSize: 12, fontWeight: 800, padding: '7px 13px', borderRadius: 10, border: 'none', cursor: 'pointer', background: on ? '#2563eb' : '#fff', color: on ? '#fff' : '#7c8499', boxShadow: on ? 'none' : 'inset 0 0 0 1.5px #eee' }}>
                      {s.icono + ' ' + s.nombre}
                      {badge > 0 && <span style={{ marginLeft: 5, background: on ? '#fff' : '#2563eb', color: on ? '#2563eb' : '#fff', borderRadius: 8, padding: '1px 6px', fontSize: 10 }}>{badge}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {msg && <p style={{ color: '#b3261e', fontSize: 13 }}>{msg}</p>}

      {/* ---------------- MAESTROS INTERESADOS ---------------- */}
      {seccion === 'interesados' && (
        <div style={card}>
          <b style={{ fontSize: 14 }}>{'\u{1F9F0} Maestros interesados (' + interesados.length + ')'}</b>
          <div style={{ fontSize: 12, color: '#9aa1b5', margin: '4px 0 8px' }}>Inscritos desde la portada (antes del lanzamiento). Contáctalos por WhatsApp para activarlos.</div>
          {interesados.length === 0 && <p style={{ fontSize: 13, color: '#9aa1b5', marginTop: 8 }}>Aún no hay maestros inscritos.</p>}
          {interesados.map(function (it) {
            var wnum = (it.whatsapp || '').replace(/\D/g, '');
            if (wnum.length === 8) wnum = '569' + wnum; else if (wnum.length === 9) wnum = '56' + wnum;
            return (
              <div key={it.id} style={{ borderTop: '1px solid #f1f1f5', padding: '11px 0', opacity: it.contactado ? 0.55 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <b style={{ fontSize: 13.5 }}>{it.nombre}</b>
                  <span style={{ fontSize: 10.5, color: '#9aa1b5' }}>{fecha(it.creado_en)}</span>
                </div>
                <div style={{ fontSize: 12, color: '#5b6275', margin: '2px 0' }}>{[it.oficio, it.comuna].filter(Boolean).join(' · ') || 'Sin oficio/comuna'}</div>
                {it.referido_por && <div style={{ fontSize: 11, color: '#b07a1e' }}>{'Invitado por: ' + it.referido_por}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {wnum && <a href={'https://wa.me/' + wnum} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', background: '#e8f7ef', border: '1px solid #bfe6cf', color: '#0d9456', borderRadius: 9, padding: '6px 11px', fontSize: 12, fontWeight: 800 }}>{'\u{1F4AC} ' + (it.whatsapp || 'WhatsApp')}</a>}
                  <button onClick={function () { marcarContactado(it); }} style={{ border: '1px solid #e4e4ef', background: it.contactado ? '#eef0f5' : '#fff', color: '#5b6275', borderRadius: 9, padding: '6px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{it.contactado ? '✓ Contactado' : 'Marcar contactado'}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- PORTADA (home on/off) ---------------- */}
      {seccion === 'comision' && (
        <div style={card}>
          <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>{'\u{1F4B8}'} Comisión de la plataforma</h2>
          <p style={{ fontSize: 13, color: '#7c8499', margin: '0 0 14px', lineHeight: 1.5 }}>Porcentaje que se suma a cada cotización. Lo paga el cliente y el maestro recibe su precio completo. Se calcula sobre la mano de obra. Déjalo en 0% durante la marcha blanca; cuando está en 0 no aparece ninguna línea de comisión.</p>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#5b6275' }}>Porcentaje (%)</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6, maxWidth: 240 }}>
            <input type="number" min="0" max="40" step="0.5" value={portada.comision_pct == null ? 0 : portada.comision_pct} onChange={function (e) { var v = e.target.value; setPortada(function (p) { return Object.assign({}, p, { comision_pct: v }); }); }} style={{ flex: 1, padding: 11, border: '1.5px solid #e4e4ef', borderRadius: 10, fontSize: 15, boxSizing: 'border-box' }} />
            <span style={{ fontSize: 18, fontWeight: 800, color: '#1c2230' }}>%</span>
          </div>
          <div style={{ fontSize: 12, color: '#7c8499', margin: '8px 0 14px' }}>{'Ejemplo: mano de obra $10.000 con ' + (Number(portada.comision_pct) || 0) + '% \u2192 comisión ' + plata(Math.round(10000 * ((Number(portada.comision_pct) || 0) / 100)))}</div>
          <button onClick={function () { guardarPortada({ comision_pct: Number(portada.comision_pct) || 0 }); }} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 24px', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Guardar</button>
          {portadaMsg && <span style={{ marginLeft: 12, fontSize: 13, color: portadaMsg.indexOf('Error') >= 0 ? '#b3261e' : '#0d9456' }}>{portadaMsg}</span>}
        </div>
      )}
      {seccion === 'lanzamiento' && (
        <div>
          <div style={{ ...card, background: portada.prelanzamiento ? 'linear-gradient(160deg,#0e1a38,#13224a)' : '#fff', color: portada.prelanzamiento ? '#fff' : '#1c1f2b', border: portada.prelanzamiento ? 'none' : '1px solid #eef0f5' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 15 }}>{'\u{1F680} Modo prelanzamiento'}</b>
                <div style={{ fontSize: 12.5, color: portada.prelanzamiento ? 'rgba(255,255,255,.8)' : '#7c8499', marginTop: 4, lineHeight: 1.45 }}>
                  {portada.prelanzamiento
                    ? 'ENCENDIDO: el home muestra el aviso y los pedidos de los clientes NO le llegan a los maestros (se guardan en espera).'
                    : 'APAGADO: app lanzada. El aviso no aparece y los maestros reciben todos los pedidos.'}
                </div>
              </div>
              <button onClick={function () { var nuevo = !portada.prelanzamiento; setPortada(function (p) { return Object.assign({}, p, { prelanzamiento: nuevo }); }); guardarPortada({ prelanzamiento: nuevo }); }} style={{ flexShrink: 0, position: 'relative', width: 64, height: 34, borderRadius: 20, border: 'none', cursor: 'pointer', background: portada.prelanzamiento ? '#f59e0b' : '#cfd3df' }}>
                <span style={{ position: 'absolute', top: 4, left: portada.prelanzamiento ? 34 : 4, width: 26, height: 26, borderRadius: '50%', background: '#fff', transition: '.15s' }} />
              </button>
            </div>
          </div>
          <div style={card}>
            <b style={{ fontSize: 14 }}>Texto del aviso (popup del home)</b>
            <div style={{ fontSize: 12, color: '#9aa1b5', margin: '4px 0 10px' }}>Lo que ven los visitantes mientras el modo est\u00e9 encendido. Pueden inscribirse igual.</div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#5b6275' }}>T\u00edtulo</label>
            <input style={inp} value={portada.aviso_titulo || ''} onChange={function (e) { var v = e.target.value; setPortada(function (p) { return Object.assign({}, p, { aviso_titulo: v }); }); }} />
            <label style={{ fontSize: 12, fontWeight: 700, color: '#5b6275' }}>Texto</label>
            <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={portada.aviso_texto || ''} onChange={function (e) { var v = e.target.value; setPortada(function (p) { return Object.assign({}, p, { aviso_texto: v }); }); }} />
            <button onClick={function () { guardarPortada(); }} style={{ marginTop: 4, width: '100%', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12, padding: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Guardar texto</button>
          </div>
          {portada.prelanzamiento && (
            <button onClick={function () { if (!window.confirm('\u00bfLanzar la app? El aviso desaparece y TODOS los pedidos acumulados pasan a verse por los maestros.')) return; setPortada(function (p) { return Object.assign({}, p, { prelanzamiento: false }); }); guardarPortada({ prelanzamiento: false }); }} style={{ width: '100%', background: 'linear-gradient(135deg,#22d3ee,#2563eb)', color: '#fff', border: 'none', borderRadius: 14, padding: 15, fontWeight: 800, fontSize: 15.5, cursor: 'pointer' }}>{'\u{1F680} Lanzar app ahora'}</button>
          )}
          {portadaMsg && <p style={{ fontSize: 12.5, textAlign: 'center', color: portadaMsg.indexOf('Error') >= 0 ? '#b3261e' : '#0d9456', marginTop: 8 }}>{portadaMsg}</p>}
        </div>
      )}
      {seccion === 'portada' && (
        <div>
          <div style={{ ...card, background: portada.portada_activa ? 'linear-gradient(160deg,#16181f,#2a2d3a)' : '#fff', color: portada.portada_activa ? '#fff' : '#1c1f2b', border: portada.portada_activa ? 'none' : '1px solid #eef0f5' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <b style={{ fontSize: 15 }}>{'\u{1FAA7} Portada de lanzamiento'}</b>
                <div style={{ fontSize: 12.5, color: portada.portada_activa ? 'rgba(255,255,255,.8)' : '#7c8499', marginTop: 4, lineHeight: 1.45 }}>
                  {portada.portada_activa
                    ? 'ENCENDIDA: los clientes ven la portada "PRONTO". Tú (admin) sigues viendo la app real.'
                    : 'APAGADA: los clientes ven el home real con los maestros.'}
                </div>
              </div>
              <button onClick={togglePortada} style={{ flexShrink: 0, position: 'relative', width: 64, height: 34, borderRadius: 20, border: 'none', cursor: 'pointer', background: portada.portada_activa ? '#25c26e' : '#cfd3df' }}>
                <span style={{ position: 'absolute', top: 4, left: portada.portada_activa ? 34 : 4, width: 26, height: 26, borderRadius: '50%', background: '#fff', transition: '.15s' }} />
              </button>
            </div>
          </div>

          <div style={card}>
            <b style={{ fontSize: 14 }}>Contenido de la portada</b>
            <div style={{ fontSize: 12, color: '#9aa1b5', margin: '4px 0 10px' }}>Edita lo que se muestra y guarda. Cambia al instante en la portada pública.</div>

            <label style={{ fontSize: 12, fontWeight: 700, color: '#5b6275' }}>Título</label>
            <input style={inp} value={portada.titulo || ''} onChange={function (e) { var v = e.target.value; setPortada(function (p) { return Object.assign({}, p, { titulo: v }); }); }} />

            <label style={{ fontSize: 12, fontWeight: 700, color: '#5b6275' }}>Subtítulo</label>
            <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={portada.subtitulo || ''} onChange={function (e) { var v = e.target.value; setPortada(function (p) { return Object.assign({}, p, { subtitulo: v }); }); }} />

            <label style={{ fontSize: 12, fontWeight: 700, color: '#5b6275' }}>Etiqueta (badge)</label>
            <input style={inp} value={portada.badge || ''} onChange={function (e) { var v = e.target.value; setPortada(function (p) { return Object.assign({}, p, { badge: v }); }); }} />

            <label style={{ fontSize: 12, fontWeight: 700, color: '#5b6275' }}>URL de la foto</label>
            <input style={inp} placeholder="https://..." value={portada.foto_url || ''} onChange={function (e) { var v = e.target.value; setPortada(function (p) { return Object.assign({}, p, { foto_url: v }); }); }} />
            {portada.foto_url
              ? <img src={portada.foto_url} alt="" style={{ width: '100%', borderRadius: 12, marginTop: 6, maxHeight: 200, objectFit: 'cover' }} />
              : <div style={{ fontSize: 11.5, color: '#9aa1b5', marginTop: 4 }}>Sin foto: se muestra una ilustración por defecto.</div>}

            <button onClick={function () { guardarPortada(); }} style={{ marginTop: 12, width: '100%', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12, padding: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Guardar portada</button>
            {portadaMsg && <p style={{ fontSize: 12.5, textAlign: 'center', color: portadaMsg.indexOf('Error') >= 0 ? '#b3261e' : '#0d9456', marginTop: 8 }}>{portadaMsg}</p>}
          </div>

          <div style={card}>
            <b style={{ fontSize: 14 }}>{'\u{1F4E5} Inscritos en lista de espera (' + listaEspera.length + ')'}</b>
            {listaEspera.length === 0 && <p style={{ fontSize: 13, color: '#9aa1b5', marginTop: 8 }}>Todavía nadie se ha inscrito desde la portada.</p>}
            {listaEspera.slice(0, 50).map(function (l) {
              return (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f4f4f7', padding: '8px 0', fontSize: 12.5 }}>
                  <span>{l.email}</span>
                  <span style={{ color: '#9aa1b5' }}>{fecha(l.creado_en)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- RESUMEN ---------------- */}
      {seccion === 'resumen' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 14 }}>
            {kpi('Maestros activos', activos)}
            {kpi('Solicitudes', totalSolic)}
            {kpi('Reservas', totalReservas)}
            {kpi('Conversión', convPct + '%', convPct >= 20 ? '#0d9456' : '#b07a1e')}
            {kpi('GMV total', plata(gmv))}
            {kpi('Comisión del mes', plata(comisionMes), '#0d9456')}
            {kpi('1ª cotización (prom.)', tiempoTxt)}
            {kpi('Verif. pendientes', pendientes.length, pendientes.length ? '#b07a1e' : '#1c1f2b')}
          </div>

          <div style={card}>
            <b style={{ fontSize: 14 }}>Embudo de conversión</b>
            <div style={{ marginTop: 10 }}>
              {[['Solicitudes', totalSolic], ['Con cotización', solicCotizadas], ['Agendadas (reservas)', totalReservas]].map(function (row, i) {
                const pct = totalSolic ? Math.round(row[1] / totalSolic * 100) : 0;
                return (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#5b6275', marginBottom: 3 }}><span>{row[0]}</span><span>{row[1] + ' · ' + pct + '%'}</span></div>
                    <div style={{ background: '#f1f1f5', borderRadius: 6, height: 10 }}><div style={{ width: pct + '%', background: '#2563eb', height: 10, borderRadius: 6 }} /></div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <div style={card}>
              <b style={{ fontSize: 14 }}>Top comunas (demanda)</b>
              {topComunas.length === 0 && <div style={{ fontSize: 12, color: '#9aa1b5', marginTop: 6 }}>Sin datos</div>}
              {topComunas.map(function (c, i) { return <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderTop: i ? '1px solid #f4f4f7' : 'none' }}><span>{c.k}</span><b>{c.n}</b></div>; })}
            </div>
            <div style={card}>
              <b style={{ fontSize: 14 }}>Top oficios (demanda)</b>
              {topOficios.length === 0 && <div style={{ fontSize: 12, color: '#9aa1b5', marginTop: 6 }}>Sin datos</div>}
              {topOficios.map(function (c, i) { return <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderTop: i ? '1px solid #f4f4f7' : 'none' }}><span style={{ textTransform: 'capitalize' }}>{c.k}</span><b>{c.n}</b></div>; })}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- ONBOARDING / PIPELINE ---------------- */}
      {seccion === 'pipeline' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            {[['Sin ficha', sinFicha.length, '#9aa1b5'], ['Sin verificar', etapas['Sin verificar'].length, '#b07a1e'], ['En revisión', etapas['En revisión'].length, '#b07a1e'], ['Activos', etapas['Activo'].length, '#0d9456'], ['Suspendidos', etapas['Suspendido'].length, '#b3261e']].map(function (e, i) {
              return <div key={i} style={{ ...card, marginBottom: 0 }}><div style={{ fontSize: 12, color: '#7c8499' }}>{e[0]}</div><div style={{ fontSize: 24, fontWeight: 800, color: e[2] }}>{e[1]}</div></div>;
            })}
          </div>
          {['Sin verificar', 'En revisión', 'Activo', 'Suspendido'].map(function (et) {
            return (
              <div key={et} style={card}>
                <b style={{ fontSize: 14 }}>{et + ' (' + etapas[et].length + ')'}</b>
                {etapas[et].length === 0 && <div style={{ fontSize: 12, color: '#9aa1b5', marginTop: 6 }}>Vacío</div>}
                {etapas[et].map(function (m) {
                  return <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '7px 0', borderTop: '1px solid #f4f4f7' }}>
                    <span>{nombreDe(m.id)} <span style={{ color: '#9aa1b5' }}>· {m.oficio}</span></span>
                    <span style={{ fontSize: 11, color: '#9aa1b5' }}>{(cotizPorM[m.id] || 0) + ' cotiz · ' + (reservasPorM[m.id] || 0) + ' reservas'}</span>
                  </div>;
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- MAESTROS (scorecard) ---------------- */}
      {seccion === 'maestros' && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <b style={{ fontSize: 14 }}>{maestros.length + ' maestros'}</b>
            <input value={busca} onChange={function (e) { setBusca(e.target.value); }} placeholder="Buscar..." style={{ padding: '8px 12px', border: '1.5px solid #ddd', borderRadius: 10, fontSize: 13, width: 180 }} />
          </div>
          {verifSinFicha.length > 0 && (
            <div style={{ background: '#eef4ff', border: '1px solid #dbe7fb', borderRadius: 12, padding: 12, marginBottom: 12 }}>
              <b style={{ fontSize: 13, color: '#b07a1e' }}>{'\u{23F3} ' + verifSinFicha.length + ' en verificación (aún sin ficha publicada)'}</b>
              {verifSinFicha.map(function (v) {
                var u = urls[v.id] || {};
                var abierto = verDet === v.id;
                return (
                  <div key={v.id} style={{ borderTop: '1px solid #f4ead2', paddingTop: 8, marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 12 }}>{nombreDe(v.user_id)} <span style={{ color: '#9aa1b5' }}>{'· RUT ' + (v.rut || '—')}</span></div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button style={btnS} onClick={function () { setVerDet(abierto ? null : v.id); }}>{abierto ? 'Cerrar' : 'Ver datos'}</button>
                        <button style={{ ...btnS, color: '#0d9456', borderColor: '#bce5cf' }} onClick={function () { aprobar(v); }}>Aprobar</button>
                        <button style={{ ...btnS, color: '#b3261e', borderColor: '#f5c2c2' }} onClick={function () { rechazar(v); }}>Rechazar</button>
                      </div>
                    </div>
                    {abierto && (
                      <div style={{ background: '#fff', border: '1px solid #f0e6cf', borderRadius: 10, padding: 12, marginTop: 8 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 8, fontSize: 12, marginBottom: 10 }}>
                          <div><span style={{ color: '#9aa1b5' }}>Nombre:</span> <b>{nombreDe(v.user_id)}</b></div>
                          <div><span style={{ color: '#9aa1b5' }}>RUT:</span> <b>{v.rut || '—'}</b></div>
                          <div><span style={{ color: '#9aa1b5' }}>Teléfono:</span> <b>{v.telefono || '—'}</b></div>
                          <div><span style={{ color: '#9aa1b5' }}>Correo:</span> <b>{v.email || '—'}</b></div>
                          <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#9aa1b5' }}>Dirección:</span> <b>{v.direccion || '—'}</b></div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, color: '#9aa1b5', marginBottom: 4 }}>Carnet</div>
                            {u.carnet ? <a href={u.carnet} target="_blank" rel="noreferrer"><img src={u.carnet} alt="carnet" style={{ width: '100%', borderRadius: 8, border: '1px solid #eee' }} /></a> : <div style={{ fontSize: 12, color: '#9aa1b5' }}>Cargando…</div>}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, color: '#9aa1b5', marginBottom: 4 }}>Selfie</div>
                            {u.selfie ? <a href={u.selfie} target="_blank" rel="noreferrer"><img src={u.selfie} alt="selfie" style={{ width: '100%', borderRadius: 8, border: '1px solid #eee' }} /></a> : <div style={{ fontSize: 12, color: '#9aa1b5' }}>Cargando…</div>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                          <button style={{ ...btnS, background: '#0d9456', color: '#fff', border: 'none' }} onClick={function () { aprobar(v); }}>{'Aprobar ✓'}</button>
                          <button style={{ ...btnS, color: '#b3261e', borderColor: '#f5c2c2' }} onClick={function () { rechazar(v); }}>Rechazar</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {sinFichaResto.length > 0 && (
            <div style={{ background: '#fff8ee', border: '1px solid #f0e6cf', borderRadius: 12, padding: 12, marginBottom: 12 }}>
              <b style={{ fontSize: 13, color: '#b07a1e' }}>{'\u{1F4DD} ' + sinFichaResto.length + ' registrados sin ficha completa'}</b>
              <div style={{ fontSize: 11.5, color: '#9aa1b5', margin: '3px 0 6px' }}>Crearon su cuenta como maestro pero no completaron oficios/precios, por eso no aparecen en el directorio. Contactalos para que terminen su registro.</div>
              {sinFichaResto.map(function (p) {
                var v = verifs.find(function (x) { return x.user_id === p.id; }) || null;
                var est = v ? v.estado : null;
                var color = est === 'aprobado' ? '#0d9456' : est === 'rechazado' ? '#b3261e' : '#9aa1b5';
                var etiqueta = est === 'aprobado' ? 'VERIF. APROBADA' : est === 'rechazado' ? 'VERIF. RECHAZADA' : 'SIN VERIFICACIÓN';
                var contacto = [v && v.telefono, v && v.email].filter(Boolean).join('  \u00b7  ') || 'Sin contacto registrado';
                return (
                  <div key={p.id} style={{ borderTop: '1px solid #f4ead2', paddingTop: 7, marginTop: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 12.5 }}>
                      <b>{p.nombre || (p.id ? p.id.slice(0, 8) : 'Sin nombre')}</b>
                      <span style={{ color: color, fontWeight: 800, fontSize: 10.5, marginLeft: 8 }}>{etiqueta}</span>
                      <div style={{ fontSize: 11.5, color: '#7c8499', marginTop: 2 }}>{contacto}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table className="tcards" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead><tr><th style={th}>Nombre</th><th style={th}>Oficio</th><th style={th}>Rating</th><th style={th}>Trabajos</th><th style={th}>Cotiz.</th><th style={th}>Reservas</th><th style={th}>Estado</th><th style={th}>Acción</th></tr></thead>
              <tbody>
                {maestrosFiltrados.map(function (m) {
                  return (
                    <tr key={m.id}>
                      <td data-l="Nombre" style={td}>{nombreDe(m.id)}</td>
                      <td data-l="Oficio" style={{ ...td, color: '#7c8499' }}>{m.oficio}</td>
                      <td data-l="Rating" style={td}>{'★ ' + (m.rating_promedio || '—')}</td>
                      <td data-l="Trabajos" style={td}>{m.total_trabajos || 0}</td>
                      <td data-l="Cotiz." style={td}>{cotizPorM[m.id] || 0}</td>
                      <td data-l="Reservas" style={td}>{reservasPorM[m.id] || 0}</td>
                      <td data-l="Estado" style={td}>{m.suspendido ? tag('SUSPENDIDO', 'mal') : m.verificado ? tag('VERIFICADO', 'ok') : tag('SIN VERIF', 'pend')}</td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button style={btnS} onClick={function () { setMaestroDet(maestroDet === m.id ? null : m.id); }}>{maestroDet === m.id ? 'Cerrar' : 'Ver perfil'}</button>
                          {!m.verificado && <button style={{ ...btnS, color: '#0d9456', borderColor: '#bce5cf' }} onClick={function () { aprobarMaestro(m); }}>Aprobar</button>}
                          <button style={btnS} onClick={function () { mensajeMaestro(m); }}>Mensaje</button>
                          {m.suspendido
                            ? <button style={{ ...btnS, color: '#0d9456', borderColor: '#bce5cf' }} onClick={function () { suspender(m, false); }}>Reactivar</button>
                            : <button style={{ ...btnS, color: '#b3261e', borderColor: '#f5c2c2' }} onClick={function () { suspender(m, true); }}>Suspender</button>}
                          <button style={{ ...btnS, color: '#fff', background: '#b3261e', border: 'none' }} onClick={function () { eliminarMaestro(m); }}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {maestroDet && (function () {
            const m = maestros.find(function (x) { return x.id === maestroDet; });
            if (!m) return null;
            const perf = perfiles.find(function (p) { return p.id === m.id; }) || {};
            const vPend = verifs.find(function (x) { return x.user_id === m.id && x.estado === 'pendiente'; });
            const u = vPend ? (urls[vPend.id] || {}) : {};
            return (
              <div style={{ marginTop: 14, borderTop: '1px solid #eee', paddingTop: 14 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                  {(m.foto_url || perf.avatar_url) && <img src={m.foto_url || perf.avatar_url} alt="" style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'cover' }} />}
                  <div>
                    <b style={{ fontSize: 15 }}>{nombreDe(m.id)}</b>
                    <div style={{ fontSize: 12, color: '#7c8499' }}>{((m.oficios && m.oficios.length ? m.oficios.join(' · ') : (m.oficio || '')) + (perf.telefono ? ' · ' + perf.telefono : '')) || '—'}</div>
                  </div>
                </div>
                {m.descripcion && <div style={{ fontSize: 13, color: '#444', marginBottom: 8 }}>{m.descripcion}</div>}
                <div style={{ fontSize: 12, color: '#5b6275', marginBottom: 8 }}>{'Diagnóstico: ' + plata(m.precio_videollamada) + (m.precio_visita ? ' · Visita: ' + plata(m.precio_visita) : '') + (m.comuna ? ' · ' + m.comuna : '')}</div>
                {m.galeria && m.galeria.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 8 }}>
                    {m.galeria.map(function (g, i) { return <img key={i} src={g} alt="" style={{ height: 90, borderRadius: 8, flexShrink: 0 }} />; })}
                  </div>
                )}
                {vPend ? (
                  <div style={{ background: '#eef4ff', borderRadius: 10, padding: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#b07a1e', marginBottom: 6 }}>{'Verificación pendiente · RUT ' + (vPend.rut || '—')}</div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      {u.carnet ? <a href={u.carnet} target="_blank" rel="noreferrer" style={{ flex: 1 }}><img src={u.carnet} alt="carnet" style={{ width: '100%', borderRadius: 8, border: '1px solid #eee' }} /></a> : <div style={{ flex: 1, fontSize: 12, color: '#9aa1b5' }}>Cargando carnet...</div>}
                      {u.selfie ? <a href={u.selfie} target="_blank" rel="noreferrer" style={{ flex: 1 }}><img src={u.selfie} alt="selfie" style={{ width: '100%', borderRadius: 8, border: '1px solid #eee' }} /></a> : <div style={{ flex: 1, fontSize: 12, color: '#9aa1b5' }}>Cargando selfie...</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={{ ...btnS, background: '#0d9456', color: '#fff', border: 'none' }} onClick={function () { aprobar(vPend); }}>{'Aprobar ✓'}</button>
                      <button style={{ ...btnS, color: '#b3261e', borderColor: '#f5c2c2' }} onClick={function () { rechazar(vPend); }}>Rechazar</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#9aa1b5' }}>{m.verificado ? 'Identidad verificada ✓' : 'Aún no envió documentos de verificación.'}</div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ---------------- CLIENTES ---------------- */}
      {seccion === 'clientes' && (function () {
        const clientes = perfiles.filter(function (p) { return (p.rol || 'cliente') === 'cliente'; });
        const pedidosPorC = {}; presupuestos.forEach(function (p) { pedidosPorC[p.cliente_id] = (pedidosPorC[p.cliente_id] || 0) + 1; });
        const reservasPorC = {}; reservas.forEach(function (r) { reservasPorC[r.cliente_id] = (reservasPorC[r.cliente_id] || 0) + 1; });
        const filtrados = clientes.filter(function (p) {
          if (!busca) return true;
          return ((p.nombre || '') + ' ' + (p.telefono || '')).toLowerCase().indexOf(busca.toLowerCase()) >= 0;
        });
        return (
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <b style={{ fontSize: 14 }}>{clientes.length + ' clientes'}</b>
              <input value={busca} onChange={function (e) { setBusca(e.target.value); }} placeholder="Buscar..." style={{ padding: '8px 12px', border: '1.5px solid #ddd', borderRadius: 10, fontSize: 13, width: 180 }} />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="tcards" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead><tr><th style={th}>Nombre</th><th style={th}>Teléfono</th><th style={th}>Pedidos</th><th style={th}>Reservas</th><th style={th}>Registrado</th><th style={th}>Acción</th></tr></thead>
                <tbody>
                  {filtrados.map(function (p) {
                    return (
                      <tr key={p.id}>
                        <td data-l="Nombre" style={td}>{p.nombre || '—'}</td>
                        <td data-l="Teléfono" style={{ ...td, color: '#7c8499' }}>{p.telefono || '—'}</td>
                        <td data-l="Pedidos" style={td}>{pedidosPorC[p.id] || 0}</td>
                        <td data-l="Reservas" style={td}>{reservasPorC[p.id] || 0}</td>
                        <td data-l="Registrado" style={{ ...td, color: '#9aa1b5' }}>{fecha(p.creado_en)}</td>
                        <td style={td}><button style={{ ...btnS, color: '#fff', background: '#b3261e', border: 'none' }} onClick={function () { eliminarCliente(p); }}>Eliminar</button></td>
                      </tr>
                    );
                  })}
                  {filtrados.length === 0 && <tr><td style={td}>Sin clientes todavía</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ---------------- LEADS (lista de espera) ---------------- */}
      {seccion === 'leads' && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <b style={{ fontSize: 14 }}>{'\u{1F9F2} ' + listaEspera.length + ' leads'}</b>
            <span style={{ fontSize: 11, color: '#9aa1b5' }}>Correos del formulario "Avísenme" del home</span>
          </div>
          {listaEspera.length === 0 && <div style={{ fontSize: 12, color: '#9aa1b5' }}>Nadie se ha inscrito todavía.</div>}
          {listaEspera.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
                <thead><tr><th style={th}>Correo</th><th style={th}>Origen</th><th style={th}>Fecha</th><th style={th}>Acción</th></tr></thead>
                <tbody>
                  {listaEspera.map(function (e) {
                    return (
                      <tr key={e.id}>
                        <td style={td}>{e.email}</td>
                        <td style={td}>{tag('LISTA DE ESPERA', 'pend')}</td>
                        <td style={{ ...td, color: '#9aa1b5' }}>{fecha(e.creado_en)}</td>
                        <td style={td}><button style={{ ...btnS, color: '#fff', background: '#b3261e', border: 'none' }} onClick={function () { borrarLead(e); }}>Borrar</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------------- CATÁLOGOS ---------------- */}
      {seccion === 'catalogos' && (
        <div>
          <div style={{ fontSize: 12, color: '#9aa1b5', margin: '0 0 12px' }}>Lo que edites aquí aparece al instante en el registro de los maestros.</div>
          {[['especialidad', '\u{1F527} Especialidades', 'Nueva especialidad...'], ['tipo', '\u{1F4BC} Tipos de trabajo', 'Nuevo tipo...'], ['ofrece', '✅ Qué ofreces', 'Nuevo ítem...']].map(function (g) {
            var tipo = g[0];
            var items = catalogos.filter(function (c) { return c.tipo === tipo; });
            return (
              <div key={tipo} style={card}>
                <b style={{ fontSize: 14 }}>{g[1]}</b>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, margin: '12px 0' }}>
                  {items.length === 0 && <span style={{ fontSize: 12, color: '#9aa1b5' }}>Sin ítems todavía</span>}
                  {items.map(function (c) {
                    return (
                      <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 999, fontSize: 12.5, background: '#fff', border: '1px solid #e0e0ec', color: '#2563eb' }}>
                        {c.valor}
                        <button onClick={function () { quitarCatalogo(c); }} style={{ border: 'none', background: 'none', color: '#b3261e', fontWeight: 800, fontSize: 14, cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
                      </span>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: 7 }}>
                  <input value={nuevoCat[tipo]} onChange={function (e) { var v = e.target.value; setNuevoCat(function (p) { var n = { ...p }; n[tipo] = v; return n; }); }}
                    onKeyDown={function (e) { if (e.key === 'Enter') agregarCatalogo(tipo); }}
                    placeholder={g[2]} style={{ flex: 1, padding: '9px 11px', border: '1.5px solid #ddd', borderRadius: 9, fontSize: 13 }} />
                  <button onClick={function () { agregarCatalogo(tipo); }} style={{ background: '#26215C', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Agregar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- PEDIDOS (timeline) ---------------- */}
      {seccion === 'pedidos' && (
        <div>
          {presupuestos.length === 0 && <div style={card}><b style={{ fontSize: 14 }}>Sin pedidos todavía</b></div>}
          {presupuestos.map(function (p) {
            const cots = cotizaciones.filter(function (c) { return c.presupuesto_id === p.id; });
            const msgs = mensajes.filter(function (m) { return m.presupuesto_id === p.id; });
            const reserva = reservas.find(function (r) { return r.cliente_id === p.cliente_id && (r.descripcion_problema === p.descripcion); });
            const abierto = pedido === p.id;
            return (
              <div key={p.id} style={card}>
                <div onClick={function () { setPedido(abierto ? null : p.id); }} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ fontSize: 14, textTransform: 'capitalize' }}>{(p.oficio || 'servicio')}</b>
                    <div style={{ fontSize: 12, color: '#7c8499', maxWidth: 520, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.descripcion}</div>
                    <div style={{ fontSize: 11, color: '#9aa1b5', marginTop: 2 }}>{nombreDe(p.cliente_id) + ' · ' + (p.comuna || 's/comuna') + ' · ' + fecha(p.creado_en)}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {reserva ? tag('AGENDADO', 'ok') : cots.length ? tag(cots.length + ' COTIZ', 'pend') : tag('ESPERANDO', 'pend')}
                    <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 800, marginTop: 4 }}>{abierto ? 'Cerrar' : 'Ver timeline'}</div>
                    <button onClick={function (e) { e.stopPropagation(); eliminarPedido(p); }} style={{ marginTop: 6, background: '#b3261e', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 9px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>{'\u{1F5D1} Eliminar'}</button>
                  </div>
                </div>
                {abierto && (
                  <div style={{ marginTop: 12, borderTop: '1px solid #f1f1f1', paddingTop: 12 }}>
                    <div style={{ fontSize: 12, color: '#5b6275', marginBottom: 8 }}><b>1. Solicitud</b> · {fecha(p.creado_en)} · {nombreDe(p.cliente_id)} pidió: {p.descripcion}</div>
                    <div style={{ fontSize: 12, color: '#5b6275', marginBottom: 8 }}><b>2. Cotizaciones</b>
                      {cots.length === 0 && <span style={{ color: '#9aa1b5' }}> · ninguna aún</span>}
                      {cots.map(function (c) { return <div key={c.id} style={{ marginLeft: 12, marginTop: 4 }}>{'• ' + nombreDe(c.maestro_id) + ' → ' + (c.monto ? plata(c.monto) : 's/monto') + (c.mensaje ? ' · ' + c.mensaje : '')}</div>; })}
                    </div>
                    <div style={{ fontSize: 12, color: '#5b6275', marginBottom: 8 }}><b>3. Conversación</b> · {msgs.length + ' mensaje(s)'} {flagContacto(msgs.map(function (m) { return m.texto; }).join(' ')) ? <span style={{ color: '#b3261e', fontWeight: 800 }}>· {'\u{1F6A9}'} posible contacto fuera de la app</span> : null}</div>
                    {msgs.length > 0 && (
                      <div style={{ background: '#fafafc', borderRadius: 10, padding: 10, marginBottom: 10, maxHeight: 300, overflowY: 'auto' }}>
                        {msgs.slice().sort(function (a, b) { return a.creado_en < b.creado_en ? -1 : 1; }).map(function (mm) {
                          var cli = mm.autor_rol === 'cliente';
                          return (
                            <div key={mm.id} style={{ display: 'flex', justifyContent: cli ? 'flex-start' : 'flex-end', marginBottom: 6 }}>
                              <div style={{ maxWidth: '78%', background: cli ? '#fff' : '#2563eb', color: cli ? '#1c1f2b' : '#fff', border: cli ? '1px solid #eee' : 'none', borderRadius: 12, padding: '6px 10px', fontSize: 12.5, lineHeight: 1.4 }}>
                                <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 800, marginBottom: 1 }}>{cli ? 'Cliente' : 'Maestro'}</div>
                                {mm.texto || (mm.foto_url ? '\u{1F4F7} foto' : '')}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: '#5b6275' }}><b>4. Reserva</b> · {reserva ? (fecha(reserva.fecha_hora) + ' · ' + plata(reserva.precio_cotizado) + ' · ' + (reserva.estado || '')) : <span style={{ color: '#9aa1b5' }}>aún no agenda</span>}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- MENSAJES (chat admin <-> maestro) ---------------- */}
      {seccion === 'mensajes' && (function () {
        var porMaestro = {};
        msop.forEach(function (m) { (porMaestro[m.maestro_id] = porMaestro[m.maestro_id] || []).push(m); });
        var ids = {};
        maestros.forEach(function (m) { ids[m.id] = true; });
        Object.keys(porMaestro).forEach(function (k) { ids[k] = true; });
        var lista = Object.keys(ids);
        var hilo = chatMaestro ? (porMaestro[chatMaestro] || []) : [];
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 12 }}>
            <div style={{ ...card, padding: 0, overflow: 'hidden', margin: 0 }}>
              {lista.length === 0 && <div style={{ padding: 14, fontSize: 12, color: '#9aa1b5' }}>Aún no hay maestros.</div>}
              {lista.map(function (mid) {
                var hs = porMaestro[mid] || [];
                var ult = hs.length ? hs[hs.length - 1] : null;
                var nl = hs.filter(function (x) { return x.autor === 'maestro' && !x.leido; }).length;
                var on = chatMaestro === mid;
                return (
                  <div key={mid} onClick={function () { abrirChatMaestro(mid); }} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '11px 12px', borderBottom: '1px solid #f4f4f7', cursor: 'pointer', background: on ? '#eef4ff' : '#fff' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#7F77DD', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{nombreDe(mid).charAt(0).toUpperCase()}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{nombreDe(mid)}</div>
                      <div style={{ fontSize: 11, color: '#9aa1b5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ult ? ult.texto : 'Sin mensajes'}</div>
                    </div>
                    {nl > 0 && <span style={{ background: '#2563eb', color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 999, padding: '0 6px' }}>{nl}</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ ...card, margin: 0, display: 'flex', flexDirection: 'column', minHeight: 420 }}>
              {!chatMaestro && <div style={{ fontSize: 13, color: '#9aa1b5' }}>Elige un maestro para ver y responder su conversación.</div>}
              {chatMaestro && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <b style={{ fontSize: 14, marginBottom: 8 }}>{nombreDe(chatMaestro)}</b>
                  <div style={{ flex: 1, overflowY: 'auto', background: '#fafafc', borderRadius: 10, padding: 10, marginBottom: 10, maxHeight: 360 }}>
                    {hilo.length === 0 && <div style={{ fontSize: 12, color: '#9aa1b5' }}>Aún no hay mensajes con este maestro. Escríbele abajo.</div>}
                    {hilo.map(function (m) {
                      var out = m.autor === 'admin';
                      return (
                        <div key={m.id} style={{ display: 'flex', justifyContent: out ? 'flex-end' : 'flex-start', marginBottom: 7 }}>
                          <div style={{ maxWidth: '78%', background: out ? '#2563eb' : '#fff', color: out ? '#fff' : '#1c1f2b', border: out ? 'none' : '1px solid #eee', borderRadius: 12, padding: '7px 10px', fontSize: 13, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{m.texto}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={chatTxt} onChange={function (e) { setChatTxt(e.target.value); }} onKeyDown={function (e) { if (e.key === 'Enter') enviarSoporte(); }} placeholder="Escribe al maestro..." style={{ flex: 1, padding: 10, border: '1.5px solid #ddd', borderRadius: 10, fontSize: 13 }} />
                    <button onClick={enviarSoporte} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, padding: '0 16px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Enviar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ---------------- CONVERSACIONES ---------------- */}
      {seccion === 'conversaciones' && (
        <div>
          {hilosFlag > 0 && <div style={{ ...card, background: '#fff7ea', borderColor: '#f0d9a8' }}><b style={{ fontSize: 13, color: '#b07a1e' }}>{'\u{1F6A9} ' + hilosFlag + ' conversación(es) con posible intercambio de contacto fuera de la plataforma'}</b></div>}
          {hilos.length === 0 && <div style={card}><b style={{ fontSize: 14 }}>Sin conversaciones todavía</b><div style={{ fontSize: 12, color: '#9aa1b5', marginTop: 4 }}>Aquí verás los chats entre clientes y maestros para supervisar dudas, calidad o disputas.</div></div>}
          {hilos.map(function (h) {
            const p = presById[h.presupuesto_id] || {};
            const ultimo = h.msgs[h.msgs.length - 1];
            const abierto = hilo === h.key;
            return (
              <div key={h.key} style={{ ...card, borderColor: h.flag ? '#f0c8a8' : '#eee' }}>
                <div onClick={function () { setHilo(abierto ? null : h.key); }} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ fontSize: 14 }}>{nombreDe(p.cliente_id) + ' ↔ ' + nombreDe(h.maestro_id)} {h.flag ? <span title="posible contacto fuera de la app">{'\u{1F6A9}'}</span> : null}</b>
                    <div style={{ fontSize: 12, color: '#7c8499' }}>{((p.oficio || 'servicio') + (p.comuna ? ' · ' + p.comuna : '')).trim()}</div>
                    <div style={{ fontSize: 12, color: '#9aa1b5', marginTop: 2, maxWidth: 460, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(ultimo.autor_rol === 'cliente' ? 'Cliente: ' : 'Maestro: ') + (ultimo.texto || (ultimo.foto_url ? '\u{1F4F7} foto' : ''))}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ background: '#eef0f5', color: '#5b6275', borderRadius: 8, padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>{h.msgs.length}</span>
                    <div style={{ fontSize: 10.5, color: '#9aa1b5', marginTop: 4 }}>{fecha(ultimo.creado_en)}</div>
                    <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 800, marginTop: 2 }}>{abierto ? 'Cerrar' : 'Ver chat'}</div>
                  </div>
                </div>
                {abierto && (
                  <div style={{ marginTop: 12, borderTop: '1px solid #f1f1f1', paddingTop: 12, maxHeight: 380, overflowY: 'auto' }}>
                    {p.descripcion && <div style={{ fontSize: 12, color: '#7c8499', background: '#fafafc', borderRadius: 8, padding: 8, marginBottom: 10 }}>{'Solicitud: ' + p.descripcion}</div>}
                    {h.msgs.map(function (m) {
                      const cli = m.autor_rol === 'cliente';
                      return (
                        <div key={m.id} style={{ display: 'flex', justifyContent: cli ? 'flex-start' : 'flex-end', marginBottom: 8 }}>
                          <div style={{ maxWidth: '75%', background: cli ? '#fff' : '#2563eb', color: cli ? '#1c1f2b' : '#fff', border: cli ? '1px solid #eee' : 'none', borderRadius: 14, padding: '8px 11px' }}>
                            <div style={{ fontSize: 10, opacity: 0.75, fontWeight: 800, marginBottom: 2 }}>{cli ? nombreDe(p.cliente_id) : nombreDe(h.maestro_id)}</div>
                            {m.foto_url && <img src={m.foto_url} alt="" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: m.texto ? 6 : 0, display: 'block' }} />}
                            {m.texto && <div style={{ fontSize: 13.5, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{m.texto}</div>}
                            <div style={{ fontSize: 9.5, opacity: 0.7, marginTop: 3, textAlign: 'right' }}>{fecha(m.creado_en)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- DISPUTAS ---------------- */}
      {seccion === 'disputas' && (
        <div>
          {denuncias.length === 0 && <div style={card}><b style={{ fontSize: 14 }}>Sin reportes</b><div style={{ fontSize: 12, color: '#9aa1b5', marginTop: 4 }}>Cuando un cliente o maestro reporta una conversación, aparece aquí para que la revises y resuelvas.</div></div>}
          {denuncias.map(function (d) {
            const p = presById[d.presupuesto_id] || {};
            return (
              <div key={d.id} style={{ ...card, borderColor: d.estado === 'abierta' ? '#f0c8a8' : '#eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <b style={{ fontSize: 14 }}>{d.motivo}</b>
                  {d.estado === 'abierta' ? tag('ABIERTA', 'pend') : tag('RESUELTA', 'ok')}
                </div>
                <div style={{ fontSize: 12, color: '#5b6275' }}>{'Reportó: ' + (d.reportante_rol === 'cliente' ? 'Cliente' : 'Maestro') + ' ' + nombreDe(d.reportante_id)}</div>
                {p.oficio && <div style={{ fontSize: 12, color: '#7c8499' }}>{'Pedido: ' + p.oficio + ' · ' + (p.descripcion || '')}</div>}
                {d.detalle && <div style={{ fontSize: 13, color: '#444', marginTop: 4 }}>{d.detalle}</div>}
                <div style={{ fontSize: 11, color: '#9aa1b5', marginTop: 4 }}>{fecha(d.creado_en)}</div>
                {d.nota_admin && <div style={{ fontSize: 12, color: '#0d9456', marginTop: 6 }}>{'Resolución: ' + d.nota_admin}</div>}
                {d.estado === 'abierta' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button style={{ ...btnS, color: '#0d9456', borderColor: '#bce5cf' }} onClick={function () { resolverDenuncia(d); }}>Resolver con nota</button>
                    <button style={{ ...btnS }} onClick={function () { setSeccion('conversaciones'); }}>Ver conversaciones</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- COMUNICADOS ---------------- */}
      {seccion === 'comunicados' && (
        <div>
          <div style={card}>
            <b style={{ fontSize: 14 }}>{'\u{1F4E2} Nuevo comunicado'}</b>
            <div style={{ fontSize: 12, color: '#9aa1b5', margin: '4px 0 10px' }}>Aparece como aviso dentro de la app para el segmento elegido.</div>
            <input value={cTitulo} onChange={function (e) { setCTitulo(e.target.value); }} placeholder="Título (ej: Nueva función disponible)" style={inp} />
            <textarea value={cCuerpo} onChange={function (e) { setCCuerpo(e.target.value); }} placeholder="Mensaje para tus usuarios..." rows={3} style={{ ...inp, resize: 'vertical' }} />
            <select value={cSegmento} onChange={function (e) { setCSegmento(e.target.value); }} style={inp}>
              <option value="maestros">Para maestros</option>
              <option value="clientes">Para clientes</option>
              <option value="todos">Para todos</option>
            </select>
            <button className="gbtn" style={{ width: '100%' }} onClick={publicarComunicado}>Publicar comunicado</button>
          </div>
          {comunicados.map(function (c) {
            return (
              <div key={c.id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b style={{ fontSize: 14 }}>{c.titulo}</b>
                  {c.activo ? tag('ACTIVO', 'ok') : tag('OCULTO', 'pend')}
                </div>
                <div style={{ fontSize: 13, color: '#444', margin: '4px 0' }}>{c.cuerpo}</div>
                <div style={{ fontSize: 11, color: '#9aa1b5' }}>{'Segmento: ' + c.segmento + ' · ' + fecha(c.creado_en)}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button style={btnS} onClick={function () { toggleComunicado(c); }}>{c.activo ? 'Ocultar' : 'Activar'}</button>
                  <button style={{ ...btnS, color: '#b3261e', borderColor: '#f5c2c2' }} onClick={function () { borrarComunicado(c); }}>Borrar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- RESERVAS ---------------- */}
      {seccion === 'reservas' && (
        <div style={card}>
          <b style={{ fontSize: 14 }}>Últimas reservas</b>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, minWidth: 600 }}>
              <thead><tr><th style={th}>Problema</th><th style={th}>Cliente</th><th style={th}>Maestro</th><th style={th}>Estado</th><th style={th}>Cotizado</th><th style={th}>Acción</th></tr></thead>
              <tbody>
                {reservas.map(function (r) {
                  var cancelada = (r.estado || '').toLowerCase() === 'cancelado';
                  return (
                    <tr key={r.id}>
                      <td style={td}>{r.descripcion_problema || r.tipo || '—'}</td>
                      <td style={{ ...td, color: '#7c8499' }}>{nombreDe(r.cliente_id)}</td>
                      <td style={{ ...td, color: '#7c8499' }}>{nombreDe(r.maestro_id)}</td>
                      <td style={td}>{tag((r.estado || '—').toUpperCase(), 'pend')}</td>
                      <td style={td}>{plata(r.precio_cotizado)}</td>
                      <td style={td}>{cancelada ? <span style={{ fontSize: 11, color: '#9aa1b5' }}>—</span> : <button onClick={function () { cancelarReservaAdmin(r); }} style={{ background: 'none', border: '1px solid #f0c8c2', color: '#b3261e', borderRadius: 8, padding: '4px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>}</td>
                    </tr>
                  );
                })}
                {reservas.length === 0 && <tr><td style={td}>Sin reservas todavía</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- POR LIBERAR (escrow) ---------------- */}
      {seccion === 'liberar' && (
        <div style={card}>
          <b style={{ fontSize: 14 }}>{'\u{1F513} Pagos retenidos por liberar'}</b>
          <div style={{ fontSize: 12, color: '#7c8499', margin: '4px 0 6px' }}>El dinero del cliente está retenido. Cuando el trabajo termine (idealmente con la confirmación del cliente), libera el neto al maestro.</div>
          {porLiberar.filter(function (x) { return !x.liberado; }).length === 0 && <p style={{ fontSize: 13, color: '#9aa1b5', marginTop: 8 }}>No hay pagos pendientes de liberar.</p>}
          {porLiberar.filter(function (x) { return !x.liberado; }).map(function (x) {
            return (
              <div key={x.reserva_id} style={{ borderTop: '1px solid #f1f1f1', padding: '12px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ fontSize: 13 }}>{(x.maestro_nombre || 'Maestro') + '  ←  ' + (x.cliente_nombre || 'Cliente')}</b>
                    <div style={{ fontSize: 12, color: '#7c8499', margin: '2px 0' }}>{x.descripcion || 'Trabajo'}</div>
                    <div style={{ fontSize: 11, color: '#9aa1b5' }}>{fecha(x.fecha_hora)}</div>
                    <div style={{ marginTop: 6 }}>
                      {x.trabajo_confirmado
                        ? tag('CLIENTE CONFIRMÓ', 'ok')
                        : tag('EN GARANTÍA · sin confirmar', 'pend')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: 11, color: '#9aa1b5' }}>{'Cobrado: ' + plata(x.precio)}</div>
                    <div style={{ fontSize: 11, color: '#0d9456' }}>{'Comisión: ' + plata(x.comision)}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1c1f2b', marginTop: 2 }}>{plata(x.liquido_maestro)}</div>
                    <div style={{ fontSize: 10, color: '#9aa1b5' }}>al maestro</div>
                  </div>
                </div>
                <button onClick={function () { if (window.confirm('¿Liberar ' + plata(x.liquido_maestro) + ' a ' + (x.maestro_nombre || 'el maestro') + '? Esto marca el pago como liberado.')) liberarPago(x.reserva_id); }}
                  disabled={liberandoId === x.reserva_id}
                  style={{ marginTop: 10, width: '100%', background: '#0d9456', color: '#fff', border: 'none', borderRadius: 10, padding: 10, fontWeight: 800, fontSize: 13, cursor: 'pointer', opacity: liberandoId === x.reserva_id ? 0.6 : 1 }}>
                  {liberandoId === x.reserva_id ? 'Liberando...' : '\u{1F513} Liberar pago al maestro'}
                </button>
              </div>
            );
          })}
          {porLiberar.filter(function (x) { return x.liberado; }).length > 0 && (
            <div style={{ marginTop: 16 }}>
              <b style={{ fontSize: 13, color: '#7c8499' }}>Ya liberados</b>
              {porLiberar.filter(function (x) { return x.liberado; }).map(function (x) {
                return (
                  <div key={x.reserva_id} style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f6f6f6', padding: '8px 0', fontSize: 12 }}>
                    <span style={{ color: '#5b6275' }}>{(x.maestro_nombre || 'Maestro') + ' · ' + (x.descripcion || '')}</span>
                    <span style={{ color: '#0d9456', fontWeight: 700 }}>{plata(x.liquido_maestro) + ' ✓'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------------- PAGOS ---------------- */}
      {seccion === 'pagos' && (
        <div style={card}>
          <b style={{ fontSize: 14 }}>Últimos pagos</b>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, minWidth: 600 }}>
              <thead><tr><th style={th}>Bruto</th><th style={th}>Comisión</th><th style={th}>Pasarela</th><th style={th}>SII</th><th style={th}>Líquido</th><th style={th}>Estado</th></tr></thead>
              <tbody>
                {pagos.map(function (p) {
                  return (
                    <tr key={p.id}>
                      <td style={td}>{plata(p.monto_bruto)}</td>
                      <td style={{ ...td, color: '#0d9456' }}>{plata(p.comision_plataforma)}</td>
                      <td style={{ ...td, color: '#7c8499' }}>{plata(p.costo_pasarela)}</td>
                      <td style={{ ...td, color: '#7c8499' }}>{plata(p.retencion_sii)}</td>
                      <td style={td}><b>{plata(p.liquido_maestro)}</b></td>
                      <td style={td}>{tag((p.estado || '—').toUpperCase(), p.estado === 'pagado' ? 'ok' : 'pend')}</td>
                    </tr>
                  );
                })}
                {pagos.length === 0 && <tr><td style={td}>Sin pagos todavía</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- RESEÑAS ---------------- */}
      {seccion === 'resenas' && (
        <div style={card}>
          <b style={{ fontSize: 14 }}>Últimas reseñas</b>
          {resenas.map(function (re) {
            return (
              <div key={re.id} style={{ borderTop: '1px solid #f1f1f1', padding: '10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <b style={{ fontSize: 13 }}>{nombreDe(re.cliente_id) + ' → ' + nombreDe(re.maestro_id)}</b>
                  <span style={{ fontSize: 13 }}>{'★'.repeat(re.estrellas || 0)}</span>
                </div>
                <div style={{ fontSize: 13, color: '#444', marginTop: 4 }}>{re.comentario}</div>
                <div style={{ fontSize: 11, color: '#9aa1b5', marginTop: 2 }}>{fecha(re.creado_en)}</div>
              </div>
            );
          })}
          {resenas.length === 0 && <p style={{ fontSize: 13, color: '#9aa1b5' }}>Sin reseñas todavía</p>}
        </div>
      )}
    {seccion === 'embudo' && <EmbudoMaestros maestros={maestros} perfiles={perfiles} verifs={verifs} interesados={interesados} onAprobarMaestro={aprobarMaestro} onRechazar={rechazar} onReactivar={function (m) { suspender(m, false); }} onRecargar={cargarTodo} />}
    {seccion === 'campana' && <CampanaMaestros />}
      {seccion === 'extraer' && <MapsExtractor />}
      {seccion === 'agenteia' && <AgenteIA />}
      {seccion === 'influencers' && <InfluencersPanel />}
      {seccion === 'usuarios' && esSuper && <UsuariosPanel categorias={CATEGORIAS} />}
      </main>
  );
}
