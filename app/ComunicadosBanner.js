'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Muestra los avisos (comunicados) activos del dueño dentro de la app.
// segmento: 'todos' o el segmento indicado (por ej. 'maestros' o 'clientes').
export default function ComunicadosBanner({ segmento }) {
  const [avisos, setAvisos] = useState([]);
  const [cerrados, setCerrados] = useState({});

  useEffect(function () {
    supabase.from('comunicados').select('*').eq('activo', true).order('creado_en', { ascending: false })
      .then(function (r) {
        var data = (r.data || []).filter(function (c) { return c.segmento === 'todos' || c.segmento === segmento; });
        setAvisos(data);
      });
  }, [segmento]);

  var visibles = avisos.filter(function (c) { return !cerrados[c.id]; });
  if (visibles.length === 0) return null;

  return (
    <div className="body" style={{ paddingTop: 12, paddingBottom: 0 }}>
      {visibles.map(function (c) {
        return (
          <div key={c.id} style={{ background: '#EEEDFE', border: '1px solid #d9d5fb', borderRadius: 14, padding: '12px 14px', marginBottom: 10, position: 'relative' }}>
            <button onClick={function () { setCerrados(function (p) { var n = Object.assign({}, p); n[c.id] = true; return n; }); }}
              style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', color: '#7066d6', fontSize: 15, fontWeight: 800, cursor: 'pointer', lineHeight: 1 }}>{'✕'}</button>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#3C3489', paddingRight: 18 }}>{'\u{1F4E2} ' + c.titulo}</div>
            <div style={{ fontSize: 13, color: '#534AB7', marginTop: 3, lineHeight: 1.5 }}>{c.cuerpo}</div>
          </div>
        );
      })}
    </div>
  );
}
