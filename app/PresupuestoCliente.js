'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import ChatCotizacion from './ChatCotizacion';
import MediaCarrusel from './MediaCarrusel';
import { subirACloudinary, LIMITES } from '../lib/cloudinary';

var MAX_ARCHIVOS = 6;

// Presupuesto por video: el cliente graba/sube un video del problema y lo manda a
// los maestros del oficio. Recibe cotizaciones, las compara como hojas claras,
// ACEPTA Y PAGA una (sin fecha). La fecha se coordina después por la app/WhatsApp.
export default function PresupuestoCliente({ usuario, maestros, modo, descripcionInicial }) {
  var soloCrear = modo !== 'lista';
  var soloLista = modo === 'lista';
  const [cats, setCats] = useState([]);
  const [oficio, setOficio] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [archivos, setArchivos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [msg, setMsg] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [mensajesPorPres, setMensajesPorPres] = useState({});
  const [perfil, setPerfil] = useState(null);
  const [chatKey, setChatKey] = useState(null);
  const [hojaKey, setHojaKey] = useState(null);     // cotización abierta (hoja)
  const [miaSel, setMiaSel] = useState(null);       // solicitud expandida en la lista
  const [tabMia, setTabMia] = useState('activas');  // 'activas' | 'pagadas'
  const [presMap, setPresMap] = useState({});       // reserva.id -> presupuesto_id
  const [chatPagado, setChatPagado] = useState(null); // chat de un trabajo pagado {presupuestoId, maestroId, titulo, telefono}
  const [infoPago, setInfoPago] = useState(false);  // modal "pago protegido"
  const [pagando, setPagando] = useState(false);
  const [reservas, setReservas] = useState([]);
  const [resenas, setResenas] = useState([]);
  const [revStars, setRevStars] = useState({});
  const [revText, setRevText] = useState({});
  const [confirmando, setConfirmando] = useState(null);
  const [fijarKey, setFijarKey] = useState(null);   // reserva a la que se le fija fecha
  const [fijarFecha, setFijarFecha] = useState('');
  const grabarRef = useRef(null);
  const subirRef = useRef(null);

  function cargarReservas() {
    if (!usuario) return;
    supabase.rpc('mis_reservas').then(function (r) { setReservas(r.error ? [] : (r.data || [])); });
  }

  function cancelarReserva(reservaId) {
    if (typeof window !== 'undefined' && !window.confirm('¿Cancelar esta solicitud? Solo puedes hacerlo antes de pagar.')) return;
    supabase.rpc('cancelar_reserva', { p_reserva_id: reservaId }).then(function (r) {
      if (r.error) { setMsg('No se pudo cancelar: ' + r.error.message); return; }
      cargarReservas();
    });
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

  function fijarFechaReserva(reservaId) {
    if (!fijarFecha) { setMsg('Elige fecha y hora'); return; }
    var iso = new Date(fijarFecha).toISOString();
    supabase.rpc('fijar_fecha_reserva', { p_reserva_id: reservaId, p_fecha: iso }).then(function (r) {
      if (r.error) { setMsg('No se pudo fijar la fecha: ' + r.error.message); return; }
      setFijarKey(null); setFijarFecha(''); setMsg('Fecha coordinada ✓');
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

  // Precarga la descripción desde la búsqueda del inicio (si vino texto).
  useEffect(function () {
    if (descripcionInicial) setDescripcion(function (prev) { return prev || descripcionInicial; });
  }, [descripcionInicial]);

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
    supabase.from('reservas').select('id, presupuesto_id').eq('cliente_id', usuario.id)
      .then(function (r) { var m = {}; (r.data || []).forEach(function (x) { m[x.id] = x.presupuesto_id; }); setPresMap(m); });
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
      if (esVideo && f.size > LIMITES.video) { setMsg('Un video supera los 100MB. Graba o elige uno más corto.'); continue; }
      if (!esVideo && f.size > LIMITES.foto) { setMsg('Una foto supera los 10MB. Elige una más liviana.'); continue; }
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
    setProgreso(0);
    setMsg('Comprimiendo y subiendo...');

    // Subimos a Cloudinary uno por uno para mostrar progreso. Cloudinary optimiza
    // la entrega (fotos f_auto,q_auto / videos q_auto) y guardamos esa URL liviana.
    var total = archivos.length;
    var media = [];
    var chain = Promise.resolve();
    archivos.forEach(function (a, idx) {
      chain = chain.then(function () {
        return subirACloudinary(a.file, function (pct) {
          setProgreso(Math.round((idx * 100 + pct) / total));
        }).then(function (res) {
          media.push({ url: res.url, tipo: a.tipo });
        }).catch(function (e) {
          setMsg('No se pudo subir un archivo: ' + (e.message || 'error'));
        });
      });
    });

    chain.then(function () {
      setProgreso(100);
      if (!media.length) { setMsg('No se pudieron subir los archivos. Intenta de nuevo.'); setSubiendo(false); return; }
      setMsg('Enviando tu solicitud...');
      var primerVideo = media.filter(function (x) { return x.tipo === 'video'; })[0];
      var primerNombre = (perfil && perfil.nombre) ? perfil.nombre.trim().split(/\s+/)[0] : null;
      var tituloManual = (titulo || '').trim();

      function guardar(tituloFinal) {
        var fila = {
          cliente_id: usuario.id,
          oficio: oficio,
          descripcion: descripcion.trim(),
          titulo: tituloFinal || null,
          cliente_nombre: primerNombre,
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
          setTitulo(''); setDescripcion(''); setArchivos([]);
          setSubiendo(false);
          cargarSolicitudes();
        });
      }

      if (tituloManual) {
        guardar(tituloManual);
      } else {
        // Si el cliente no puso título, lo genera la IA de respaldo a partir de la descripción.
        fetch('/api/titulo-ia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oficio: oficio, descripcion: descripcion.trim() }) })
          .then(function (r) { return r.json(); })
          .catch(function () { return {}; })
          .then(function (tj) { guardar(tj && tj.titulo ? tj.titulo : null); });
      }
    });
  }

  // Aceptar y pagar = crear la reserva (SIN fecha) y pasar a pagar la cotización.
  // La fecha se coordina después, una vez pagado.
  function aceptarYPagar(s, c) {
    if (!c.monto) { setMsg('Este maestro aún no puso un precio. Pídeselo en el chat.'); return; }
    setPagando(true);
    setMsg('Creando tu pedido...');
    supabase.from('reservas').insert({
      cliente_id: usuario.id,
      maestro_id: c.maestro_id,
      presupuesto_id: s.id,
      descripcion_problema: s.descripcion,
      direccion: s.direccion,
      estado: 'pendiente_pago',
      precio_cotizado: c.monto || null,
      link_video: s.video_url || null,
    }).select().single().then(function (r) {
      if (r.error) { setMsg('Error: ' + r.error.message); setPagando(false); return; }
      var reservaId = r.data.id;
      supabase.from('presupuestos').update({ estado: 'cerrado' }).eq('id', s.id).then(function () {});
      setMsg('Redirigiendo al pago seguro...');
      fetch('/api/pagar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto: c.monto, tipo: 'trabajo', descripcion: (s.oficio || 'servicio') + ' con ' + nombreMaestro(c.maestro_id), reservaId: reservaId, maestroId: c.maestro_id, email: usuario.email })
      }).then(function (rp) { return rp.json(); }).then(function (d) {
        if (d && d.init_point) { window.location.href = d.init_point; }
        else { setPagando(false); setMsg('No se pudo iniciar el pago: ' + ((d && d.error) || 'intenta de nuevo') + '. Tu pedido quedó pendiente de pago.'); cargarSolicitudes(); cargarReservas(); }
      }).catch(function () { setPagando(false); setMsg('No se pudo conectar con el pago. Tu pedido quedó pendiente.'); cargarSolicitudes(); cargarReservas(); });
    });
  }

  function maestroDe(id) { return (maestros || []).find(function (x) { return x.id === id; }) || null; }
  function nombreMaestro(id) { var m = maestroDe(id); return m ? (m.nombre || (m.perfiles && m.perfiles.nombre) || 'Maestro') : 'Maestro'; }
  function fotoMaestro(id) { var m = maestroDe(id); return m ? (m.foto_url || (m.perfiles && m.perfiles.avatar_url) || null) : null; }
  function ratingMaestro(id) { var m = maestroDe(id); return m ? m.rating_promedio : null; }
  function verifMaestro(id) { var m = maestroDe(id); return m ? m.verificado : false; }
  function trabajosMaestro(id) { var m = maestroDe(id); return m ? m.total_trabajos : null; }
  function fecha(f) { return f ? new Date(f).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; }
  function plata(n) { return '$' + (n || 0).toLocaleString('es-CL'); }
  function tituloMia(s) { return (s && s.titulo && s.titulo.trim()) ? s.titulo : ((s && s.oficio ? s.oficio.charAt(0).toUpperCase() + s.oficio.slice(1) : 'Solicitud')); }
  function waLink(tel) { var t = (tel || '').replace(/[^0-9]/g, ''); if (t.length && t[0] !== '5') t = '56' + t; return 'https://wa.me/' + t; }

  const inp = { width: '100%', padding: 12, border: '1.5px solid #ddd', borderRadius: 12, fontSize: 14, marginBottom: 10, background: '#fff' };
  const card = { background: '#fff', borderRadius: 18, padding: 16, marginBottom: 14, border: '1.5px solid #eee' };
  var yaResenados = {}; resenas.forEach(function (x) { yaResenados[x.maestro_id] = true; });
  var porCalificar = [];
  reservas.forEach(function (rv) { if (rv.maestro_id && (rv.trabajo_confirmado || rv.liberado) && !yaResenados[rv.maestro_id] && porCalificar.indexOf(rv.maestro_id) < 0) porCalificar.push(rv.maestro_id); });
  var agendados = reservas.filter(function (rv) { var s = (rv.estado || '').toLowerCase(); return s !== 'pendiente_pago'; });

  function Avatar(props) {
    var id = props.id, sz = props.size || 38;
    var f = fotoMaestro(id);
    return f
      ? <img src={f} alt="" style={{ width: sz, height: sz, borderRadius: '50%', objectFit: 'cover' }} />
      : <div style={{ width: sz, height: sz, borderRadius: '50%', background: '#e1f5ee', color: '#0f6e56', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: sz * 0.4 }}>{nombreMaestro(id).charAt(0).toUpperCase()}</div>;
  }

  function MetaMaestro(props) {
    var id = props.id;
    var rt = ratingMaestro(id), tr = trabajosMaestro(id);
    return (
      <span style={{ fontSize: 11.5, color: '#9aa1b5' }}>
        {'★ ' + (rt ? rt : 'nuevo')}{tr ? ' · ' + tr + ' trabajos' : ''}
      </span>
    );
  }

  return (
    <div className="body" style={{ paddingTop: 18 }}>
      {soloCrear && (
      <div style={card}>
        <b style={{ fontSize: 15 }}>{'\u{1F3A5} Pide un presupuesto por video'}</b>
        <div style={{ fontSize: 12, color: '#7c8499', margin: '4px 0 12px' }}>Graba un video corto mostrando el problema. Los maestros lo revisan y te mandan su cotización para que elijas.</div>
        <div style={{ background: '#eef3fd', border: '1px solid #d4e0f7', borderRadius: 12, padding: '10px 12px', fontSize: 12, color: '#2b4a86', lineHeight: 1.45, marginBottom: 12 }}>{'\u{1F4A1}'} Aquí <b>creas</b> una solicitud nueva. Para ver y comparar las cotizaciones que recibas, entra a <b>Mis cotizaciones</b>.</div>

        <label style={{ fontSize: 12, fontWeight: 700, color: '#5b6275' }}>Especialidad</label>
        <select value={oficio} onChange={function (e) { setOficio(e.target.value); }} style={{ ...inp, marginTop: 4 }}>
          {cats.map(function (c) { return <option key={c.slug} value={c.slug}>{c.valor}</option>; })}
        </select>

        <label style={{ fontSize: 12, fontWeight: 700, color: '#5b6275' }}>Título</label>
        <input value={titulo} onChange={function (e) { setTitulo(e.target.value); }} placeholder="Ej: Fuga bajo el lavaplatos" maxLength={60} style={{ ...inp, marginTop: 4 }} />
        <div style={{ fontSize: 11, color: '#9aa1b5', margin: '2px 0 4px' }}>Un título corto para tu solicitud (lo verán los maestros).</div>

        <label style={{ fontSize: 12, fontWeight: 700, color: '#5b6275' }}>¿Qué necesitas?</label>
        <textarea value={descripcion} onChange={function (e) { setDescripcion(e.target.value); }} placeholder="Ej: tengo una fuga bajo el lavaplatos, gotea cuando abro la llave..." rows={3} style={{ ...inp, marginTop: 4, resize: 'vertical' }} />

        <label style={{ fontSize: 12, fontWeight: 700, color: '#5b6275' }}>{'\u{1F4F7} Fotos y video del problema'}</label>
        <div style={{ fontSize: 11.5, color: '#9aa1b5', margin: '3px 0 8px', lineHeight: 1.4 }}>Graba un video al momento, o sube archivos de tu galería (videos y fotos juntos). Hasta {MAX_ARCHIVOS}. Se optimizan automáticamente al subir (puedes mandar videos de 1-2 min).</div>
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

        {msg && <p style={{ fontSize: 12, color: msg.indexOf('Error') >= 0 || msg.indexOf('No se pudo') >= 0 ? '#b3261e' : '#0d9456', margin: '4px 0' }}>{msg}</p>}
        {subiendo && (
          <div style={{ margin: '6px 0 10px' }}>
            <div style={{ height: 8, background: '#eef0f5', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: progreso + '%', background: 'linear-gradient(90deg,#ff8a6b,#ff5a3c)', borderRadius: 6, transition: 'width .2s' }} />
            </div>
            <div style={{ fontSize: 11, color: '#7c8499', textAlign: 'right', marginTop: 3 }}>{progreso}%</div>
          </div>
        )}
        <button className="gbtn full" style={{ opacity: subiendo ? 0.6 : 1 }} disabled={subiendo} onClick={enviar}>{subiendo ? 'Subiendo ' + progreso + '%...' : 'Enviar y pedir presupuesto'}</button>
      </div>
      )}

      {soloLista && (
        <div style={{ display: 'flex', gap: 8, padding: '0 2px 12px' }}>
          {[['activas', 'Activas'], ['pagadas', 'Pagadas']].map(function (o) {
            var on = tabMia === o[0];
            return <button key={o[0]} onClick={function () { setTabMia(o[0]); }} style={{ border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800, padding: '8px 16px', borderRadius: 999, background: on ? '#ff5a3c' : '#f2f3f7', color: on ? '#fff' : '#7c8499' }}>{o[1]}</button>;
          })}
        </div>
      )}

      {soloLista && tabMia === 'pagadas' && porCalificar.length === 0 && agendados.length === 0 && (
        <div style={card}><p style={{ fontSize: 13, color: '#9aa1b5', margin: 0 }}>Aún no tienes trabajos pagados. Cuando aceptes y pagues una cotización, aparecerá aquí con los datos de contacto del maestro.</p></div>
      )}

      {soloLista && tabMia === 'pagadas' && porCalificar.length > 0 && (
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

      {soloLista && tabMia === 'pagadas' && agendados.length > 0 && (
        <div style={card}>
          <b style={{ fontSize: 15 }}>{'\u{1F6E0}️ Mis trabajos pagados'}</b>
          <div style={{ fontSize: 12, color: '#7c8499', margin: '4px 0 6px' }}>Coordina la fecha con el maestro. Cuando termine, confirma para liberar el pago.</div>
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
                <div style={{ fontSize: 11, color: rv.fecha_hora ? '#0d7a4f' : '#b07a1e', fontWeight: 700 }}>{rv.fecha_hora ? '\u{1F4C5} ' + fecha(rv.fecha_hora) : '\u{1F4C5} Fecha por coordinar'}</div>

                {pagado && rv.maestro_telefono && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#e8f7ef', border: '1px solid #bfe6cf', borderRadius: 10, padding: '8px 10px', marginTop: 8 }}>
                    <span style={{ fontSize: 12.5, color: '#0d7a4f', fontWeight: 700, flex: 1 }}>{'\u{1F4DE} ' + rv.maestro_telefono}</span>
                    {presMap[rv.id] && <button onClick={function () { setChatPagado({ presupuestoId: presMap[rv.id], maestroId: rv.maestro_id, titulo: rv.maestro_nombre || nombreMaestro(rv.maestro_id), telefono: rv.maestro_telefono }); }} style={{ background: '#fff', color: '#ff5a3c', border: '1.5px solid #ffd6cb', borderRadius: 8, padding: '6px 11px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{'\u{1F4AC} Chat'}</button>}
                    <a href={'tel:' + (rv.maestro_telefono || '').replace(/[^0-9+]/g, '')} style={{ textDecoration: 'none', background: '#0d9456', color: '#fff', borderRadius: 8, padding: '6px 11px', fontSize: 12, fontWeight: 800 }}>Llamar</a>
                  </div>
                )}

                {pagado && !completo && (
                  <div style={{ marginTop: 8 }}>
                    {fijarKey === rv.id ? (
                      <div style={{ background: '#fff', border: '1px solid #eef0f5', borderRadius: 12, padding: 12 }}>
                        <div style={{ fontSize: 12, color: '#5b6275', marginBottom: 8 }}>Fecha y hora acordadas con el maestro:</div>
                        <input type="datetime-local" value={fijarFecha} onChange={function (e) { setFijarFecha(e.target.value); }} style={{ ...inp, marginBottom: 8 }} />
                        <button className="gbtn full" onClick={function () { fijarFechaReserva(rv.id); }}>Guardar fecha</button>
                      </div>
                    ) : (
                      <button onClick={function () { setFijarKey(rv.id); setFijarFecha(''); setMsg(null); }} style={{ width: '100%', background: '#fff', color: '#0d9456', border: '1.5px solid #bfe6cf', borderRadius: 10, padding: 9, fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>{rv.fecha_hora ? '\u{1F4C5} Cambiar fecha' : '\u{1F4C5} Fijar fecha acordada'}</button>
                    )}
                  </div>
                )}

                {s === 'cancelado' && <div style={{ fontSize: 11.5, color: '#9aa1b5', fontWeight: 700, marginTop: 6 }}>Cancelada</div>}
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

      {soloLista && tabMia === 'activas' && (
      <div style={card}>
        <b style={{ fontSize: 15 }}>{'\u{1F4CB} Mis solicitudes'}</b>
        {solicitudes.filter(function (s) { return s.estado !== 'cerrado'; }).length === 0 && <p style={{ fontSize: 13, color: '#9aa1b5', marginTop: 8 }}>No tienes solicitudes activas. Anda a la pestaña <b>Cotizar</b> y graba un video para empezar.</p>}
        {solicitudes.filter(function (s) { return s.estado !== 'cerrado'; }).map(function (s) {
          var cots = s.cotizaciones || [];
          var msgs = mensajesPorPres[s.id] || [];
          var maestroIds = [];
          cots.forEach(function (c) { if (maestroIds.indexOf(c.maestro_id) < 0) maestroIds.push(c.maestro_id); });
          msgs.forEach(function (m) { if (maestroIds.indexOf(m.maestro_id) < 0) maestroIds.push(m.maestro_id); });
          var cerrado = s.estado === 'cerrado';
          var conMonto = cots.filter(function (c) { return c.monto; }).length;
          return (
            <div key={s.id} style={{ borderTop: '1px solid #f1f1f1', padding: '11px 0' }}>
              <div onClick={function () { setMiaSel(miaSel === s.id ? null : s.id); setMsg(null); }} style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ width: 46, height: 46, borderRadius: 10, flexShrink: 0, background: '#19222f', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {(function () { var mm = (s.archivos && s.archivos.length) ? s.archivos[0] : (s.video_url ? { url: s.video_url, tipo: 'video' } : null); return mm && mm.tipo !== 'video' ? <img src={mm.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#fff', fontSize: 15 }}>{'▶'}</span>; })()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <b style={{ fontSize: 13.5 }}>{tituloMia(s)}</b>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 7, background: cerrado ? '#eef3fd' : (conMonto ? '#f2fbf6' : '#fff9f0'), color: cerrado ? '#2b4a86' : (conMonto ? '#0d9456' : '#b07a1e'), fontWeight: 800, whiteSpace: 'nowrap' }}>{cerrado ? 'PAGADO' : (conMonto ? conMonto + ' COTIZ.' : 'ESPERANDO')}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#7c8499', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '1px 0' }}>{s.descripcion || 'Sin descripción'}</div>
                  <div style={{ fontSize: 10.5, color: '#9aa1b5' }}>{(s.oficio ? (s.oficio.charAt(0).toUpperCase() + s.oficio.slice(1) + ' · ') : '') + fecha(s.creado_en)}</div>
                </div>
                <span style={{ color: '#c5c9d6', fontSize: 18, flexShrink: 0, transform: miaSel === s.id ? 'rotate(90deg)' : 'none' }}>{'›'}</span>
              </div>

              {miaSel === s.id && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 250, background: '#fff', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))', borderBottom: '1px solid #eef0f5', flexShrink: 0 }}>
                <button onClick={function () { setMiaSel(null); }} style={{ border: 'none', background: 'none', color: '#ff5a3c', fontSize: 26, fontWeight: 700, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>{'‹'}</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tituloMia(s)}</div>
                  <div style={{ fontSize: 11, color: '#9aa1b5' }}>{(s.oficio ? (s.oficio.charAt(0).toUpperCase() + s.oficio.slice(1) + ' · ') : '') + fecha(s.creado_en)}</div>
                </div>
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 7, background: cerrado ? '#eef3fd' : (conMonto ? '#f2fbf6' : '#fff9f0'), color: cerrado ? '#2b4a86' : (conMonto ? '#0d9456' : '#b07a1e'), fontWeight: 800, whiteSpace: 'nowrap' }}>{cerrado ? 'PAGADO' : (conMonto ? conMonto + ' COTIZ.' : 'ESPERANDO')}</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 16px 24px' }}>
              {s.descripcion && <div style={{ fontSize: 13, color: '#5b6275', margin: '12px 0 2px', lineHeight: 1.5 }}>{s.descripcion}</div>}
              <MediaCarrusel items={(s.archivos && s.archivos.length) ? s.archivos : (s.video_url ? [{ url: s.video_url, tipo: 'video' }] : [])} alto={260} />

              {!cerrado && conMonto > 1 && <div style={{ fontSize: 11.5, color: '#5b6275', background: '#f7f9fc', borderRadius: 10, padding: '8px 10px', margin: '8px 0 2px' }}>{'\u{1F50D}'} Recibiste varias cotizaciones. Ábrelas, compáralas y elige la que más te convenga.</div>}
              {maestroIds.length === 0 && <div style={{ fontSize: 12.5, color: '#9aa1b5', margin: '10px 0 2px' }}>Aún no recibes cotizaciones. Te avisaremos cuando un maestro responda.</div>}

              {maestroIds.map(function (mid) {
                var c = cots.find(function (x) { return x.maestro_id === mid; });
                var unread = msgs.filter(function (m) { return m.maestro_id === mid && m.autor_rol === 'maestro' && !m.leido; }).length;
                var ck = s.id + '|' + mid;
                var abierta = hojaKey === ck;
                return (
                  <div key={mid} style={{ border: '1.5px solid ' + (abierta ? '#ffd6cb' : '#eef0f5'), borderRadius: 14, padding: 12, marginTop: 8, background: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar id={mid} size={38} />
                      <div style={{ flex: 1, lineHeight: 1.3 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5 }}>{nombreMaestro(mid)}{verifMaestro(mid) && <span style={{ fontSize: 11, color: '#185FA5' }}>{'✔'}</span>}</div>
                        <MetaMaestro id={mid} />
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {c && c.monto ? <b style={{ fontSize: 15, color: '#1c1f2b' }}>{plata(c.monto)}</b> : <span style={{ fontSize: 11, color: '#9aa1b5' }}>te escribió</span>}
                      </div>
                    </div>

                    {c && c.monto && !cerrado && (
                      <button onClick={function () { setHojaKey(abierta ? null : ck); setMsg(null); }} style={{ width: '100%', marginTop: 10, background: abierta ? '#fff5f2' : '#fafbfe', color: '#ff5a3c', border: '1.5px solid #ffd6cb', borderRadius: 10, padding: 9, fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>{abierta ? 'Ocultar cotización' : '\u{1F4C4} Ver cotización'}</button>
                    )}

                    {abierta && c && c.monto && !cerrado && (
                      <div style={{ marginTop: 10, background: '#f7f9fc', border: '1px solid #eef0f5', borderRadius: 12, padding: 13 }}>
                        {(c.detalle && c.detalle.modo === 'cerrado' && c.detalle.items && c.detalle.items.length) ? (
                          (function () {
                            var dd = c.detalle;
                            var mat = dd.items.filter(function (it) { return it.tipo === 'material'; }).reduce(function (a, x) { return a + (Number(x.valor) || 0); }, 0);
                            var mo = dd.items.filter(function (it) { return it.tipo !== 'material'; }).reduce(function (a, x) { return a + (Number(x.valor) || 0); }, 0);
                            return (
                              <div>
                                {(dd.descripcion || c.mensaje) && <div style={{ fontSize: 12.5, color: '#5b6275', lineHeight: 1.5, marginBottom: 10, whiteSpace: 'pre-wrap' }}>{dd.descripcion || c.mensaje}</div>}
                                <div style={{ background: '#fff', border: '1px solid #eef0f5', borderRadius: 10, padding: '11px 12px', marginBottom: 10 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '4px 0', borderBottom: '1px solid #f4f4f4' }}><span>{'\u{1F4E6} Materiales'}</span><span style={{ fontWeight: 700 }}>{plata(mat)}</span></div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '4px 0' }}><span>{'\u{1F6E0}️ Mano de obra'}</span><span style={{ fontWeight: 700 }}>{plata(mo)}</span></div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#7c8499', marginTop: 8 }}><span>IVA (19%)</span><span>{plata(dd.iva)}</span></div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid #eef0f5', marginTop: 6, paddingTop: 7 }}><span style={{ fontSize: 13, fontWeight: 800 }}>Total</span><span style={{ fontSize: 22, fontWeight: 800 }}>{plata(c.monto)}</span></div>
                                  <div style={{ fontSize: 10, color: '#9aa1b5', textAlign: 'right', marginTop: 2 }}>Todos los valores incluyen IVA</div>
                                </div>
                                {dd.incluye && dd.incluye.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>{dd.incluye.map(function (x) { return <span key={x} style={{ fontSize: 11, background: '#e1f5ee', color: '#0f6e56', borderRadius: 999, padding: '4px 9px' }}>{'✓ ' + x}</span>; })}</div>}
                                {dd.condiciones && <div style={{ fontSize: 11.5, color: '#7c8499', marginBottom: 10, lineHeight: 1.4 }}>{'\u{1F4CB} ' + dd.condiciones}</div>}
                              </div>
                            );
                          })()
                        ) : (c.detalle && c.detalle.items && c.detalle.items.length) ? (
                          <div>
                            {c.detalle.descripcion && <div style={{ fontSize: 12.5, color: '#5b6275', lineHeight: 1.5, marginBottom: 10, whiteSpace: 'pre-wrap' }}>{c.detalle.descripcion}</div>}
                            <div style={{ background: '#fff', border: '1px solid #eef0f5', borderRadius: 10, padding: '11px 12px', marginBottom: 10 }}>
                              {c.detalle.items.map(function (it, ix) {
                                return <div key={ix} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '4px 0', borderBottom: ix < c.detalle.items.length - 1 ? '1px solid #f4f4f4' : 'none' }}><span>{(it.tipo === 'mano_obra' ? '\u{1F6E0}️ ' : '\u{1F4E6} ') + it.desc}</span><span style={{ fontWeight: 700 }}>{plata(it.valor)}</span></div>;
                              })}
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#7c8499', marginTop: 8 }}><span>Neto</span><span>{plata(c.detalle.neto)}</span></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#7c8499' }}><span>IVA (19%)</span><span>{plata(c.detalle.iva)}</span></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid #eef0f5', marginTop: 6, paddingTop: 7 }}><span style={{ fontSize: 13, fontWeight: 800 }}>Total</span><span style={{ fontSize: 22, fontWeight: 800 }}>{plata(c.monto)}</span></div>
                              <div style={{ fontSize: 10, color: '#9aa1b5', textAlign: 'right', marginTop: 2 }}>Todos los valores incluyen IVA</div>
                            </div>
                            {c.detalle.incluye && c.detalle.incluye.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>{c.detalle.incluye.map(function (x) { return <span key={x} style={{ fontSize: 11, background: '#e1f5ee', color: '#0f6e56', borderRadius: 999, padding: '4px 9px' }}>{'✓ ' + x}</span>; })}</div>}
                            {c.detalle.condiciones && <div style={{ fontSize: 11.5, color: '#7c8499', marginBottom: 10, lineHeight: 1.4 }}>{'\u{1F4CB} ' + c.detalle.condiciones}</div>}
                          </div>
                        ) : (
                          <div>
                            <div style={{ background: '#fff', border: '1px solid #eef0f5', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
                              <div style={{ fontSize: 11.5, color: '#9aa1b5' }}>Precio del trabajo</div>
                              <div style={{ fontSize: 24, fontWeight: 800, color: '#1c1f2b' }}>{plata(c.monto)}</div>
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#5b6275', marginBottom: 4 }}>Qué incluye</div>
                            <div style={{ fontSize: 12.5, color: '#5b6275', lineHeight: 1.5, marginBottom: 10, whiteSpace: 'pre-wrap' }}>{c.mensaje ? c.mensaje : 'El maestro no detalló el alcance. Pregúntale por el chat antes de aceptar.'}</div>
                          </div>
                        )}
                        <div style={{ fontSize: 11.5, color: '#7c8499', marginBottom: 8 }}>{'\u{1F4C5}'} La fecha la coordinan después de pagar.</div>
                        <button onClick={function () { setInfoPago(true); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', background: '#e1f5ee', color: '#0f6e56', border: 'none', borderRadius: 10, padding: '9px 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer', marginBottom: 10 }}>{'\u{1F6E1}️ Pago protegido'} <span style={{ background: '#5dcaa5', color: '#04342c', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>i</span></button>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={function () { setChatKey(chatKey === ck ? null : ck); }} style={{ flex: 1, background: '#fff', color: '#ff5a3c', border: '1.5px solid #ffd6cb', borderRadius: 10, padding: 10, fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>{'\u{1F4AC} Conversar' + (unread > 0 ? ' · ' + unread : '')}</button>
                          <button className="gbtn" style={{ flex: 1.3, padding: 10, opacity: pagando ? 0.6 : 1 }} disabled={pagando} onClick={function () { aceptarYPagar(s, c); }}>{pagando ? 'Procesando...' : 'Aceptar y pagar'}</button>
                        </div>
                        {msg && <p style={{ fontSize: 12, fontWeight: 600, textAlign: 'center', margin: '8px 0 0', color: (msg.indexOf('Error') >= 0 || msg.indexOf('No se pudo') >= 0) ? '#b3261e' : '#0d9456' }}>{msg}</p>}
                      </div>
                    )}

                    {(!c || !c.monto) && (
                      <button onClick={function () { setChatKey(chatKey === ck ? null : ck); }} style={{ width: '100%', marginTop: 10, background: '#fff', color: '#ff5a3c', border: '1.5px solid #ffd6cb', borderRadius: 10, padding: 9, fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>{'\u{1F4AC} Conversar' + (unread > 0 ? ' · ' + unread : '')}</button>
                    )}

                    {chatKey === ck && <ChatCotizacion usuario={usuario} presupuestoId={s.id} maestroId={mid} miRol="cliente" titulo={nombreMaestro(mid)} onClose={function () { setChatKey(null); }} />}
                  </div>
                );
              })}
              </div>
              </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {chatPagado && <ChatCotizacion usuario={usuario} presupuestoId={chatPagado.presupuestoId} maestroId={chatPagado.maestroId} miRol="cliente" titulo={chatPagado.titulo} contacto={{ telefono: chatPagado.telefono }} onClose={function () { setChatPagado(null); }} />}

      {infoPago && (
        <div onClick={function () { setInfoPago(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={function (e) { e.stopPropagation(); }} style={{ width: '100%', maxWidth: 320, background: '#fff', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ background: '#e1f5ee', padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 26 }}>{'\u{1F6E1}️'}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#04342c', marginTop: 2 }}>Pagas sin riesgo</div>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>{'\u{1F4B0}'}</span>
                <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>Acuerdas el precio antes: no pagas de más ni hay sorpresas.</div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>{'\u{1F9D1}‍\u{1F527}'}</span>
                <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>Si no llega o no cumple, te devolvemos el 100%.</div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 18 }}>{'✅'}</span>
                <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>Se libera solo cuando confirmas que quedó listo.</div>
              </div>
              <button className="gbtn full" onClick={function () { setInfoPago(false); }}>Entendido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
