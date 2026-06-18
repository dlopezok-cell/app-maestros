'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Registro del maestro en 3 pasos (obligatorios en orden):
//   1) Identidad  -> foto de perfil (con reencuadre), nombre, teléfono (+56 9 fijo),
//                    dirección (Google Places), RUT (autoformateado), carnet + selfie
//   2) Descripción -> especialidades/tipos/qué ofreces (catálogos editables),
//                     años, región + comunas (autodetectadas), sello -> descripción IA
//   3) Trabajos   -> galería de fotos
// Identidad obligatoria para publicar. Si ya está registrado, se ve el resumen.

// Código de influencer: lo deja /r/<código> en ?inf= o en la cookie mel_ref (30 días).
function refInfluencer() {
  try {
    if (typeof window === 'undefined') return null;
    var iq = new URLSearchParams(window.location.search).get('inf');
    if (!iq) { var m = document.cookie.match(/(?:^|; )mel_ref=([^;]+)/); if (m) iq = decodeURIComponent(m[1]); }
    return iq ? String(iq).trim() : null;
  } catch (e) { return null; }
}

const REGIONES = {
  'Arica y Parinacota': ['Arica','Camarones','Putre','General Lagos'],
  'Tarapacá': ['Iquique','Alto Hospicio','Pozo Almonte','Camiña','Colchane','Huara','Pica'],
  'Antofagasta': ['Antofagasta','Mejillones','Sierra Gorda','Taltal','Calama','Ollagüe','San Pedro de Atacama','Tocopilla','María Elena'],
  'Atacama': ['Copiapó','Caldera','Tierra Amarilla','Chañaral','Diego de Almagro','Vallenar','Alto del Carmen','Freirina','Huasco'],
  'Coquimbo': ['La Serena','Coquimbo','Andacollo','La Higuera','Paihuano','Vicuña','Illapel','Canela','Los Vilos','Salamanca','Ovalle','Combarbalá','Monte Patria','Punitaqui','Río Hurtado'],
  'Valparaíso': ['Valparaíso','Viña del Mar','Concón','Quilpué','Villa Alemana','Quillota','La Calera','San Antonio','San Felipe','Los Andes','Casablanca','Limache','Olmué','Quintero','Puchuncaví','Algarrobo','El Quisco','Cartagena'],
  'Región Metropolitana': ['Las Condes','Vitacura','Providencia','Lo Barnechea','Ñuñoa','La Reina','Huechuraba','Santiago','Macul','Peñalolén','La Florida','San Miguel','Maipú','Colina','Quilicura','Estación Central','Recoleta','Independencia','San Bernardo','Puente Alto'],
  "O'Higgins": ['Rancagua','Machalí','Graneros','Mostazal','Codegua','Doñihue','Olivar','Rengo','Requínoa','San Vicente','Peumo','Pichidegua','San Fernando','Chimbarongo','Santa Cruz','Nancagua','Pichilemu','Marchihue','Litueche'],
  'Maule': ['Talca','San Clemente','Maule','Pelarco','Río Claro','San Rafael','Constitución','Curicó','Molina','Teno','Romeral','Sagrada Familia','Linares','Longaví','Parral','San Javier','Villa Alegre','Cauquenes','Chanco','Pelluhue'],
  'Ñuble': ['Chillán','Chillán Viejo','Bulnes','Quillón','San Ignacio','Yungay','Pinto','El Carmen','San Carlos','Coihueco','Ñiquén','San Fabián','Quirihue','Coelemu','Ránquil'],
  'Biobío': ['Concepción','Talcahuano','Hualpén','San Pedro de la Paz','Chiguayante','Penco','Tomé','Coronel','Lota','Hualqui','Florida','Santa Juana','Los Ángeles','Cabrero','Yumbel','Laja','Mulchén','Nacimiento','Arauco','Curanilahue','Lebu','Cañete','Los Álamos'],
  'La Araucanía': ['Temuco','Padre Las Casas','Lautaro','Vilcún','Cunco','Freire','Pitrufquén','Gorbea','Villarrica','Pucón','Loncoche','Nueva Imperial','Carahue','Angol','Victoria','Collipulli','Traiguén','Curacautín'],
  'Los Ríos': ['Valdivia','Mariquina','Lanco','Los Lagos','Máfil','Paillaco','Panguipulli','Corral','La Unión','Río Bueno','Futrono','Lago Ranco'],
  'Los Lagos': ['Puerto Montt','Puerto Varas','Llanquihue','Frutillar','Fresia','Los Muermos','Calbuco','Maullín','Castro','Ancud','Quellón','Dalcahue','Chonchi','Osorno','Río Negro','Purranque','Puerto Octay','Chaitén'],
  'Aysén': ['Coyhaique','Aysén','Cisnes','Chile Chico','Cochrane','Río Ibáñez','Lago Verde'],
  'Magallanes': ['Punta Arenas','Puerto Natales','Porvenir','Cabo de Hornos','Torres del Paine','Natales']
};
const MAP_REGION = { 'metropolitana':'Región Metropolitana','valpara':'Valparaíso','arica':'Arica y Parinacota','tarapac':'Tarapacá','antofagasta':'Antofagasta','atacama':'Atacama','coquimbo':'Coquimbo',"o'higgins":"O'Higgins",'libertador':"O'Higgins",'maule':'Maule','nuble':'Ñuble','biob':'Biobío','araucan':'La Araucanía','los rios':'Los Ríos','los lagos':'Los Lagos','aysen':'Aysén','magallanes':'Magallanes' };

