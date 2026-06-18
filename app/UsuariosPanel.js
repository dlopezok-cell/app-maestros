'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Gestión de usuarios del panel: el super admin crea usuarios (correo + nombre),
// les asigna categorías completas (Marketing, Operaciones, etc.) y entran al
// panel con un enlace mágico por correo. Solo ven las pestañas de sus categorías.
const ORANGE = '#2563eb';

export default function UsuariosPanel({ categorias }) {
  const CATS = (categorias || []).filter(function (c) { return c.id !== 'resumen'; }); // resumen es base para todos
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [sel, setSel] = useState({});
  const [msg, setMsg] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(function () { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    var r = await supabase.from('panel_usuarios').select('*').order('creado_en', { ascending: false });
    setUsuarios(r.data || []);
    setCargando(false);
  }

  function toggle(id) { setSel(function (s) { var n = Object.assign({}, s); n[id] = !n[id]; return n; }); }

  async function crear() {
    var em = email.trim().toLowerCase();
    if (!em || em.indexOf('@') < 0) { setMsg('Escribe un correo válido.'); return; }
    var cats = CATS.filter(function (c) { return sel[c.id]; }).map(function (c) { return c.id; });
    if (!cats.length) { setMsg('Selecciona al menos una categoría.'); return; }
    // Resumen siempre incluido para que tengan una pantalla de inicio.
    if (cats.indexOf('resumen') < 0) cats.unshift('resumen');
    setGuardando(true); setMsg('Guardando…');
    var r = await supabase.from('panel_usuarios').upsert({ email: em, nombre: nombre.trim() || em, categorias: cats, activo: true }, { onConflict: 'email' });
    setGuardando(false);
    if (r.error) { setMsg('Error: ' + r.error.message); return; }
    setNombre(''); setEmail(''); setSel({}); setMsg('¡Usuario guardado! Entrará con el enlace por correo en /admin.');
    cargar();
  }

  async function editar(u) {
    var s = {}; (u.categorias || []).forEach(function (c) { s[c] = true; });
    setSel(s); setEmail(u.email); setNombre(u.nombre || '');
    setMsg('Editando "' + u.email + '". Cambia las categorías y vuelve a guardar.');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function alternarActivo(u) {
    await supabase.from('panel_usuarios').update({ activo: !u.activo }).eq('email', u.email);
    cargar();
  }

  async function eliminar(u) {
    if (typeof window !== 'undefined' && !window.confirm('¿Quitar el acceso de ' + u.email + '?')) return;
    await supabase.from('panel_usuarios').delete().eq('email', u.email);
    cargar();
  }

  var input = { fontSize: 14, padding: '9px 11px', border: '1px solid #e5e7eb', borderRadius: 9, background: '#fff', width: '100%', boxSizing: 'border-box' };
  var lbl = { fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 4, display: 'block' };
  var nombreCat = {}; (categorias || []).forEach(function (c) { nombreCat[c.id] = c.icono + ' ' + c.nombre; });

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg,#22d3ee,#2563eb)', color: '#fff', borderRadius: 14, padding: '14px 18px', marginBottom: 14 }}>
        <span style={{ fontSize: 22 }}>{'\u{1F464}'}</span>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Usuarios del panel</div>
          <div style={{ fontSize: 13, opacity: .9 }}>Da acceso a tu equipo por categorías. Entran con un enlace por correo (sin contraseña).</div>
        </div>
      </div>

      {/* Crear / editar usuario */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Nuevo usuario / editar acceso</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <div style={{ minWidth: 200, flex: 1 }}><label style={lbl}>Nombre</label><input value={nombre} onChange={function (e) { setNombre(e.target.value); }} placeholder="ej: Camila Soto" style={input} /></div>
          <div style={{ minWidth: 220, flex: 1 }}><label style={lbl}>Correo</label><input value={email} onChange={function (e) { setEmail(e.target.value); }} placeholder="correo@ejemplo.com" style={input} /></div>
        </div>
        <label style={lbl}>Categorías a las que tendrá acceso</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {CATS.map(function (c) {
            var on = !!sel[c.id];
            return (
              <button key={c.id} onClick={function () { toggle(c.id); }} type="button"
                style={{ fontSize: 13, fontWeight: 700, padding: '8px 13px', borderRadius: 10, border: 'none', cursor: 'pointer', background: on ? ORANGE : '#fff', color: on ? '#fff' : '#6b7280', boxShadow: on ? 'none' : 'inset 0 0 0 1.5px #e5e7eb' }}>
                {(on ? '✓ ' : '') + c.icono + ' ' + c.nombre}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={crear} disabled={guardando} style={{ background: ORANGE, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: guardando ? .6 : 1 }}>Guardar usuario</button>
          {msg && <span style={{ fontSize: 12, color: ORANGE }}>{msg}</span>}
        </div>
      </div>

      {/* Lista de usuarios */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#fafafa' }}>
              {['Usuario', 'Categorías', 'Estado', ''].map(function (h, i) { return <th key={i} style={{ padding: '9px 11px', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', textAlign: 'left' }}>{h}</th>; })}
            </tr></thead>
            <tbody>
              {usuarios.map(function (u) {
                return (
                  <tr key={u.email}>
                    <td style={{ padding: '9px 11px', fontSize: 13, borderTop: '1px solid #f1f1f1' }}><b>{u.nombre || u.email}</b><div style={{ fontSize: 11, color: '#9ca3af' }}>{u.email}</div></td>
                    <td style={{ padding: '9px 11px', fontSize: 12, borderTop: '1px solid #f1f1f1' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(u.categorias || []).filter(function (c) { return c !== 'resumen'; }).map(function (c) { return <span key={c} style={{ background: '#f3f4f6', borderRadius: 7, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{nombreCat[c] || c}</span>; })}
                      </div>
                    </td>
                    <td style={{ padding: '9px 11px', fontSize: 12, borderTop: '1px solid #f1f1f1' }}>
                      <span style={{ color: u.activo ? '#0d9456' : '#9ca3af', fontWeight: 700 }}>{u.activo ? 'Activo' : 'Inactivo'}</span>
                    </td>
                    <td style={{ padding: '9px 11px', fontSize: 12, borderTop: '1px solid #f1f1f1', whiteSpace: 'nowrap' }}>
                      <button onClick={function () { editar(u); }} style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 700, marginRight: 6 }}>Editar</button>
                      <button onClick={function () { alternarActivo(u); }} style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 700, marginRight: 6 }}>{u.activo ? 'Desactivar' : 'Activar'}</button>
                      <button onClick={function () { eliminar(u); }} style={{ border: '1px solid #f0c8c2', background: '#fff', color: '#b3261e', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>Quitar</button>
                    </td>
                  </tr>
                );
              })}
              {!cargando && usuarios.length === 0 && <tr><td colSpan="4" style={{ padding: '9px 11px', fontSize: 13, borderTop: '1px solid #f1f1f1', color: '#9ca3af' }}>Aún no hay usuarios. Crea el primero arriba.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 10 }}>Cada usuario entra en /admin con la opción "Entrar con enlace por correo". Solo verá las pestañas de las categorías asignadas. Tú (super admin) siempre ves todo.</div>
    </div>
  );
}
