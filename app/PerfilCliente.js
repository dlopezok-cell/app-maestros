'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Perfil del cliente: datos de contacto + ubicacion para pedir trabajos,
// e historial de pedidos (reservas) del propio cliente.
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

  function ubicar() {
    if (!navigator.geolocation) { setMsg('Tu navegador no soporta ubicación'); return; }
    setMsg('Obteniendo tu ubicación...');
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setMsg('Ubicación capturada ✓');
      },
      function () { setMsg('No pudimos obtener tu ubicación. Revisa los permisos.'); }
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
        <div style={{ fontSize: 12, color: '#7c8499', margin: '4px 0 12px' }}>Con estos datos los maestros saben a dónde ir y cómo contactarte.</div>
        <input value={nombre} onChange={function (e) { setNombre(e.target.value); }} placeholder="Tu nombre" style={inp} />
        <input value={telefono} onChange={function (e) { setTelefono(e.target.value); }} placeholder="Teléfono (ej: +56 9 1234 5678)" style={inp} />
        <input value={direccion} onChange={function (e) { setDireccion(e.target.value); }} placeholder="Dirección (calle y número)" style={inp} />
        <input value={comuna} onChange={function (e) { setComuna(e.target.value); }} placeholder="Comuna" style={inp} />
        <button onClick={ubicar} style={{ width: '100%', padding: 12, border: '1.5px dashed #ccc', borderRadius: 12, fontSize: 13, marginBottom: 10, background: lat ? '#f2fbf6' : '#fafafa', color: lat ? '#0d9456' : '#7c8499', fontWeight: 700, cursor: 'pointer' }}>
          {lat ? '\u{1F4CD} Ubicación guardada · tocar para actualizar' : '\u{1F4CD} Usar mi ubicación actual'}
        </button>
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
