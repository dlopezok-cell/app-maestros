'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { subirACloudinary } from '../lib/cloudinary';

const card = { background: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, border: '1.5px solid #eee' };
const inp = { width: '100%', padding: '9px 11px', border: '1.5px solid #ddd', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' };
const btn = { fontSize: 13, padding: '9px 14px', borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 700 };
const btnS = { fontSize: 12, padding: '6px 11px', borderRadius: 8, border: '1.5px solid #ddd', background: '#fff', cursor: 'pointer', fontWeight: 700 };
const lab = { fontSize: 12, fontWeight: 700, color: '#5b6275', margin: '10px 0 4px' };

function plata(n) { return n != null && n !== '' ? '$' + Number(n).toLocaleString('es-CL') : '—'; }

export default function MaestrosPerfiles() {
  const [maestros, setMaestros] = useState([]);
  const [perfiles, setPerfiles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busca, setBusca] = useState('');
  const [soloAprobados, setSoloAprobados] = useState(true);
  const [edit, setEdit] = useState(null);   // objeto en edición (copia)
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [msg, setMsg] = useState('');

  function cargar() {
    setCargando(true);
    Promise.all([
      supabase.from('maestros').select('*'),
      supabase.from('perfiles').select('id, nombre, telefono, avatar_url'),
    ]).then(function (res) {
      setMaestros((res[0] && res[0].data) || []);
      setPerfiles((res[1] && res[1].data) || []);
      setCargando(false);
    }).catch(function () { setCargando(false); });
  }
  useEffect(function () { cargar(); }, []);

  function perfilDe(id) { return perfiles.find(function (p) { return p.id === id; }) || {}; }
  function nombreVisible(m) { return m.nombre || perfilDe(m.id).nombre || (m.id ? m.id.slice(0, 8) : 'Sin nombre'); }

  var lista = maestros.filter(function (m) {
    if (soloAprobados && !m.verificado) return false;
    var ficha = (m.oficios && m.oficios.length) || m.oficio;
    if (soloAprobados && !ficha) return false;
    var n = (nombreVisible(m) + ' ' + (m.oficio || '') + ' ' + ((m.oficios || []).join(' ')) + ' ' + (m.comuna || '')).toLowerCase();
    return n.indexOf(busca.toLowerCase()) >= 0;
  });

  function abrir(m) {
    setMsg('');
    setEdit({
      id: m.id,
      nombre: m.nombre || perfilDe(m.id).nombre || '',
      oficiosTxt: (m.oficios && m.oficios.length ? m.oficios : (m.oficio ? [m.oficio] : [])).join(', '),
      descripcion: m.descripcion || '',
      comuna: m.comuna || '',
      precio_videollamada: m.precio_videollamada || '',
      precio_visita: m.precio_visita || '',
      foto_url: m.foto_url || perfilDe(m.id).avatar_url || '',
      galeria: (m.galeria || []).slice(),
      verificado: m.verificado, suspendido: m.suspendido,
    });
  }

  function setCampo(k, v) { setEdit(function (e) { return Object.assign({}, e, { [k]: v }); }); }

  function subirFoto(file, destino) {
    if (!file) return;
    setSubiendo(true); setMsg('');
    subirACloudinary(file).then(function (r) {
      if (destino === 'perfil') setCampo('foto_url', r.url);
      else setEdit(function (e) { return Object.assign({}, e, { galeria: (e.galeria || []).concat([r.url]) }); });
      setSubiendo(false);
    }).catch(function (err) { setSubiendo(false); setMsg('Error al subir: ' + (err.message || '')); });
  }

  function quitarFotoGaleria(i) {
    setEdit(function (e) { var g = (e.galeria || []).slice(); g.splice(i, 1); return Object.assign({}, e, { galeria: g }); });
  }

  function guardar() {
    if (!edit) return;
    setGuardando(true); setMsg('');
    var oficios = edit.oficiosTxt.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var cambios = {
      nombre: edit.nombre || null,
      descripcion: edit.descripcion || null,
      comuna: edit.comuna || null,
      oficios: oficios.length ? oficios : null,
      oficio: oficios[0] || null,
      foto_url: edit.foto_url || null,
      galeria: edit.galeria || [],
      precio_videollamada: edit.precio_videollamada === '' ? null : Number(edit.precio_videollamada),
      precio_visita: edit.precio_visita === '' ? null : Number(edit.precio_visita),
    };
    supabase.from('maestros').update(cambios).eq('id', edit.id).then(function (res) {
      setGuardando(false);
      if (res.error) { setMsg('No se pudo guardar: ' + res.error.message); return; }
      setMsg('Guardado ✓');
      cargar();
      setTimeout(function () { setEdit(null); setMsg(''); }, 800);
    });
  }

  // ----------- EDITOR -----------
  if (edit) {
    return (
      <div>
        <button style={btnS} onClick={function () { setEdit(null); }}>{'← Volver a la lista'}</button>
        <div style={Object.assign({}, card, { marginTop: 12 })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div style={{ width: 78, height: 78, borderRadius: '50%', background: '#eef1f7', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {edit.foto_url ? <img src={edit.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 28 }}>🧑‍🔧</span>}
            </div>
            <div>
              <label style={{ ...btnS, display: 'inline-block' }}>
                {subiendo ? 'Subiendo…' : '📷 Cambiar foto de perfil'}
                <input type="file" accept="image/*" style={{ display: 'none' }} disabled={subiendo} onChange={function (e) { subirFoto(e.target.files[0], 'perfil'); }} />
              </label>
              <div style={{ fontSize: 11, color: '#9aa1b5', marginTop: 4 }}>{edit.verificado ? '✅ Verificado' : '⏳ Sin verificar'}{edit.suspendido ? ' · ⛔ Suspendido' : ''}</div>
            </div>
          </div>

          <div style={lab}>Nombre</div>
          <input style={inp} value={edit.nombre} onChange={function (e) { setCampo('nombre', e.target.value); }} placeholder="Nombre del maestro" />

          <div style={lab}>Oficios (separados por coma)</div>
          <input style={inp} value={edit.oficiosTxt} onChange={function (e) { setCampo('oficiosTxt', e.target.value); }} placeholder="Gasfitería, Electricidad" />

          <div style={lab}>Descripción</div>
          <textarea style={Object.assign({}, inp, { minHeight: 90, resize: 'vertical' })} value={edit.descripcion} onChange={function (e) { setCampo('descripcion', e.target.value); }} placeholder="Descripción del maestro…" />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <div>
              <div style={lab}>Comuna</div>
              <input style={inp} value={edit.comuna} onChange={function (e) { setCampo('comuna', e.target.value); }} placeholder="Las Condes" />
            </div>
            <div>
              <div style={lab}>Precio diagnóstico/videollamada</div>
              <input style={inp} type="number" value={edit.precio_videollamada} onChange={function (e) { setCampo('precio_videollamada', e.target.value); }} placeholder="0" />
            </div>
            <div>
              <div style={lab}>Precio visita</div>
              <input style={inp} type="number" value={edit.precio_visita} onChange={function (e) { setCampo('precio_visita', e.target.value); }} placeholder="0" />
            </div>
          </div>

          <div style={lab}>Galería de trabajos</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {(edit.galeria || []).map(function (g, i) {
              return (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={g} alt="" style={{ width: 86, height: 86, objectFit: 'cover', borderRadius: 10, border: '1px solid #eee' }} />
                  <button onClick={function () { quitarFotoGaleria(i); }} style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', border: 'none', background: '#b3261e', color: '#fff', cursor: 'pointer', fontWeight: 800, lineHeight: '20px' }}>×</button>
                </div>
              );
            })}
            <label style={{ width: 86, height: 86, borderRadius: 10, border: '2px dashed #cfd5e3', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7c8499', fontSize: 24 }}>
              {subiendo ? '…' : '+'}
              <input type="file" accept="image/*" style={{ display: 'none' }} disabled={subiendo} onChange={function (e) { subirFoto(e.target.files[0], 'galeria'); }} />
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <button style={Object.assign({}, btn, { opacity: guardando ? 0.6 : 1 })} disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
            <button style={btnS} onClick={function () { setEdit(null); }}>Cancelar</button>
            {msg && <span style={{ fontSize: 13, fontWeight: 700, color: msg.indexOf('✓') >= 0 ? '#0d9456' : '#b3261e' }}>{msg}</span>}
          </div>
        </div>
      </div>
    );
  }

  // ----------- LISTA -----------
  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>🧑‍🔧 Perfiles de maestros</h2>
        <div style={{ fontSize: 13, color: '#7c8499', marginTop: 4 }}>Abre un perfil para editar nombre, oficios, descripción, foto y galería. Los cambios se ven en el directorio público.</div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <input value={busca} onChange={function (e) { setBusca(e.target.value); }} placeholder="Buscar por nombre, oficio o comuna…" style={Object.assign({}, inp, { maxWidth: 320 })} />
        <label style={{ fontSize: 12.5, color: '#5b6275', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={soloAprobados} onChange={function (e) { setSoloAprobados(e.target.checked); }} /> Solo aprobados
        </label>
        <span style={{ fontSize: 12, color: '#9aa1b5', marginLeft: 'auto' }}>{lista.length + ' maestros'}</span>
      </div>

      {cargando && <div style={{ fontSize: 13, color: '#9aa1b5' }}>Cargando…</div>}
      {!cargando && lista.length === 0 && <div style={{ fontSize: 13, color: '#9aa1b5' }}>No hay maestros que coincidan.</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {lista.map(function (m) {
          var foto = m.foto_url || perfilDe(m.id).avatar_url;
          var oficios = (m.oficios && m.oficios.length ? m.oficios.join(' · ') : (m.oficio || '—'));
          return (
            <div key={m.id} style={{ background: '#fff', border: '1.5px solid #eee', borderRadius: 14, padding: 14 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#eef1f7', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {foto ? <img src={foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 22 }}>🧑‍🔧</span>}
                </div>
                <div style={{ minWidth: 0 }}>
                  <b style={{ fontSize: 14.5 }}>{nombreVisible(m)}</b>
                  <div style={{ fontSize: 12, color: '#7c8499', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{oficios}</div>
                  <div style={{ fontSize: 11.5, color: '#9aa1b5', marginTop: 2 }}>
                    {'★ ' + (m.rating_promedio || '—') + ' · ' + (m.comuna || 's/comuna')}
                    {m.suspendido ? ' · ⛔' : (m.verificado ? ' · ✅' : '')}
                  </div>
                </div>
              </div>
              <button style={Object.assign({}, btnS, { width: '100%', marginTop: 12 })} onClick={function () { abrir(m); }}>Ver / editar perfil</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
