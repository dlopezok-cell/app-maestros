'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import ChatCotizacion from './ChatCotizacion';
import MediaCarrusel from './MediaCarrusel';

var MAX_ARCHIVOS = 6;

// Presupuesto por video: el cliente graba o sube un video del problema y lo manda
// a un maestro especifico o a todos los maestros del oficio. Recibe cotizaciones,
// puede chatear con cada maestro y agendar. Al agendar se crea la reserva y se
// redirige a Mercado Pago para pagar el monto cotizado (el webhook confirma).
export default function PresupuestoCliente({ usuario, maestros, modo }) {
  var soloCrear = modo !== 'lista';
  var soloLista = modo === 'lista';
  const [cats, setCats] = useState([]); // especialidades del catálogo (admin)
  const [oficio, setOficio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [maestroSel, setMaestroSel] = useState('');
  const [archivos, setArchivos] = useState([]); // { file, tipo:'video'|'foto', url(preview) }
  const [subiendo, setSubiendo] = useState(false);
  const [msg, setMsg] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [mensajesPorPres, setMensajesPorPres] = useState({});
  const [perfil, setPerfil] = useState(null);
  const [chatKey, setChatKey] = useState(null);
  const [agendaKey, setAgendaKey] = useState(null);
  const [agendaFecha, setAgendaFecha] = useState('');
  const [pagando, setPagando] = useState(false);
  const [reservas, setReservas] = useState([]);
  const [resenas, setResenas] = useState([]);
  const [revStars, setRevStars] = useState({});
  const [revText, setRevText] = useState({});
  const [confirmando, setConfirmando] = useState(null);
  const grabarRef = useRef(null);
  const subirRef = useRef(null);

  function cargarReservas() {
    if (!usuario) return;
    supabase.rpc('mis_reservas').then(function (r) { setReservas(r.error ? [] : (r.data || [])); });
  }

  function confirmarTrabajo(reservaId) {
    setConfirmando(reservaId);
    supabase.rpc('confirmar_trabajo', { p_reserva_id: reservaId }).then(function (r) {
      setConfirmando(null);
      if (r.error) { setMsg('Error al confirmar: ' + r.error.message); return; }
      setMsg('¡Gracias! Confirmaste el trabajo. Liberaremos el pago al maestro. ✓');
      cargarReservas();
    });
  }

  useEffect(function () {
    supabase.from('catalogos').select('valor, slug').eq('tipo', 'especialidad').eq('activo', true).order('orden', { ascending: true })
      .then(function (r) {
        var data = r.data || [];
        setCats(data);
        if (data.length) setOficio(function (prev) { return prev || data[0].slug; });
      });
  }, []);

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
    cargarReservas();
    supabase.from('resenas').select('maestro_id').eq('cliente_id', usuario.id)
      .then(function (r) { setResenas(r.data || []); });
    cargarSolicitudes();
  }, [usuario]);

  function enviarResena(maestroId) {
    var est = revStars[maestroId] || 0;
    if (!est) { setMsg('Elige cuántas estrellas'); return; }
    supabase.from('resenas').insert({ cliente_id: usuario.id, maestro_id: maestroId, estrellas: est, comentario: (revText[maestroId] || '').trim() || null })
      .then(function (r) {
        if (r.error) { setMsg('Error: ' + r.error.message); return; }
        setResenas(function (p) { return p.concat([{ maestro_id: maestroId }]); });
        setMsg('¡Gracias por tu reseña! ✓');
      });
  }

  function agregarArchivos(e) {
    var fl = e.target.files ? Array.prototype.slice.call(e.target.files) : [];
    e.target.value = '';
    if (!fl.length) return;
    var nuevos = [];
    var actual = archivos.length;
    for (var k = 0; k < fl.length; k++) {
      var f = fl[k];
      var esVideo = (f.type || '').indexOf('video') === 0;
      if (esVideo && f.size > 50 * 1024 * 1024) { setMsg('Un video supera los 50MB. Graba o elige uno más corto.'); continue; }
      if (actual + nuevos.length >= MAX_ARCHIVOS) { setMsg('Máximo ' + MAX_ARCHIVOS + ' archivos.'); break; }
      nuevos.push({ file: f, tipo: esVideo ? 'video' : 'foto', url: URL.createObjectURL(f) });
    }
    if (nuevos.length) { setArchivos(function (p) { return p.concat(nuevos); }); setMsg(null); }
  }

  function quitarArchivo(i) {
    setArchivos(function (p) { return p.filter(function (x, k) { return k !== i; }); });
  }

  function enviar() {
    if (!usuario) { setMsg('Inicia sesión para pedir un presupuesto'); return; }
    if (!archivos.length) { setMsg('Agrega al menos un video o foto del problema'); return; }
    if (!descripcion.trim()) { setMsg('Cuéntanos brevemente qué necesitas'); return; }
    setSubiendo(true);
    setMsg('Subiendo archivos...');

    var subidas = archivos.map(function (a, i) {
      var ext = (a.file.name.split('.').pop() || (a.tipo === 'video' ? 'mp4' : 'jpg')).toLowerCase();
      var path = usuario.id + '/' + Date.now() + '_' + i + '.' + ext;
      return supabase.storage.from('presupuestos').upload(path, a.file, { contentType: a.file.type || (a.tipo === 'video' ? 'video/mp4' : 'image/jpeg') })
        .then(function (up) {
          if (up.error) return null;
          var url = supabase.storage.from('presupuestos').getPublicUrl(path).data.publicUrl;
          return { url: url, tipo: a.tipo };
        });
    });

    Promise.all(subidas).then(function (res) {
      var media = res.filter(function (x) { return x; });
      if (!media.length) { setMsg('No se pudieron subir los archivos. Intenta de nuevo.'); setSubiendo(false); return; }
      var primerVideo = media.filter(function (x) { return x.tipo === 'video'; })[0];
      var fila = {
        cliente_id: usuario.id,
        oficio: oficio,
        descripcion: descripcion.trim(),
        video_url: primerVideo ? primerVideo.url : (media[0] ? media[0].url : null),
        archivos: media,
        maestro_id: null,
        comuna: perfil ? perfil.comuna : null,
        direccion: perfil ? perfil.direccion : null,
        lat: perfil ? perfil.lat : null,
        lng: perfil ? perfil.lng : null,
        estado: 'abierto',
      };
      supabase.from('presupuestos').insert(fila).select().single().then(function (r) {
        if (r.error) { setMsg('Error: ' + r.error.message); setSubiendo(false); return; }
        setMsg('¡Listo! Tu solicitud fue enviada ✓');
        setDescripcion(''); setArchivos([]);
        setSubiendo(false);
        cargarSolicitudes();
      });
    });
  }

  // Agendar = crear la reserva y pasar a pagar el monto cotizado en Mercado Pago.
  function agendar(s, c) {
    if (!agendaFecha) { setMsg('Elige fecha y hora'); return; }
    if (!c.monto) { setMsg('Este maestro aún no puso un precio. Pídele en el chat que cotice un monto antes de agendar.'); return; }
    setPagando(true);
    setMsg('Creando tu reserva...');
    var iso = new Date(agendaFecha).toISOString();
    supabase.from('reservas').insert({
      cliente_id: usuario.id,
      maestro_id: c.maestro_id,
      descripcion_problema: s.descripcion,
      direccion: s.direccion,
      fecha_hora: iso,
      estado: 'pendiente_pago',
      precio_cotizado: c.monto || null,
      link_video: s.video_url || null,
    }).select().single().then(function (r) {
      if (r.error) { setMsg('Error al agendar: ' + r.error.message); setPagando(false); return; }
      var reservaId = r.data.id;
      supabase.from('presupuestos').update({ estado: 'cerrado' }).eq('id', s.id).then(function () {});
      setMsg('Redirigiendo al pago seguro...');
      fetch('/api/pagar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto: c.monto, tipo: 'trabajo', descripcion: (s.oficio || 'servicio') + ' con ' + nombreMaestro(c.maestro_id), reservaId: reservaId, maestroId: c.maestro_id, email: usuario.email })
      }).then(function (rp) { return rp.json(); }).then(function (d) {
        if (d && d.init_point) { window.location.href = d.init_point; }
        else { setPagando(false); setMsg('No se pudo iniciar el pago: ' + ((d && d.error) || 'intenta de nuevo') + '. Tu reserva quedó como pendiente de pago.'); cargarSolicitudes(); }
      }).catch(function () { setPagando(false); setMsg('No se pudo conectar con el pago. Tu reserva quedó pendiente.'); cargarSolicitudes(); });
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
  var yaResenados = {}; resenas.forEach(function (x) { yaResenados[x.maestro_id] = true; });
  var porCalificar = [];
  reservas.forEach(function (rv) { if (rv.maestro_id && (rv.trabajo_confirmado || rv.liberado) && !yaResenados[rv.maestro_id] && porCalificar.indexOf(rv.maestro_id) < 0) porCalificar.push(rv.maestro_id); });
  var agendados = reservas.filter(function (rv) { var s = (rv.estado || '').toLowerCase(); return s !== 'pendiente_pago'; });

  return (
    <div className="body" style={{ paddingTop: 18 }}>
      {soloCrear && (
      <div style={card}>
        <b style={{ fontSize: 15 }}>{'\u{1F3A5} Pide un presupuesto por video'}</b>
        <div style={{ fontSize: 12, color: '#7c8499', margin: '4px 0 12px' }}>Graba un video corto mostrando el problema. Un maestro lo revisa, te puede escribir para aclarar dudas y te manda un presupuesto.</div>
        <div style={{ background: '#eef3fd', border: '1px solid #d4e0f7', borderRadius: 12, padding: '10px 12px', fontSize: 12, color: '#2b4a86', lineHeight: 1.45, marginBottom: 12 }}>{'\u{1F4A1}'} Aquí <b>creas</b> una cotización nueva. Para ver las que ya enviaste y chatear con los maestros, entra a <b>Mis cotizaciones</b>.</div>

        <label style={{ fontSize: 12, fontWeight: 700, color: '#5b6275' }}>Especialidad</label>
        <select value={oficio} onChange={function (e) { setOficio(e.target.value); setMaestroSel(''); }} style={{ ...inp, marginTop: 4 }}>
          {cats.map(function (c) { return <option key={c.slug} value={c.slug}>{c.valor}</option>; })}
        </select>

        <label style={{ fontSize: 12, fontWeight: 700, color: '#5b6275' }}>¿Qué necesitas?</label>
        <textarea value={descripcion} onChange={function (e) { setDescripcion(e.target.value); }} placeholder="Ej: tengo una fuga bajo el lavaplatos, gotea cuando abro la llave..." rows={3} style={{ ...inp, marginTop: 4, resize: 'vertical' }} />

        <label style={{ fontSize: 12, fontWeight: 700, color: '#5b6275' }}>{'\u{1F4F7} Fotos y video del problema'}</label>
        <div style={{ fontSize: 11.5, color: '#9aa1b5', margin: '3px 0 8px', lineHeight: 1.4 }}>Graba un video al momento, o sube archivos de tu galería (videos y fotos juntos). Hasta {MAX_ARCHIVOS}.</div>
        <input ref={grabarRef} type="file" accept="video/*" capture="environment" onChange={agregarArchivos} style={{ display: 'none' }} />
        <input ref={subirRef} type="file" accept="video/*,image/*" multiple onChange={agregarArchivos} style={{ display: 'none' }} />
        <div style={{ display: 'flex', gap: 8, marginBottom: archivos.length ? 10 : 4 }}>
          <button type="button" onClick={function () { if (grabarRef.current) grabarRef.current.click(); }} style={{ flex: 1, border: '1.5px dashed #cbd0dd', background: '#fafbfe', borderRadius: 12, padding: '12px 6px', textAlign: 'center', cursor: 'pointer', color: '#5b6275', fontWeight: 700, fontSize: 12 }}>{'\u{1F3A5}'}<br />Grabar video</button>
          <button type="button" onClick={function () { if (subirRef.current) subirRef.current.click(); }} style={{ flex: 1, border: '1.5px dashed #cbd0dd', background: '#fafbfe', borderRadius: 12, padding: '12px 6px', textAlign: 'center', cursor: 'pointer', color: '#5b6275', fontWeight: 700, fontSize: 12 }}>{'\u{1F4CE}'}<br />Subir archivos<br /><span style={{ fontWeight: 600, color: '#9aa1b5', fontSize: 10.5 }}>(videos y fotos)</span></button>
        </div>
        {archivos.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
            {archivos.map(function (a, i) {
              return (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '1px solid #eee', background: '#000' }}>
                  {a.tipo === 'video'
                    ? <video src={a.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                    : <img src={a.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  {a.tipo === 'video' && <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', fontSize: 18, textShadow: '0 1px 3px rgba(0,0,0,.6)' }}>{'▶'}</span>}
                  <button type="button" onClick={function () { quitarArchivo(i); }} style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,.6)', color: '#fff', border: 'none', fontSize: 11, cursor: 'pointer' }}>{'✕'}</button>
                  <span style={{ position: 'absolute', bottom: 3, left: 3, background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 8.5, fontWeight: 700, borderRadius: 5, padding: '1px 5px' }}>{a.tipo === 'video' ? 'VIDEO' : 'FOTO'}</span>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ fontSize: 11.5, color: '#5b6275', background: '#f7f9fc', border: '1px solid #eef0f5', borderRadius: 10, padding: '9px 11px', margin: '4px 0 10px', lineHeight: 1.45 }}>{'\u{1F4E2}'} Tu solicitud se enviará a todos los maestros de <b>{cats.filter(function (c) { return c.slug === oficio; }).map(function (c) { return c.valor; })[0] || 'la especialidad'}</b>. Te llegarán varias cotizaciones para que elijas.</div>

        {msg && <p style={{ fontSize: 12, color: msg.indexOf('Error') >= 0 || msg.indexOf('pesado') >= 0 || msg.indexOf('No se pudo') >= 0 ? '#b3261e' : '#0d9456', margin: '4px 0' }}>{msg}</p>}
        <button className="gbtn full" style={{ opacity: subiendo ? 0.6 : 1 }} disabled={subiendo} onClick={enviar}>{subiendo ? 'Enviando...' : 'Enviar y pedir presupuesto'}</button>
      </div>
      )}

      {soloLista && porCalificar.length > 0 && (
        <div style={card}>
          <b style={{ fontSize: 15 }}>{'⭐ Califica a tus maestros'}</b>
          <div style={{ fontSize: 12, color: '#7c8499', margin: '4px 0 6px' }}>Tu opinión ayuda a otros clientes a elegir bien.</div>
          {porCalificar.map(function (mid) {
            return (
              <div key={mid} style={{ borderTop: '1px solid #f1f1f1', padding: '10px 0' }}>
                <b style={{ fontSize: 13 }}>{nombreMaestro(mid)}</b>
                <div style={{ fontSize: 26, margin: '4px 0', letterSpacing: 3 }}>
                  {[1, 2, 3, 4, 5].map(function (n) {
                    return <span key={n} onClick={function () { setRevStars(function (p) { var o = Object.assign({}, p); o[mid] = n; return o; }); }} style={{ cursor: 'pointer', color: (revStars[mid] || 0) >= n ? '#f5a623' : '#ddd' }}>★</span>;
                  })}
                </div>
                <textarea value={revText[mid] || ''} onChange={function (e) { var v = e.target.value; setRevText(function (p) { var o = Object.assign({}, p); o[mid] = v; return o; }); }} placeholder="¿Cómo fue el trabajo? (opcional)" rows={2} style={{ ...inp, resize: 'vertical' }} />
                <button className="gbtn full" onClick={function () { enviarResena(mid); }}>Enviar reseña</button>
              </div>
            );
          })}
        </div>
      )}

      {soloLista && agendados.length > 0 && (
        <div style={card}>
          <b style={{ fontSize: 15 }}>{'\u{1F6E0}️ Mis trabajos agendados'}</b>
          <div style={{ fontSize: 12, color: '#7c8499', margin: '4px 0 6px' }}>Cuando el maestro termine, confirma para liberar el pago.</div>
          {agendados.map(function (rv) {
            var s = (rv.estado || '').toLowerCase();
            var pagado = s === 'pagado' || s === 'retenido';
            var puedeConfirmar = pagado && !rv.trabajo_confirmado && !rv.liberado;
            var enRevision = rv.trabajo_confirmado && !rv.liberado;
            var completo = rv.liberado || s === 'completado';
            return (
              <div key={rv.id} style={{ borderTop: '1px solid #f1f1f1', padding: '12px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b style={{ fontSize: 13 }}>{rv.maestro_nombre || nombreMaestro(rv.maestro_id)}</b>
                  <b style={{ fontSize: 14, color: '#1c1f2b' }}>{plata(rv.precio)}</b>
                </div>
                <div style={{ fontSize: 12, color: '#7c8499', margin: '3px 0' }}>{rv.descripcion}</div>
                <div style={{ fontSize: 11, color: '#9aa1b5' }}>{fecha(rv.fecha_hora)}</div>
                {s === 'pendiente_pago' && <div style={{ fontSize: 11.5, color: '#b07a1e', fontWeight: 700, marginTop: 6 }}>Pendiente de pago</div>}
                {puedeConfirmar && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11.5, color: '#2b4a86', background: '#eef3fd', border: '1px solid #d4e0f7', borderRadius: 10, padding: '8px 10px', marginBottom: 8 }}>{'\u{1F512}'} Tu pago de {plata(rv.precio)} está protegido. Se libera al maestro solo cuando confirmes que el trabajo quedó listo.</div>
                    <button className="gbtn full" style={{ opacity: confirmando === rv.id ? 0.6 : 1 }} disabled={confirmando === rv.id} onClick={function () { confirmarTrabajo(rv.id); }}>{confirmando === rv.id ? 'Confirmando...' : '✓ Confirmar trabajo terminado'}</button>
                  </div>
                )}
                {enRevision && <div style={{ fontSize: 11.5, color: '#0d9456', fontWeight: 700, marginTop: 6 }}>{'✓'} Confirmado. Liberando el pago al maestro.</div>}
                {completo && <div style={{ fontSize: 11.5, color: '#0d9456', fontWeight: 700, marginTop: 6 }}>{'✓'} Trabajo completado</div>}
              </div>
            );
          })}
        </div>
      )}

      {soloLista && (
      <div style={card}>
        <b style={{ fontSize: 15 }}>{'\u{1F4CB} Mis cotizaciones'}</b>
        {solicitudes.length === 0 && <p style={{ fontSize: 13, color: '#9aa1b5', marginTop: 8 }}>Aún no has enviado cotizaciones. Anda a la pestaña <b>Cotizar</b> y graba un video para empezar.</p>}
        {solicitudes.map(function (s) {
          var cots = s.cotizaciones || [];
          var msgs = mensajesPorPres[s.id] || [];
          var maestroIds = [];
          cots.forEach(function (c) { if (maestroIds.indexOf(c.maestro_id) < 0) maestroIds.push(c.maestro_id); });
          msgs.forEach(function (m) { if (maestroIds.indexOf(m.maestro_id) < 0) maestroIds.push(m.maestro_id); });
          var cerrado = s.estado === 'cerrado';
          return (
            <div key={s.id} style={{ borderTop: '1px solid #f1f1f1', padding: '12px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ fontSize: 13 }}>{(s.oficio || 'servicio').charAt(0).toUpperCase() + (s.oficio || '').slice(1)}</b>
                <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 8, background: cots.length ? '#f2fbf6' : '#fff9f0', color: cots.length ? '#0d9456' : '#b07a1e', fontWeight: 800 }}>{cerrado ? 'AGENDADO' : (cots.length ? cots.length + ' COTIZACIÓN' + (cots.length > 1 ? 'ES' : '') : 'ESPERANDO')}</span>
              </div>
              <div style={{ fontSize: 12, color: '#7c8499', margin: '3px 0' }}>{s.descripcion}</div>
              <div style={{ fontSize: 11, color: '#9aa1b5' }}>{(s.maestro_id ? 'A ' + nombreMaestro(s.maestro_id) : 'Abierto a todos') + ' · ' + fecha(s.creado_en)}</div>
              <MediaCarrusel items={(s.archivos && s.archivos.length) ? s.archivos : (s.video_url ? [{ url: s.video_url, tipo: 'video' }] : [])} alto={220} />

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
                      {c && !cerrado && <button onClick={function () { setAgendaKey(agendaKey === ck ? null : ck); setMsg(null); }} style={{ flex: 1, background: '#0d9456', color: '#fff', border: 'none', borderRadius: 10, padding: 9, fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>{'\u{1F4C5} Agendar y pagar'}</button>}
                    </div>
                    {chatKey === ck && <ChatCotizacion usuario={usuario} presupuestoId={s.id} maestroId={mid} miRol="cliente" titulo={nombreMaestro(mid)} />}
                    {agendaKey === ck && c && (
                      <div style={{ marginTop: 10, background: '#fff', border: '1px solid #eef0f5', borderRadius: 12, padding: 12 }}>
                        <div style={{ fontSize: 12, color: '#5b6275', marginBottom: 8 }}>Elige cuándo quieres que vaya {nombreMaestro(mid)}{c.monto ? ' (' + plata(c.monto) + ')' : ''}:</div>
                        <input type="datetime-local" value={agendaFecha} onChange={function (e) { setAgendaFecha(e.target.value); }} style={{ ...inp, marginBottom: 8 }} />
                        <button className="gbtn full" style={{ opacity: pagando ? 0.6 : 1 }} disabled={pagando} onClick={function () { agendar(s, c); }}>{pagando ? 'Procesando...' : (c.monto ? 'Agendar y pagar ' + plata(c.monto) : 'Agendar')}</button>
                        <div style={{ fontSize: 10.5, color: '#9aa1b5', marginTop: 6, textAlign: 'center' }}>Pago seguro con Mercado Pago. Tu dinero queda protegido hasta confirmar el trabajo.</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
