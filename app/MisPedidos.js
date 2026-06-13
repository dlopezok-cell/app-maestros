'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Lista de pedidos (reservas) del cliente. Pagina propia, separada del perfil.
export default function MisPedidos({ usuario }) {
  const [pedidos, setPedidos] = useState([]);
  const [cargado, setCargado] = useState(false);

  useEffect(function () {
    if (!usuario) return;
    supabase.from('reservas').select('*').eq('cliente_id', usuario.id).order('creado_en', { ascending: false })
      .then(function (r) { setPedidos(r.data || []); setCargado(true); });
  }, [usuario]);

  function fecha(f) { return f ? new Date(f).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; }
  function plata(n) { return '$' + (n || 0).toLocaleString('es-CL'); }

  const card = { background: '#fff', borderRadius: 18, padding: 16, marginBottom: 14, border: '1.5px solid #eee' };

  return (
    <div className="body" style={{ paddingTop: 18 }}>
      <div style={card}>
        <b style={{ fontSize: 15 }}>{'\u{1F4E6} Mis pedidos'}</b>
        {!cargado && <p style={{ fontSize: 13, color: '#9aa1b5', marginTop: 8 }}>Cargando...</p>}
        {cargado && pedidos.length === 0 && <p style={{ fontSize: 13, color: '#9aa1b5', marginTop: 8 }}>Todavía no tienes pedidos. Cuando agendes una videollamada o un trabajo, aparecerán aquí.</p>}
        {pedidos.map(function (p) {
          return (
            <div key={p.id} style={{ borderTop: '1px solid #f1f1f1', padding: '10px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ fontSize: 13 }}>{p.descripcion_problema || p.tipo || 'Pedido'}</b>
                <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 8, background: '#fff9f0', color: '#b07a1e', fontWeight: 800 }}>{(p.estado || '—').toUpperCase()}</span>
              </div>
              <div style={{ fontSize: 12, color: '#7c8499', marginTop: 2 }}>{(p.precio_cotizado ? plata(p.precio_cotizado) + ' · ' : '') + fecha(p.creado_en)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
