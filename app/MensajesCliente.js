'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import ChatCotizacion from './ChatCotizacion';
import SoporteCliente from './SoporteCliente';

// Bandeja de mensajes del CLIENTE (estilo WhatsApp). Lista las conversaciones
// (un hilo = presupuesto + maestro) con el último mensaje y los no leídos,
// y abre el chat existente (ChatCotizacion) al tocar una.
// Arriba, fijo, el contacto "Soporte MaestrosEnLínea".

function cuando(iso) {
  if (!iso) return '';
  var d = new Date(iso), now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  var ayer = new Date(now); ayer.setDate(now.getDate() - 1);
  if (d.toDateString() === ayer.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
}

function preview(m) {
  if (m.texto && m.texto.trim()) return m.texto.trim();
  var t = (m.media_tipo || '').toLowerCase();
  if (t.indexOf('imag') >= 0 || t.indexOf('image') >= 0 || t.indexOf('foto') >= 0) return '\u{1F4F7} Foto';
  if (t.indexOf('video') >= 0) return '\u{1F3AC} Video';
  if (t.indexOf('audio') >= 0) return '\u{1F3A4} Audio';
  return '\u{1F4CE} Archivo';
}

function FilaSoporte({ onClick, noLeidos }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #eef1f7', background: '#f3f8ff' }}>
      <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg,#22d3ee,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 14.5, color: '#0b1426' }}>Soporte MaestrosEnLínea <span style={{ fontSize: 11 }}>📌</span></span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 3 }}>
          <span style={{ fontSize: 12.5, color: '#5b6275', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>Equipo de ayuda · escríbenos cualquier duda</span>
          {noLeidos > 0 && <span style={{ flex: 'none', background: '#2563eb', color: '#fff', fontSize: 11, fontWeight: 800, borderRadius: 999, minWidth: 20, height: 20, lineHeight: '20px', textAlign: 'center', padding: '0 6px', boxSizing: 'border-box' }}>{noLeidos > 9 ? '9+' : noLeidos}</span>}
        </div>
      </div>
    </div>
  );
}

export default function MensajesCliente({ usuario, maestros }) {
  const [hilos, setHilos] = useState([]);
  const [info, setInfo] = useState({});
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(null);
  const [soporte, setSoporte] = useState(false);
  const [soporteNL, setSoporteNL] = useState(0);
  const [refresh, setRefresh] = useState(0);

  useEffect(function () {
    if (!usuario) return;
    supabase.from('mensajes_soporte').select('id', { count: 'exact', head: true })
      .eq('cliente_id', usuario.id).eq('autor', 'admin').eq('leido', false)
      .then(function (r) { setSoporteNL(r.count || 0); });
  }, [usuario, soporte, refresh]);

  useEffect(function () {
    if (!usuario) return;
    var activo = true;
    (async function () {
      setCargando(true);
      var pres = await supabase.from('presupuestos').select('id, titulo').eq('cliente_id', usuario.id);
      var lista = pres.data || [];
      var ids = lista.map(function (p) { return p.id; });
      var tit = {}; lista.forEach(function (p) { tit[p.id] = p.titulo || ''; });
      if (!ids.length) { if (activo) { setHilos([]); setCargando(false); } return; }

      var msgs = await supabase.from('mensajes')
        .select('presupuesto_id, maestro_id, autor_rol, texto, media_tipo, leido, creado_en')
        .in('presupuesto_id', ids)
        .order('creado_en', { ascending: false });
      var data = msgs.data || [];

      var map = {};
      data.forEach(function (m) {
        var k = m.presupuesto_id + '|' + m.maestro_id;
        if (!map[k]) map[k] = { presupuestoId: m.presupuesto_id, maestroId: m.maestro_id, titulo: tit[m.presupuesto_id] || '', last: m, unread: 0 };
        if (m.autor_rol !== 'cliente' && !m.leido) map[k].unread++;
      });
      var arr = Object.keys(map).map(function (k) { return map[k]; });
      arr.sort(function (a, b) { return new Date(b.last.creado_en) - new Date(a.last.creado_en); });

      var nombres = {};
      (maestros || []).forEach(function (m) { nombres[m.id] = { nombre: m.nombre || 'Maestro', foto: m.foto_url || null }; });
      var faltan = arr.map(function (h) { return h.maestroId; }).filter(function (id, i, s) { return s.indexOf(id) === i && !nombres[id]; });
      if (faltan.length) {
        var mm = await supabase.from('maestros').select('id, nombre, foto_url').in('id', faltan);
        (mm.data || []).forEach(function (m) { nombres[m.id] = { nombre: m.nombre || 'Maestro', foto: m.foto_url || null }; });
      }

      if (activo) { setInfo(nombres); setHilos(arr); setCargando(false); }
    })();
    return function () { activo = false; };
  }, [usuario, refresh]);

  function abrir(h) {
    var nom = (info[h.maestroId] && info[h.maestroId].nombre) || 'Maestro';
    setAbierto({ presupuestoId: h.presupuestoId, maestroId: h.maestroId, titulo: nom });
  }
  function cerrar() { setAbierto(null); setRefresh(function (n) { return n + 1; }); }

  return (
    <div>
      <FilaSoporte onClick={function () { setSoporte(true); }} noLeidos={soporteNL} />

      {cargando && <div style={{ padding: '24px 16px', color: '#9aa1b5', fontSize: 13 }}>Cargando conversaciones…</div>}

      {!cargando && hilos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 30px', color: '#9aa1b5' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>{'\u{1F4AC}'}</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#5b6275' }}>Aún no tienes conversaciones con maestros</div>
          <div style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.5 }}>Cuando converses con un maestro desde tus cotizaciones, tus chats aparecerán aquí. Para cualquier duda, escríbenos a Soporte arriba.</div>
        </div>
      )}

      {!cargando && hilos.map(function (h) {
        var d = info[h.maestroId] || { nombre: 'Maestro', foto: null };
        var prefijo = h.last.autor_rol === 'cliente' ? 'Tú: ' : '';
        return (
          <div key={h.presupuestoId + '|' + h.maestroId} onClick={function () { abrir(h); }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #eef1f7', background: '#fff' }}>
            {d.foto
              ? <img src={d.foto} alt="" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', flex: 'none' }} />
              : <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg,#e7f0fb,#dbe7fb)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, flex: 'none' }}>{d.nombre.charAt(0).toUpperCase()}</div>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 14.5, color: '#0b1426', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nombre}</span>
                <span style={{ fontSize: 11, color: h.unread > 0 ? '#2563eb' : '#9aa1b5', fontWeight: h.unread > 0 ? 800 : 400, flex: 'none' }}>{cuando(h.last.creado_en)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 3 }}>
                <span style={{ fontSize: 12.5, color: h.unread > 0 ? '#0b1426' : '#7c8499', fontWeight: h.unread > 0 ? 700 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{prefijo}{preview(h.last)}</span>
                {h.unread > 0 && <span style={{ flex: 'none', background: '#2563eb', color: '#fff', fontSize: 11, fontWeight: 800, borderRadius: 999, minWidth: 20, height: 20, lineHeight: '20px', textAlign: 'center', padding: '0 6px', boxSizing: 'border-box' }}>{h.unread > 9 ? '9+' : h.unread}</span>}
              </div>
              {h.titulo && <div style={{ fontSize: 11, color: '#aeb6c5', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{'\u{1F4CB} ' + h.titulo}</div>}
            </div>
          </div>
        );
      })}

      {abierto && <ChatCotizacion usuario={usuario} presupuestoId={abierto.presupuestoId} maestroId={abierto.maestroId} miRol="cliente" titulo={abierto.titulo} onClose={cerrar} />}

      {soporte && (
        <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 400, display: 'flex', flexDirection: 'column' }}>
          <SoporteCliente usuario={usuario} onBack={function () { setSoporte(false); setRefresh(function (n) { return n + 1; }); }} />
        </div>
      )}
    </div>
  );
}
