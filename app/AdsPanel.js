'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Cuenta de Google Ads (MaestrosEnLínea.cl)
const OCID = '8340886244';
const ADS = function (path) { return 'https://ads.google.com/aw/' + path + '?ocid=' + OCID; };

const ACCESOS = [
  { icono: '\u{1F4CA}', t: 'Resumen de la cuenta', d: 'Impresiones, clics, costo, conversiones', url: ADS('overview') },
  { icono: '\u{1F4E3}', t: 'Campañas', d: 'Estado y rendimiento de "Clientes - Oriente"', url: ADS('campaigns') },
  { icono: '\u{1F50D}', t: 'Términos de búsqueda', d: 'Qué escribe la gente que ve tus anuncios', url: ADS('keywords/searchterms') },
  { icono: '\u{1F511}', t: 'Palabras clave', d: 'Pausar caras, subir las que convierten', url: ADS('keywords') },
  { icono: '\u{2705}', t: 'Conversiones', d: 'Solicitudes de presupuesto registradas', url: ADS('conversions') },
  { icono: '\u{1F4B3}', t: 'Facturación', d: 'Gasto y crédito promocional', url: ADS('billing/summary') },
];

function diaKey(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function etiquetaDia(d) {
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return dias[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1);
}

export default function AdsPanel() {
  const [presupuestos, setPresupuestos] = useState([]);
  const [leads, setLeads] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(function () {
    Promise.all([
      supabase.from('presupuestos').select('creado_en, comuna, oficio, cliente_id').order('creado_en', { ascending: false }),
      supabase.from('leads').select('creado_en').order('creado_en', { ascending: false }),
    ]).then(function (res) {
      setPresupuestos((res[0] && res[0].data) || []);
      setLeads((res[1] && res[1].data) || []);
      setCargando(false);
    }).catch(function () { setCargando(false); });
  }, []);

  // ---- series por día (últimos 14 días) ----
  const dias = [];
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  for (var i = 13; i >= 0; i--) { const d = new Date(hoy); d.setDate(hoy.getDate() - i); dias.push(d); }
  const mapaSolic = {}; presupuestos.forEach(function (p) { if (!p.creado_en) return; const k = diaKey(new Date(p.creado_en)); mapaSolic[k] = (mapaSolic[k] || 0) + 1; });
  const mapaLeads = {}; leads.forEach(function (l) { if (!l.creado_en) return; const k = diaKey(new Date(l.creado_en)); mapaLeads[k] = (mapaLeads[k] || 0) + 1; });
  const serie = dias.map(function (d) { const k = diaKey(d); return { d: d, k: k, solic: mapaSolic[k] || 0, leads: mapaLeads[k] || 0 }; });
  const maxSolic = Math.max(1, ...serie.map(function (s) { return s.solic; }));

  function enRango(p, ndias) { if (!p.creado_en) return false; const lim = new Date(hoy); lim.setDate(hoy.getDate() - (ndias - 1)); return new Date(p.creado_en) >= lim; }
  const solicHoy = serie[serie.length - 1].solic;
  const solic7 = presupuestos.filter(function (p) { return enRango(p, 7); }).length;
  const solic14 = presupuestos.filter(function (p) { return enRango(p, 14); }).length;

  // top comunas / oficios últimos 14 días
  function topDe(campo) {
    const m = {};
    presupuestos.filter(function (p) { return enRango(p, 14); }).forEach(function (p) { const k = (p[campo] || '—'); m[k] = (m[k] || 0) + 1; });
    return Object.keys(m).map(function (k) { return { k: k, n: m[k] }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 6);
  }
  const topComunas = topDe('comuna');
  const topOficios = topDe('oficio');

  const card = { background: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, border: '1.5px solid #eee' };
  const kpiCard = { background: '#fff', borderRadius: 14, padding: 14, border: '1.5px solid #eee' };

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>📈 Anuncios Ads</h2>
        <div style={{ fontSize: 13, color: '#7c8499', marginTop: 4 }}>
          Campaña <b>Clientes - Oriente</b>. Las impresiones, clics y costo viven en Google Ads (botones abajo). Aquí ves el <b>resultado real</b>: las solicitudes de presupuesto que llegan a la app.
        </div>
      </div>

      {/* Accesos directos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 16 }}>
        {ACCESOS.map(function (a, i) {
          return (
            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: 'none', color: 'inherit', display: 'block', background: '#fff', border: '1.5px solid #e6e8ef', borderRadius: 14, padding: '12px 14px', transition: 'box-shadow .15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>{a.icono}</span>
                <b style={{ fontSize: 14 }}>{a.t}</b>
                <span style={{ marginLeft: 'auto', color: '#2563eb', fontSize: 16 }}>↗</span>
              </div>
              <div style={{ fontSize: 11.5, color: '#9aa1b5', marginTop: 4 }}>{a.d}</div>
            </a>
          );
        })}
      </div>

      {/* KPIs propios */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 14 }}>
        <div style={kpiCard}><div style={{ fontSize: 12, color: '#7c8499' }}>Solicitudes hoy</div><div style={{ fontSize: 26, fontWeight: 800, color: '#2563eb' }}>{cargando ? '…' : solicHoy}</div></div>
        <div style={kpiCard}><div style={{ fontSize: 12, color: '#7c8499' }}>Últimos 7 días</div><div style={{ fontSize: 26, fontWeight: 800 }}>{cargando ? '…' : solic7}</div></div>
        <div style={kpiCard}><div style={{ fontSize: 12, color: '#7c8499' }}>Últimos 14 días</div><div style={{ fontSize: 26, fontWeight: 800 }}>{cargando ? '…' : solic14}</div></div>
        <div style={kpiCard}><div style={{ fontSize: 12, color: '#7c8499' }}>Promedio diario (14d)</div><div style={{ fontSize: 26, fontWeight: 800 }}>{cargando ? '…' : (Math.round(solic14 / 14 * 10) / 10)}</div></div>
      </div>

      {/* Gráfico solicitudes por día */}
      <div style={card}>
        <b style={{ fontSize: 14 }}>Solicitudes de presupuesto por día (últimos 14 días)</b>
        {cargando && <div style={{ fontSize: 12, color: '#9aa1b5', marginTop: 8 }}>Cargando…</div>}
        {!cargando && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 150, marginTop: 14 }}>
            {serie.map(function (s, i) {
              const h = Math.round(s.solic / maxSolic * 120);
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }} title={etiquetaDia(s.d) + ': ' + s.solic + ' solicitudes'}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: s.solic ? '#1c1f2b' : '#c8ccd8', marginBottom: 3 }}>{s.solic}</div>
                  <div style={{ width: '100%', maxWidth: 26, height: Math.max(3, h), background: i === serie.length - 1 ? '#2563eb' : '#9db8f5', borderRadius: '5px 5px 0 0' }} />
                  <div style={{ fontSize: 9.5, color: '#9aa1b5', marginTop: 4, whiteSpace: 'nowrap' }}>{s.d.getDate() + '/' + (s.d.getMonth() + 1)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top comunas / oficios */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        <div style={card}>
          <b style={{ fontSize: 14 }}>Top comunas (solicitudes 14d)</b>
          {!cargando && topComunas.length === 0 && <div style={{ fontSize: 12, color: '#9aa1b5', marginTop: 6 }}>Sin datos aún</div>}
          {topComunas.map(function (c, i) { return <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderTop: i ? '1px solid #f4f4f7' : 'none' }}><span style={{ textTransform: 'capitalize' }}>{c.k}</span><b>{c.n}</b></div>; })}
        </div>
        <div style={card}>
          <b style={{ fontSize: 14 }}>Top oficios (solicitudes 14d)</b>
          {!cargando && topOficios.length === 0 && <div style={{ fontSize: 12, color: '#9aa1b5', marginTop: 6 }}>Sin datos aún</div>}
          {topOficios.map(function (c, i) { return <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderTop: i ? '1px solid #f4f4f7' : 'none' }}><span style={{ textTransform: 'capitalize' }}>{c.k}</span><b>{c.n}</b></div>; })}
        </div>
      </div>

      <div style={{ fontSize: 11.5, color: '#9aa1b5', marginTop: 6, lineHeight: 1.5 }}>
        💡 Para decidir: cruza el <b>gasto y clics</b> de Google Ads (botón "Resumen") con las <b>solicitudes</b> de aquí. Si una comuna u oficio trae muchas solicitudes, súbele presupuesto; revisa "Términos de búsqueda" para sumar palabras clave negativas y dejar de pagar por búsquedas que no convierten.
      </div>
    </div>
  );
}
