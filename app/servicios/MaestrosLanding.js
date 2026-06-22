'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const NAVY = '#0e1a38', MUT = '#5b6275';

function norm(s) {
  return (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

export default function MaestrosLanding({ oficioSlug, oficioNombre, profesional, comunaNombre }) {
  const [maestros, setMaestros] = useState(null);

  useEffect(function () {
    let vivo = true;
    const targets = [norm(oficioSlug), norm(oficioNombre), norm(profesional)].filter(Boolean);
    const comTarget = comunaNombre ? norm(comunaNombre) : null;
    supabase
      .from('maestros')
      .select('id, nombre, oficio, oficios, comunas, region, foto_url, rating_promedio, total_trabajos, verificado, suspendido')
      .limit(400)
      .then(function (r) {
        if (!vivo) return;
        const rows = (r.data || []).filter(function (m) {
          if (m.suspendido) return false;
          const ofs = (Array.isArray(m.oficios) && m.oficios.length ? m.oficios : (m.oficio ? [m.oficio] : [])).map(norm);
          const okOficio = ofs.some(function (o) { return targets.some(function (t) { return o === t || o.indexOf(t) >= 0 || t.indexOf(o) >= 0; }); });
          if (!okOficio) return false;
          if (comTarget) {
            const cs = (Array.isArray(m.comunas) ? m.comunas : []).map(norm);
            if (cs.indexOf(comTarget) < 0) return false;
          }
          return true;
        });
        rows.sort(function (a, b) { return (b.verificado ? 1 : 0) - (a.verificado ? 1 : 0) || (b.rating_promedio || 0) - (a.rating_promedio || 0); });
        setMaestros(rows);
      })
      .catch(function () { if (vivo) setMaestros([]); });
    return function () { vivo = false; };
  }, [oficioSlug, oficioNombre, profesional, comunaNombre]);

  if (maestros === null) return null;

  const zona = comunaNombre ? ('en ' + comunaNombre) : 'en Chile';

  if (maestros.length === 0) {
    return (
      <div style={{ background: '#f6f8fc', border: '1px solid #e6ecf7', borderRadius: 16, padding: '20px 18px', margin: '24px 0' }}>
        <p style={{ fontWeight: 800, color: NAVY, margin: '0 0 6px', fontSize: 17 }}>Estamos sumando {(profesional || 'maestros').toLowerCase()}s {zona}</p>
        <p style={{ margin: '0 0 14px', color: MUT, fontSize: 14.5 }}>Publica tu solicitud y contactamos a maestros de tu zona para que te coticen. Es gratis y sin compromiso.</p>
        <a href="/" style={{ display: 'inline-block', textDecoration: 'none', borderRadius: 12, padding: '12px 20px', fontWeight: 800, fontSize: 15, background: 'linear-gradient(135deg,#22d3ee,#2563eb)', color: '#fff' }}>Pedir presupuesto gratis</a>
      </div>
    );
  }

  const top = maestros.slice(0, 6);
  return (
    <div style={{ margin: '28px 0' }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: '0 0 4px' }}>{maestros.length} {maestros.length === 1 ? 'maestro disponible' : 'maestros disponibles'} {zona}</h2>
      <p style={{ margin: '0 0 16px', color: MUT, fontSize: 14.5 }}>Algunos de los profesionales que pueden cotizarte hoy:</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        {top.map(function (m) {
          const ini = (m.nombre || 'M').trim().charAt(0).toUpperCase();
          return (
            <a key={m.id} href="/" style={{ textDecoration: 'none', border: '1px solid #e6ecf7', borderRadius: 14, padding: '14px 12px', display: 'block', textAlign: 'center', color: NAVY }}>
              {m.foto_url
                ? <img src={m.foto_url} alt={m.nombre || 'Maestro'} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 8px', display: 'block' }} />
                : <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#22d3ee,#2563eb)', color: '#fff', fontWeight: 800, fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>{ini}</div>}
              <div style={{ fontWeight: 800, fontSize: 14.5 }}>{(m.nombre || 'Maestro')}{m.verificado ? ' ✓' : ''}</div>
              {(m.rating_promedio ? <div style={{ fontSize: 12.5, color: MUT, marginTop: 2 }}>{'★ ' + Number(m.rating_promedio).toFixed(1)}{m.total_trabajos ? ' · ' + m.total_trabajos + ' trabajos' : ''}</div> : null)}
            </a>
          );
        })}
      </div>
      <div style={{ marginTop: 16 }}>
        <a href="/" style={{ display: 'inline-block', textDecoration: 'none', borderRadius: 12, padding: '12px 22px', fontWeight: 800, fontSize: 15, background: 'linear-gradient(135deg,#22d3ee,#2563eb)', color: '#fff' }}>Pedir presupuesto gratis</a>
      </div>
    </div>
  );
}
