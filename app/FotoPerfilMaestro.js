'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Foto de perfil PUBLICA del maestro: la que ven los clientes en su ficha.
// Es distinta de la foto de verificacion (carnet + selfie), que es privada.
// Se sube al bucket publico "avatares" y la URL queda en perfiles.avatar_url.
export default function FotoPerfilMaestro({ usuario }) {
  const [url, setUrl] = useState(null);
  const [nombre, setNombre] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [msg, setMsg] = useState(null);
  const [cargado, setCargado] = useState(false);

  useEffect(function () {
    if (!usuario) return;
    supabase.from('perfiles').select('avatar_url, nombre').eq('id', usuario.id).maybeSingle()
      .then(function (r) {
        if (r.data) { setUrl(r.data.avatar_url || null); setNombre(r.data.nombre || ''); }
        setCargado(true);
      });
  }, [usuario]);

  function subir(file) {
    if (!file) return;
    setSubiendo(true);
    setMsg('Subiendo foto...');
    var ruta = usuario.id + '/perfil_' + Date.now() + '.jpg';
    supabase.storage.from('avatares').upload(ruta, file, { upsert: true })
      .then(function (r) {
        if (r.error) throw new Error(r.error.message);
        var pub = supabase.storage.from('avatares').getPublicUrl(ruta);
        var publicUrl = pub.data.publicUrl;
        return supabase.from('perfiles').update({ avatar_url: publicUrl }).eq('id', usuario.id)
          .then(function (r2) {
            if (r2.error) throw new Error(r2.error.message);
            setUrl(publicUrl);
            setMsg('Foto actualizada ✓');
            setSubiendo(false);
          });
      })
      .catch(function (e) { setMsg('Error: ' + e.message); setSubiendo(false); });
  }

  if (!usuario || !cargado) return null;

  var inicial = (nombre || usuario.email || '?').trim().charAt(0).toUpperCase();
  var card = { background: '#fff', borderRadius: 16, padding: 16, margin: '14px 16px', border: '1.5px solid #eee', display: 'flex', alignItems: 'center', gap: 14 };

  return (
    <div style={card}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 26 }}>
        {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : inicial}
      </div>
      <div style={{ flex: 1 }}>
        <b style={{ fontSize: 14 }}>Foto de perfil</b>
        <div style={{ fontSize: 12, color: '#7c8499', margin: '2px 0 8px' }}>La que ven los clientes en tu ficha. No es la foto del carnet.</div>
        <label style={{ display: 'inline-block', background: '#2563eb', color: '#fff', borderRadius: 10, padding: '8px 14px', fontWeight: 800, fontSize: 13, cursor: 'pointer', opacity: subiendo ? 0.6 : 1 }}>
          {url ? 'Cambiar foto' : 'Subir foto'}
          <input type="file" accept="image/*" style={{ display: 'none' }} disabled={subiendo}
            onChange={function (e) { subir(e.target.files[0]); }} />
        </label>
        {msg && <p style={{ fontSize: 12, color: msg.indexOf('Error') >= 0 ? '#b3261e' : '#0d9456', margin: '6px 0 0' }}>{msg}</p>}
      </div>
    </div>
  );
}
