'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Perfil del cliente: datos de contacto + varias direcciones (tipo Rappi) con
// título, una marcada como principal. La principal se refleja en perfiles para
// compatibilidad con cotizaciones y filtros.

function refInfluencer() {
  try {
    if (typeof window === 'undefined') return null;
    var iq = new URLSearchParams(window.location.search).get('inf');
    if (!iq) { var m = document.cookie.match(/(?:^|; )mel_ref=([^;]+)/); if (m) iq = decodeURIComponent(m[1]); }
    return iq ? String(iq).trim() : null;
  } catch (e) { return null; }
}

export default function PerfilCliente({ usuario }) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [msg, setMsg] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [editando, setEditando] = useState(true);

  // Direcciones
  const [dirs, setDirs] = useState([]);
  const [dirForm, setDirForm] = useState(false);
  const [dEdit, setDEdit] = useState(null); // { id, titulo, direccion, comuna, lat, lng }
  const [dirMsg, setDirMsg] = useState(null);
  const [guardandoDir, setGuardandoDir] = useState(false);
  const dirRef = useRef(null);

  function cargarDirs() {
    supabase.from('direcciones').select('*').eq('user_id', usuario.id).order('principal', { ascending: false }).order('creado_en', { ascending: true })
      .then(function (r) { setDirs(r.error ? [] : (r.data || [])); });
  }

  useEffect(function () {
    if (!usuario) return;
    supabase.from('perfiles').select('*').eq('id', usuario.id).maybeSingle()
      .then(function (r) {
        if (r.data) {
          setNombre(r.data.nombre || '');
          setTelefono(r.data.telefono || '');
          if (r.data.nombre) setEditando(false);
        }
        setCargado(true);
      });
    cargarDirs();
  }, [usuario]);

  // Google Places: autocompletado solo cuando el formulario de dirección está abierto
  useEffect(function () {
    if (!dirForm) return;
    var key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    function attach() {
      if (!dirRef.current || dirRef.current._ac || !(window.google && window.google.maps && window.google.maps.places)) return;
      var ac = new window.google.maps.places.Autocomplete(dirRef.current, { componentRestrictions: { country: 'cl' }, fields: ['formatted_address', 'address_components', 'geometry'] });
      dirRef.current._ac = ac;
      ac.addListener('place_changed', function () {
        var pl = ac.getPlace();
        var nd = {};
        if (pl.formatted_address) nd.direccion = pl.formatted_address;
        if (pl.geometry && pl.geometry.location) { nd.lat = pl.geometry.location.lat(); nd.lng = pl.geometry.location.lng(); }
        var comps = pl.address_components || [], com = '';
        comps.forEach(function (cc) {
          if (cc.types.indexOf('administrative_area_level_3') >= 0 && !com) com = cc.long_name;
          if (cc.types.indexOf('locality') >= 0 && !com) com = cc.long_name;
        });
        if (com) nd.comuna = com;
        setDEdit(function (prev) { return Object.assign({}, prev, nd); });
        setDirMsg('Dirección seleccionada ✓');
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
  }, [dirForm]);

  function ubicar() {
    if (!navigator.geolocation) { setDirMsg('Tu navegador no soporta ubicación. Escribe la dirección arriba.'); return; }
    setDirMsg('Obteniendo tu ubicación...');
    var listo = false;
    var falla = function () { if (listo) return; listo = true; setDirMsg('No pudimos obtener tu ubicación. Escribe la dirección arriba.'); };
    var t = setTimeout(falla, 9000);
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        if (listo) return; listo = true; clearTimeout(t);
        setDEdit(function (prev) { return Object.assign({}, prev, { lat: pos.coords.latitude, lng: pos.coords.longitude }); });
        setDirMsg('Ubicación capturada ✓ escribe la dirección');
      },
      function () { clearTimeout(t); falla(); },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }

  function espejoPerfil(d) {
    // refleja la dirección principal en perfiles (compatibilidad con cotización y filtros)
    supabase.from('perfiles').upsert({ id: usuario.id, rol: 'cliente', direccion: d ? (d.direccion || null) : null, comuna: d ? (d.comuna || null) : null, lat: d ? d.lat : null, lng: d ? d.lng : null }, { onConflict: 'id' }).then(function () {});
  }

  function abrirNueva() { setDEdit({ id: null, titulo: '', direccion: '', comuna: '', lat: null, lng: null }); setDirMsg(null); setDirForm(true); }
  function abrirEditar(d) { setDEdit({ id: d.id, titulo: d.titulo || '', direccion: d.direccion || '', comuna: d.comuna || '', lat: d.lat, lng: d.lng }); setDirMsg(null); setDirForm(true); }

  function guardarDir() {
    var d = dEdit || {};
    if (!(d.direccion || '').trim()) { setDirMsg('Escribe la dirección.'); return; }
    setGuardandoDir(true);
    var esPrimera = dirs.length === 0;
    var fila = { user_id: usuario.id, titulo: (d.titulo || '').trim() || 'Dirección', direccion: d.direccion.trim(), comuna: (d.comuna || '').trim() || null, lat: d.lat, lng: d.lng };
    var op;
    if (d.id) op = supabase.from('direcciones').update(fila).eq('id', d.id).eq('user_id', usuario.id);
    else { if (esPrimera) fila.principal = true; op = supabase.from('direcciones').insert(fila); }
    op.then(function (r) {
      setGuardandoDir(false);
      if (r.error) { setDirMsg('Error: ' + r.error.message); return; }
      if (esPrimera) espejoPerfil(fila);
      else if (d.id) {
        var era = dirs.find(function (x) { return x.id === d.id; });
        if (era && era.principal) espejoPerfil(fila);
      }
      setDirForm(false); setDEdit(null); cargarDirs();
    });
  }

  function hacerPrincipal(d) {
    supabase.from('direcciones').update({ principal: false }).eq('user_id', usuario.id).then(function () {
      supabase.from('direcciones').update({ principal: true }).eq('id', d.id).eq('user_id', usuario.id).then(function () {
        espejoPerfil(d); cargarDirs();
      });
    });
  }

  function borrarDir(d) {
    if (!window.confirm('¿Borrar la dirección "' + (d.titulo || 'Dirección') + '"?')) return;
    supabase.from('direcciones').delete().eq('id', d.id).eq('user_id', usuario.id).then(function () {
      if (d.principal) {
        var resto = dirs.filter(function (x) { return x.id !== d.id; });
        if (resto.length) hacerPrincipal(resto[0]); else { espejoPerfil(null); cargarDirs(); }
      } else cargarDirs();
    });
  }

  function guardar() {
    if (!nombre.trim()) { setMsg('Ingresa tu nombre'); return; }
    setGuardando(true); setMsg('Guardando...');
    var perfilRow = { id: usuario.id, rol: 'cliente', nombre: nombre.trim(), telefono: telefono.trim() || null };
    var _inf = refInfluencer(); if (_inf) perfilRow.ref = _inf;
    supabase.from('perfiles').upsert(perfilRow, { onConflict: 'id' }).then(function (r) {
      setGuardando(false);
      if (r.error) { setMsg('Error: ' + r.error.message); return; }
      setMsg('Perfil guardado ✓'); setEditando(false);
    });
  }

  if (!usuario || !cargado) return <div className="body" style={{ paddingTop: 18 }}><p>Cargando tu perfil...</p></div>;

  const dis = !editando;
  const enApp = typeof window !== 'undefined' && /[?&]app=1/.test(window.location.search);
  const inp = { width: '100%', padding: 12, border: '1.5px solid #ddd', borderRadius: 12, fontSize: 14, marginBottom: 10, background: dis ? '#f6f7f9' : '#fff', color: dis ? '#5b6275' : '#1c1f2b' };
  const inp2 = { width: '100%', padding: 12, border: '1.5px solid #ddd', borderRadius: 12, fontSize: 14, marginBottom: 10, background: '#fff', color: '#1c1f2b' };
  const card = { background: '#fff', borderRadius: 18, padding: 16, marginBottom: 14, border: '1.5px solid #eee' };

  return (
    <div className="body" style={{ paddingTop: 18 }}>
      <div style={card}>
        {editando ? (
          <div>
            <b style={{ fontSize: 15 }}>Mis datos</b>
            <div style={{ fontSize: 12, color: '#7c8499', margin: '4px 0 12px' }}>Tu nombre y teléfono para que los maestros sepan cómo contactarte.</div>
            <input value={nombre} onChange={function (e) { setNombre(e.target.value); }} placeholder="Tu nombre" style={inp2} />
            <input value={telefono} onChange={function (e) { setTelefono(e.target.value); }} placeholder="Teléfono (ej: +56 9 1234 5678)" style={inp2} />
            {msg && <p style={{ fontSize: 12, color: msg.indexOf('Error') >= 0 ? '#b3261e' : '#0d9456', margin: '4px 0' }}>{msg}</p>}
            <button className="gbtn full" style={{ opacity: guardando ? .6 : 1 }} disabled={guardando} onClick={guardar}>Guardar datos</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, fontWeight: 800, flexShrink: 0 }}>{((nombre || (usuario && usuario.email) || '?').charAt(0) || '?').toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1c1f2b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombre || 'Tu nombre'}</div>
              <div style={{ fontSize: 13, color: '#7c8499', marginTop: 1 }}>{telefono || 'Agrega tu teléfono'}</div>
            </div>
            <button onClick={function () { setEditando(true); setMsg(null); }} aria-label="Editar datos" style={{ background: '#f1f4f9', border: 'none', width: 36, height: 36, borderRadius: 11, color: '#2563eb', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{'\u270F\uFE0F'}</button>
          </div>
        )}
      </div>

      <div style={card}>
        <b style={{ fontSize: 15 }}>{'\u{1F4CD} Mis direcciones'}</b>
        <div style={{ fontSize: 12, color: '#7c8499', margin: '4px 0 12px' }}>Guarda varias (Casa, Trabajo…) y elige la principal. Al cotizar llega la principal, pero puedes cambiarla.</div>

        {dirs.length === 0 && !dirForm && <div style={{ fontSize: 13, color: '#9aa1b5', padding: '4px 0 12px' }}>Aún no tienes direcciones guardadas.</div>}

        {dirs.map(function (d) {
          return (
            <div key={d.id} style={{ border: '1.5px solid ' + (d.principal ? '#cfe0ff' : '#eef1f7'), background: d.principal ? '#f7faff' : '#fff', borderRadius: 14, padding: 11, marginBottom: 9 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 16 }}>{'\u{1F4CD}'}</span>
                <b style={{ fontSize: 13.5, color: '#16294f' }}>{d.titulo || 'Dirección'}</b>
                {d.principal
                  ? <span style={{ fontSize: 10, color: '#2563eb', background: '#e7f0ff', borderRadius: 20, padding: '2px 9px', fontWeight: 800 }}>Principal</span>
                  : <span onClick={function () { hacerPrincipal(d); }} style={{ fontSize: 10.5, color: '#5b6275', border: '1px solid #e4e4ef', borderRadius: 20, padding: '2px 9px', cursor: 'pointer' }}>Hacer principal</span>}
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                  <span onClick={function () { abrirEditar(d); }} style={{ fontSize: 13, color: '#2563eb', cursor: 'pointer' }}>{'✎'}</span>
                  <span onClick={function () { borrarDir(d); }} style={{ fontSize: 13, color: '#b3261e', cursor: 'pointer' }}>{'\u{1F5D1}'}</span>
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#5b6275', marginTop: 4, paddingLeft: 23 }}>{d.direccion}{d.comuna ? (' · ' + d.comuna) : ''}</div>
            </div>
          );
        })}

        {dirForm && (
          <div style={{ border: '1.5px solid #dbe7fb', borderRadius: 14, padding: 12, marginTop: 4, background: '#fafcff' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#16294f', marginBottom: 8 }}>{dEdit && dEdit.id ? 'Editar dirección' : 'Nueva dirección'}</div>
            <input value={(dEdit && dEdit.titulo) || ''} onChange={function (e) { setDEdit(Object.assign({}, dEdit, { titulo: e.target.value })); }} placeholder="Título (ej: Casa, Trabajo)" maxLength={30} style={inp2} />
            <input ref={dirRef} value={(dEdit && dEdit.direccion) || ''} onChange={function (e) { setDEdit(Object.assign({}, dEdit, { direccion: e.target.value })); }} placeholder="Dirección (escribe y elige de la lista)" autoComplete="off" style={inp2} />
            <input value={(dEdit && dEdit.comuna) || ''} onChange={function (e) { setDEdit(Object.assign({}, dEdit, { comuna: e.target.value })); }} placeholder="Comuna" style={inp2} />
            {!enApp && (
              <button onClick={ubicar} style={{ width: '100%', padding: 11, border: '1.5px dashed #ccc', borderRadius: 12, fontSize: 12.5, marginBottom: 10, background: (dEdit && dEdit.lat) ? '#f2fbf6' : '#fafafa', color: (dEdit && dEdit.lat) ? '#0d9456' : '#7c8499', fontWeight: 700, cursor: 'pointer' }}>
                {(dEdit && dEdit.lat) ? '\u{1F4CD} Ubicación capturada · tocar para actualizar' : '\u{1F4CD} Usar mi ubicación actual'}
              </button>
            )}
            {dirMsg && <p style={{ fontSize: 12, color: dirMsg.indexOf('Error') >= 0 ? '#b3261e' : '#0d9456', margin: '2px 0 8px' }}>{dirMsg}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="gbtn" style={{ flex: 1.4, opacity: guardandoDir ? .6 : 1 }} disabled={guardandoDir} onClick={guardarDir}>Guardar dirección</button>
              <button onClick={function () { setDirForm(false); setDEdit(null); }} style={{ flex: 1, background: '#fff', color: '#5b6275', border: '1.5px solid #e4e4ef', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        )}

        {!dirForm && (
          <button onClick={abrirNueva} style={{ width: '100%', padding: 12, border: '1.5px dashed #cbd0dd', borderRadius: 12, fontSize: 13, background: '#fafbfe', color: '#2563eb', fontWeight: 800, cursor: 'pointer' }}>{'+ Agregar dirección'}</button>
        )}
      </div>
    </div>
  );
}