function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
function matchRegion(name) { var n = norm(name); for (var k in MAP_REGION) { if (n.indexOf(k) >= 0) return MAP_REGION[k]; } return ''; }

function formatRut(v) {
  v = (v || '').replace(/[^0-9kK]/g, '').toUpperCase();
  if (v.length === 0) return '';
  if (v.length === 1) return v;
  var cuerpo = v.slice(0, -1), dv = v.slice(-1);
  cuerpo = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return cuerpo + '-' + dv;
}
function rutValido(r) {
  var limpio = (r || '').replace(/\./g, '').replace('-', '').toUpperCase();
  if (limpio.length < 8) return false;
  var cuerpo = limpio.slice(0, -1), dv = limpio.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;
  var suma = 0, mul = 2;
  for (var i = cuerpo.length - 1; i >= 0; i--) { suma += parseInt(cuerpo[i], 10) * mul; mul = mul === 7 ? 2 : mul + 1; }
  var res = 11 - (suma % 11);
  var dvc = res === 11 ? '0' : res === 10 ? 'K' : String(res);
  return dv === dvc;
}
function telDigitos(t) { var d = (t || '').replace(/\D/g, ''); if (d.indexOf('56') === 0) d = d.slice(2); if (d.indexOf('9') === 0) d = d.slice(1); return d.slice(0, 8); }
function telVisible(d) { return d.length > 4 ? d.slice(0, 4) + ' ' + d.slice(4) : d; }

