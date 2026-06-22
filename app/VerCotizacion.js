'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Visor de la cotización REAL, abierto desde el chat (botón "Ver cotización").
// Carga la cotización de (presupuesto, maestro) y muestra el detalle.
// Para el CLIENTE incluye "Aceptar" (mismo flujo que Mis solicitudes: crea la
// reserva pagada, cierra el presupuesto y revela el contacto). Para el maestro
// es solo lectura de su propia cotización.
export default function VerCotizacion({ usuario, presupuestoId, maestroId, miRol, titulo, onClose }) {
  const [pres, setPres] = useState(null);
  const [cot, setCot] = useState(null);
  const [cargado, setCargado] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [aceptado, setAceptado] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(function () {
    var activo = true;
    (async function () {
      var rp = await supabase.from('presupuestos').select('id, titulo, oficio, descripcion, direccion, video_url, estado, es_consulta').eq('id', presupuestoId).maybeSingle();
      var rc = await supabase.from('cotizaciones').select('*').eq('presupuesto_id', presupuestoId).eq('maestro_id', maestroId).order('creado_en', { ascending: false }).limit(1);
      if (!activo) return;
      setPres(rp.data || null);
      setCot((rc.data && rc.data[0]) || null);
      if (rp.data && (rp.data.estado === 'cerrado' || rp.data.estado === 'agendado')) setAceptado(true);
      setCargado(true);
    })();
    return function () { activo = false; };
  }, [presupuestoId, maestroId]);

  function plata(n) { return '$' + (n || 0).toLocaleString('es-CL'); }
  function ofTit(p) { if (p && p.es_consulta) return 'Consulta'; return ((p && p.oficio) || 'servicio').charAt(0).toUpperCase() + ((p && p.oficio) || '').slice(1); }
  function tituloDe(p) { return (p && p.titulo && p.titulo.trim()) ? p.titulo : ofTit(p); }

  function aceptar() {
    if (!cot || !cot.monto) { setMsg('El maestro aún no puso un precio. Pídeselo en el chat.'); return; }
    setPagando(true); setMsg('Aceptando la cotización...');
    supabase.from('reservas').insert({
      cliente_id: usuario.id,
      maestro_id: maestroId,
      presupuesto_id: presupuestoId,
      descripcion_problema: pres ? pres.descripcion : null,
      direccion: pres ? pres.direccion : null,
      estado: 'pagado',
      precio_cotizado: cot.monto || null,
      link_video: pres ? (pres.video_url || null) : null,
    }).select().single().then(function (r) {
      if (r.error) { setMsg('Error: ' + r.error.message); setPagando(false); return; }
      supabase.from('presupuestos').update({ estado: 'cerrado' }).eq('id', presupuestoId).then(function () {});
      try { fetch('/api/notificar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'trabajo_pagado', reservaId: r.data.id, monto: cot.monto }) }); } catch (e) {}
      setPagando(false); setAceptado(true); setMsg(null);
    });
  }

  var d = cot && cot.detalle ? cot.detalle : null;
  var pantalla = { position: 'fixed', inset: 0, zIndex: 650, background: '#fff', display: 'flex', flexDirection: 'column' };
  var topbar = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px', paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))', borderBottom: '1px solid #eef0f5', background: '#fff', flexShrink: 0 };

  return (
    <div style={pantalla}>
      <div style={topbar}>
        <button onClick={onClose} style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: 26, fontWeight: 700, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>{'‹'}</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Cotización{titulo ? ' de ' + titulo : ''}</div>
          <div style={{ fontSize: 11, color: '#9aa1b5' }}>{tituloDe(pres)}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', background: '#f5f6fa' }}>
        {!cargado && <div style={{ padding: 24, fontSize: 13, color: '#9aa1b5', textAlign: 'center' }}>Cargando cotización…</div>}
        {cargado && !cot && <div style={{ padding: 24, fontSize: 13.5, color: '#9aa1b5', textAlign: 'center' }}>No encontramos la cotización.</div>}
        {cargado && cot && (
          <div style={{ padding: 14 }}>
            <div style={{ border: '2px solid #cbe0fb', borderRadius: 16, background: '#fff', padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#D85A30', letterSpacing: 0.4 }}>COTIZACIÓN</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e1f5ee', color: '#0f6e56', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{(titulo || 'M').charAt(0).toUpperCase()}</div>
                  <span style={{ fontSize: 15, fontWeight: 800 }}>{titulo || 'Maestro'}</span>
                </div>
                <span style={{ fontSize: 19, fontWeight: 800 }}>{plata(cot.monto)}</span>
              </div>

              <div style={{ background: '#f7f9fc', borderRadius: 12, padding: '11px 13px', marginTop: 12 }}>
                {d && d.items && d.items.length ? d.items.map(function (it, ix) {
                  return <div key={ix} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: ix < d.items.length - 1 ? '1px solid #eef0f5' : 'none' }}><span>{(it.tipo === 'mano_obra' ? '\u{1F6E0}️ ' : '\u{1F4E6} ') + it.desc}</span><span style={{ fontWeight: 700 }}>{plata(it.valor)}</span></div>;
                }) : null}
                {d && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#7c8499', marginTop: 8 }}><span>Neto</span><span>{plata(d.neto)}</span></div>}
                {d && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#7c8499' }}><span>IVA (19%)</span><span>{plata(d.iva)}</span></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid #e7eaf1', marginTop: 8, paddingTop: 8 }}><span style={{ fontSize: 13, fontWeight: 800 }}>Total</span><span style={{ fontSize: 20, fontWeight: 800 }}>{plata(cot.monto)}</span></div>
                <div style={{ fontSize: 10.5, color: '#9aa1b5', textAlign: 'right', marginTop: 2 }}>Todos los valores incluyen IVA</div>
              </div>

              {d && d.incluye && d.incluye.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 11 }}>{d.incluye.map(function (x) { return <span key={x} style={{ fontSize: 11, background: '#e1f5ee', color: '#0f6e56', borderRadius: 999, padding: '4px 9px' }}>{'✓ ' + x}</span>; })}</div>}
              {d && d.condiciones && <div style={{ fontSize: 11.5, color: '#7c8499', marginTop: 10, lineHeight: 1.4 }}>{'\u{1F4CB} ' + d.condiciones}</div>}
              {d && d.descripcion && <div style={{ fontSize: 12.5, color: '#5b6275', lineHeight: 1.5, marginTop: 10, whiteSpace: 'pre-wrap' }}>{d.descripcion}</div>}
              {!d && cot.mensaje && <div style={{ fontSize: 12.5, color: '#5b6275', lineHeight: 1.5, marginTop: 10, whiteSpace: 'pre-wrap' }}>{cot.mensaje}</div>}
            </div>

            {miRol === 'cliente' && !aceptado && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11.5, color: '#7c8499', marginBottom: 10 }}>{'\u{1F4C5}'} Al aceptar se revela el contacto del maestro y coordinan fecha y pago directamente.</div>
                {msg && <div style={{ fontSize: 12.5, color: msg.indexOf('Error') >= 0 ? '#b3261e' : '#5b6275', marginBottom: 8 }}>{msg}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={onClose} style={{ flex: 1, background: '#fff', color: '#2563eb', border: '1.5px solid #dbe7fb', borderRadius: 12, padding: 12, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>{'\u{1F4AC} Conversar'}</button>
                  <button className="gbtn" style={{ flex: 1.3, padding: 12, opacity: pagando ? 0.6 : 1 }} disabled={pagando} onClick={aceptar}>{pagando ? 'Aceptando…' : 'Aceptar'}</button>
                </div>
              </div>
            )}

            {aceptado && (
              <div style={{ marginTop: 14, background: '#e1f5ee', border: '1px solid #bfe6cf', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f6e56' }}>{'✓ Cotización aceptada'}</div>
                <div style={{ fontSize: 12, color: '#0f6e56', marginTop: 4, lineHeight: 1.5 }}>Coordina con el maestro en la pestaña "Pagadas". Ya puedes ver su contacto.</div>
              </div>
            )}

            {miRol === 'maestro' && !aceptado && (
              <div style={{ marginTop: 14, fontSize: 12, color: '#9aa1b5', textAlign: 'center' }}>Esta es la cotización que enviaste. El cliente la acepta desde su lado.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
