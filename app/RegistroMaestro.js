'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Registro del maestro. Dos estados:
//  - Editando / sin registrar: formulario completo (cuestionario + IA) y botón guardar.
//  - Ya registrado: se ocultan las herramientas y queda un resumen con
//    "Editar perfil" y "Ver mi perfil" (vista previa de cómo lo ven los clientes).
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
function oficioNombre(id) { var o = OFICIOS.filter(function (x) { return x.id === id; })[0]; return o ? o.nombre : id; }

export default function RegistroMaestro({ usuario, onGuardado }) {
  const [nombre, setNombre] = useState('');
  const [oficios, setOficios] = useState([]);
  const [descripcion, setDescripcion] = useState('');
  const [anos, setAnos] = useState('');
  const [precioVideo, setPrecioVideo] = useState('');
  const [precioVisita, setPrecioVisita] = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [galeria, setGaleria] = useState([]);
  const [msg, setMsg] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [yaRegistrado, setYaRegistrado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [verPerfil, setVerPerfil] = useState(false);
  const [trabajoIdx, setTrabajoIdx] = useState(-1); // foto de galería abierta en grande

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
      supabase.from('perfiles').select('nombre, lat, lng, avatar_url').eq('id', usuario.id).maybeSingle()
    ]).then(function (res) {
      var m = res[0].data;
      var p = res[1].data;
      if (p) { setNombre(p.nombre || ''); if (p.lat != null) setLat(p.lat); if (p.lng != null) setLng(p.lng); setAvatarUrl(p.avatar_url || null); }
      if (m) {
        setYaRegistrado(true);
        setOficios(m.oficios && m.oficios.length ? m.oficios : (m.oficio ? [m.oficio] : []));
        setAnos(m.anos_experiencia != null ? String(m.anos_experiencia) : '');
        setPrecioVideo(m.precio_videollamada != null ? String(m.precio_videollamada) : '');
        setPrecioVisita(m.precio_visita != null ? String(m.precio_visita) : '');
        if (m.galeria) setGaleria(m.galeria);
        if (m.descripcion) { setDescripcion(m.descripcion); setEditado(true); } // no sobreescribir lo guardado
      } else {
        setEditando(true); // sin registrar -> mostrar el formulario
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
    if (!cargado || !editando || !oficios.length || editado) return;
    var t = setTimeout(function () { pedirIA(); }, 1300);
    return function () { clearTimeout(t); };
    // eslint-disable-next-line
  }, [cargado, editando, editado, oficios, anos, tipos, fds, urgencias, garantia, boleta, comunas, sello, nombre]);

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
      setMsg(null);
      setGuardando(false);
      setEditando(false); // colapsa: oculta las herramientas y muestra el resumen
      window.scrollTo(0, 0);
      if (onGuardado) onGuardado();
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
  function chip(on, small) {
    return {
      padding: small ? '6px 11px' : '7px 13px', borderRadius: 999, fontSize: small ? 12 : 13,
      fontWeight: on ? 600 : 500, cursor: 'pointer',
      border: on ? '1px solid #7F77DD' : '1px solid #e0e0ec',
      background: on ? '#fff' : '#fafafc', color: on ? '#3C3489' : '#6b7184'
    };
  }

  var oficiosTxt = oficios.map(oficioNombre).join(' · ');
  var inicial = (nombre || (usuario.email || '?')).trim().charAt(0).toUpperCase();

  // ---- Vista previa (modal): así te ven los clientes ----
  function verAnterior(e) { e.stopPropagation(); setTrabajoIdx(function (i) { return i <= 0 ? galeria.length - 1 : i - 1; }); }
  function verSiguiente(e) { e.stopPropagation(); setTrabajoIdx(function (i) { return i >= galeria.length - 1 ? 0 : i + 1; }); }

  function Preview() {
    return (
      <>
      <div onClick={function () { setVerPerfil(false); }}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(20,20,40,.55)', zIndex: 120, overflowY: 'auto', padding: '22px 14px', boxSizing: 'border-box' }}>
        <div onClick={function (e) { e.stopPropagation(); }}
          style={{ maxWidth: 420, margin: '0 auto', background: '#fff', borderRadius: 22, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.4)' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {galeria.map(function (u, i) {
                    return (
                      <button key={i} type="button" onClick={function () { setTrabajoIdx(i); }}
                        style={{ position: 'relative', paddingTop: '100%', padding: 0, border: 'none', borderRadius: 12, overflow: 'hidden', background: '#eef0f5', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
                        <img src={u} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11, color: '#9aa1b5', marginTop: 7 }}>{'\u{1F50D} Toca una foto para verla en grande'}</div>
              </div>
            )}

            <button onClick={function () { setVerPerfil(false); }} style={{ width: '100%', marginTop: 16, background: '#26215C', color: '#fff', border: 'none', borderRadius: 12, padding: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Cerrar vista previa</button>
          </div>
        </div>
      </div>

      {/* Visor de trabajos a pantalla completa */}
      {trabajoIdx >= 0 && galeria[trabajoIdx] && (
        <div onClick={function () { setTrabajoIdx(-1); }}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.93)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
          <button onClick={function (e) { e.stopPropagation(); setTrabajoIdx(-1); }} style={{ position: 'absolute', top: 14, right: 16, width: 38, height: 38, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.16)', color: '#fff', fontSize: 17, fontWeight: 800, cursor: 'pointer' }}>{'✕'}</button>
          {galeria.length > 1 && <button onClick={verAnterior} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 42, height: 42, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.16)', color: '#fff', fontSize: 24, cursor: 'pointer', lineHeight: '42px', padding: 0 }}>{'‹'}</button>}
          <img src={galeria[trabajoIdx]} alt="" onClick={function (e) { e.stopPropagation(); }} style={{ maxWidth: '92vw', maxHeight: '82vh', borderRadius: 12, objectFit: 'contain' }} />
          {galeria.length > 1 && <button onClick={verSiguiente} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 42, height: 42, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.16)', color: '#fff', fontSize: 24, cursor: 'pointer', lineHeight: '42px', padding: 0 }}>{'›'}</button>}
          <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>{(trabajoIdx + 1) + ' / ' + galeria.length}</div>
        </div>
      )}
      </>
    );
  }

  // ---- Estado: YA REGISTRADO (resumen, sin herramientas) ----
  if (yaRegistrado && !editando) {
    return (
      <div style={card}>
        {verPerfil && <Preview />}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 18 }}>{'\u{1F9F0}'}</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#1c1f2b' }}>Mi ficha de maestro</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: '#0F6E56', background: '#E1F5EE', borderRadius: 999, padding: '3px 9px' }}>Publicada</span>
        </div>
        <div style={{ fontSize: 13, color: '#7c8499', marginBottom: 4 }}>{[oficiosTxt, anos ? anos + ' años' : ''].filter(Boolean).join(' · ') || 'Tu ficha'}</div>
        {descripcion && <div style={{ fontSize: 13, lineHeight: 1.55, color: '#2b2f3a', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{descripcion}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
          <button onClick={function () { setEditando(true); setMsg(null); }} style={{ background: '#fff', color: '#3C3489', border: '1.5px solid #cfc9f3', borderRadius: 12, padding: 11, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>{'✏️ Editar perfil'}</button>
          <button onClick={function () { setVerPerfil(true); }} style={{ background: '#26215C', color: '#fff', border: 'none', borderRadius: 12, padding: 11, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>{'\u{1F441} Ver mi perfil'}</button>
        </div>
      </div>
    );
  }

  // ---- Estado: EDITANDO / SIN REGISTRAR (formulario completo) ----
  return (
    <div style={card}>
      {verPerfil && <Preview />}
      {/* Tus datos */}
      {seccion('\u{1F464}', 'Tus datos')}
      <input value={nombre} onChange={function (e) { setNombre(e.target.value); }} placeholder="Tu nombre y apellido" style={{ ...inp, marginBottom: 0 }} />

      <div style={divider} />

      {/* Arma tu descripcion con IA */}
      <div style={{ background: '#EEEDFE', borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 15 }}>{'✨'}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#3C3489' }}>Arma tu descripción</span>
        </div>
        <div style={{ fontSize: 12, color: '#534AB7', margin: '4px 0 14px', lineHeight: 1.5 }}>Responde y la descripción se escribe sola abajo.</div>

        <div style={{ fontSize: 12, color: '#534AB7', margin: '0 0 8px' }}>Especialidades (elige una o varias)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {OFICIOS.map(function (o) {
            var on = oficios.indexOf(o.id) >= 0;
            return <button key={o.id} type="button" onClick={function () { toggle(oficios, setOficios, o.id); }} style={chip(on, true)}>{o.nombre}</button>;
          })}
        </div>

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
      {genMsg && <div style={{ fontSize: 11, color: genMsg.indexOf('Error') >= 0 ? '#b3261e' : '#9aa1b5', margin: '6px 0 14px' }}>{genMsg}</div>}

      {msg && <p style={{ fontSize: 12, color: msg.indexOf('Error') >= 0 ? '#b3261e' : '#0d9456' }}>{msg}</p>}
      <button className="gbtn full" style={{ marginTop: 6, opacity: guardando ? 0.6 : 1 }} disabled={guardando} onClick={guardar}>
        {yaRegistrado ? 'Guardar cambios' : 'Registrarme como maestro'}
      </button>
      {yaRegistrado && <button onClick={function () { setEditando(false); setMsg(null); }} style={{ background: 'none', border: 'none', color: '#9aa1b5', fontWeight: 700, fontSize: 12, cursor: 'pointer', width: '100%', marginTop: 8 }}>Cancelar</button>}
    </div>
  );
}
