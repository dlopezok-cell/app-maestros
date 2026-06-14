'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import ChatCotizacion from './ChatCotizacion';

// Presupuesto por video: el cliente graba o sube un video del problema y lo manda
// a un maestro especifico o a todos los maestros del oficio. Recibe cotizaciones,
// puede chatear con cada maestro y agendar (crea una reserva con fecha).
const OFICIOS = ['gasfiteria', 'electricidad', 'cerrajeria', 'pintura', 'calefont', 'limpieza'];

export default function PresupuestoCliente({ usuario, maestros }) {
  const [oficio, setOficio] = useState('gasfiteria');
  const [descripcion, setDescripcion] = useState('');
  const [destino, setDestino] = useState('todos'); // 'todos' | 'uno'
  const [maestroSel, setMaestroSel] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [msg, setMsg] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [mensajesPorPres, setMensajesPorPres] = useState({});
  const [perfil, setPerfil] = useState(null);
  const [chatKey, setChatKey] = useState(null);
  const [agendaKey, setAgendaKey] = useState(null);
  const [agendaFecha, setAgendaFecha] = useState('');
  const fileRef = useRef(null);

  function cargarSolicitudes() {
    if (!usuario) return;
    supabase.from('presupuestos').select('*, cotizaciones(*)').eq('cliente_id', usuario.id).order('creado_en', { ascending: false })
      .then(function (r) {
        var data = r.data || [];
        setSolicitudes(data);
        var ids = data.map(function (s) { return s.id; });
        if (ids.length) {
          supabase.from('mensajes').select('presupuesto_id, maestro_id, autor_rol, leido').in('presupuesto_id', ids)
            .then(function (rm) {
              var byp = {}; (rm.data || []).forEach(function (m) { (byp[m.presupuesto_id] = byp[m.presupuesto_id] || []).push(m); });
              setMensajesPorPres(byp);
            });
        } else { setMensajesPorPres({}); }
      });
  }

  useEffect(function () {
    if (!usuario) return;
    supabase.from('perfiles').select('*').eq('id', usuario.id).maybeSingle()
      .then(function (r) { setPerfil(r.data || null); });
    cargarSolicitudes();
  }, [usuario]);

  function elegirArchivo(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) { setMsg('El video es muy pesado (máx 50MB). Graba uno más corto.'); return; }
    setArchivo(f);
    setMsg(null);
  }

  function enviar() {
    if (!usuario) { setMsg('Inicia sesión para pedir un presupuesto'); return; }
    if (!archivo) { setMsg('Graba o sube un video del problema'); return; }
    if (!descripcion.trim()) { setMsg('Cuéntanos brevemente qué necesitas'); return; }
    if (destino === 'uno' && !maestroSel) { setMsg('Elige un maestro'); return; }
    setSubiendo(true);
    setMsg('Subiendo video...');
    var ext = (archivo.name.split('.').pop() || 'mp4').toLowerCase();
    var path = usuario.id + '/' + Date.now() + '.' + ext;
    supabase.storage.from('presupuestos').upload(path, archivo, { contentType: archivo.type || 'video/mp4' })
      .then(function (up) {
        if (up.error) { setMsg('Error subiendo el video: ' + up.error.message); setSubiendo(false); return; }
        var url = supabase.storage.from('presupuestos').getPublicUrl(path).data.publicUrl;
        var fila = {
          cliente_id: usuario.id,
          oficio: oficio,
          descripcion: descripcion.trim(),
          video_url: url,
          maestro_id: destino === 'uno' ? maestroSel : null,
          comuna: perfil ? perfil.comuna : null,
          direccion: perfil ? perfil.direccion : null,
          lat: perfil ? perfil.lat : null,
          lng: perfil ? perfil.lng : null,
          estado: 'abierto',
        };
        supabase.from('presupuestos').insert(fila).then(function (r) {
          if (r.error) { setMsg('Error: ' + r.error.message); setSubiendo(false); return; }
          setMsg('¡Listo! Tu video fue enviado ✓');
          setDescripcion(''); setArchivo(null); if (fileRef.current) fileRef.current.value = '';
          setSubiendo(false);
          cargarSolicitudes();
        });
      });
  }

  function agendar(s, c) {
    if (!agendaFecha) { setMsg('Elige fecha y hora'); return; }
    var iso = new Date(agendaFecha).toISOString();
    supabase.from('reservas').insert({
      cliente_id: usuario.id,
      maestro_id: c.maestro_id,
      descripcion_problema: s.descripcion,
      direccion: s.direccion,
      fecha_hora: iso,
      estado: 'agendado',
      precio_cotizado: c.monto || null,
      link_video: s.video_url || null,
    }).then(function (r) {
      if (r.error) { setMsg('Error al agendar: ' + r.error.message); return; }
      supabase.from('presupuestos').update({ estado: 'cerrado' }).eq('id', s.id).then(function () {});
      setAgendaKey(null); setAgendaFecha('');
      setMsg('¡Agendado! El maestro lo verá en su agenda ✓');
      cargarSolicitudes();
    });
  }

  function nombreMaestro(id) {
    var m = (maestros || []).find(function (x) { return x.id === id; });
    return m ? m.nombre : 'Maestro';
  }
  function fecha(f) { return f ? new Date(f).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; }
  function plata(n) { return '$' + (n || 0).toLocaleString('es-CL'); }

  const inp = { width: '100%', padding: 12, border: '1.5px solid #ddd', borderRadius: 12, fontSize: 14, marginBottom: 10, background: '#fff' };
  const card = { background: '#fff', borderRadius: 18, padding: 16, marginBottom: 14, border: '1.5px solid #eee' };
  const maestrosOficio = (maestros || []).filter(function (m) { return m.oficio === oficio; });

  return (
    <div className="body" style={{ paddingTop: 18 }}>
      <div style={card}>
        <b style={{ fontSize: 15 }}>{'\u{1F3A5} Pide un presupuesto por video'}</b>
        <div style={{ fontSize: 12, color: '#7c8499', margin: '4px 0 12px' }}>Graba un video corto mostrando el problema. Un maestro lo revisa, te puede escribir para aclarar dudas y te manda un presupuesto.</div>

        <label style={{ fontSize: 12, fontWeight: 700, color: '#5b6275' }}>Tipo de servicio</label>
        <select value={oficio} onChange={function (e) { setOficio(e.target.value); setMaestroSel(''); }} style={{ ...inp, marginTop: 4 }}>
          {OFICIOS.map(function (o) { return <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>; })}
        </select>

        <label style={{ fontSize: 12, fontWeight: 700, color: '#5b6275' }}>¿Qué necesitas?</label>
        <textarea value={descripcion} onChange={function (e) { setDescripcion(e.target.value); }} placeholder="Ej: tengo una fuga bajo el lavaplatos, gotea cuando abro la llave..." rows={3} style={{ ...inp, marginTop: 4, resize: 'vertical' }} />

        <label style={{ fontSize: 12, fontWeight: 700, color: '#5b6275' }}>Video del problema</label>
        <input ref={fileRef} type="file" accept="video/*" capture="environment" onChange={elegirArchivo} style={{ ...inp, marginTop: 4, padding: 10 }} />
        {archivo && <div style={{ fontSize: 12, color: '#0d9456', marginBottom: 10 }}>{'✓ ' + archivo.name + ' (' + Math.round(archivo.size / 1024 / 1024 * 10) / 10 + ' MB)'}</div>}

        <label style={{ fontSize: 12, fontWeight: 700, color: '#5b6275' }}>¿A quién se lo mandamos?</label>
        <div style={{ display: 'flex', gap: 8, margin: '6px 0 10px' }}>
          <button onClick={function () { setDestino('todos'); }} style={{ flex: 1, padding: 11, borderRadius: 12, border: destino === 'todos' ? '2px solid #ff5a3c' : '1.5px solid #ddd', background: destino === 'todos' ? '#fff5f2' : '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: destino === 'todos' ? '#ff5a3c' : '#5b6275' }}>Todos los maestros del oficio</button>
          <button onClick={function () { setDestino('uno'); }} style={{ flex: 1, padding: 11, borderRadius: 12, border: destino === 'uno' ? '2px solid #ff5a3c' : '1.5px solid #ddd', background: destino === 'uno' ? '#fff5f2' : '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: destino === 'uno' ? '#ff5a3c' : '#5b6275' }}>Elegir un maestro</button>
        </div>
        {destino === 'uno' && (
          <select value={maestroSel} onChange={function (e) { setMaestroSel(e.target.value); }} style={inp}>
            <option value="">Selecciona un maestro...</option>
            {maestrosOficio.map(function (m) { return <option key={m.id} value={m.id}>{m.nombre + ' · ★ ' + m.rating}</option>; })}
          </select>
        )}
        {destino === 'uno' && maestrosOficio.length === 0 && <div style={{ fontSize: 12, color: '#9aa1b5', marginBottom: 10 }}>No hay maestros de este oficio cerca todavía. Puedes mandarlo a "todos".</div>}

        {msg && <p style={{ fontSize: 12, color: msg.indexOf('Error') >= 0 || msg.indexOf('pesado') >= 0 ? '#b3261e' : '#0d9456', margin: '4px 0' }}>{msg}</p>}
        <button className="gbtn full" style={{ opacity: subiendo ? 0.6 : 1 }} disabled={subiendo} onClick={enviar}>{subiendo ? 'Enviando...' : 'Enviar y pedir presupuesto'}</button>
      </div>

      <div style={card}>
        <b style={{ fontSize: 15 }}>{'\u{1F4CB} Mis cotizaciones'}</b>
        {solicitudes.length === 0 && <p style={{ fontSize: 13, color: '#9aa1b5', marginTop: 8 }}>Aún no has pedido presupuestos. Graba un video arriba y empieza.</p>}
        {solicitudes.map(function (s) {
          var cots = s.cotizaciones || [];
          var msgs = mensajesPorPres[s.id] || [];
          var maestroIds = [];
          cots.forEach(function (c) { if (maestroIds.indexOf(c.maestro_id) < 0) maestroIds.push(c.maestro_id); });
          msgs.forEach(function (m) { if (maestroIds.indexOf(m.maestro_id) < 0) maestroIds.push(m.maestro_id); });
          return (
            <div key={s.id} style={{ borderTop: '1px solid #f1f1f1', padding: '12px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ fontSize: 13 }}>{(s.oficio || 'servicio').charAt(0).toUpperCase() + (s.oficio || '').slice(1)}</b>
                <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 8, background: cots.length ? '#f2fbf6' : '#fff9f0', color: cots.length ? '#0d9456' : '#b07a1e', fontWeight: 800 }}>{s.estado === 'cerrado' ? 'AGENDADO' : (cots.length ? cots.length + ' COTIZACIÓN' + (cots.length > 1 ? 'ES' : '') : 'ESPERANDO')}</span>
              </div>
              <div style={{ fontSize: 12, color: '#7c8499', margin: '3px 0' }}>{s.descripcion}</div>
              <div style={{ fontSize: 11, color: '#9aa1b5' }}>{(s.maestro_id ? 'A ' + nombreMaestro(s.maestro_id) : 'Abierto a todos') + ' · ' + fecha(s.creado_en)}</div>
              {s.video_url && <video src={s.video_url} controls style={{ width: '100%', borderRadius: 12, marginTop: 8, background: '#000', maxHeight: 220 }} />}

              {maestroIds.map(function (mid) {
                var c = cots.find(function (x) { return x.maestro_id === mid; });
                var unread = msgs.filter(function (m) { return m.maestro_id === mid && m.autor_rol === 'maestro' && !m.leido; }).length;
                var ck = s.id + '|' + mid;
                return (
                  <div key={mid} style={{ background: '#f7f9fc', borderRadius: 12, padding: 11, marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <b style={{ fontSize: 13 }}>{nombreMaestro(mid)}</b>
                      {c && c.monto ? <b style={{ fontSize: 14, color: '#0d9456' }}>{plata(c.monto)}</b> : <span style={{ fontSize: 11, color: '#9aa1b5' }}>te escribió</span>}
                    </div>
                    {c && c.mensaje && <div style={{ fontSize: 12, color: '#5b6275', marginTop: 2 }}>{c.mensaje}</div>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={function () { setChatKey(chatKey === ck ? null : ck); }} style={{ flex: 1, background: chatKey === ck ? '#fff5f2' : '#fff', color: '#ff5a3c', border: '1.5px solid #ffd6cb', borderRadius: 10, padding: 9, fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>{'\u{1F4AC} Conversación' + (unread > 0 ? ' · ' + unread : '')}</button>
                      {c && s.estado !== 'cerrado' && <button onClick={function () { setAgendaKey(agendaKey === ck ? null : ck); setMsg(null); }} style={{ flex: 1, background: '#0d9456', color: '#fff', border: 'none', borderRadius: 10, padding: 9, fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>{'\u{1F4C5} Agendar'}</button>}
                    </div>
                    {chatKey === ck && <ChatCotizacion usuario={usuario} presupuestoId={s.id} maestroId={mid} miRol="cliente" />}
                    {agendaKey === ck && c && (
                      <div style={{ marginTop: 10, background: '#fff', border: '1px solid #eef0f5', borderRadius: 12, padding: 12 }}>
                        <div style={{ fontSize: 12, color: '#5b6275', marginBottom: 8 }}>Elige cuándo quieres que vaya {nombreMaestro(mid)}{c.monto ? ' (' + plata(c.monto) + ')' : ''}:</div>
                        <input type="datetime-local" value={agendaFecha} onChange={function (e) { setAgendaFecha(e.target.value); }} style={{ ...inp, marginBottom: 8 }} />
                        <button className="gbtn full" onClick={function () { agendar(s, c); }}>Confirmar agenda</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
