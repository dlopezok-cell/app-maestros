'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const ADMIN_EMAIL = 'dlopezok@gmail.com';
const SECCIONES = [
  { id: 'resumen', icono: '\u{1F4CA}', nombre: 'Resumen' },
  { id: 'verificaciones', icono: '\u{1F6E1}', nombre: 'Verificaciones' },
  { id: 'maestros', icono: '\u{1F477}', nombre: 'Maestros' },
  { id: 'usuarios', icono: '\u{1F464}', nombre: 'Usuarios' },
  { id: 'reservas', icono: '\u{1F4C5}', nombre: 'Reservas' },
  { id: 'pagos', icono: '\u{1F4B0}', nombre: 'Pagos' },
  { id: 'resenas', icono: '⭐', nombre: 'Reseñas' },
];

export default function Admin() {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [seccion, setSeccion] = useState('resumen');
  const [verifs, setVerifs] = useState([]);
  const [maestros, setMaestros] = useState([]);
  const [perfiles, setPerfiles] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [resenas, setResenas] = useState([]);
  const [urls, setUrls] = useState({});
  const [busca, setBusca] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(function () {
    supabase.auth.getUser().then(function (r) {
      setUsuario(r.data.user || null);
      if (r.data.user && r.data.user.email === ADMIN_EMAIL) cargarTodo();
      else setCargando(false);
    });
  }, []);

  function cargarTodo() {
    Promise.all([
      supabase.from('verificaciones').select('*').order('creado_at', { ascending: false }),
      supabase.from('maestros').select('*'),
      supabase.from('perfiles').select('*').order('creado_en', { ascending: false }),
      supabase.from('reservas').select('*').order('creado_en', { ascending: false }).limit(25),
      supabase.from('pagos').select('*').order('creado_en', { ascending: false }).limit(25),
      supabase.from('resenas').select('*').order('creado_en', { ascending: false }).limit(25),
    ]).then(function (rs) {
      setVerifs(rs[0].data || []);
      setMaestros(rs[1].data || []);
      setPerfiles(rs[2].data || []);
      setReservas(rs[3].data || []);
      setPagos(rs[4].data || []);
      setResenas(rs[5].data || []);
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

  function nombreDe(id) {
    const p = perfiles.find(function (x) { return x.id === id; });
    return p ? p.nombre : id ? id.slice(0, 8) : '—';
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

  const wrap = { maxWidth: 860, margin: '0 auto', padding: 16 };
  const card = { background: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, border: '1.5px solid #eee' };
  const th = { textAlign: 'left', fontWeight: 700, padding: '6px 6px', color: '#7c8499', fontSize: 12 };
  const td = { padding: '8px 6px', fontSize: 13, borderTop: '1px solid #f1f1f1' };
  const btnS = { fontSize: 12, padding: '5px 10px', borderRadius: 8, border: '1.5px solid #ddd', background: '#fff', cursor: 'pointer', fontWeight: 700 };
  const tag = function (texto, tipo) {
    const c = tipo === 'ok' ? ['#f2fbf6', '#0d9456'] : tipo === 'mal' ? ['#fdeeee', '#b3261e'] : ['#fff9f0', '#b07a1e'];
    return <span style={{ background: c[0], color: c[1], borderRadius: 8, padding: '3px 9px', fontSize: 11, fontWeight: 800 }}>{texto}</span>;
  };

  if (cargando) return <main style={wrap}><p>Cargando panel...</p></main>;

  if (!usuario || usuario.email !== ADMIN_EMAIL) return (
    <main style={wrap}>
      <h2>Acceso restringido</h2>
      <p style={{ color: '#7c8499', fontSize: 14 }}>Esta seccion es solo para administradores. Ingresa con tu cuenta de admin desde la app y vuelve a /admin.</p>
      <a href="/" style={{ color: '#ff5a3c', fontWeight: 800, fontSize: 14 }}>Ir al inicio</a>
    </main>
  );

  const pendientes = verifs.filter(function (v) { return v.estado === 'pendiente'; });
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const reservasHoy = reservas.filter(function (r) { return new Date(r.creado_en) >= hoy; }).length;
  const comisionMes = pagos.filter(function (p) { return new Date(p.creado_en) >= inicioMes; })
    .reduce(function (s, p) { return s + (p.comision_plataforma || 0); }, 0);
  const activos = maestros.filter(function (m) { return !m.suspendido; }).length;

  const maestrosFiltrados = maestros.filter(function (m) {
    if (!busca) return true;
    const n = (nombreDe(m.id) + ' ' + m.oficio).toLowerCase();
    return n.indexOf(busca.toLowerCase()) >= 0;
  });

  return (
    <main style={wrap}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>{'\u{1F6E0} Panel de administración'}</h2>
          <span style={{ fontSize: 12, color: '#9aa1b5' }}>{usuario.email}</span>
        </div>
        <a href="/" style={{ color: '#9aa1b5', fontWeight: 700, fontSize: 13 }}>Ver app →</a>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {SECCIONES.map(function (s) {
          const on = seccion === s.id;
          return (
            <button key={s.id} onClick={function () { setSeccion(s.id); }}
              style={{ fontSize: 12, fontWeight: 800, padding: '7px 13px', borderRadius: 10, border: 'none', cursor: 'pointer', background: on ? '#ff5a3c' : '#fff', color: on ? '#fff' : '#7c8499', boxShadow: on ? 'none' : 'inset 0 0 0 1.5px #eee' }}>
              {s.icono + ' ' + s.nombre}
              {s.id === 'verificaciones' && pendientes.length > 0 && <span style={{ marginLeft: 5, background: on ? '#fff' : '#ff5a3c', color: on ? '#ff5a3c' : '#fff', borderRadius: 8, padding: '1px 6px', fontSize: 10 }}>{pendientes.length}</span>}
            </button>
          );
        })}
      </div>

      {msg && <p style={{ color: '#b3261e', fontSize: 13 }}>{msg}</p>}

      {seccion === 'resumen' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 14 }}>
            <div style={{ ...card, marginBottom: 0 }}><div style={{ fontSize: 12, color: '#7c8499' }}>Maestros activos</div><div style={{ fontSize: 26, fontWeight: 800 }}>{activos}</div></div>
            <div style={{ ...card, marginBottom: 0 }}><div style={{ fontSize: 12, color: '#7c8499' }}>Verif. pendientes</div><div style={{ fontSize: 26, fontWeight: 800, color: pendientes.length ? '#b07a1e' : '#1c1f2b' }}>{pendientes.length}</div></div>
            <div style={{ ...card, marginBottom: 0 }}><div style={{ fontSize: 12, color: '#7c8499' }}>Reservas hoy</div><div style={{ fontSize: 26, fontWeight: 800 }}>{reservasHoy}</div></div>
            <div style={{ ...card, marginBottom: 0 }}><div style={{ fontSize: 12, color: '#7c8499' }}>Comisión del mes</div><div style={{ fontSize: 26, fontWeight: 800 }}>{plata(comisionMes)}</div></div>
          </div>
          <div style={card}>
            <b style={{ fontSize: 14 }}>Actividad reciente</b>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <tbody>
                {verifs.slice(0, 3).map(function (v) { return <tr key={'v' + v.id}><td style={td}>{'\u{1F6E1} Verificación de ' + (v.email || '')}</td><td style={td}>{tag(v.estado.toUpperCase(), v.estado === 'aprobado' ? 'ok' : v.estado === 'rechazado' ? 'mal' : 'pend')}</td><td style={{ ...td, color: '#9aa1b5' }}>{fecha(v.creado_at)}</td></tr>; })}
                {reservas.slice(0, 3).map(function (r) { return <tr key={'r' + r.id}><td style={td}>{'\u{1F4C5} Reserva: ' + (r.descripcion_problema || r.tipo || '')}</td><td style={td}>{tag((r.estado || '—').toUpperCase(), 'pend')}</td><td style={{ ...td, color: '#9aa1b5' }}>{fecha(r.creado_en)}</td></tr>; })}
                {verifs.length === 0 && reservas.length === 0 && <tr><td style={td}>Sin actividad todavía</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {seccion === 'verificaciones' && (
        <div>
          {pendientes.length === 0 && <div style={card}><b style={{ fontSize: 14 }}>Sin pendientes ✓</b></div>}
          {pendientes.map(function (v) {
            const u = urls[v.id] || {};
            return (
              <div key={v.id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <b style={{ fontSize: 14 }}>{v.email}</b>{tag('PENDIENTE', 'pend')}
                </div>
                <div style={{ fontSize: 13, color: '#444', marginBottom: 10 }}>
                  {'RUT: ' + (v.rut || '—') + ' · N° doc: ' + (v.num_serie || '—')}<br />
                  <span style={{ fontSize: 11, color: '#9aa1b5' }}>{'Enviado: ' + fecha(v.creado_at)}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  {u.carnet ? <a href={u.carnet} target="_blank" rel="noreferrer" style={{ flex: 1 }}><img src={u.carnet} alt="carnet" style={{ width: '100%', borderRadius: 12, border: '1px solid #eee' }} /></a> : <div style={{ flex: 1, fontSize: 12, color: '#9aa1b5' }}>Cargando carnet...</div>}
                  {u.selfie ? <a href={u.selfie} target="_blank" rel="noreferrer" style={{ flex: 1 }}><img src={u.selfie} alt="selfie" style={{ width: '100%', borderRadius: 12, border: '1px solid #eee' }} /></a> : <div style={{ flex: 1, fontSize: 12, color: '#9aa1b5' }}>Cargando selfie...</div>}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button style={{ ...btnS, flex: 1, background: '#0d9456', color: '#fff', border: 'none', padding: '10px 14px' }} onClick={function () { aprobar(v); }}>{'Aprobar ✓'}</button>
                  <button style={{ ...btnS, flex: 1, color: '#b3261e', borderColor: '#f5c2c2', padding: '10px 14px' }} onClick={function () { rechazar(v); }}>Rechazar</button>
                </div>
              </div>
            );
          })}
          {verifs.filter(function (v) { return v.estado !== 'pendiente'; }).map(function (v) {
            return (
              <div key={v.id} style={{ ...card, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div><b style={{ fontSize: 13 }}>{v.email}</b><div style={{ fontSize: 11, color: '#9aa1b5' }}>{(v.rut || '') + (v.notas ? ' · ' + v.notas : '')}</div></div>
                  {tag(v.estado.toUpperCase(), v.estado === 'aprobado' ? 'ok' : 'mal')}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {seccion === 'maestros' && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <b style={{ fontSize: 14 }}>{maestros.length + ' maestros'}</b>
            <input value={busca} onChange={function (e) { setBusca(e.target.value); }} placeholder="Buscar..." style={{ padding: '8px 12px', border: '1.5px solid #ddd', borderRadius: 10, fontSize: 13, width: 180 }} />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Nombre</th><th style={th}>Oficio</th><th style={th}>Rating</th><th style={th}>Estado</th><th style={th}>Acciones</th></tr></thead>
            <tbody>
              {maestrosFiltrados.map(function (m) {
                return (
                  <tr key={m.id}>
                    <td style={td}>{nombreDe(m.id)}</td>
                    <td style={{ ...td, color: '#7c8499' }}>{m.oficio}</td>
                    <td style={td}>{'★ ' + (m.rating_promedio || '—') + ' · ' + (m.total_trabajos || 0)}</td>
                    <td style={td}>{m.suspendido ? tag('SUSPENDIDO', 'mal') : m.verificado ? tag('VERIFICADO', 'ok') : tag('SIN VERIFICAR', 'pend')}</td>
                    <td style={td}>
                      {m.suspendido
                        ? <button style={{ ...btnS, color: '#0d9456', borderColor: '#bce5cf' }} onClick={function () { suspender(m, false); }}>Reactivar</button>
                        : <button style={{ ...btnS, color: '#b3261e', borderColor: '#f5c2c2' }} onClick={function () { suspender(m, true); }}>Suspender</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {seccion === 'usuarios' && (
        <div style={card}>
          <b style={{ fontSize: 14 }}>{perfiles.length + ' usuarios registrados'}</b>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead><tr><th style={th}>Nombre</th><th style={th}>Rol</th><th style={th}>Teléfono</th><th style={th}>Registrado</th></tr></thead>
            <tbody>
              {perfiles.map(function (p) {
                return (
                  <tr key={p.id}>
                    <td style={td}>{p.nombre || '—'}</td>
                    <td style={td}>{tag((p.rol || 'cliente').toUpperCase(), p.rol === 'maestro' ? 'pend' : 'ok')}</td>
                    <td style={{ ...td, color: '#7c8499' }}>{p.telefono || '—'}</td>
                    <td style={{ ...td, color: '#9aa1b5' }}>{fecha(p.creado_en)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ fontSize: 11, color: '#9aa1b5', marginTop: 10 }}>El correo y bloqueo de cuentas se gestionan en Supabase Auth (requiere clave de servidor; se integrará con API routes).</p>
        </div>
      )}

      {seccion === 'reservas' && (
        <div style={card}>
          <b style={{ fontSize: 14 }}>Últimas reservas</b>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead><tr><th style={th}>Problema</th><th style={th}>Cliente</th><th style={th}>Maestro</th><th style={th}>Estado</th><th style={th}>Cotizado</th></tr></thead>
            <tbody>
              {reservas.map(function (r) {
                return (
                  <tr key={r.id}>
                    <td style={td}>{r.descripcion_problema || r.tipo || '—'}</td>
                    <td style={{ ...td, color: '#7c8499' }}>{nombreDe(r.cliente_id)}</td>
                    <td style={{ ...td, color: '#7c8499' }}>{nombreDe(r.maestro_id)}</td>
                    <td style={td}>{tag((r.estado || '—').toUpperCase(), 'pend')}</td>
                    <td style={td}>{plata(r.precio_cotizado)}</td>
                  </tr>
                );
              })}
              {reservas.length === 0 && <tr><td style={td}>Sin reservas todavía</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {seccion === 'pagos' && (
        <div style={card}>
          <b style={{ fontSize: 14 }}>Últimos pagos</b>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
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
      )}

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
    </main>
  );
}
