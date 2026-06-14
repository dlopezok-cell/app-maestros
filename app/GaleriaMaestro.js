'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Galeria de trabajos del maestro: sube fotos de trabajos realizados.
// Las fotos van al bucket publico "avatares" (carpeta del usuario) y la lista
// de URLs se guarda en maestros.galeria via RPC guardar_galeria.
export default function GaleriaMaestro({ usuario, plano, onGuardado }) {
  const [urls, setUrls] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [msg, setMsg] = useState(null);
  const [cargado, setCargado] = useState(false);

  useEffect(function () {
    if (!usuario) return;
    supabase.from('maestros').select('galeria').eq('id', usuario.id).maybeSingle()
      .then(function (r) {
        if (r.data && r.data.galeria) setUrls(r.data.galeria);
        setCargado(true);
      });
  }, [usuario]);

  function guardar(nuevas) {
    return supabase.rpc('guardar_galeria', { p_urls: nuevas }).then(function (r) {
      if (r.error) { setMsg('Error: ' + r.error.message); return false; }
      return true;
    });
  }

  function subir(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    setSubiendo(true);
    setMsg('Subiendo ' + files.length + ' foto(s)...');
    var nuevas = urls.slice();
    var i = 0;
    function siguiente() {
      if (i >= files.length) {
        guardar(nuevas).then(function (ok) {
          if (ok) { setUrls(nuevas); setMsg('Galería actualizada ✓'); }
          setSubiendo(false);
        });
        return;
      }
      var f = files[i];
      var ruta = usuario.id + '/trabajo_' + Date.now() + '_' + i + '.jpg';
      supabase.storage.from('avatares').upload(ruta, f, { upsert: true }).then(function (r) {
        if (!r.error) {
          var pub = supabase.storage.from('avatares').getPublicUrl(ruta);
          nuevas.push(pub.data.publicUrl);
        }
        i++;
        siguiente();
      });
    }
    siguiente();
  }

  function quitar(url) {
    var nuevas = urls.filter(function (u) { return u !== url; });
    setMsg('Guardando...');
    guardar(nuevas).then(function (ok) { if (ok) { setUrls(nuevas); setMsg('Foto quitada ✓'); } });
  }

  if (!usuario || !cargado) return null;

  var card = plano
    ? { background: 'transparent', borderRadius: 0, padding: 0, margin: 0, border: 'none' }
    : { background: '#fff', borderRadius: 16, padding: 16, margin: '14px 16px', border: '1.5px solid #eee' };

  return (
    <div style={card}>
      {!plano && <b style={{ fontSize: 15 }}>{'\u{1F4F8} Galería de trabajos'}</b>}
      <div style={{ fontSize: 12, color: '#7c8499', margin: plano ? '0 0 12px' : '4px 0 12px' }}>
        Sube fotos de trabajos que ya hiciste. Las fotos <b>dan más confianza</b>: los clientes contratan mucho más a los maestros que muestran su trabajo terminado.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        {urls.map(function (u, i) {
          return (
            <div key={i} style={{ position: 'relative', paddingTop: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid #eee' }}>
              <img src={u} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={function () { quitar(u); }} style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', lineHeight: '24px', padding: 0 }}>×</button>
            </div>
          );
        })}
        <label style={{ paddingTop: '100%', position: 'relative', borderRadius: 12, border: '1.5px dashed #ccc', background: '#fafafa', cursor: 'pointer' }}>
          <span style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#7c8499', fontSize: 12, fontWeight: 700 }}>
            <span style={{ fontSize: 24 }}>+</span>Agregar
          </span>
          <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={subiendo}
            onChange={function (e) { subir(e.target.files); }} />
        </label>
      </div>

      {msg && <p style={{ fontSize: 12, color: msg.indexOf('Error') >= 0 ? '#b3261e' : '#0d9456', margin: 0 }}>{msg}</p>}
      {urls.length === 0 && !msg && <div style={{ fontSize: 11, color: '#9aa1b5' }}>Aún no subes fotos. Toca "Agregar" para empezar.</div>}
      {plano && <button onClick={function () { if (onGuardado) onGuardado(); }} disabled={subiendo}
        style={{ width: '100%', marginTop: 12, background: '#26215C', color: '#fff', border: 'none', borderRadius: 12, padding: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer', opacity: subiendo ? 0.6 : 1 }}>Listo</button>}
    </div>
  );
}
