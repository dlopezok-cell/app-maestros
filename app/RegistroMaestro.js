'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Formulario de registro/edicion del maestro: oficios (varios), experiencia, precios y ubicacion.
// Guarda via RPC registrar_maestro (marca el perfil como maestro y hace upsert en maestros).
const OFICIOS = [
  { id: 'gasfiteria', nombre: 'Gasfitería' },
  { id: 'electricidad', nombre: 'Electricidad' },
  { id: 'cerrajeria', nombre: 'Cerrajería' },
  { id: 'pintura', nombre: 'Pintura' },
  { id: 'calefont', nombre: 'Calefont' },
  { id: 'limpieza', nombre: 'Limpieza' },
];

export default function RegistroMaestro({ usuario }) {
  const [nombre, setNombre] = useState('');
  const [oficios, setOficios] = useState([]);
  const [descripcion, setDescripcion] = useState('');
  const [anos, setAnos] = useState('');
  const [precioVideo, setPrecioVideo] = useState('');
  const [precioVisita, setPrecioVisita] = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [ubicMsg, setUbicMsg] = useState('');
  const [msg, setMsg] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [yaRegistrado, setYaRegistrado] = useState(false);

  useEffect(function () {
    if (!usuario) return;
    Promise.all([
      supabase.from('maestros').select('*').eq('id', usuario.id).maybeSingle(),
      supabase.from('perfiles').select('nombre, lat, lng').eq('id', usuario.id).maybeSingle()
    ]).then(function (res) {
      var m = res[0].data;
      var p = res[1].data;
      if (p) { setNombre(p.nombre || ''); if (p.lat != null) setLat(p.lat); if (p.lng != null) setLng(p.lng); }
      if (m) {
        setYaRegistrado(true);
        setOficios(m.oficios && m.oficios.length ? m.oficios : (m.oficio ? [m.oficio] : []));
        setDescripcion(m.descripcion || '');
        setAnos(m.anos_experiencia != null ? String(m.anos_experiencia) : '');
        setPrecioVideo(m.precio_videollamada != null ? String(m.precio_videollamada) : '');
        setPrecioVisita(m.precio_visita != null ? String(m.precio_visita) : '');
      }
      setCargado(true);
    });
  }, [usuario]);

  function toggleOficio(id) {
    setOficios(function (prev) {
      return prev.indexOf(id) >= 0 ? prev.filter(function (x) { return x !== id; }) : prev.concat([id]);
    });
  }

  function ubicar() {
    if (!navigator.geolocation) { setUbicMsg('Tu navegador no soporta ubicación'); return; }
    setUbicMsg('Obteniendo tu ubicación...');
    navigator.geolocation.getCurrentPosition(
      function (pos) { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setUbicMsg('Ubicación lista ✓'); },
      function () { setUbicMsg('No pudimos obtener tu ubicación. Revisa los permisos.'); }
    );
  }

  function guardar() {
    if (!nombre.trim()) { setMsg('Escribe tu nombre'); return; }
    if (!oficios.length) { setMsg('Elige al menos una especialidad'); return; }
    if (!descripcion.trim() || descripcion.trim().length < 20) { setMsg('Cuéntanos un poco más de tu experiencia (mín. 20 caracteres)'); return; }
    setGuardando(true);
    setMsg('Guardando...');
    supabase.rpc('registrar_maestro', {
      p_nombre: nombre.trim(),
      p_oficios: oficios,
      p_descripcion: descripcion.trim(),
      p_anos: anos ? parseInt(anos, 10) : 0,
      p_precio_video: precioVideo ? parseInt(precioVideo, 10) : 0,
      p_precio_visita: precioVisita ? parseInt(precioVisita, 10) : 0,
      p_lat: lat,
      p_lng: lng
    }).then(function (r) {
      if (r.error) { setMsg('Error: ' + r.error.message); setGuardando(false); return; }
      setYaRegistrado(true);
      setMsg('Perfil de maestro guardado ✓ Ya apareces para los clientes.');
      setGuardando(false);
    });
  }

  if (!usuario || !cargado) return <div className="body" style={{ paddingTop: 18 }}><p>Cargando...</p></div>;

  const inp = { width: '100%', padding: 12, border: '1.5px solid #ddd', borderRadius: 12, fontSize: 14, marginBottom: 10, background: '#fff', color: '#1c1f2b' };
  const card = { background: '#fff', borderRadius: 16, padding: 16, margin: '14px 16px', border: '1.5px solid #eee' };

  return (
    <div style={card}>
      <b style={{ fontSize: 15 }}>{yaRegistrado ? 'Tu ficha de maestro' : 'Regístrate como maestro'}</b>
      <div style={{ fontSize: 12, color: '#7c8499', margin: '4px 0 12px' }}>Cuéntale a los clientes qué haces. Esto es lo que verán en tu ficha.</div>

      <input value={nombre} onChange={function (e) { setNombre(e.target.value); }} placeholder="Tu nombre y apellido" style={inp} />

      <div style={{ fontSize: 13, fontWeight: 700, margin: '4px 0 8px' }}>Tus especialidades (elige una o varias)</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {OFICIOS.map(function (o) {
          var on = oficios.indexOf(o.id) >= 0;
          return (
            <button key={o.id} type="button" onClick={function () { toggleOficio(o.id); }}
              style={{ padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                border: on ? '1.5px solid #ff5a3c' : '1.5px solid #ddd',
                background: on ? '#fff5f2' : '#fff', color: on ? '#ff5a3c' : '#5b6275' }}>
              {(on ? '✓ ' : '') + o.nombre}
            </button>
          );
        })}
      </div>

      <textarea value={descripcion} onChange={function (e) { setDescripcion(e.target.value); }}
        placeholder="Describe tu experiencia: qué trabajos haces, tu especialidad, certificaciones, etc."
        style={{ ...inp, minHeight: 92, resize: 'vertical' }} />

      <input value={anos} onChange={function (e) { setAnos(e.target.value.replace(/[^0-9]/g, '')); }} inputMode="numeric" placeholder="Años de experiencia" style={inp} />
      <input value={precioVideo} onChange={function (e) { setPrecioVideo(e.target.value.replace(/[^0-9]/g, '')); }} inputMode="numeric" placeholder="Precio diagnóstico por videollamada (CLP)" style={inp} />
      <input value={precioVisita} onChange={function (e) { setPrecioVisita(e.target.value.replace(/[^0-9]/g, '')); }} inputMode="numeric" placeholder="Precio visita a domicilio (CLP)" style={inp} />

      <button onClick={ubicar} style={{ width: '100%', padding: 12, border: '1.5px dashed #ccc', borderRadius: 12, fontSize: 13, marginBottom: 10, background: lat ? '#f2fbf6' : '#fafafa', color: lat ? '#0d9456' : '#7c8499', fontWeight: 700, cursor: 'pointer' }}>
        {lat ? '\u{1F4CD} Ubicación lista · tocar para actualizar' : '\u{1F4CD} Usar mi ubicación (para aparecer cerca de los clientes)'}
      </button>
      {ubicMsg && <div style={{ fontSize: 11, color: '#9aa1b5', marginBottom: 6 }}>{ubicMsg}</div>}

      {msg && <p style={{ fontSize: 12, color: msg.indexOf('Error') >= 0 ? '#b3261e' : '#0d9456' }}>{msg}</p>}
      <button className="gbtn full" style={{ opacity: guardando ? 0.6 : 1 }} disabled={guardando} onClick={guardar}>
        {yaRegistrado ? 'Guardar cambios' : 'Registrarme como maestro'}
      </button>
    </div>
  );
}
