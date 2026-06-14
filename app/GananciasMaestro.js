'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Ganancias del maestro: resumen de lo ganado (trabajos pagados/completados),
// lo pendiente por cobrar y el conteo de trabajos.
function esPagado(e) { var s = (e || '').toLowerCase(); return s === 'completado' || s === 'pagado'; }
function esCancelado(e) { var s = (e || '').toLowerCase(); return s === 'cancelado' || s === 'rechazado'; }

export default function GananciasMaestro({ usuario }) {
  const [trabajos, setTrabajos] = useState([]);
  const [cargado, setCargado] = useState(false);

  useEffect(function () {
    if (!usuario) return;
    supabase.rpc('agenda_maestro').then(function (r) {
      setTrabajos(r.error ? [] : (r.data || []));
      setCargado(true);
    });
  }, [usuario]);

  function plata(n) { return '$' + (n || 0).toLocaleString('es-CL'); }
  function fechaDe(t) { return new Date(t.fecha_hora || t.creado_en); }

  var ahora = new Date();
  var inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  var pagados = trabajos.filter(function (t) { return esPagado(t.estado); });
  var pendientes = trabajos.filter(function (t) { return !esPagado(t.estado) && !esCancelado(t.estado); });
  var totalGanado = pagados.reduce(function (s, t) { return s + (t.precio_cotizado || 0); }, 0);
  var totalPend = pendientes.reduce(function (s, t) { return s + (t.precio_cotizado || 0); }, 0);
  var ganadoMes = pagados.filter(function (t) { return fechaDe(t) >= inicioMes; }).reduce(function (s, t) { return s + (t.precio_cotizado || 0); }, 0);

  const card = { background: '#fff', borderRadius: 16, padding: 16, margin: '0 0 12px', border: '1px solid #eef0f5' };
  const metric = { background: '#f7f6fc', borderRadius: 14, padding: '14px 16px' };

  function fila(t) {
    var d = fechaDe(t);
    var pagado = esPagado(t.estado);
    return (
      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f1f5', padding: '10px 0' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1c1f2b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.descripcion_problema || 'Trabajo'}</div>
          <div style={{ fontSize: 11.5, color: '#9aa1b5' }}>{(t.cliente_nombre || 'Cliente') + ' · ' + d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}</div>
        </div>
        <div style={{ textAlign: 'right', marginLeft: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: pagado ? '#0d9456' : '#b07a1e' }}>{plata(t.precio_cotizado)}</div>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: pagado ? '#0d9456' : '#b07a1e' }}>{pagado ? 'Pagado' : 'Pendiente'}</div>
        </div>
      </div>
    );
  }

  if (!cargado) return <div className="body" style={{ paddingTop: 16 }}><p style={{ fontSize: 13, color: '#9aa1b5' }}>Cargando...</p></div>;

  return (
    <div className="body" style={{ paddingTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px' }}>
        <span style={{ fontSize: 16 }}>{'\u{1F4B0}'}</span>
        <b style={{ fontSize: 16 }}>Mis ganancias</b>
      </div>

      <div style={{ ...card, background: 'linear-gradient(160deg,#0f6e56,#0d9456)', border: 'none', color: '#fff' }}>
        <div style={{ fontSize: 12, opacity: .9 }}>Total ganado</div>
        <div style={{ fontSize: 30, fontWeight: 900, margin: '2px 0 0' }}>{plata(totalGanado)}</div>
        <div style={{ fontSize: 12, opacity: .9, marginTop: 4 }}>{'Este mes: ' + plata(ganadoMes)}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div style={metric}>
          <div style={{ fontSize: 11.5, color: '#7c8499' }}>Por cobrar</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#b07a1e' }}>{plata(totalPend)}</div>
        </div>
        <div style={metric}>
          <div style={{ fontSize: 11.5, color: '#7c8499' }}>Trabajos pagados</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1c1f2b' }}>{pagados.length}</div>
        </div>
      </div>

      <div style={card}>
        <b style={{ fontSize: 14 }}>Detalle</b>
        {trabajos.length === 0 && <p style={{ fontSize: 13, color: '#9aa1b5', marginTop: 8 }}>Todavía no tienes trabajos. Cuando completes uno, verás tus ingresos aquí.</p>}
        {trabajos.filter(function (t) { return !esCancelado(t.estado); }).map(fila)}
      </div>

      <p style={{ fontSize: 11, color: '#b6bccb', textAlign: 'center', margin: '4px 0 0' }}>Los montos se basan en el precio cotizado de cada trabajo.</p>
    </div>
  );
}
