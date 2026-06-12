'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

const OFICIOS = [
  { id: 'gasfiteria', emoji: '\u{1F6B0}', nombre: 'Gasfiteria' },
  { id: 'electricidad', emoji: '⚡', nombre: 'Electricidad' },
  { id: 'cerrajeria', emoji: '\u{1F511}', nombre: 'Cerrajeria' },
  { id: 'pintura', emoji: '\u{1F3A8}', nombre: 'Pintura' },
  { id: 'calefont', emoji: '\u{1F525}', nombre: 'Calefont' },
  { id: 'limpieza', emoji: '\u{1F9F9}', nombre: 'Limpieza' },
  ];

export default function Home() {
    const [oficio, setOficio] = useState(null);
    const [maestros, setMaestros] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(null);

  function buscar(oficioId) {
        setOficio(oficioId);
        setCargando(true);
        setError(null);
        navigator.geolocation.getCurrentPosition(
                async (pos) => {
                          const { data, error } = await supabase.rpc('maestros_cercanos', {
                                      lat: pos.coords.latitude,
                                      lng: pos.coords.longitude,
                                      oficio_buscado: oficioId,
                          });
                          if (error) setError(error.message);
                          else setMaestros(data || []);
                          setCargando(false);
                },
                () => {
                          setError('Necesitamos tu ubicacion para encontrar maestros cerca de ti.');
                          setCargando(false);
                }
              );
  }

  function videollamada(id) {
        window.open('https://meet.jit.si/maestros-demo-' + id, '_blank');
  }

  return (
        <main>
          <div className="hero">
            <h1>{'Que arreglamos hoy? \u{1F527}'}</h1>
          <p>{'Maestros verificados, con puntuacion real y diagnostico por videollamada'}</p>
    </div>
        <div className="body">
            <div style={{ background: 'linear-gradient(135deg, #1c1f2b, #33405e)', borderRadius: 18, padding: 16, color: '#fff', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 30 }}>{'\u{1F4F9}'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{'Tu primer diagnostico es GRATIS'}</div>
            <div style={{ fontSize: 12, opacity: .75 }}>{'Videollamada con un maestro experto, hoy mismo'}</div>
  </div>
          <button onClick={() => videollamada('banner')} style={{ background: '#ff5a3c', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 14px', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>Probar ahora</button>
  </div>

        <div className="cats">
{OFICIOS.map((o) => (
              <div key={o.id} className="cat" onClick={() => buscar(o.id)}
              style={{ borderColor: oficio === o.id ? '#ff5a3c' : '#eee' }}>
              <span>{o.emoji}</span>{o.nombre}
                </div>
          ))}
            </div>

{cargando && <p>Buscando maestros cerca de ti...</p>}
 {error && <p className="error">{error}</p>}

  {maestros.map((m) => (
              <div key={m.id} className="card">
                <div className="av">{'\u{1F527}'}</div>
              <div style={{ flex: 1 }}>
              <b>{m.nombre}</b>
               <div className="stars">{'★ ' + (m.rating || 'Nuevo') + (m.trabajos ? ' (' + m.trabajos + ' trabajos)' : '')}</div>
              <div className="meta">{'a ' + m.distancia_km + ' km de ti'}</div>
              <button onClick={() => videollamada(m.id)} style={{ marginTop: 8, background: '#e9faf1', color: '#0d9456', border: '1.5px solid #b7e4cd', borderRadius: 10, padding: '8px 12px', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>{'\u{1F4F9} Videollamada GRATIS (1ra vez)'}</button>
  </div>
  </div>
        ))}

{oficio && !cargando && maestros.length === 0 && !error && (
            <p>{'Aun no hay maestros de este oficio en tu zona. Pronto!'}</p>
         )}
</div>
  </main>
  );
}
