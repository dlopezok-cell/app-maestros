'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Perfil del cliente: datos de contacto + ubicacion (mapa con pin arrastrable
// y autocompletado de direcciones via OpenStreetMap/Photon). Sin "Mis pedidos"
// (eso vive en su propia pagina). Modo ver / editar.
export default function PerfilCliente({ usuario }) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [comuna, setComuna] = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [msg, setMsg] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [editando, setEditando] = useState(true);

  // Autocompletado de direcciones (Google Places)
  const dirRef = useRef(null);

  useEffect(function () {
    if (!usuario) return;
    supabase.from('perfiles').select('*').eq('id', usuario.id).maybeSingle()
      .then(function (r) {
        if (r.data) {
          setNombre(r.data.nombre || '');
          setTelefono(r.data.telefono || '');
          setDireccion(r.data.direccion || '');
          setComuna(r.data.comuna || '');
          setLat(r.data.lat || null);
          setLng(r.data.lng || null);
          if (r.data.nombre) setEditando(false);
        }
        setCargado(true);
      });
  }, [usuario]);

  // Google Places: autocompletado de dirección (mismo método que el registro del maestro)
  useEffect(function () {
    if (!editando) return;
    var key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    function attach() {
      if (!dirRef.current || dirRef.current._ac || !(window.google && window.google.maps && window.google.maps.places)) return;
      var ac = new window.google.maps.places.Autocomplete(dirRef.current, { componentRestrictions: { country: 'cl' }, fields: ['formatted_address', 'address_components', 'geometry'] });
      dirRef.current._ac = ac;
      ac.addListener('place_changed', function () {
        var pl = ac.getPlace();
        if (pl.formatted_address) setDireccion(pl.formatted_address);
        if (pl.geometry && pl.geometry.location) { setLat(pl.geometry.location.lat()); setLng(pl.geometry.location.lng()); }
        var comps = pl.address_components || [], com = '';
        comps.forEach(function (cc) {
          if (cc.types.indexOf('administrative_area_level_3') >= 0 && !com) com = cc.long_name;
          if (cc.types.indexOf('locality') >= 0 && !com) com = cc.long_name;
        });
        if (com) setComuna(com);
        setMsg('Dirección seleccionada ✓ revisa el pin');
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
  }, [editando, cargado]);

  function ubicar() {
    if (!navigator.geolocation) { setMsg('Tu navegador no soporta ubicación. Escribe tu dirección arriba.'); return; }
    setMsg('Obteniendo tu ubicación...');
    var listo = false;
    var falla = function () { if (listo) return; listo = true; setMsg('No pudimos obtener tu ubicación. Escribe tu dirección en el campo de arriba.'); };
    var t = setTimeout(falla, 9000);
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        if (listo) return; listo = true; clearTimeout(t);
        var la = pos.coords.latitude, lo = pos.coords.longitude;
        setLat(la); setLng(lo);
        setMsg('Ubicación capturada ✓ ajusta el pin y escribe tu dirección');
      },
      function () { clearTimeout(t); falla(); },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }

  function guardar() {
    if (!nombre.trim()) { setMsg('Ingresa tu nombre'); return; }
    setGuardando(true);
    setMsg('Guardando...');
    supabase.from('perfiles').upsert({
      id: usuario.id,
      rol: 'cliente',
      nombre: nombre.trim(),
      telefono: telefono.trim() || null,
      direccion: direccion.trim() || null,
      comuna: comuna.trim() || null,
      lat: lat,
      lng: lng,
    }, { onConflict: 'id' }).then(function (r) {
      if (r.error) { setMsg('Error: ' + r.error.message); setGuardando(false); return; }
      setMsg('Perfil guardado ✓');
      setGuardando(false);
      setEditando(false);
    });
  }

  if (!usuario || !cargado) return <div className="body" style={{ paddingTop: 18 }}><p>Cargando tu perfil...</p></div>;

  const dis = !editando;
  const enApp = typeof window !== 'undefined' && /[?&]app=1/.test(window.location.search);
  const inp = { width: '100%', padding: 12, border: '1.5px solid #ddd', borderRadius: 12, fontSize: 14, marginBottom: 10, background: dis ? '#f6f7f9' : '#fff', color: dis ? '#5b6275' : '#1c1f2b' };
  const card = { background: '#fff', borderRadius: 18, padding: 16, marginBottom: 14, border: '1.5px solid #eee' };

  return (
    <div className="body" style={{ paddingTop: 18 }}>
      <div style={card}>
        <b style={{ fontSize: 15 }}>Mis datos</b>
        <div style={{ fontSize: 12, color: '#7c8499', margin: '4px 0 12px' }}>Con estos datos los maestros saben a dónde ir y cómo contactarte. Puedes pedir el servicio a otra dirección (ej: la de un familiar).</div>
        <input value={nombre} disabled={dis} onChange={function (e) { setNombre(e.target.value); }} placeholder="Tu nombre" style={inp} />
        <input value={telefono} disabled={dis} onChange={function (e) { setTelefono(e.target.value); }} placeholder="Teléfono (ej: +56 9 1234 5678)" style={inp} />

        <div style={{ marginBottom: 10 }}>
          <input ref={dirRef} value={direccion} disabled={dis} onChange={function (e) { setDireccion(e.target.value); }} placeholder="Dirección (escribe y elige de la lista)" style={{ ...inp, marginBottom: 0 }} autoComplete="off" />
          {editando && <div style={{ fontSize: 11, color: '#9aa1b5', marginTop: 4 }}>Empieza a escribir y selecciona tu dirección de las sugerencias.</div>}
        </div>

        <input value={comuna} disabled={dis} onChange={function (e) { setComuna(e.target.value); }} placeholder="Comuna" style={inp} />

        {editando && !enApp && (
          <button onClick={ubicar} style={{ width: '100%', padding: 12, border: '1.5px dashed #ccc', borderRadius: 12, fontSize: 13, marginBottom: 10, background: lat ? '#f2fbf6' : '#fafafa', color: lat ? '#0d9456' : '#7c8499', fontWeight: 700, cursor: 'pointer' }}>
            {lat ? '\u{1F4CD} Ubicación guardada · tocar para actualizar' : '\u{1F4CD} Usar mi ubicación actual'}
          </button>
        )}

        {msg && <p style={{ fontSize: 12, color: msg.indexOf('Error') >= 0 ? '#b3261e' : '#0d9456', margin: '4px 0' }}>{msg}</p>}

        {editando
          ? <button className="gbtn full" style={{ opacity: guardando ? .6 : 1 }} disabled={guardando} onClick={guardar}>Guardar perfil</button>
          : <button className="gbtn full" style={{ background: '#fff', color: '#ff5a3c', border: '2px solid #ffd6cb', boxShadow: 'none' }} onClick={function () { setEditando(true); setMsg(null); }}>{'✏️ Editar perfil'}</button>}
      </div>
    </div>
  );
}
