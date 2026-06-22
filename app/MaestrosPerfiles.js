'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { subirACloudinary } from '../lib/cloudinary';

const card = { background: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, border: '1.5px solid #eee' };
const inp = { width: '100%', padding: '9px 11px', border: '1.5px solid #ddd', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' };
const btn = { fontSize: 13, padding: '9px 14px', borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 700 };
const btnS = { fontSize: 12, padding: '6px 11px', borderRadius: 8, border: '1.5px solid #ddd', background: '#fff', cursor: 'pointer', fontWeight: 700 };
const btnWa = { fontSize: 12, padding: '7px 12px', borderRadius: 8, border: 'none', background: '#25D366', color: '#fff', cursor: 'pointer', fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 };
const lab = { fontSize: 12, fontWeight: 700, color: '#5b6275', margin: '10px 0 4px' };
const pill = { fontSize: 10.5, fontWeight: 800, padding: '2px 7px', borderRadius: 999, marginLeft: 6 };

// ---- Teléfono chileno -> formato wa.me ----
function waNumero(t) {
  var d = ('' + (t || '')).replace(/\D/g, '');
  if (!d) return '';
  if (d.indexOf('56') === 0) return d;
  if (d.length === 9 && d[0] === '9') return '56' + d;
  if (d.length === 8) return '569' + d;
  return '56' + d;
}

// ---- Plantillas de mensaje ----
function plFoto(n) { return 'Hola ' + (n || '') + ', te saludamos de MaestrosEnLínea. Notamos que a tu perfil le falta la *foto de perfil*. Una buena foto genera más confianza y te llegan más pedidos. Entra a la app, ve a Mi perfil y súbela.'; }
function plDocs(n) { return 'Hola ' + (n || '') + ', somos MaestrosEnLínea. Para completar tu verificación nos faltan tus *documentos* (carnet + selfie). Súbelos en la app, en la sección Verificación, y obtienes tu sello de *Maestro Verificado*, que te posiciona mejor ante los clientes.'; }
function plAmbos(n) { return 'Hola ' + (n || '') + ', te escribimos de MaestrosEnLínea. Para que tu perfil quede completo te faltan dos cosas: tu *foto de perfil* y tus *documentos* (carnet + selfie). Súbelos en la app, en Mi perfil y en Verificación. Así obtienes tu sello de Verificado y recibes más pedidos.'; }
function plLibre(n) { return 'Hola ' + (n || '') + ', te saludamos de MaestrosEnLínea. ¿Cómo va todo con la plataforma? Cualquier duda, aquí estamos para ayudarte.'; }

const PLANTILLAS = [
  { id: 'auto', nombre: 'Automática (según lo que falta)' },
  { id: 'foto', nombre: 'Pedir foto de perfil', fn: plFoto },
  { id: 'docs', nombre: 'Pedir documentos (carnet + selfie)', fn: plDocs },
  { id: 'ambos', nombre: 'Pedir foto + documentos', fn: plAmbos },
  { id: 'libre', nombre: 'Saludo / mensaje libre', fn: plLibre },
];

function plata(n) { return n != null && n !== '' ? '$' + Number(n).toLocaleString('es-CL') : '—'; }

export default function MaestrosPerfiles() {
  const [maestros, setMaestros] = useState([]);
  const [perfiles, setPerfiles] = useState([]);
  const [verifs, setVerifs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busca, setBusca] = useState('');
  const [soloAprobados, setSoloAprobados] = useState(true);
  const [soloFalta, setSoloFalta] = useState(false);
  const [edit, setEdit] = useState(null);
  const [plantillaSel, setPlantillaSel] = useState('auto');
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [msg, setMsg] = useState('');

  function cargar() {
    setCargando(true);
    Promise.all([
      supabase.from('maestros').select('*'),
      supabase.from('perfiles').select('id, nombre, telefono, avatar_url'),
      supabase.from('verificaciones').select('user_id, telefono, email, carnet_path, estado'),
    ]).then(function (res) {
      setMaestros((res[0] && res[0].data) || []);
      setPerfiles((res[1] && res[1].data) || []);
      setVerifs((res[2] && res[2].data) || []);
      setCargando(false);
    }).catch(function () { setCargando(false); });
  }
  useEffect(function () { cargar(); }, []);

  function perfilDe(id) { return perfiles.find(function (p) { return p.id === id; }) || {}; }
  function verifDe(id) { return verifs.find(function (v) { return v.user_id === id; }) || null; }
  function nombreVisible(m) { return m.nombre || perfilDe(m.id).nombre || (m.id ? m.id.slice(0, 8) : 'Sin nombre'); }
  function telefonoDe(m) { var v = verifDe(m.id); return perfilDe(m.id).telefono || (v && v.telefono) || ''; }
  function tieneFoto(m) { return !!(m.foto_url || perfilDe(m.id).avatar_url); }
  function tieneDocs(m) { var v = verifDe(m.id); return !!(v && (v.carnet_path || v.estado === 'aprobado')); }

  function textoPlantilla(m, sel) {
    var n = nombreVisible(m);
    if (sel && sel !== 'auto') { var p = PLANTILLAS.find(function (x) { return x.id === sel; }); return p && p.fn ? p.fn(n) : plLibre(n); }
    var f = tieneFoto(m), d = tieneDocs(m);
    if (!f && !d) return plAmbos(n);
    if (!f) return plFoto(n);
    if (!d) return plDocs(n);
    return plLibre(n);
  }
  function waLink(m, sel) {
    var num = waNumero(telefonoDe(m));
    if (!num) return null;
    return 'https://wa.me/' + num + '?text=' + encodeURIComponent(textoPlantilla(m, sel));
  }

  var lista = maestros.filter(function (m) {
    if (soloAprobados && !m.verificado) return false;
    var ficha = (m.oficios && m.oficios.length) || m.oficio;
    if (soloAprobados && !ficha) return false;
    if (soloFalta && tieneFoto(m) && tieneDocs(m)) return false;
    var n = (nombreVisible(m) + ' ' + (m.oficio || '') + ' ' + ((m.oficios || []).join(' ')) + ' ' + (m.comuna || '')).toLowerCase();
    return n.indexOf(busca.toLowerCase()) >= 0;
  });

  var faltanFoto = maestros.filter(function (m) { return (!soloAprobados || m.verificado) && !tieneFoto(m); }).length;
  var faltanDocs = maestros.filter(function (m) { return (!soloAprobados || m.verificado) && !tieneDocs(m); }).length;

  function abrir(m) {
    setMsg(''); setPlantillaSel('auto');
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
      telefono: telefonoDe(m), tieneDocs: tieneDocs(m), _orig: m,
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
  function quitarFotoGaleria(i) { setEdit(function (e) { var g = (e.galeria || []).slice(); g.splice(i, 1); return Object.assign({}, e, { galeria: g }); }); }

  function guardar() {
    if (!edit) return;
    setGuardando(true); setMsg('');
    var oficios = edit.oficiosTxt.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var cambios = {
      nombre: edit.nombre || null, descripcion: edit.descripcion || null, comuna: edit.comuna || null,
      oficios: oficios.length ? oficios : null, oficio: oficios[0] || null,
      foto_url: edit.foto_url || null, galeria: edit.galeria || [],
      precio_videollamada: edit.precio_videollamada === '' ? null : Number(edit.precio_videollamada),
      precio_visita: edit.precio_visita === '' ? null : Number(edit.precio_visita),
    };
    supabase.from('maestros').update(cambios).eq('id', edit.id).then(function (res) {
      setGuardando(false);
      if (res.error) { setMsg('No se pudo guardar: ' + res.error.message); return; }
      setMsg('Guardado ✓'); cargar();
      setTimeout(function () { setEdit(null); setMsg(''); }, 800);
    });
  }

  // ----------- EDITOR -----------
  if (edit) {
    var m0 = edit._orig;
    var link = waLink(m0, plantillaSel);
    return (
      <div>
        <button style={btnS} onClick={function () { setEdit(null); }}>{'← Volver a la lista'}</button>
        <div style={Object.assign({}, card, { marginTop: 12 })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
            <div style={{ width: 78, height: 78, borderRadius: '50%', background: '#eef1f7', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {edit.foto_url ? <img src={edit.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 28 }}>🧑‍🔧</span>}
            </div>
            <div>
              <label style={{ ...btnS, display: 'inline-block' }}>
                {subiendo ? 'Subiendo…' : '📷 Cambiar foto de perfil'}
                <input type="file" accept="image/*" style={{ display: 'none' }} disabled={subiendo} onChange={function (e) { subirFoto(e.target.files[0], 'perfil'); }} />
              </label>
              <div style={{ fontSize: 11, color: '#9aa1b5', marginTop: 4 }}>
                {edit.verificado ? '✅ Verificado' : '⏳ Sin verificar'}
                {!edit.foto_url ? <span style={{ ...pill, background: '#fdecec', color: '#b3261e' }}>SIN FOTO</span> : null}
                {!edit.tieneDocs ? <span style={{ ...pill, background: '#fff3df', color: '#b07a1e' }}>SIN DOCS</span> : null}
              </div>
            </div>
          </div>

          {/* Contacto WhatsApp */}
          <div style={{ background: '#f0fbf4', border: '1px solid #cdeedb', borderRadius: 12, padding: 12, marginTop: 6 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 6 }}>📲 Contactar al maestro</div>
            <div style={{ fontSize: 12, color: '#5b6275', marginBottom: 8 }}>{'Teléfono: ' + (edit.telefono || '— (sin teléfono registrado)')}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={plantillaSel} onChange={function (e) { setPlantillaSel(e.target.value); }} style={{ ...inp, width: 'auto', padding: '7px 10px', fontSize: 12.5 }}>
                {PLANTILLAS.map(function (p) { return <option key={p.id} value={p.id}>{p.nombre}</option>; })}
              </select>
              {link
                ? <a href={link} target="_blank" rel="noopener noreferrer" style={btnWa}>🟢 Enviar por WhatsApp</a>
                : <span style={{ fontSize: 12, color: '#b3261e', fontWeight: 700 }}>No tiene teléfono para WhatsApp</span>}
            </div>
            <div style={{ fontSize: 11.5, color: '#7c8499', marginTop: 8, whiteSpace: 'pre-wrap', background: '#fff', border: '1px solid #e6efe9', borderRadius: 8, padding: 8 }}>{textoPlantilla(m0, plantillaSel)}</div>
          </div>

          <div style={lab}>Nombre</div>
          <input style={inp} value={edit.nombre} onChange={function (e) { setCampo('nombre', e.target.value); }} placeholder="Nombre del maestro" />
          <div style={lab}>Oficios (separados por coma)</div>
          <input style={inp} value={edit.oficiosTxt} onChange={function (e) { setCampo('oficiosTxt', e.target.value); }} placeholder="Gasfitería, Electricidad" />
          <div style={lab}>Descripción</div>
          <textarea style={Object.assign({}, inp, { minHeight: 90, resize: 'vertical' })} value={edit.descripcion} onChange={function (e) { setCampo('descripcion', e.target.value); }} placeholder="Descripción del maestro…" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <div><div style={lab}>Comuna</div><input style={inp} value={edit.comuna} onChange={function (e) { setCampo('comuna', e.target.value); }} placeholder="Las Condes" /></div>
            <div><div style={lab}>Precio diagnóstico/videollamada</div><input style={inp} type="number" value={edit.precio_videollamada} onChange={function (e) { setCampo('precio_videollamada', e.target.value); }} placeholder="0" /></div>
            <div><div style={lab}>Precio visita</div><input style={inp} type="number" value={edit.precio_visita} onChange={function (e) { setCampo('precio_visita', e.target.value); }} placeholder="0" /></div>
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
        <div style={{ fontSize: 13, color: '#7c8499', marginTop: 4 }}>Abre un perfil para editar datos, foto y galería, o contacta al maestro por WhatsApp con una plantilla.</div>
      </div>

      {!cargando && (faltanFoto > 0 || faltanDocs > 0) && (
        <div style={{ background: '#fff8ee', border: '1px solid #f0e6cf', borderRadius: 12, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#8a6a1e' }}>
          {'⚠️ ' + faltanFoto + ' sin foto de perfil · ' + faltanDocs + ' sin documentos. '}
          <a style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 700 }} onClick={function () { setSoloFalta(true); }}>Ver solo los que faltan</a>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <input value={busca} onChange={function (e) { setBusca(e.target.value); }} placeholder="Buscar por nombre, oficio o comuna…" style={Object.assign({}, inp, { maxWidth: 300 })} />
        <label style={{ fontSize: 12.5, color: '#5b6275', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={soloAprobados} onChange={function (e) { setSoloAprobados(e.target.checked); }} /> Solo aprobados
        </label>
        <label style={{ fontSize: 12.5, color: '#5b6275', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={soloFalta} onChange={function (e) { setSoloFalta(e.target.checked); }} /> Solo con datos faltantes
        </label>
        <span style={{ fontSize: 12, color: '#9aa1b5', marginLeft: 'auto' }}>{lista.length + ' maestros'}</span>
      </div>

      {cargando && <div style={{ fontSize: 13, color: '#9aa1b5' }}>Cargando…</div>}
      {!cargando && lista.length === 0 && <div style={{ fontSize: 13, color: '#9aa1b5' }}>No hay maestros que coincidan.</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 12 }}>
        {lista.map(function (m) {
          var foto = m.foto_url || perfilDe(m.id).avatar_url;
          var oficios = (m.oficios && m.oficios.length ? m.oficios.join(' · ') : (m.oficio || '—'));
          var link = waLink(m, 'auto');
          return (
            <div key={m.id} style={{ background: '#fff', border: '1.5px solid #eee', borderRadius: 14, padding: 14 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#eef1f7', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {foto ? <img src={foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 22 }}>🧑‍🔧</span>}
                </div>
                <div style={{ minWidth: 0 }}>
                  <b style={{ fontSize: 14.5 }}>{nombreVisible(m)}</b>
                  <div style={{ fontSize: 12, color: '#7c8499', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{oficios}</div>
                  <div style={{ fontSize: 11.5, color: '#9aa1b5', marginTop: 2 }}>{'★ ' + (m.rating_promedio || '—') + ' · ' + (m.comuna || 's/comuna')}</div>
                </div>
              </div>
              <div style={{ marginTop: 8, minHeight: 18 }}>
                {!tieneFoto(m) ? <span style={{ ...pill, marginLeft: 0, marginRight: 4, background: '#fdecec', color: '#b3261e' }}>SIN FOTO</span> : null}
                {!tieneDocs(m) ? <span style={{ ...pill, marginLeft: 0, background: '#fff3df', color: '#b07a1e' }}>SIN DOCS</span> : null}
                {tieneFoto(m) && tieneDocs(m) ? <span style={{ ...pill, marginLeft: 0, background: '#eaf7ef', color: '#0d9456' }}>COMPLETO</span> : null}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button style={Object.assign({}, btnS, { flex: 1 })} onClick={function () { abrir(m); }}>Ver / editar</button>
                {link
                  ? <a href={link} target="_blank" rel="noopener noreferrer" style={Object.assign({}, btnWa, { flex: 1, justifyContent: 'center' })}>🟢 WhatsApp</a>
                  : <span style={{ ...btnS, flex: 1, textAlign: 'center', color: '#b3261e', cursor: 'default' }}>sin teléfono</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