export default function RegistroMaestro({ usuario, onGuardado }) {
  const [cat, setCat] = useState({ especialidad: [], tipo: [], ofrece: [] });
  const [nombre, setNombre] = useState('');
  const [tel8, setTel8] = useState('');
  const [direccion, setDireccion] = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [rut, setRut] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [carnetFile, setCarnetFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [verif, setVerif] = useState(null);
  const [oficios, setOficios] = useState([]);
  const [anos, setAnos] = useState('');
  const [tipos, setTipos] = useState([]);
  const [ofrece, setOfrece] = useState([]);
  const [region, setRegion] = useState('');
  const [comunas, setComunas] = useState([]);
  const [sello, setSello] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [editado, setEditado] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [galeria, setGaleria] = useState([]);
  const [subiendoGal, setSubiendoGal] = useState(false);
  const [paso, setPaso] = useState(0);
  const [maxPaso, setMaxPaso] = useState(0);
  const [cargado, setCargado] = useState(false);
  const [yaRegistrado, setYaRegistrado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [verPerfil, setVerPerfil] = useState(false);
  const [trabajoIdx, setTrabajoIdx] = useState(-1);
  const [err, setErr] = useState(null);
  const [msg, setMsg] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const dirRef = useRef(null);

  useEffect(function () {
    if (!usuario) return;
    Promise.all([
      supabase.from('catalogos').select('*').eq('activo', true).order('orden', { ascending: true }),
      supabase.from('maestros').select('*').eq('id', usuario.id).maybeSingle(),
      supabase.from('perfiles').select('nombre, lat, lng, avatar_url').eq('id', usuario.id).maybeSingle(),
      supabase.from('verificaciones').select('*').eq('user_id', usuario.id).maybeSingle()
    ]).then(function (res) {
      var rows = res[0].data || [];
      var c = { especialidad: [], tipo: [], ofrece: [] };
      rows.forEach(function (r) { if (c[r.tipo]) c[r.tipo].push(r); });
      setCat(c);
      var m = res[1].data, p = res[2].data, v = res[3].data;
      if (p) { setNombre(p.nombre || ''); if (p.lat != null) setLat(p.lat); if (p.lng != null) setLng(p.lng); setAvatarUrl(p.avatar_url || null); }
      if (v) { setVerif(v); if (v.rut) setRut(formatRut(v.rut)); if (v.telefono) setTel8(telDigitos(v.telefono)); if (v.direccion) setDireccion(v.direccion); }
      if (m) {
        setYaRegistrado(true);
        setOficios(m.oficios && m.oficios.length ? m.oficios : (m.oficio ? [m.oficio] : []));
        setAnos(m.anos_experiencia != null ? String(m.anos_experiencia) : '');
        if (m.region) setRegion(m.region);
        if (m.comunas) setComunas(m.comunas);
        if (m.galeria) setGaleria(m.galeria);
        if (m.descripcion) { setDescripcion(m.descripcion); setEditado(true); }
      } else {
        setEditando(true);
      }
      setCargado(true);
    });
  }, [usuario]);

  useEffect(function () {
    if (paso !== 0 || !editando) return;
    var key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    function attach() {
      if (!dirRef.current || dirRef.current._ac || !(window.google && window.google.maps && window.google.maps.places)) return;
      var ac = new window.google.maps.places.Autocomplete(dirRef.current, { componentRestrictions: { country: 'cl' }, fields: ['formatted_address', 'address_components', 'geometry'] });
      dirRef.current._ac = ac;
      ac.addListener('place_changed', function () {
        var pl = ac.getPlace();
        if (pl.formatted_address) setDireccion(pl.formatted_address);
        if (pl.geometry && pl.geometry.location) { setLat(pl.geometry.location.lat()); setLng(pl.geometry.location.lng()); }
        var comps = pl.address_components || [], reg = '', com = '';
        comps.forEach(function (cc) {
          if (cc.types.indexOf('administrative_area_level_1') >= 0) reg = cc.long_name;
          if (cc.types.indexOf('administrative_area_level_3') >= 0 && !com) com = cc.long_name;
          if (cc.types.indexOf('locality') >= 0 && !com) com = cc.long_name;
        });
        var rk = matchRegion(reg);
        if (rk) {
          setRegion(rk);
          var lista = REGIONES[rk] || [];
          var found = lista.filter(function (x) { return norm(x) === norm(com); })[0];
          setComunas(found ? [found] : []);
        }
      });
    }
    if (window.google && window.google.maps && window.google.maps.places) { attach(); return; }
    if (!key) return;
    var existing = document.getElementById('gmaps-sdk');
    if (existing) { var iv = setInterval(function () { if (window.google && window.google.maps && window.google.maps.places) { clearInterval(iv); attach(); } }, 250); return function () { clearInterval(iv); }; }
    var s = document.createElement('script');
    s.id = 'gmaps-sdk';
    s.src = 'https://maps.googleapis.com/maps/api/js?key=' + key + '&libraries=places&language=es&region=CL';
    s.async = true; s.onload = attach;
    document.head.appendChild(s);
  }, [paso, editando, cargado]);

  function toggle(arr, set, v) { set(arr.indexOf(v) >= 0 ? arr.filter(function (x) { return x !== v; }) : arr.concat([v])); }
  function espNombre(slug) { var e = cat.especialidad.filter(function (x) { return x.slug === slug; })[0]; return e ? e.valor : slug; }
  var oficiosTxt = oficios.map(espNombre).join(' · ');

  function pedirIA() {
    if (!oficios.length) return;
    setGenerando(true);
    fetch('/api/describir-maestro', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre.trim(), oficios: oficios.map(espNombre), anos: anos, tipos: tipos, zona: comunas.join(', '), sello: sello.trim(), garantia: ofrece.indexOf('Doy garantía') >= 0, boleta: ofrece.indexOf('Emito boleta') >= 0, urgencias: ofrece.indexOf('Urgencias') >= 0, fds: ofrece.indexOf('Fines de semana') >= 0 })
    }).then(function (r) { return r.json(); }).then(function (d) {
      setGenerando(false);
      if (d && d.descripcion) setDescripcion(d.descripcion);
    }).catch(function () { setGenerando(false); });
  }
  useEffect(function () {
    if (!cargado || !editando || paso !== 1 || !oficios.length || editado) return;
    var t = setTimeout(function () { pedirIA(); }, 1300);
    return function () { clearTimeout(t); };
    // eslint-disable-next-line
  }, [cargado, editando, paso, editado, oficios, anos, tipos, ofrece, comunas, sello, nombre]);

  function guardarIdentidad() {
    return supabase.auth.getSession().then(function (s) {
      var sesion = s.data ? s.data.session : null;
      if (!sesion) throw new Error('Tu sesión no está activa. Abre el correo de confirmación y vuelve a ingresar.');
      var uid = sesion.user.id;
      var carnetPath = verif && verif.carnet_path ? verif.carnet_path : uid + '/carnet.jpg';
      var selfiePath = verif && verif.selfie_path ? verif.selfie_path : uid + '/selfie.jpg';
      var huboFoto = !!(carnetFile || selfieFile);
      var telGuardar = '+56 9 ' + tel8.slice(0, 4) + ' ' + tel8.slice(4);
      function subirC() { if (!carnetFile) return Promise.resolve(); carnetPath = uid + '/carnet.jpg'; return supabase.storage.from('verificaciones').upload(carnetPath, carnetFile, { upsert: true }).then(function (r) { if (r.error) throw new Error('al subir el carnet: ' + r.error.message); }); }
      function subirS() { if (!selfieFile) return Promise.resolve(); selfiePath = uid + '/selfie.jpg'; return supabase.storage.from('verificaciones').upload(selfiePath, selfieFile, { upsert: true }).then(function (r) { if (r.error) throw new Error('al subir la selfie: ' + r.error.message); }); }
      // Aseguramos que exista la fila de perfil (rol es obligatorio) antes de publicar la ficha.
      var perfilRow = { id: uid, nombre: nombre.trim(), lat: lat, lng: lng, rol: 'maestro' };
      var _inf = refInfluencer(); if (_inf) perfilRow.ref = _inf; // código de influencer (solo si viene), no sobrescribe si no hay
      return supabase.from('perfiles').upsert(perfilRow, { onConflict: 'id' }).then(function (rp) {
        if (rp.error) throw new Error('al guardar tu perfil: ' + rp.error.message);
        return subirC();
      }).then(subirS).then(function () {
        var estado = huboFoto ? 'pendiente' : (verif && verif.estado ? verif.estado : 'pendiente');
        return supabase.from('verificaciones').upsert({
          user_id: uid, email: sesion.user.email, rut: rut.trim().toUpperCase(),
          telefono: telGuardar, direccion: direccion.trim(),
          carnet_path: carnetPath, selfie_path: selfiePath, estado: estado
        }, { onConflict: 'user_id' }).select().single();
      }).then(function (r) {
        if (r.error) throw new Error('al guardar identidad: ' + r.error.message);
        setVerif(r.data);
      });
    });
  }

  function subirTrabajos(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    setSubiendoGal(true);
    var nuevas = galeria.slice(); var i = 0;
    function sig() {
      if (i >= files.length) {
        supabase.rpc('guardar_galeria', { p_urls: nuevas }).then(function (r) {
          if (!r.error) setGaleria(nuevas);
          setSubiendoGal(false);
        });
        return;
      }
      var ruta = usuario.id + '/trabajo_' + Date.now() + '_' + i + '.jpg';
      supabase.storage.from('avatares').upload(ruta, files[i], { upsert: true }).then(function (r) {
        if (!r.error) { var pub = supabase.storage.from('avatares').getPublicUrl(ruta); nuevas.push(pub.data.publicUrl); }
        i++; sig();
      });
    }
    sig();
  }
  function quitarTrabajo(u) {
    var nuevas = galeria.filter(function (x) { return x !== u; });
    supabase.rpc('guardar_galeria', { p_urls: nuevas }).then(function (r) { if (!r.error) setGaleria(nuevas); });
  }

  function avanzar(n) { if (n > maxPaso) setMaxPaso(n); setPaso(n); setErr(null); window.scrollTo(0, 0); }
  function irPaso(n) { if (n <= maxPaso) { setPaso(n); setErr(null); } }

  function next1() {
    var e = [];
    if (!nombre.trim()) e.push('nombre');
    if (tel8.length < 8) e.push('teléfono completo');
    if (direccion.trim().length < 5) e.push('dirección');
    if (!rutValido(rut)) e.push('RUT válido');
    if (!(verif && verif.carnet_path) && !carnetFile) e.push('foto del carnet');
    if (!(verif && verif.selfie_path) && !selfieFile) e.push('selfie');
    if (e.length) { setErr('Falta: ' + e.join(', ') + '.'); return; }
    setGuardando(true); setErr(null);
    guardarIdentidad().then(function () { setGuardando(false); avanzar(1); })
      .catch(function (ex) { setGuardando(false); setErr('Error ' + ex.message); });
  }
  function next2() {
    var e = [];
    if (!oficios.length) e.push('al menos una especialidad');
    if (!region) e.push('tu región');
    if (!comunas.length) e.push('al menos una comuna');
    if (!descripcion.trim() || descripcion.trim().length < 20) e.push('la descripción (responde el cuestionario)');
    if (e.length) { setErr('Falta: ' + e.join(', ') + '.'); return; }
    avanzar(2);
  }
  function finalizar() {
    setGuardando(true); setMsg('Publicando...');
    supabase.rpc('registrar_maestro', {
      p_nombre: nombre.trim(), p_oficios: oficios, p_descripcion: descripcion.trim(),
      p_anos: anos ? parseInt(anos, 10) : 0, p_precio_video: 0, p_precio_visita: 0,
      p_lat: lat, p_lng: lng
    }).then(function (r) {
      if (r.error) { setGuardando(false); setMsg('Error: ' + r.error.message); return; }
      return supabase.rpc('guardar_zona', { p_region: region, p_comunas: comunas }).then(function () {
        setGuardando(false); setYaRegistrado(true); setEditando(false); setMsg(null); window.scrollTo(0, 0);
        if (onGuardado) onGuardado();
      });
    });
  }

  if (!usuario || !cargado) return <div className="body" style={{ paddingTop: 18 }}><p>Cargando...</p></div>;

  const card = { background: '#fff', borderRadius: 18, padding: 18, margin: '14px 16px', border: '1px solid #eef0f5' };
  const inp = { width: '100%', padding: 12, border: '1px solid #e4e4ef', borderRadius: 12, fontSize: 14, background: '#fff', color: '#1c1f2b', boxSizing: 'border-box' };
  const lbl = { display: 'block', fontSize: 12, color: '#534AB7', margin: '12px 0 6px' };
  function chip(on) { return { padding: '7px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: on ? 600 : 500, cursor: 'pointer', border: on ? '1px solid #7F77DD' : '1px solid #e0e0ec', background: on ? '#fff' : '#fafafc', color: on ? '#3C3489' : '#6b7184' }; }
  var inicial = (nombre || (usuario.email || '?')).trim().charAt(0).toUpperCase();

  function verAnterior(e) { e.stopPropagation(); setTrabajoIdx(function (i) { return i <= 0 ? galeria.length - 1 : i - 1; }); }
  function verSiguiente(e) { e.stopPropagation(); setTrabajoIdx(function (i) { return i >= galeria.length - 1 ? 0 : i + 1; }); }
  function Preview() {
    return (
      <>
      <div onClick={function () { setVerPerfil(false); }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(20,20,40,.55)', zIndex: 120, overflowY: 'auto', padding: '22px 14px', boxSizing: 'border-box' }}>
        <div onClick={function (e) { e.stopPropagation(); }} style={{ maxWidth: 420, margin: '0 auto', background: '#fff', borderRadius: 22, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.4)' }}>
          <div style={{ background: '#1c2030', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#fff', fontSize: 12.5, fontWeight: 800 }}>{'\u{1F441} Así te ven los clientes'}</span>
            <button onClick={function () { setVerPerfil(false); }} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.15)', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', lineHeight: '30px', padding: 0 }}>{'✕'}</button>
          </div>
          <div style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: '#ff5a3c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 30, flexShrink: 0 }}>
                {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : inicial}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1c1f2b' }}>{nombre || 'Tu nombre'}</div>
                <div style={{ fontSize: 13, color: '#7c8499' }}>{oficiosTxt || 'Tus especialidades'}</div>
                <div style={{ display: 'inline-block', marginTop: 6, background: '#E1F5EE', color: '#0F6E56', borderRadius: 999, padding: '3px 9px', fontSize: 11, fontWeight: 800 }}>{'\u{1F6E1} Verificado'}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#b07a1e', background: '#fff7ea', borderRadius: 10, padding: '8px 11px', margin: '14px 0' }}>{'⭐ Nuevo en MaestrosEnLínea · aún sin reseñas'}</div>
            {descripcion && <p style={{ fontSize: 14, lineHeight: 1.6, color: '#2b2f3a', margin: '0 0 14px' }}>{descripcion}</p>}
            {galeria && galeria.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1c1f2b', margin: '4px 0 10px' }}>{'\u{1F4F8} Trabajos realizados'} <span style={{ color: '#9aa1b5', fontWeight: 600 }}>({galeria.length})</span></div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
                  {galeria.map(function (u, i) {
                    return (
                      <button key={i} type="button" onClick={function () { setTrabajoIdx(i); }} style={{ position: 'relative', flex: '0 0 auto', width: 150, height: 150, padding: 0, border: 'none', borderRadius: 12, overflow: 'hidden', background: '#eef0f5', cursor: 'pointer', scrollSnapAlign: 'start' }}>
                        <img src={u} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11, color: '#9aa1b5', marginTop: 7 }}>{'\u{1F50D} Desliza para ver · toca una foto para ampliarla'}</div>
              </div>
            )}
            <button onClick={function () { setVerPerfil(false); }} style={{ width: '100%', marginTop: 16, background: '#26215C', color: '#fff', border: 'none', borderRadius: 12, padding: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Cerrar vista previa</button>
          </div>
        </div>
      </div>
      {trabajoIdx >= 0 && galeria[trabajoIdx] && (
        <div onClick={function () { setTrabajoIdx(-1); }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.93)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
          <button onClick={function (e) { e.stopPropagation(); setTrabajoIdx(-1); }} style={{ position: 'absolute', top: 14, right: 16, width: 38, height: 38, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.16)', color: '#fff', fontSize: 17, fontWeight: 800, cursor: 'pointer' }}>{'✕'}</button>
          {galeria.length > 1 && <button onClick={verAnterior} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 42, height: 42, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.16)', color: '#fff', fontSize: 24, cursor: 'pointer', lineHeight: '42px', padding: 0 }}>{'‹'}</button>}
          <img src={galeria[trabajoIdx]} alt="" onClick={function (e) { e.stopPropagation(); }} style={{ maxWidth: '92vw', maxHeight: '82vh', borderRadius: 12, objectFit: 'contain' }} />
          {galeria.length > 1 && <button onClick={verSiguiente} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 42, height: 42, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.16)', color: '#fff', fontSize: 24, cursor: 'pointer', lineHeight: '42px', padding: 0 }}>{'›'}</button>}
        </div>
      )}
      </>
    );
  }

  if (yaRegistrado && !editando) {
    return (
      <div style={card}>
        {verPerfil && <Preview />}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 18 }}>{'\u{1F9F0}'}</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#1c1f2b' }}>Mi ficha de maestro</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: '#0F6E56', background: '#E1F5EE', borderRadius: 999, padding: '3px 9px' }}>Publicada</span>
        </div>
        <div style={{ fontSize: 13, color: '#7c8499', marginBottom: 4 }}>{[oficiosTxt, anos ? anos + ' años' : '', region].filter(Boolean).join(' · ') || 'Tu ficha'}</div>
        {descripcion && <div style={{ fontSize: 13, lineHeight: 1.55, color: '#2b2f3a', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{descripcion}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
          <button onClick={function () { setEditando(true); setPaso(0); setMaxPaso(2); setErr(null); }} style={{ background: '#fff', color: '#3C3489', border: '1.5px solid #cfc9f3', borderRadius: 12, padding: 11, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>{'✏️ Editar perfil'}</button>
          <button onClick={function () { setVerPerfil(true); }} style={{ background: '#26215C', color: '#fff', border: 'none', borderRadius: 12, padding: 11, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>{'\u{1F441} Ver mi perfil'}</button>
        </div>
      </div>
    );
  }

  var pasoMeta = [
    { n: 'Identidad', h: 'Paso 1 de 3 · Tus datos y verificación' },
    { n: 'Descripción', h: 'Paso 2 de 3 · Cuéntanos qué haces' },
    { n: 'Trabajos', h: 'Paso 3 de 3 · Fotos de tus trabajos' }
  ];
  var comunasRegion = region ? (REGIONES[region] || []) : [];
  var rutMark = rut ? (rutValido(rut)
    ? <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 800, color: '#0d9456' }}>{'✓'}</span>
    : <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 800, color: '#b3261e' }}>RUT inválido</span>) : null;

  return (
    <div style={card}>
      {verPerfil && <Preview />}

      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
        {pasoMeta.map(function (s, i) {
          var on = i === paso, done = i < paso;
          return (
            <div key={i} onClick={function () { irPaso(i); }} style={{ flex: 1, cursor: i <= maxPaso ? 'pointer' : 'default' }}>
              <div style={{ height: 5, borderRadius: 999, background: on ? '#ff5a3c' : done ? '#1D9E75' : '#e8e6f3' }} />
              <div style={{ fontSize: 11, marginTop: 5, color: done ? '#0F6E56' : on ? '#1c1f2b' : '#9aa1b5', fontWeight: on || done ? 700 : 500 }}>{(done ? '✓ ' : '') + s.n}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: '#9aa1b5', margin: '8px 0 12px' }}>{pasoMeta[paso].h}</div>

      {paso === 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>{'\u{1F6E1}'}</span><span style={{ fontSize: 15, fontWeight: 800 }}>Verifica tu identidad</span>
          </div>
          <div style={{ fontSize: 11, color: '#9aa1b5', background: '#fafafc', border: '1px solid #eef0f5', borderRadius: 10, padding: '8px 11px', margin: '4px 0 12px', textAlign: 'center' }}>{'\u{1F4F7} Tu foto de perfil se edita arriba, en la cabecera.'}</div>

          <label style={lbl}>Nombre y apellido</label>
          <input value={nombre} onChange={function (e) { setNombre(e.target.value); }} placeholder="Tu nombre y apellido" style={inp} />

          <label style={lbl}>Teléfono</label>
          <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid #e4e4ef', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f3f2fb', color: '#3C3489', fontWeight: 600, fontSize: 14, padding: '0 13px', borderRight: '1px solid #e4e4ef', whiteSpace: 'nowrap' }}>{'\u{1F1E8}\u{1F1F1} +56 9'}</div>
            <input value={telVisible(tel8)} onChange={function (e) { setTel8(e.target.value.replace(/\D/g, '').slice(0, 8)); }} inputMode="numeric" placeholder="1234 5678" style={{ flex: 1, padding: 12, border: 'none', fontSize: 14, outline: 'none', color: '#1c1f2b', minWidth: 0 }} />
          </div>

          <label style={lbl}>Dirección</label>
          <input ref={dirRef} value={direccion} onChange={function (e) { setDireccion(e.target.value); }} placeholder="Escribe tu dirección" autoComplete="off" style={inp} />
          <label style={lbl}>RUT</label>
          <div style={{ position: 'relative' }}>
            <input value={rut} onChange={function (e) { setRut(formatRut(e.target.value)); }} placeholder="12.345.678-9" style={inp} />
            {rutMark}
          </div>
          <label style={{ ...lbl, marginTop: 14 }}>Foto del carnet (por delante)</label>
          <label style={{ display: 'block', padding: 12, border: '1.5px dashed #ccc', borderRadius: 12, fontSize: 13, background: (carnetFile || (verif && verif.carnet_path)) ? '#f2fbf6' : '#fafafa', color: (carnetFile || (verif && verif.carnet_path)) ? '#0d9456' : '#6b7184', cursor: 'pointer' }}>
            {carnetFile ? '✅ Carnet nuevo seleccionado' : (verif && verif.carnet_path ? '\u{1FAAA} Carnet cargado — tocar para reemplazar' : '\u{1FAAA} Tocar para abrir cámara')}
            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={function (e) { setCarnetFile(e.target.files[0] || null); }} />
          </label>
          <label style={{ display: 'block', marginTop: 10, padding: 12, border: '1.5px dashed #ccc', borderRadius: 12, fontSize: 13, background: (selfieFile || (verif && verif.selfie_path)) ? '#f2fbf6' : '#fafafa', color: (selfieFile || (verif && verif.selfie_path)) ? '#0d9456' : '#6b7184', cursor: 'pointer' }}>
            {selfieFile ? '✅ Selfie nueva seleccionada' : (verif && verif.selfie_path ? '\u{1F933} Selfie cargada — tocar para reemplazar' : '\u{1F933} Selfie — cámara frontal')}
            <input type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={function (e) { setSelfieFile(e.target.files[0] || null); }} />
          </label>
          <div style={{ fontSize: 11, color: '#9aa1b5', margin: '12px 0 4px', lineHeight: 1.5 }}>Solo lo ve nuestro equipo. Las fotos del carnet se eliminan al aprobarte.</div>
          {msg && <p style={{ fontSize: 12, color: msg.indexOf('Error') >= 0 ? '#b3261e' : '#0d9456' }}>{msg}</p>}
          {err && <p style={{ fontSize: 12, color: '#b3261e' }}>{err}</p>}
          <button className="gbtn full" style={{ marginTop: 8, opacity: guardando ? 0.6 : 1 }} disabled={guardando} onClick={next1}>{guardando ? 'Guardando...' : 'Siguiente: Descripción →'}</button>
          {yaRegistrado && <button onClick={function () { setEditando(false); }} style={{ background: 'none', border: 'none', color: '#9aa1b5', fontWeight: 700, fontSize: 12, cursor: 'pointer', width: '100%', marginTop: 8 }}>Cancelar</button>}
        </div>
      )}

      {paso === 1 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>{'✨'}</span><span style={{ fontSize: 15, fontWeight: 800 }}>Tu descripción</span>
          </div>
          <div style={{ fontSize: 12, color: '#534AB7', background: '#EEEDFE', borderRadius: 10, padding: '9px 11px', margin: '0 0 14px', lineHeight: 1.5 }}>Responde y la descripción se escribe sola abajo.</div>

          <label style={lbl}>Especialidades</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {cat.especialidad.map(function (o) { var on = oficios.indexOf(o.slug) >= 0; return <button key={o.id} type="button" onClick={function () { toggle(oficios, setOficios, o.slug); }} style={chip(on)}>{o.valor}</button>; })}
          </div>
          <label style={lbl}>Años de experiencia</label>
          <input value={anos} onChange={function (e) { setAnos(e.target.value.replace(/[^0-9]/g, '')); }} inputMode="numeric" placeholder="Ej: 8" style={inp} />
          <label style={lbl}>Tipo de trabajos</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {cat.tipo.map(function (t) { var on = tipos.indexOf(t.valor) >= 0; return <button key={t.id} type="button" onClick={function () { toggle(tipos, setTipos, t.valor); }} style={chip(on)}>{t.valor}</button>; })}
          </div>
          <label style={lbl}>Qué ofreces</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {cat.ofrece.map(function (t) { var on = ofrece.indexOf(t.valor) >= 0; return <button key={t.id} type="button" onClick={function () { toggle(ofrece, setOfrece, t.valor); }} style={chip(on)}>{(on ? '✓ ' : '') + t.valor}</button>; })}
          </div>

          <label style={lbl}>Región</label>
          <select value={region} onChange={function (e) { setRegion(e.target.value); setComunas([]); }} style={inp}>
            <option value="">Elige tu región...</option>
            {Object.keys(REGIONES).map(function (r) { return <option key={r} value={r}>{r}</option>; })}
          </select>
          {region && (
            <div>
              <label style={lbl}>Comunas donde trabajas</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {comunasRegion.map(function (c) { var on = comunas.indexOf(c) >= 0; return <button key={c} type="button" onClick={function () { toggle(comunas, setComunas, c); }} style={chip(on)}>{(on ? '✓ ' : '') + c}</button>; })}
              </div>
            </div>
          )}

          <label style={lbl}>¿Qué te diferencia?</label>
          <input value={sello} onChange={function (e) { setSello(e.target.value); }} placeholder="Ej: puntualidad, limpieza" style={inp} />

          <div style={{ border: '1px solid #e4e4ef', borderRadius: 14, padding: '12px 14px', margin: '14px 0 4px', background: '#fafafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: '#9aa1b5' }}>Vista previa · se arma sola</span>
              <button type="button" onClick={function () { setEditado(false); pedirIA(); }} disabled={generando} style={{ background: 'none', border: 'none', color: '#534AB7', fontWeight: 800, fontSize: 12, cursor: 'pointer', opacity: generando ? 0.5 : 1 }}>{'↻ Regenerar'}</button>
            </div>
            <textarea value={descripcion} onChange={function (e) { setDescripcion(e.target.value); setEditado(true); }} placeholder="Aquí aparece tu descripción (se arma sola al responder). También puedes escribirla tú." style={{ width: '100%', minHeight: 92, resize: 'vertical', border: 'none', background: 'transparent', fontSize: 13, lineHeight: 1.6, color: '#1c1f2b', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          {generando && <div style={{ fontSize: 11, color: '#7048e8' }}>{'✨ Escribiendo tu descripción...'}</div>}
          {err && <p style={{ fontSize: 12, color: '#b3261e' }}>{err}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={function () { setPaso(0); setErr(null); }} style={{ background: '#fff', color: '#6b7184', border: '1px solid #e0e0ec', borderRadius: 12, padding: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>← Atrás</button>
            <button className="gbtn full" style={{ flex: 1 }} onClick={next2}>Siguiente: Trabajos →</button>
          </div>
        </div>
      )}

      {paso === 2 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>{'\u{1F4F8}'}</span><span style={{ fontSize: 15, fontWeight: 800 }}>Tus trabajos</span>
          </div>
          <div style={{ fontSize: 12, color: '#7c8499', margin: '0 0 12px', lineHeight: 1.5 }}>Sube fotos de trabajos que hayas hecho. Las fichas con fotos reciben más contactos.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            {galeria.map(function (u, i) {
              return (
                <div key={i} style={{ position: 'relative', paddingTop: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid #eee' }}>
                  <img src={u} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={function () { quitarTrabajo(u); }} style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', lineHeight: '24px', padding: 0 }}>×</button>
                </div>
              );
            })}
            <label style={{ paddingTop: '100%', position: 'relative', borderRadius: 12, border: '1.5px dashed #ccc', background: '#fafafa', cursor: 'pointer' }}>
              <span style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#7c8499', fontSize: 12, fontWeight: 700 }}>
                <span style={{ fontSize: 24 }}>+</span>Agregar
              </span>
              <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={subiendoGal} onChange={function (e) { subirTrabajos(e.target.files); }} />
            </label>
          </div>
          {subiendoGal && <div style={{ fontSize: 11, color: '#7048e8', marginBottom: 8 }}>Subiendo fotos...</div>}
          {msg && <p style={{ fontSize: 12, color: msg.indexOf('Error') >= 0 ? '#b3261e' : '#0d9456' }}>{msg}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button onClick={function () { setPaso(1); setErr(null); }} style={{ background: '#fff', color: '#6b7184', border: '1px solid #e0e0ec', borderRadius: 12, padding: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>← Atrás</button>
            <button className="gbtn full" style={{ flex: 1, background: '#1D9E75', opacity: guardando ? 0.6 : 1 }} disabled={guardando} onClick={finalizar}>{guardando ? 'Publicando...' : (yaRegistrado ? '✓ Guardar cambios' : '✓ Finalizar registro')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
