'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Perfil del cliente: datos de contacto + ubicacion (mapa con pin arrastrable
// y autocompletado de direcciones via OpenStreetMap/Photon) + historial de pedidos.
export default function PerfilCliente({ usuario }) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [comuna, setComuna] = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [msg, setMsg] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [cargado, setCargado] = useState(false);

  // Autocompletado de direcciones
  const [sugs, setSugs] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const debRef = useRef(null);

  // Mapa Leaflet (OpenStreetMap)
  const [leafletReady, setLeafletReady] = useState(false);
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

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
        }
        setCargado(true);
      });
    supabase.from('reservas').select('*').eq('cliente_id', usuario.id).order('creado_en', { ascending: false })
      .then(function (r) { setPedidos(r.data || []); });
  }, [usuario]);

  // Cargar Leaflet desde CDN una sola vez
  useEffect(function () {
    if (typeof window === 'undefined') return;
    if (window.L) { setLeafletReady(true); return; }
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    var script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = function () { setLeafletReady(true); };
    document.body.appendChild(script);
  }, []);

  // Inicializar / actualizar el mapa cuando hay coordenadas
  useEffect(function () {
    if (!leafletReady || lat == null || lng == null || !mapDivRef.current) return;
    var L = window.L;
    if (!mapRef.current) {
      mapRef.current = L.map(mapDivRef.current).setView([lat, lng], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 19,
      }).addTo(mapRef.current);
      var icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41],
      });
      markerRef.current = L.marker([lat, lng], { draggable: true, icon: icon }).addTo(mapRef.current);
      markerRef.current.on('dragend', function (e) {
        var p = e.target.getLatLng();
        setLat(p.lat); setLng(p.lng);
        setMsg('Pin movido ✓ ajusta si es necesario');
      });
      setTimeout(function () { if (mapRef.current) mapRef.current.invalidateSize(); }, 200);
    } else {
      mapRef.current.setView([lat, lng], 16);
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [leafletReady, lat, lng]);

  // Usar ubicacion actual del dispositivo
  function ubicar() {
    if (!navigator.geolocation) { setMsg('Tu navegador no soporta ubicación'); return; }
    setMsg('Obteniendo tu ubicación...');
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        var la = pos.coords.latitude, lo = pos.coords.longitude;
        setLat(la); setLng(lo);
        setMsg('Ubicación capturada ✓');
        // Rellenar la direccion con geocodificacion inversa (opcional)
        fetch('https://photon.komoot.io/reverse?lat=' + la + '&lon=' + lo)
          .then(function (r) { return r.json(); })
          .then(function (j) {
            var f = j && j.features && j.features[0];
            if (!f) return;
            var p = f.properties || {};
            var calle = [p.name || p.street, p.housenumber].filter(Boolean).join(' ');
            if (calle && !direccion) setDireccion(calle);
            if ((p.city || p.district) && !comuna) setComuna(p.city || p.district);
          })
          .catch(function () {});
      },
      function () { setMsg('No pudimos obtener tu ubicación. Revisa los permisos.'); }
    );
  }

  // Autocompletado de direcciones (Photon / OpenStreetMap), sesgado a Chile
  function onDireccion(v) {
    setDireccion(v);
    if (debRef.current) clearTimeout(debRef.current);
    if (!v || v.trim().length < 4) { setSugs([]); return; }
    debRef.current = setTimeout(function () {
      setBuscando(true);
      fetch('https://photon.komoot.io/api/?q=' + encodeURIComponent(v) + '&limit=8&lat=-33.45&lon=-70.66')
        .then(function (r) { return r.json(); })
        .then(function (j) {
          var feats = (j.features || []).filter(function (f) {
            return f.properties && f.properties.countrycode === 'CL';
          });
          setSugs(feats);
          setBuscando(false);
        })
        .catch(function () { setBuscando(false); });
    }, 350);
  }

  function elegirSug(f) {
    var c = f.geometry.coordinates; // [lon, lat]
    var p = f.properties || {};
    setLng(c[0]); setLat(c[1]);
    var calle = [p.name || p.street, p.housenumber].filter(Boolean).join(' ');
    setDireccion(calle || p.name || '');
    if (p.city || p.district || p.county) setComuna(p.city || p.district || p.county);
    setSugs([]);
    setMsg('Dirección seleccionada ✓ revisa el pin');
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
    });
  }

  function fecha(f) { return f ? new Date(f).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; }
  function plata(n) { return '$' + (n || 0).toLocaleString('es-CL'); }

  if (!usuario || !cargado) return <div className="body" style={{ paddingTop: 18 }}><p>Cargando tu perfil...</p></div>;

  const inp = { width: '100%', padding: 12, border: '1.5px solid #ddd', borderRadius: 12, fontSize: 14, marginBottom: 10 };
  const card = { background: '#fff', borderRadius: 18, padding: 16, marginBottom: 14, border: '1.5px solid #eee' };

  return (
    <div className="body" style={{ paddingTop: 18 }}>
      <div style={card}>
        <b style={{ fontSize: 15 }}>Mis datos</b>
        <div style={{ fontSize: 12, color: '#7c8499', margin: '4px 0 12px' }}>Con estos datos los maestros saben a dónde ir y cómo contactarte. Puedes pedir el servicio a otra dirección (ej: la de un familiar).</div>
        <input value={nombre} onChange={function (e) { setNombre(e.target.value); }} placeholder="Tu nombre" style={inp} />
        <input value={telefono} onChange={function (e) { setTelefono(e.target.value); }} placeholder="Teléfono (ej: +56 9 1234 5678)" style={inp} />

        <div style={{ position: 'relative', marginBottom: 10 }}>
          <input value={direccion} onChange={function (e) { onDireccion(e.target.value); }} placeholder="Dirección (escribe calle y número)" style={{ ...inp, marginBottom: 0 }} autoComplete="off" />
          {buscando && <div style={{ fontSize: 11, color: '#9aa1b5', marginTop: 4 }}>Buscando direcciones...</div>}
          {sugs.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, background: '#fff', border: '1.5px solid #eee', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.10)', overflow: 'hidden', marginTop: 4 }}>
              {sugs.map(function (f, i) {
                var p = f.properties || {};
                var linea = [p.name || p.street, p.housenumber].filter(Boolean).join(' ');
                var sub = [p.city || p.district, p.state].filter(Boolean).join(', ');
                return (
                  <div key={i} onClick={function () { elegirSug(f); }} style={{ padding: '10px 12px', borderBottom: i < sugs.length - 1 ? '1px solid #f3f3f3' : 'none', cursor: 'pointer', fontSize: 13 }}>
                    <div style={{ fontWeight: 700 }}>{linea || p.name || 'Dirección'}</div>
                    {sub && <div style={{ fontSize: 11, color: '#9aa1b5' }}>{sub}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <input value={comuna} onChange={function (e) { setComuna(e.target.value); }} placeholder="Comuna" style={inp} />
        <button onClick={ubicar} style={{ width: '100%', padding: 12, border: '1.5px dashed #ccc', borderRadius: 12, fontSize: 13, marginBottom: 10, background: lat ? '#f2fbf6' : '#fafafa', color: lat ? '#0d9456' : '#7c8499', fontWeight: 700, cursor: 'pointer' }}>
          {lat ? '\u{1F4CD} Ubicación guardada · tocar para actualizar' : '\u{1F4CD} Usar mi ubicación actual'}
        </button>

        {lat != null && lng != null && (
          <div style={{ marginBottom: 10 }}>
            <div ref={mapDivRef} style={{ width: '100%', height: 200, borderRadius: 14, overflow: 'hidden', border: '1.5px solid #eee' }} />
            <div style={{ fontSize: 11, color: '#9aa1b5', marginTop: 4 }}>Arrastra el pin para ajustar la ubicación exacta.</div>
          </div>
        )}

        {msg && <p style={{ fontSize: 12, color: msg.indexOf('Error') >= 0 ? '#b3261e' : '#0d9456', margin: '4px 0' }}>{msg}</p>}
        <button className="gbtn full" style={{ opacity: guardando ? .6 : 1 }} disabled={guardando} onClick={guardar}>Guardar perfil</button>
      </div>

      <div style={card}>
        <b style={{ fontSize: 15 }}>{'\u{1F4E6} Mis pedidos'}</b>
        {pedidos.length === 0 && <p style={{ fontSize: 13, color: '#9aa1b5', marginTop: 8 }}>Todavía no tienes pedidos. Cuando agendes una videollamada o un trabajo, aparecerán aquí.</p>}
        {pedidos.map(function (p) {
          return (
            <div key={p.id} style={{ borderTop: '1px solid #f1f1f1', padding: '10px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ fontSize: 13 }}>{p.descripcion_problema || p.tipo || 'Pedido'}</b>
                <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 8, background: '#fff9f0', color: '#b07a1e', fontWeight: 800 }}>{(p.estado || '—').toUpperCase()}</span>
              </div>
              <div style={{ fontSize: 12, color: '#7c8499', marginTop: 2 }}>{(p.precio_cotizado ? plata(p.precio_cotizado) + ' · ' : '') + fecha(p.creado_en)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
