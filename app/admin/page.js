'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const ADMIN_EMAIL = 'dlopezok@gmail.com';

// Panel admin: revisar verificaciones de identidad (carnet + selfie + RUT)
export default function Admin() {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [lista, setLista] = useState([]);
  const [urls, setUrls] = useState({});
  const [msg, setMsg] = useState(null);

  useEffect(function () {
    supabase.auth.getUser().then(function (r) {
      setUsuario(r.data.user || null);
      if (r.data.user && r.data.user.email === ADMIN_EMAIL) cargar();
      else setCargando(false);
    });
  }, []);

  function cargar() {
    supabase.from('verificaciones').select('*').order('creado_at', { ascending: false })
      .then(function (r) {
        if (r.error) { setMsg(r.error.message); setCargando(false); return; }
        setLista(r.data || []);
        setCargando(false);
        (r.data || []).forEach(function (v) {
          if (!v.carnet_path || v.estado !== 'pendiente') return;
          Promise.all([
            supabase.storage.from('verificaciones').createSignedUrl(v.carnet_path, 3600),
            supabase.storage.from('verificaciones').createSignedUrl(v.selfie_path, 3600),
          ]).then(function (rs) {
            setUrls(function (prev) {
              const n = { ...prev };
              n[v.id] = {
                carnet: rs[0].data ? rs[0].data.signedUrl : null,
                selfie: rs[1].data ? rs[1].data.signedUrl : null,
              };
              return n;
            });
          });
        });
      });
  }

  function aprobar(v) {
    supabase.from('verificaciones')
      .update({ estado: 'aprobado', revisado_at: new Date().toISOString(), notas: null })
      .eq('id', v.id)
      .then(function (r) {
        if (r.error) { setMsg(r.error.message); return; }
        // Ley 21.719: minimizar datos -> borrar fotos al aprobar
        supabase.storage.from('verificaciones').remove([v.carnet_path, v.selfie_path]);
        cargar();
      });
  }

  function rechazar(v) {
    const motivo = window.prompt('Motivo del rechazo (lo vera el maestro):', 'Fotos poco legibles');
    if (motivo === null) return;
    supabase.from('verificaciones')
      .update({ estado: 'rechazado', revisado_at: new Date().toISOString(), notas: motivo })
      .eq('id', v.id)
      .then(function (r) {
        if (r.error) { setMsg(r.error.message); return; }
        cargar();
      });
  }

  const wrap = { maxWidth: 560, margin: '0 auto', padding: 16 };
  const card = { background: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, border: '1.5px solid #eee' };
  const tag = function (estado) {
    const c = estado === 'aprobado' ? ['#f2fbf6', '#0d9456'] : estado === 'rechazado' ? ['#fdeeee', '#b3261e'] : ['#fff9f0', '#b07a1e'];
    return { background: c[0], color: c[1], borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 800 };
  };
  const btnA = { background: '#0d9456', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 14px', fontWeight: 800, fontSize: 12, cursor: 'pointer', flex: 1 };
  const btnR = { background: '#fff', color: '#b3261e', border: '1.5px solid #f5c2c2', borderRadius: 10, padding: '9px 14px', fontWeight: 800, fontSize: 12, cursor: 'pointer', flex: 1 };

  if (cargando) return <main style={wrap}><p>Cargando...</p></main>;

  if (!usuario || usuario.email !== ADMIN_EMAIL) return (
    <main style={wrap}>
      <h2>Acceso restringido</h2>
      <p style={{ color: '#7c8499', fontSize: 14 }}>
        Esta seccion es solo para administradores. Ingresa con tu cuenta de admin desde la app y vuelve a /admin.
      </p>
      <a href="/" style={{ color: '#ff5a3c', fontWeight: 800, fontSize: 14 }}>Ir al inicio</a>
    </main>
  );

  const pendientes = lista.filter(function (v) { return v.estado === 'pendiente'; });
  const resueltas = lista.filter(function (v) { return v.estado !== 'pendiente'; });

  return (
    <main style={wrap}>
      <h2 style={{ marginBottom: 4 }}>{'\u{1F6E1} Verificaciones'}</h2>
      <p style={{ color: '#7c8499', fontSize: 13, marginTop: 0 }}>{pendientes.length + ' pendiente(s) de revision'}</p>
      {msg && <p style={{ color: '#b3261e', fontSize: 13 }}>{msg}</p>}

      {pendientes.length === 0 && <div style={card}><b style={{ fontSize: 14 }}>Sin pendientes ✓</b></div>}

      {pendientes.map(function (v) {
        const u = urls[v.id] || {};
        return (
          <div key={v.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <b style={{ fontSize: 14 }}>{v.email}</b>
              <span style={tag(v.estado)}>PENDIENTE</span>
            </div>
            <div style={{ fontSize: 13, color: '#444', marginBottom: 10 }}>
              {'RUT: ' + (v.rut || '—') + ' · N° doc: ' + (v.num_serie || '—')}
              <br />
              <span style={{ fontSize: 11, color: '#9aa1b5' }}>{'Enviado: ' + new Date(v.creado_at).toLocaleString('es-CL')}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              {u.carnet
                ? <a href={u.carnet} target="_blank" rel="noreferrer" style={{ flex: 1 }}><img src={u.carnet} alt="carnet" style={{ width: '100%', borderRadius: 12, border: '1px solid #eee' }} /></a>
                : <div style={{ flex: 1, fontSize: 12, color: '#9aa1b5' }}>Cargando carnet...</div>}
              {u.selfie
                ? <a href={u.selfie} target="_blank" rel="noreferrer" style={{ flex: 1 }}><img src={u.selfie} alt="selfie" style={{ width: '100%', borderRadius: 12, border: '1px solid #eee' }} /></a>
                : <div style={{ flex: 1, fontSize: 12, color: '#9aa1b5' }}>Cargando selfie...</div>}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={btnA} onClick={function () { aprobar(v); }}>{'Aprobar ✓'}</button>
              <button style={btnR} onClick={function () { rechazar(v); }}>Rechazar</button>
            </div>
          </div>
        );
      })}

      {resueltas.length > 0 && <h3 style={{ fontSize: 14, color: '#7c8499' }}>Historial</h3>}
      {resueltas.map(function (v) {
        return (
          <div key={v.id} style={{ ...card, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <b style={{ fontSize: 13 }}>{v.email}</b>
                <div style={{ fontSize: 11, color: '#9aa1b5' }}>{(v.rut || '') + (v.notas ? ' · ' + v.notas : '')}</div>
              </div>
              <span style={tag(v.estado)}>{v.estado.toUpperCase()}</span>
            </div>
          </div>
        );
      })}
    </main>
  );
}
