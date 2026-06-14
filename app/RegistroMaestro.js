'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Registro del maestro: ficha en una pagina, ordenada por secciones con estilo
// moderno. La descripcion se ARMA SOLA con IA a medida que responde (respeta
// lo que edite a mano). Las comunas se eligen como chips.
const OFICIOS = [
  { id: 'gasfiteria', nombre: 'Gasfitería' },
  { id: 'electricidad', nombre: 'Electricidad' },
  { id: 'cerrajeria', nombre: 'Cerrajería' },
  { id: 'pintura', nombre: 'Pintura' },
  { id: 'calefont', nombre: 'Calefont' },
  { id: 'limpieza', nombre: 'Limpieza' },
];
const TIPOS = ['Instalaciones', 'Reparaciones', 'Mantención', 'Remodelaciones', 'Emergencias'];
const COMUNAS = [
  'Providencia', 'Ñuñoa', 'Las Condes', 'Vitacura', 'Lo Barnechea', 'La Reina',
  'Santiago Centro', 'Macul', 'Peñalolén', 'La Florida', 'San Miguel', 'Maipú',
  'Estación Central', 'Recoleta', 'Independencia', 'Quilicura', 'Huechuraba', 'Puente Alto',
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

  // Cuestionario para la IA
  const [tipos, setTipos] = useState([]);
  const [fds, setFds] = useState(false);
  const [urgencias, setUrgencias] = useState(false);
  const [garantia, setGarantia] = useState(false);
  const [boleta, setBoleta] = useState(false);
  const [comunas, setComunas] = useState([]);
  const [sello, setSello] = useState('');
  const [generando, setGenerando] = useState(false);
  const [genMsg, setGenMsg] = useState(null);
  const [editado, setEditado] = useState(false); // true = el maestro edito la descripcion a mano

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
        setAnos(m.anos_experiencia != null ? String(m.anos_experiencia) : '');
        setPrecioVideo(m.precio_videollamada != null ? String(m.precio_videollamada) : '');
        setPrecioVisita(m.precio_visita != null ? String(m.precio_visita) : '');
        if (m.descripcion) { setDescripcion(m.descripcion); setEditado(true); } // no sobreescribir lo guardado
      }
      setCargado(true);
    });
  }, [usuario]);

  function toggle(arr, set, id) {
    set(arr.indexOf(id) >= 0 ? arr.filter(function (x) { return x !== id; }) : arr.concat([id]));
  }

  function pedirIA() {
    if (!oficios.length) return;
    setGenerando(true);
    setGenMsg('Escribiendo tu descripción...');
    fetch('/api/describir-maestro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre.trim(), oficios: oficios, anos: anos, tipos: tipos, zona: comunas.join(', '), sello: sello.trim(), fds: fds, urgencias: urgencias, garantia: garantia, boleta: boleta })
    }).then(function (r) { return r.json(); }).then(function (d) {
      setGenerando(false);
      if (d.error) { setGenMsg('Error: ' + d.error); return; }
      if (d.descripcion) { setDescripcion(d.descripcion); setGenMsg('Descripción lista ✓ puedes editarla'); }
      else { setGenMsg('No se pudo generar, intenta de nuevo'); }
    }).catch(function () { setGenerando(false); setGenMsg('No se pudo generar, intenta de nuevo'); });
  }

  // Auto-genera la descripcion (con debounce) mientras el maestro responde,
  // siempre que no la haya editado a mano y tenga al menos una especialidad.
  useEffect(function () {
    if (!cargado || !oficios.length || editado) return;
    var t = setTimeout(function () { pedirIA(); }, 1300);
    return function () { clearTimeout(t); };
    // eslint-disable-next-line
  }, [cargado, editado, oficios, anos, tipos, fds, urgencias, garantia, boleta, comunas, sello, nombre]);

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
    if (!descripcion.trim() || descripcion.trim().length < 20) { setMsg('Falta tu descripción (responde el cuestionario y se arma sola)'); return; }
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

  // --- estilos ---
  const inp = { width: '100%', padding: 12, border: '1px solid #e4e4ef', borderRadius: 12, fontSize: 14, background: '#fff', color: '#1c1f2b', boxSizing: 'border-box' };
  const card = { background: '#fff', borderRadius: 18, padding: 18, margin: '14px 16px', border: '1px solid #eef0f5' };
  const divider = { borderTop: '1px solid #eef0f5', margin: '18px 0' };
  function seccion(icono, titulo) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px' }}>
        <span style={{ fontSize: 15 }}>{icono}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#2b2f3a' }}>{titulo}</span>
      </div>
    );
  }
  function lbl(t) { return <div style={{ fontSize: 12, color: '#7c8499', margin: '0 0 8px' }}>{t}</div>; }
  // chip morado (moderno, liviano)
  function chip(on, small) {
    return {
      padding: small ? '6px 11px' : '7px 13px', borderRadius: 999, fontSize: small ? 12 : 13,
      fontWeight: on ? 600 : 500, cursor: 'pointer',
      border: on ? '1px solid #7F77DD' : '1px solid #e0e0ec',
      background: on ? '#fff' : '#fafafc', color: on ? '#3C3489' : '#6b7184'
    };
  }

  return (
    <div style={card}>
      {/* Tus datos */}
      {seccion('\u{1F464}', 'Tus datos')}
      <input value={nombre} onChange={function (e) { setNombre(e.target.value); }} placeholder="Tu nombre y apellido" style={{ ...inp, marginBottom: 14 }} />
      {lbl('Especialidades (elige una o varias)')}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {OFICIOS.map(function (o) {
          var on = oficios.indexOf(o.id) >= 0;
          return <button key={o.id} type="button" onClick={function () { toggle(oficios, setOficios, o.id); }} style={chip(on)}>{o.nombre}</button>;
        })}
      </div>

      <div style={divider} />

      {/* Arma tu descripcion con IA */}
      <div style={{ background: '#EEEDFE', borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 15 }}>{'✨'}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#3C3489' }}>Arma tu descripción</span>
        </div>
        <div style={{ fontSize: 12, color: '#534AB7', margin: '4px 0 14px', lineHeight: 1.5 }}>Responde y la descripción se escribe sola abajo.</div>

        <input value={anos} onChange={function (e) { setAnos(e.target.value.replace(/[^0-9]/g, '')); }} inputMode="numeric" placeholder="Años de experiencia" style={{ ...inp, marginBottom: 14 }} />

        <div style={{ fontSize: 12, color: '#534AB7', margin: '0 0 8px' }}>Tipo de trabajos</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {TIPOS.map(function (t) {
            var on = tipos.indexOf(t) >= 0;
            return <button key={t} type="button" onClick={function () { toggle(tipos, setTipos, t); }} style={chip(on, true)}>{t}</button>;
          })}
        </div>

        <div style={{ fontSize: 12, color: '#534AB7', margin: '0 0 8px' }}>Qué ofreces</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          <button type="button" onClick={function () { setGarantia(!garantia); }} style={chip(garantia, true)}>{(garantia ? '✓ ' : '') + 'Doy garantía'}</button>
          <button type="button" onClick={function () { setBoleta(!boleta); }} style={chip(boleta, true)}>{(boleta ? '✓ ' : '') + 'Emito boleta'}</button>
          <button type="button" onClick={function () { setUrgencias(!urgencias); }} style={chip(urgencias, true)}>{(urgencias ? '✓ ' : '') + 'Urgencias'}</button>
          <button type="button" onClick={function () { setFds(!fds); }} style={chip(fds, true)}>{(fds ? '✓ ' : '') + 'Fines de semana'}</button>
        </div>

        <div style={{ fontSize: 12, color: '#534AB7', margin: '0 0 8px' }}>Comunas donde trabajas</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {COMUNAS.map(function (c) {
            var on = comunas.indexOf(c) >= 0;
            return <button key={c} type="button" onClick={function () { toggle(comunas, setComunas, c); }} style={chip(on, true)}>{c}</button>;
          })}
        </div>

        <input value={sello} onChange={function (e) { setSello(e.target.value); }} placeholder="¿Qué te diferencia? (ej: puntualidad, limpieza)" style={{ ...inp, marginBottom: 0 }} />

        {generando && <div style={{ fontSize: 11, color: '#7048e8', marginTop: 10 }}>{'✨ Escribiendo tu descripción...'}</div>}
      </div>

      {/* Vista previa de la ficha */}
      <div style={{ border: '1px solid #e4e4ef', borderRadius: 14, padding: '12px 14px', marginBottom: 4, background: '#fafafc' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: '#9aa1b5' }}>Vista previa de tu ficha</span>
          <button type="button" onClick={function () { setEditado(false); pedirIA(); }} disabled={generando}
            style={{ background: 'none', border: 'none', color: '#534AB7', fontWeight: 800, fontSize: 12, cursor: 'pointer', opacity: generando ? 0.5 : 1 }}>{'↻ Regenerar'}</button>
        </div>
        <textarea value={descripcion} onChange={function (e) { setDescripcion(e.target.value); setEditado(true); }}
          placeholder="Aquí aparece tu descripción (se arma sola al responder arriba). También puedes escribirla tú."
          style={{ width: '100%', minHeight: 92, resize: 'vertical', border: 'none', background: 'transparent', fontSize: 13, lineHeight: 1.6, color: '#1c1f2b', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
      </div>
      {genMsg && <div style={{ fontSize: 11, color: genMsg.indexOf('Error') >= 0 ? '#b3261e' : '#9aa1b5', margin: '6px 0 0' }}>{genMsg}</div>}

      <div style={divider} />

      {/* Precios */}
      {seccion('\u{1F4B5}', 'Precios')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div>
          {lbl('Videollamada (CLP)')}
          <input value={precioVideo} onChange={function (e) { setPrecioVideo(e.target.value.replace(/[^0-9]/g, '')); }} inputMode="numeric" placeholder="8000" style={inp} />
        </div>
        <div>
          {lbl('Visita (CLP)')}
          <input value={precioVisita} onChange={function (e) { setPrecioVisita(e.target.value.replace(/[^0-9]/g, '')); }} inputMode="numeric" placeholder="20000" style={inp} />
        </div>
      </div>

      <button onClick={ubicar} style={{ width: '100%', padding: 12, border: '1px dashed #cdd0db', borderRadius: 12, fontSize: 13, marginBottom: 8, background: lat ? '#E1F5EE' : '#fafafc', color: lat ? '#0F6E56' : '#7c8499', fontWeight: 700, cursor: 'pointer' }}>
        {lat ? '\u{1F4CD} Ubicación lista · tocar para actualizar' : '\u{1F4CD} Usar mi ubicación (para aparecer cerca de los clientes)'}
      </button>
      {ubicMsg && <div style={{ fontSize: 11, color: '#9aa1b5', marginBottom: 6 }}>{ubicMsg}</div>}

      {msg && <p style={{ fontSize: 12, color: msg.indexOf('Error') >= 0 ? '#b3261e' : '#0d9456' }}>{msg}</p>}
      <button className="gbtn full" style={{ marginTop: 6, opacity: guardando ? 0.6 : 1 }} disabled={guardando} onClick={guardar}>
        {yaRegistrado ? 'Guardar cambios' : 'Registrarme como maestro'}
      </button>
    </div>
  );
}
