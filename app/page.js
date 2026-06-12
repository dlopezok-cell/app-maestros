'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

const OFICIOS = [
  { id: 'gasfiteria', emoji: '\u{1F6B0}', nombre: 'Gasfitería' },
  { id: 'electricidad', emoji: '⚡', nombre: 'Electricidad' },
  { id: 'cerrajeria', emoji: '\u{1F511}', nombre: 'Cerrajería' },
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
                          setError('Necesitamos tu ubicación para encontrar maestros cerca de ti.');
                          setCargando(false);
                }
              );
  }

  return (
        <main>
          <div className="hero">
            <h1>{'¿Qué arreglamos hoy? \u{1F527}'}</h1>
          <p>{'Maestros verificados, con puntuación real y diagnóstico por videollamada'}</p>
    </div>
        <div className="body">
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
              <div className="meta">{'a ' + m.distancia_km + ' km · videollamada $' + (m.precio_videollamada || 4000).toLocaleString('es-CL')}</div>
  </div>
  </div>
        ))}

{oficio && !cargando && maestros.length === 0 && !error && (
            <p>{'Aún no hay maestros de este oficio en tu zona. ¡Pronto!'}</p>
         )}
</div>
  </main>
      );
}
