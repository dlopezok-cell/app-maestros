'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Cabecera de perfil del maestro (estilo profesional): avatar grande editable,
// nombre, especialidades y la insignia de verificación. La foto se sube al bucket
// publico "avatares" y la URL queda en perfiles.avatar_url.
const NOMBRE_OFICIO = { gasfiteria: 'Gasfitería', electricidad: 'Electricidad', cerrajeria: 'Cerrajería', pintura: 'Pintura', calefont: 'Calefont', limpieza: 'Limpieza' };

export default function CabeceraMaestro({ usuario }) {
  const [url, setUrl] = useState(null);
  const [nombre, setNombre] = useState('');
  const [oficios, setOficios] = useState([]);
  const [verificado, setVerificado] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [cargado, setCargado] = useState(false);

  useEffect(function () {
    if (!usuario) return;
    Promise.all([
      supabase.from('perfiles').select('nombre, avatar_url').eq('id', usuario.id).maybeSingle(),
      supabase.from('maestros').select('oficios, oficio, verificado').eq('id', usuario.id).maybeSingle()
    ]).then(function (res) {
      var p = res[0].data, m = res[1].data;
      if (p) { setNombre(p.nombre || ''); setUrl(p.avatar_url || null); }
      if (m) { setOficios(m.oficios && m.oficios.length ? m.oficios : (m.oficio ? [m.oficio] : [])); setVerificado(!!m.verificado); }
      setCargado(true);
    });
  }, [usuario]);

  function subir(file) {
    if (!file) return;
    setSubiendo(true);
    var ruta = usuario.id + '/perfil_' + Date.now() + '.jpg';
    supabase.storage.from('avatares').upload(ruta, file, { upsert: true }).then(function (r) {
      if (r.error) { setSubiendo(false); return; }
      var pub = supabase.storage.from('avatares').getPublicUrl(ruta);
      supabase.from('perfiles').update({ avatar_url: pub.data.publicUrl }).eq('id', usuario.id).then(function () {
        setUrl(pub.data.publicUrl); setSubiendo(false);
      });
    });
  }

  if (!usuario || !cargado) return <div className="darkhead"><div className="dh2">Cargando tu perfil...</div></div>;

  var inicial = (nombre || usuario.email || '?').trim().charAt(0).toUpperCase();
  var oficiosTxt = oficios.map(function (o) { return NOMBRE_OFICIO[o] || o; }).join(' · ');

  return (
    <div className="darkhead" style={{ textAlign: 'center', paddingBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: '#ff8a6b' }}>{'\u{1F6E0} MODO MAESTRO'}</div>
      <div style={{ position: 'relative', width: 108, height: 108, margin: '14px auto 12px' }}>
        <div style={{ width: 108, height: 108, borderRadius: '50%', overflow: 'hidden', background: '#ff5a3c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 42, border: '3px solid rgba(255,255,255,.55)' }}>
          {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : inicial}
        </div>
        <label style={{ position: 'absolute', bottom: 2, right: 2, width: 34, height: 34, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.35)', opacity: subiendo ? 0.5 : 1 }}>
          <span style={{ fontSize: 15 }}>{'\u{1F4F7}'}</span>
          <input type="file" accept="image/*" style={{ display: 'none' }} disabled={subiendo} onChange={function (e) { subir(e.target.files[0]); }} />
        </label>
      </div>
      <h2 style={{ margin: '0 0 4px' }}>{nombre || (usuario.email || '').split('@')[0]}</h2>
      <div style={{ color: '#b9c0d4', fontSize: 13 }}>{oficiosTxt || 'Completa tu ficha de maestro abajo'}</div>
      {verificado
        ? <div style={{ display: 'inline-block', marginTop: 12, background: 'rgba(13,148,86,.20)', color: '#7ee2b0', borderRadius: 999, padding: '5px 13px', fontSize: 12, fontWeight: 800 }}>{'\u{1F6E1} Identidad verificada'}</div>
        : <div style={{ display: 'inline-block', marginTop: 12, background: 'rgba(255,255,255,.12)', color: '#cdd3e3', borderRadius: 999, padding: '5px 13px', fontSize: 12, fontWeight: 700 }}>{'\u{23F3} Verificación pendiente'}</div>}
      {subiendo && <div style={{ fontSize: 11, color: '#b9c0d4', marginTop: 8 }}>Subiendo foto...</div>}
    </div>
  );
}
