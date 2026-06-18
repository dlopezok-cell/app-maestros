'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Agenda del maestro: trabajos agendados/aceptados. Tres vistas: Lista, Mes, Semana.
// Cada trabajo muestra cliente + teléfono, dirección + mapa, servicio + fecha/hora, precio + estado.
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Colores por estado
function estadoColor(e) {
  var s = (e || '').toLowerCase();
  if (s === 'completado' || s === 'pagado') return { bg: '#e8f7ef', fg: '#0d9456' };
  if (s === 'en_camino' || s === 'confirmado' || s === 'agendado') return { bg: '#e9f1ff', fg: '#2b5fd0' };
  if (s === 'cancelado' || s === 'rechazado') return { bg: '#eef4ff', fg: '#b3261e' };
  return { bg: '#fff7ea', fg: '#b07a1e' }; // pendiente
}

export default function AgendaMaestro({ usuario }) {
  const [trabajos, setTrabajos] = useState([]);
  const [cargado, setCargado] = useState(false);
  const [vista, setVista] = useState('lista'); // 'lista' | 'mes' | 'semana'
  const [cursor, setCursor] = useState(new Date()); // mes/semana visible
  const [diaSel, setDiaSel] = useState(null); // 'YYYY-MM-DD' en vista mes

  useEffect(function () {
    if (!usuario) return;
    supabase.rpc('agenda_maestro').then(function (r) {
      setTrabajos(r.error ? [] : (r.data || []));
      setCargado(true);
    });
  }, [usuario]);

  function fechaDe(t) { return new Date(t.fecha_hora || t.creado_en); }
  function clave(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function plata(n) { return '$' + (n || 0).toLocaleString('es-CL'); }
  function hora(d) { return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }); }
  function soloFecha(d) { return d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3); }

  function tel(t) { return (t.cliente_telefono || '').replace(/[^0-9]/g, ''); }
  function wa(t) { var n = tel(t); if (!n) return null; if (n.length === 9 && n[0] === '9') n = '56' + n; return 'https://wa.me/' + n; }
  function mapa(t) { return t.direccion ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(t.direccion) : null; }

  // --- estilos ---
  const card = { background: '#fff', borderRadius: 16, padding: 14, margin: '0 0 12px', border: '1px solid #eef0f5' };
  const seg = function (on) { return { flex: 1, border: 'none', borderRadius: 9, padding: '8px 0', fontWeight: 800, fontSize: 13, cursor: 'pointer', background: on ? '#fff' : 'transparent', color: on ? '#3C3489' : '#8b8fa3', boxShadow: on ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }; };
  const navBtn = { background: '#fff', border: '1px solid #e4e4ef', borderRadius: 10, width: 34, height: 34, fontSize: 16, cursor: 'pointer', color: '#3C3489', fontWeight: 800 };

  function TarjetaTrabajo(props) {
    var t = props.t;
    var d = fechaDe(t);
    var c = estadoColor(t.estado);
    var m = mapa(t);
    return (
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: t.fecha_hora ? '#1c1f2b' : '#b07a1e' }}>{t.fecha_hora ? ('\u{1F4C5} ' + soloFecha(d) + ' · ' + hora(d)) : '\u{1F4C5} Fecha por coordinar'}</span>
          <span style={{ fontSize: 11, fontWeight: 800, background: c.bg, color: c.fg, borderRadius: 8, padding: '3px 9px' }}>{(t.estado || 'pendiente').toUpperCase()}</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#1c1f2b', marginBottom: 2 }}>{t.descripcion_problema || 'Trabajo'}</div>
        <div style={{ fontSize: 13, color: '#0d9456', fontWeight: 800, marginBottom: 8 }}>{plata(t.precio_cotizado)}</div>

        <div style={{ fontSize: 13, color: '#5b6275', marginBottom: 4 }}>{'\u{1F464} ' + (t.cliente_nombre || 'Cliente')}</div>
        {t.direccion && <div style={{ fontSize: 13, color: '#5b6275', marginBottom: 10 }}>{'\u{1F4CD} ' + t.direccion}</div>}
        {!t.pagado && <div style={{ fontSize: 12, color: '#8a5a00', background: '#fff7ea', border: '1px solid #dbe7fb', borderRadius: 10, padding: '8px 10px', marginBottom: 10, lineHeight: 1.4 }}>{'\u{1F512} La dirección y el teléfono del cliente se revelan cuando pague el trabajo.'}</div>}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {tel(t) && <a href={'tel:' + tel(t)} style={{ flex: 1, minWidth: 90, textAlign: 'center', textDecoration: 'none', background: '#fff', border: '1px solid #e4e4ef', borderRadius: 10, padding: '8px 0', fontSize: 12.5, fontWeight: 800, color: '#1c1f2b' }}>{'\u{1F4DE} Llamar'}</a>}
          {m && <a href={m} target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 90, textAlign: 'center', textDecoration: 'none', background: '#e9f1ff', border: '1px solid #c5dafa', borderRadius: 10, padding: '8px 0', fontSize: 12.5, fontWeight: 800, color: '#2b5fd0' }}>{'\u{1F5FA} Mapa'}</a>}
        </div>
      </div>
    );
  }

  function vacio(txt) {
    return <div style={{ ...card, textAlign: 'center', color: '#9aa1b5', fontSize: 13, padding: 22 }}>{txt}</div>;
  }

  // ---------- VISTA LISTA ----------
  function Lista() {
    var ord = trabajos.slice().sort(function (a, b) { return fechaDe(a) - fechaDe(b); });
    var futuros = ord.filter(function (t) { return fechaDe(t) >= new Date(new Date().setHours(0, 0, 0, 0)); });
    var lista = futuros.length ? futuros : ord; // si no hay futuros, muestra todos
    if (!lista.length) return vacio('No tienes trabajos agendados todavía. Cuando un cliente acepte tu cotización y agende, aparecerá aquí.');
    var grupos = {};
    lista.forEach(function (t) { var k = clave(fechaDe(t)); (grupos[k] = grupos[k] || []).push(t); });
    var hoyK = clave(new Date());
    var manK = clave(new Date(Date.now() + 86400000));
    return (
      <div>
        {Object.keys(grupos).sort().map(function (k) {
          var d = fechaDe(grupos[k][0]);
          var titulo = k === hoyK ? 'Hoy' : (k === manK ? 'Mañana' : (DIAS[(d.getDay() + 6) % 7] + ' ' + soloFecha(d)));
          return (
            <div key={k}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#7c8499', margin: '4px 0 8px', textTransform: 'uppercase', letterSpacing: .5 }}>{titulo}</div>
              {grupos[k].map(function (t) { return <TarjetaTrabajo key={t.id} t={t} />; })}
            </div>
          );
        })}
      </div>
    );
  }

  // ---------- VISTA MES ----------
  function Mes() {
    var y = cursor.getFullYear(), mo = cursor.getMonth();
    var primero = new Date(y, mo, 1);
    var offset = (primero.getDay() + 6) % 7; // lunes=0
    var diasMes = new Date(y, mo + 1, 0).getDate();
    var celdas = [];
    for (var i = 0; i < offset; i++) celdas.push(null);
    for (var dnum = 1; dnum <= diasMes; dnum++) celdas.push(new Date(y, mo, dnum));
    var porDia = {};
    trabajos.forEach(function (t) { var k = clave(fechaDe(t)); (porDia[k] = porDia[k] || []).push(t); });
    var hoyK = clave(new Date());
    var delDia = diaSel && porDia[diaSel] ? porDia[diaSel] : [];

    return (
      <div>
        <div style={{ ...card, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button style={navBtn} onClick={function () { setCursor(new Date(y, mo - 1, 1)); setDiaSel(null); }}>‹</button>
            <b style={{ fontSize: 14, textTransform: 'capitalize' }}>{MESES[mo] + ' ' + y}</b>
            <button style={navBtn} onClick={function () { setCursor(new Date(y, mo + 1, 1)); setDiaSel(null); }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 4 }}>
            {DIAS.map(function (d) { return <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 800, color: '#9aa1b5' }}>{d}</div>; })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
            {celdas.map(function (d, i) {
              if (!d) return <div key={'e' + i} />;
              var k = clave(d);
              var n = porDia[k] ? porDia[k].length : 0;
              var esHoy = k === hoyK, sel = k === diaSel;
              return (
                <button key={k} onClick={function () { setDiaSel(sel ? null : k); }}
                  style={{ aspectRatio: '1', border: sel ? '1.5px solid #7F77DD' : '1px solid #eef0f5', borderRadius: 9, background: esHoy ? '#EEEDFE' : '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: esHoy ? 800 : 600, color: '#1c1f2b' }}>{d.getDate()}</span>
                  {n > 0 && <span style={{ marginTop: 2, fontSize: 9, fontWeight: 800, color: '#fff', background: '#2563eb', borderRadius: 999, minWidth: 15, height: 15, lineHeight: '15px', padding: '0 3px' }}>{n}</span>}
                </button>
              );
            })}
          </div>
        </div>
        {diaSel
          ? (delDia.length ? delDia.map(function (t) { return <TarjetaTrabajo key={t.id} t={t} />; }) : vacio('No hay trabajos ese día.'))
          : <div style={{ textAlign: 'center', fontSize: 12, color: '#9aa1b5', padding: '4px 0' }}>Toca un día con trabajos para verlos.</div>}
      </div>
    );
  }

  // ---------- VISTA SEMANA ----------
  function Semana() {
    var base = new Date(cursor);
    var offset = (base.getDay() + 6) % 7;
    var lunes = new Date(base.getFullYear(), base.getMonth(), base.getDate() - offset);
    var dias = [];
    for (var i = 0; i < 7; i++) dias.push(new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i));
    var porDia = {};
    trabajos.forEach(function (t) { var k = clave(fechaDe(t)); (porDia[k] = porDia[k] || []).push(t); });
    var hoyK = clave(new Date());
    var domingo = dias[6];
    return (
      <div>
        <div style={{ ...card, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button style={navBtn} onClick={function () { setCursor(new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() - 7)); }}>‹</button>
          <b style={{ fontSize: 13 }}>{soloFecha(lunes) + ' — ' + soloFecha(domingo)}</b>
          <button style={navBtn} onClick={function () { setCursor(new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 7)); }}>›</button>
        </div>
        {dias.map(function (d) {
          var k = clave(d);
          var lst = porDia[k] || [];
          return (
            <div key={k} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: k === hoyK ? '#2563eb' : '#7c8499', margin: '0 0 6px' }}>{DIAS[(d.getDay() + 6) % 7] + ' ' + soloFecha(d) + (k === hoyK ? ' · hoy' : '')}</div>
              {lst.length ? lst.map(function (t) { return <TarjetaTrabajo key={t.id} t={t} />; })
                : <div style={{ fontSize: 12, color: '#c2c7d4', padding: '0 0 4px 2px' }}>Sin trabajos</div>}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="body" style={{ paddingTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px' }}>
        <span style={{ fontSize: 16 }}>{'\u{1F4C5}'}</span>
        <b style={{ fontSize: 16 }}>Mi agenda</b>
      </div>

      <div style={{ display: 'flex', background: '#f0eefb', borderRadius: 12, padding: 4, marginBottom: 14 }}>
        <button onClick={function () { setVista('lista'); }} style={seg(vista === 'lista')}>Lista</button>
        <button onClick={function () { setVista('mes'); }} style={seg(vista === 'mes')}>Mes</button>
        <button onClick={function () { setVista('semana'); }} style={seg(vista === 'semana')}>Semana</button>
      </div>

      {!cargado
        ? <div style={{ fontSize: 13, color: '#9aa1b5' }}>Cargando agenda...</div>
        : (vista === 'lista' ? <Lista /> : vista === 'mes' ? <Mes /> : <Semana />)}
    </div>
  );
}
