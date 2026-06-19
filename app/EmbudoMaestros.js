'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

// Embudo de reclutamiento de maestros: tablero tipo Trello (6 columnas) + Fuera del embudo
// (suspendidos / rechazados) + Inbox de WhatsApp (Wasapi) + Plantillas por columna.
// Recibe los datos ya cargados por el admin y los handlers de aprobar/rechazar/reactivar.

const STAGES = [
  { id: 'sinrespuesta', nombre: 'Sin respuesta', sub: 'No contestaron', color: '#9aa1b5', tpl: 'primer_contacto' },
  { id: 'enconversacion', nombre: 'En conversación', sub: 'Preguntando / con dudas', color: '#b07a1e', tpl: 'mas_info' },
  { id: 'interesados', nombre: 'Interesados', sub: 'Llenaron "Súmate"', color: '#2563eb', tpl: 'invita_registro' },
  { id: 'sinficha', nombre: 'Sin ficha', sub: 'Falta oficios/precios', color: '#b07a1e', tpl: 'termina_ficha' },
  { id: 'porverif', nombre: 'Por verificar', sub: 'Falta aprobar', color: '#2563eb', tpl: 'en_revision' },
  { id: 'verif', nombre: 'Verificados', sub: 'Publicados y activos', color: '#0d9456', tpl: 'bienvenida_activo' },
];

const TPL_DEFAULT = {
  primer_contacto: 'Hola {{1}} 👋 Te escribimos de MaestrosEnLínea. Buscamos maestros para trabajos en tu zona, sin costo por inscribirte. ¿Te gustaría saber más?',
  mas_info: 'Hola {{1}}, te cuento rápido: los clientes te llegan directo y en esta etapa no cobramos comisión. ¿Te ayudo a registrarte?',
  invita_registro: '{{1}}, ya casi estás 🙌 Crea tu cuenta y empieza a recibir solicitudes: https://www.maestrosenlinea.cl/maestros',
  termina_ficha: 'Hola {{1}}, te falta un paso: completar tus oficios y precios para aparecer en la app. Te toma 2 minutos 👉 https://www.maestrosenlinea.cl/maestros',
  en_revision: '{{1}}, recibimos tu ficha ✅ Estamos revisando tu verificación, te avisamos apenas quede lista.',
  bienvenida_activo: '¡Felicidades {{1}}! Ya estás verificado y visible en MaestrosEnLínea 🎉 Cuando llegue una solicitud te avisamos por aquí.',
};

function digits(s) { return (s || '').toString().replace(/\D/g, ''); }
function last9(s) { var d = digits(s); return d.length >= 9 ? d.slice(-9) : d; }
function norm56(s) {
  var d = digits(s);
  if (!d) return '';
  if (d.length === 8) return '569' + d;
  if (d.length === 9) return '56' + d;
  if (d.indexOf('56') === 0) return d;
  return d;
}
function primerNombre(n) { return (n || '').toString().trim().split(/\s+/)[0] || ''; }
function fechaCorta(f) {
  if (!f) return '';
  try { return new Date(f).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
}

export default function EmbudoMaestros(props) {
  var maestros = props.maestros || [];
  var perfiles = props.perfiles || [];
  var verifs = props.verifs || [];
  var interesados = props.interesados || [];
  var onAprobarMaestro = props.onAprobarMaestro;
  var onRechazar = props.onRechazar;
  var onReactivar = props.onReactivar;
  var onRecargar = props.onRecargar;

  var [vista, setVista] = useState('embudo'); // embudo | inbox | plantillas
  var [waMsgs, setWaMsgs] = useState([]);
  var [contactos, setContactos] = useState([]);
  var [verSusp, setVerSusp] = useState(false);
  var [ficha, setFicha] = useState(null);      // card seleccionada para ver ficha
  var [fichaUrls, setFichaUrls] = useState({});
  var [selTel, setSelTel] = useState(null);     // inbox: teléfono seleccionado
  var [borrador, setBorrador] = useState('');
  var [enviando, setEnviando] = useState(false);
  var [aviso, setAviso] = useState(null);
  var [tpls, setTpls] = useState(TPL_DEFAULT);

  useEffect(function () {
    try { var raw = localStorage.getItem('embudo_plantillas'); if (raw) setTpls(Object.assign({}, TPL_DEFAULT, JSON.parse(raw))); } catch (e) {}
    cargarWa();
    cargarContactos();
  }, []);

  function cargarWa() {
    supabase.from('wa_mensajes').select('*').order('creado_en', { ascending: true }).limit(2000)
      .then(function (r) { setWaMsgs(r.error ? [] : (r.data || [])); });
  }
  function cargarContactos() {
    supabase.from('campana_contactos').select('*').order('creado_en', { ascending: false }).limit(500)
      .then(function (r) { setContactos(r.error ? [] : (r.data || [])); });
  }

  // ---- índices ----
  var maestroById = useMemo(function () { var o = {}; maestros.forEach(function (m) { o[m.id] = m; }); return o; }, [maestros]);
  var verifByUser = useMemo(function () { var o = {}; verifs.forEach(function (v) { if (!o[v.user_id]) o[v.user_id] = v; }); return o; }, [verifs]);
  var telMaestroSet = useMemo(function () {
    var o = {};
    perfiles.forEach(function (p) { if (p.rol === 'maestro' && p.telefono) o[last9(p.telefono)] = 1; });
    verifs.forEach(function (v) { if (v.telefono) o[last9(v.telefono)] = 1; });
    return o;
  }, [perfiles, verifs]);
  var waInbound = useMemo(function () { var o = {}; waMsgs.forEach(function (m) { if (m.direccion === 'in' && m.telefono) o[last9(m.telefono)] = 1; }); return o; }, [waMsgs]);

  // ---- columnas ----
  var cols = useMemo(function () {
    var c = { sinrespuesta: [], enconversacion: [], interesados: [], sinficha: [], porverif: [], verif: [] };
    var fuera = { susp: [], rechazado: [] };

    // maestros con ficha
    maestros.forEach(function (m) {
      var v = verifByUser[m.id];
      var card = { key: 'm-' + m.id, tipo: 'maestro', m: m, v: v, p: perfiles.find(function (x) { return x.id === m.id; }),
        nombre: m.nombre || (m.id ? m.id.slice(0, 8) : 'Maestro'),
        sub: (Array.isArray(m.oficios) && m.oficios.length ? m.oficios.join(', ') : (m.oficio || 'Maestro')),
        telefono: (v && v.telefono) || '' };
      if (m.suspendido) fuera.susp.push(card);
      else if (m.verificado) c.verif.push(card);
      else c.porverif.push(card);
    });

    // perfiles maestro sin ficha
    var maestroIds = {}; maestros.forEach(function (m) { maestroIds[m.id] = 1; });
    perfiles.filter(function (p) { return p.rol === 'maestro' && !maestroIds[p.id]; }).forEach(function (p) {
      var v = verifByUser[p.id];
      var card = { key: 'p-' + p.id, tipo: 'perfil', p: p, v: v,
        nombre: p.nombre || (p.id ? p.id.slice(0, 8) : 'Sin nombre'),
        sub: v && v.estado ? ('verif. ' + v.estado) : 'cuenta sin ficha',
        telefono: (v && v.telefono) || p.telefono || '' };
      if (v && v.estado === 'rechazado') fuera.rechazado.push(card);
      else c.sinficha.push(card);
    });

    // interesados (no avanzaron a cuenta)
    interesados.forEach(function (it) {
      if (telMaestroSet[last9(it.whatsapp)]) return;
      c.interesados.push({ key: 'i-' + it.id, tipo: 'interesado', it: it,
        nombre: it.nombre || 'Interesado',
        sub: [it.oficio, it.comuna].filter(Boolean).join(' · ') || 'Sin oficio',
        telefono: it.whatsapp || '' });
    });

    // en conversación: hilos wa con entrante, no conocidos
    var intSet = {}; interesados.forEach(function (it) { intSet[last9(it.whatsapp)] = 1; });
    var hilos = {};
    waMsgs.forEach(function (m) {
      if (!m.telefono) return;
      var k = last9(m.telefono);
      if (!hilos[k]) hilos[k] = { tel: m.telefono, nombre: '', inbound: false, ultimo: m.creado_en };
      if (m.nombre) hilos[k].nombre = m.nombre;
      if (m.direccion === 'in') hilos[k].inbound = true;
      hilos[k].ultimo = m.creado_en;
    });
    Object.keys(hilos).forEach(function (k) {
      var h = hilos[k];
      if (!h.inbound) return;
      if (telMaestroSet[k] || intSet[k]) return;
      c.enconversacion.push({ key: 'w-' + k, tipo: 'thread', nombre: h.nombre || ('+' + h.tel), sub: 'WhatsApp', telefono: h.tel });
    });

    // sin respuesta: contactos de campaña sin entrante y no conocidos
    contactos.forEach(function (x) {
      var w = x.whatsapp || x.telefono;
      var k = last9(w);
      if (!k) return;
      if (waInbound[k] || telMaestroSet[k] || intSet[k]) return;
      c.sinrespuesta.push({ key: 'c-' + (x.id || k), tipo: 'contacto', nombre: x.nombre || ('+' + (w || '')), sub: [x.oficio, x.comuna].filter(Boolean).join(' · ') || 'Maps', telefono: w });
    });

    return { c: c, fuera: fuera };
  }, [maestros, perfiles, verifs, interesados, waMsgs, contactos, verifByUser, telMaestroSet, waInbound]);

  function stageDeTel(tel) {
    var k = last9(tel);
    var found = null;
    STAGES.forEach(function (s) {
      (cols.c[s.id] || []).forEach(function (cd) { if (last9(cd.telefono) === k) found = s; });
    });
    return found;
  }

  // ---- acciones ----
  function abrirFicha(card) {
    setFicha(card); setFichaUrls({});
    var v = card.v || (card.m ? verifByUser[card.m.id] : null) || (card.p ? verifByUser[card.p.id] : null);
    if (v && v.carnet_path) {
      Promise.all([
        supabase.storage.from('verificaciones').createSignedUrl(v.carnet_path, 3600),
        v.selfie_path ? supabase.storage.from('verificaciones').createSignedUrl(v.selfie_path, 3600) : Promise.resolve({ data: null }),
      ]).then(function (us) {
        setFichaUrls({ carnet: us[0].data ? us[0].data.signedUrl : null, selfie: us[1].data ? us[1].data.signedUrl : null });
      });
    }
  }
  function aprobarCard(card) {
    if (card.m && onAprobarMaestro) onAprobarMaestro(card.m);
    setFicha(null);
  }
  function rechazarCard(card) {
    var v = card.v || (card.m ? verifByUser[card.m.id] : null);
    if (v && onRechazar) onRechazar(v); else setAviso('No hay verificación pendiente para rechazar.');
    setFicha(null);
  }
  function reactivarCard(card) { if (card.m && onReactivar) onReactivar(card.m); }
  function pedirDeNuevo(card) {
    var v = card.v; if (!v) return;
    supabase.from('verificaciones').update({ estado: 'pendiente', notas: null, revisado_at: null }).eq('id', v.id)
      .then(function (r) { if (r.error) setAviso(r.error.message); else { setAviso('Verificación reabierta ✓'); if (onRecargar) onRecargar(); } });
  }

  function irAInbox(card) {
    var tel = norm56(card.telefono);
    setSelTel(tel || last9(card.telefono));
    var st = STAGES.find(function (s) { return cols.c[s.id] && cols.c[s.id].indexOf(card) >= 0; });
    var tplName = st ? st.tpl : null;
    if (tplName && tpls[tplName]) setBorrador(tpls[tplName].replace(/\{\{1\}\}/g, primerNombre(card.nombre)));
    else setBorrador('');
    setVista('inbox');
  }

  function enviar() {
    var tel = norm56(selTel);
    var txt = (borrador || '').trim();
    if (!tel || !txt || enviando) return;
    setEnviando(true);
    supabase.auth.getSession().then(function (s) {
      var token = s && s.data && s.data.session ? s.data.session.access_token : '';
      return fetch('/api/wasapi-send', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ wa_id: tel, texto: txt }) });
    }).then(function (r) { return r.json(); }).then(function (d) {
      setEnviando(false);
      if (d && d.ok) { setBorrador(''); setAviso('Enviado ✓'); setTimeout(cargarWa, 800); }
      else setAviso('No se pudo enviar: ' + ((d && d.error) || 'error'));
    }).catch(function () { setEnviando(false); setAviso('No se pudo enviar.'); });
  }

  function guardarTpl(name, texto) {
    var n = Object.assign({}, tpls); n[name] = texto; setTpls(n);
    try { localStorage.setItem('embudo_plantillas', JSON.stringify(n)); } catch (e) {}
  }

  // ---- estilos ----
  var wrapTab = { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, border: '1px solid #e4e4ef', borderRadius: 10, padding: '7px 13px', cursor: 'pointer', background: '#fff', color: '#5b6275' };
  var wrapTabOn = Object.assign({}, wrapTab, { background: '#eef4ff', color: '#16294f', borderColor: '#cfe0ff' });
  var colBox = { flex: '1 0 192px', minWidth: 0, background: '#f6f8fc', border: '1px solid #eef1f7', borderRadius: 14, padding: 10 };
  var cardBox = { background: '#fff', border: '1px solid #eef1f7', borderRadius: 10, padding: 9, marginBottom: 7 };
  var waBtn = { flex: '0 0 auto', width: 27, height: 27, borderRadius: 8, background: '#e8f7ef', color: '#0d9456', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer' };
  var iconBtn = { flex: '0 0 auto', width: 27, height: 27, borderRadius: 8, background: '#fff', color: '#2563eb', border: '1px solid #e4e4ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer' };

  function Card(props2) {
    var card = props2.card; var st = props2.st;
    return (
      <div style={cardBox}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.nombre}</div>
            <div style={{ fontSize: 10.5, color: '#8a90a2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.sub}</div>
          </div>
          {card.tipo === 'maestro' && <button title="Ver ficha" style={iconBtn} onClick={function () { abrirFicha(card); }}>👁</button>}
          <button title="WhatsApp" style={waBtn} onClick={function () { irAInbox(card); }}>💬</button>
        </div>
        {st && st.id === 'porverif' && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button style={{ flex: 1, fontSize: 11.5, fontWeight: 700, color: '#fff', background: '#0d9456', border: 'none', borderRadius: 8, padding: 5, cursor: 'pointer' }} onClick={function () { aprobarCard(card); }}>✓ Aprobar</button>
            <button style={{ flex: 1, fontSize: 11.5, fontWeight: 700, color: '#b3261e', background: '#fff', border: '1px solid #f3c9c9', borderRadius: 8, padding: 5, cursor: 'pointer' }} onClick={function () { rechazarCard(card); }}>✕</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #eef1f7', borderRadius: 16, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button style={vista === 'embudo' ? wrapTabOn : wrapTab} onClick={function () { setVista('embudo'); }}>🗂️ Embudo</button>
        <button style={vista === 'inbox' ? wrapTabOn : wrapTab} onClick={function () { setVista('inbox'); }}>💬 Inbox</button>
        <button style={vista === 'plantillas' ? wrapTabOn : wrapTab} onClick={function () { setVista('plantillas'); }}>📝 Plantillas</button>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9aa1b5' }}>6 columnas + Fuera del embudo</span>
      </div>

      {aviso && <div style={{ fontSize: 12.5, background: '#eef4ff', color: '#16294f', border: '1px solid #cfe0ff', borderRadius: 10, padding: '8px 11px', marginBottom: 10 }}>{aviso} <span style={{ cursor: 'pointer', float: 'right', color: '#9aa1b5' }} onClick={function () { setAviso(null); }}>✕</span></div>}

      {vista === 'embudo' && (
        <div>
          <div style={{ display: 'flex', gap: 9, overflowX: 'auto', paddingBottom: 6 }}>
            {STAGES.map(function (s) {
              var lista = cols.c[s.id] || [];
              return (
                <div key={s.id} style={colBox}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }}></span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{s.nombre}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, background: '#fff', border: '1px solid #eef1f7', borderRadius: 20, padding: '1px 7px' }}>{lista.length}</span>
                  </div>
                  <div style={{ fontSize: 9.5, color: '#9aa1b5', marginBottom: 5 }}>{s.sub}</div>
                  <div title="Plantilla de esta columna · toca para editar" onClick={function () { setVista('plantillas'); }} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, color: '#5b6275', background: '#fff', border: '1px solid #eef1f7', borderRadius: 8, padding: '3px 6px', marginBottom: 7, cursor: 'pointer' }}>📝 {s.tpl}<span style={{ marginLeft: 'auto', opacity: .5 }}>✎</span></div>
                  {lista.length === 0 && <div style={{ fontSize: 10.5, color: '#b8bdcb', textAlign: 'center', padding: 6 }}>Vacío</div>}
                  {lista.slice(0, 25).map(function (card) { return <Card key={card.key} card={card} st={s} />; })}
                  {lista.length > 25 && <div style={{ fontSize: 10, color: '#9aa1b5', textAlign: 'center' }}>{'+' + (lista.length - 25) + ' más'}</div>}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 9px' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#b3261e' }}>🗄️ Fuera del embudo</span>
            <span style={{ fontSize: 10.5, color: '#9aa1b5' }}>detenidos — recupéralos</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={colBox}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#b3261e' }}></span>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>Suspendidos</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#b3261e', background: '#fdecec', borderRadius: 20, padding: '1px 8px' }}>{cols.fuera.susp.length}</span>
              </div>
              {cols.fuera.susp.length === 0 && <div style={{ fontSize: 11, color: '#b8bdcb', textAlign: 'center', padding: 6 }}>Ninguno</div>}
              {cols.fuera.susp.map(function (card) {
                return (
                  <div key={card.key} style={cardBox}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 700 }}>{card.nombre}</div><div style={{ fontSize: 10.5, color: '#8a90a2' }}>{card.sub}</div></div>
                      <button title="Ver ficha" style={iconBtn} onClick={function () { abrirFicha(card); }}>👁</button>
                      <button title="WhatsApp" style={waBtn} onClick={function () { irAInbox(card); }}>💬</button>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#0d9456', background: '#fff', border: '1px solid #bfe6cf', borderRadius: 8, padding: 4, cursor: 'pointer' }} onClick={function () { reactivarCard(card); }}>↻ Reactivar</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={colBox}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#b3261e' }}></span>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>Rechazados</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#b3261e', background: '#fdecec', borderRadius: 20, padding: '1px 8px' }}>{cols.fuera.rechazado.length}</span>
              </div>
              {cols.fuera.rechazado.length === 0 && <div style={{ fontSize: 11, color: '#b8bdcb', textAlign: 'center', padding: 6 }}>Ninguno</div>}
              {cols.fuera.rechazado.map(function (card) {
                return (
                  <div key={card.key} style={cardBox}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 700 }}>{card.nombre}</div><div style={{ fontSize: 10.5, color: '#b3261e' }}>{card.v && card.v.notas ? card.v.notas : 'rechazado'}</div></div>
                      <button title="Ver ficha" style={iconBtn} onClick={function () { abrirFicha(card); }}>👁</button>
                      <button title="WhatsApp" style={waBtn} onClick={function () { irAInbox(card); }}>💬</button>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#fff', border: '1px solid #cfe0ff', borderRadius: 8, padding: 4, cursor: 'pointer' }} onClick={function () { pedirDeNuevo(card); }}>↺ Pedir de nuevo</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {vista === 'inbox' && (function () {
        var hilos = {};
        waMsgs.forEach(function (m) {
          if (!m.telefono) return; var k = last9(m.telefono);
          if (!hilos[k]) hilos[k] = { k: k, tel: m.telefono, nombre: '', items: [], ultimo: m.creado_en };
          hilos[k].items.push(m); if (m.nombre) hilos[k].nombre = m.nombre; hilos[k].ultimo = m.creado_en;
        });
        var lista = Object.keys(hilos).map(function (k) { return hilos[k]; }).sort(function (a, b) { return (b.ultimo || '').localeCompare(a.ultimo || ''); });
        var selK = selTel ? last9(selTel) : null;
        var hiloSel = selK ? hilos[selK] : null;
        return (
          <div style={{ display: 'flex', gap: 10, height: 440, border: '1px solid #eef1f7', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ flex: '0 0 210px', borderRight: '1px solid #eef1f7', overflowY: 'auto' }}>
              {lista.length === 0 && <div style={{ padding: 14, fontSize: 12.5, color: '#9aa1b5' }}>Sin conversaciones todavía.</div>}
              {lista.map(function (h) {
                var ult = h.items[h.items.length - 1] || {};
                var st = stageDeTel(h.tel);
                var on = selK === h.k;
                return (
                  <div key={h.k} onClick={function () { setSelTel(h.tel); }} style={{ padding: '9px 10px', borderBottom: '1px solid #f3f4f8', cursor: 'pointer', background: on ? '#eef4ff' : '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.nombre || ('+' + h.tel)}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 9.5, color: '#b8bdcb' }}>{fechaCorta(h.ultimo).split(',')[0]}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#8a90a2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(ult.direccion === 'out' ? 'Tú: ' : '') + (ult.texto || '')}</div>
                    {st && <span style={{ fontSize: 9, color: st.color, background: '#f3f5f9', borderRadius: 20, padding: '0 6px' }}>{st.nombre}</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              {!hiloSel && !selTel && <div style={{ margin: 'auto', fontSize: 13, color: '#9aa1b5' }}>Elige una conversación o toca 💬 en una tarjeta.</div>}
              {(hiloSel || selTel) && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ padding: '9px 11px', borderBottom: '1px solid #eef1f7', fontSize: 13, fontWeight: 800 }}>
                    {(hiloSel && hiloSel.nombre) || ('+' + norm56(selTel))}
                    <span style={{ fontSize: 11, color: '#9aa1b5', fontWeight: 400 }}>{'  ·  +' + norm56(selTel)}</span>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 7, background: '#fafbfd' }}>
                    {hiloSel && hiloSel.items.map(function (m) {
                      var out = m.direccion === 'out';
                      return (
                        <div key={m.id} style={{ alignSelf: out ? 'flex-end' : 'flex-start', maxWidth: '76%', background: out ? '#e8f7ef' : '#fff', border: '1px solid ' + (out ? '#cdeedd' : '#eef1f7'), borderRadius: 10, padding: '7px 10px', fontSize: 12.5 }}>
                          {m.texto}
                          <div style={{ fontSize: 9, color: '#b8bdcb', textAlign: 'right', marginTop: 2 }}>{fechaCorta(m.creado_en)}</div>
                        </div>
                      );
                    })}
                    {!hiloSel && <div style={{ fontSize: 12, color: '#9aa1b5' }}>Nueva conversación. Escribe el primer mensaje abajo.</div>}
                  </div>
                  <div style={{ padding: '8px 10px', borderTop: '1px solid #eef1f7' }}>
                    <div style={{ display: 'flex', gap: 5, marginBottom: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 10.5, color: '#8a90a2' }}>📝</span>
                      {STAGES.map(function (s) {
                        return <span key={s.id} onClick={function () { setBorrador(tpls[s.tpl] || ''); }} style={{ fontSize: 10, color: '#5b6275', border: '1px solid #e4e4ef', borderRadius: 20, padding: '2px 8px', cursor: 'pointer' }}>{s.tpl}</span>;
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'flex-end' }}>
                      <textarea value={borrador} onChange={function (e) { setBorrador(e.target.value); }} placeholder="Escribe un mensaje…" rows={2} style={{ flex: 1, fontSize: 13, border: '1px solid #e4e4ef', borderRadius: 10, padding: '8px 10px', resize: 'vertical', fontFamily: 'inherit' }} />
                      <button onClick={enviar} disabled={enviando} style={{ width: 40, height: 40, borderRadius: '50%', background: '#0d9456', color: '#fff', border: 'none', fontSize: 16, cursor: 'pointer' }}>➤</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7, flexWrap: 'wrap' }}>
                      <a href={'https://wa.me/' + norm56(selTel) + (borrador ? '?text=' + encodeURIComponent(borrador) : '')} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: '#0d9456', background: '#e8f7ef', border: '1px solid #bfe6cf', borderRadius: 9, padding: '5px 10px', textDecoration: 'none' }}>{'\u{1F4F1} Abrir en WhatsApp Web ↗'}</a>
                      <span style={{ fontSize: 9.5, color: '#b8bdcb', flex: 1, minWidth: 120 }}>Si pasaron más de 24h y el envío directo falla, usa este botón para escribirle desde tu WhatsApp.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {vista === 'plantillas' && (
        <div>
          <div style={{ fontSize: 11.5, color: '#5b6275', marginBottom: 10 }}>Una plantilla por columna. {'{{1}}'} = nombre del maestro. Se usan al tocar 💬 en una tarjeta y como atajos en el inbox. (Se guardan en este navegador por ahora.)</div>
          {STAGES.map(function (s) {
            return (
              <div key={s.id} style={{ border: '1px solid #eef1f7', borderRadius: 12, padding: '10px 12px', marginBottom: 9 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }}></span>
                  <span style={{ fontSize: 11, color: '#8a90a2' }}>{s.nombre}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: 'monospace' }}>{s.tpl}</span>
                </div>
                <textarea value={tpls[s.tpl] || ''} onChange={function (e) { guardarTpl(s.tpl, e.target.value); }} rows={3} style={{ width: '100%', fontSize: 12.5, border: '1px solid #e4e4ef', borderRadius: 10, padding: '8px 10px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            );
          })}
        </div>
      )}

      {ficha && (function () {
        var m = ficha.m;
        var cap = function (s) { s = (s || '').toString(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
        var ofs = m ? (Array.isArray(m.oficios) && m.oficios.length ? m.oficios : (m.oficio ? [m.oficio] : [])).map(cap).join(' · ') : '';
        var gal = (m && Array.isArray(m.galeria)) ? m.galeria : [];
        var foto = m && m.foto_url;
        var inicial = (ficha.nombre || '?').charAt(0).toUpperCase();
        return (
        <div onClick={function () { setFicha(null); }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, zIndex: 9999, overflowY: 'auto' }}>
          <div onClick={function (e) { e.stopPropagation(); }} style={{ width: '100%', maxWidth: 430, background: '#fff', borderRadius: 18, overflow: 'hidden', marginTop: 16, marginBottom: 24 }}>
            <div style={{ position: 'relative', height: 210, background: 'linear-gradient(135deg,#16294f,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {foto ? <img alt="" src={foto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 70, color: '#fff', fontWeight: 800 }}>{inicial}</span>}
              <span onClick={function () { setFicha(null); }} style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.92)', color: '#16294f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer' }}>✕</span>
            </div>
            <div style={{ padding: '16px 16px 4px' }}>
              <div style={{ fontSize: 21, fontWeight: 800, color: '#16294f' }}>{ficha.nombre}</div>
              <div style={{ fontSize: 13.5, color: '#9aa1b5', marginTop: 2 }}>{ofs || ficha.sub}</div>
              <div style={{ display: 'flex', gap: 8, margin: '12px 0', flexWrap: 'wrap' }}>
                {m && m.verificado && <span style={{ background: '#f3f4f8', borderRadius: 14, padding: '7px 11px', fontSize: 11.5, fontWeight: 700, color: '#3b4156' }}>{'\u{1F6E1} Identidad verificada'}</span>}
                {m && Array.isArray(m.comunas) && m.comunas.length > 0 && <span style={{ background: '#f3f4f8', borderRadius: 14, padding: '7px 11px', fontSize: 11.5, fontWeight: 700, color: '#3b4156' }}>{'\u{1F4CD} ' + m.comunas.join(', ')}</span>}
                {m && !m.suspendido && <span style={{ background: '#e9faf1', color: '#0d9456', borderRadius: 14, padding: '7px 11px', fontSize: 11.5, fontWeight: 700 }}>{'● Disponible'}</span>}
                {m && m.suspendido && <span style={{ background: '#fdecec', color: '#b3261e', borderRadius: 14, padding: '7px 11px', fontSize: 11.5, fontWeight: 700 }}>{'● Suspendido'}</span>}
              </div>
              {m && (m.precio_visita || m.precio_videollamada) ? (
                <div style={{ display: 'flex', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  {m.precio_videollamada ? <span style={{ fontSize: 12, color: '#16294f', background: '#eef4ff', borderRadius: 12, padding: '5px 10px', fontWeight: 700 }}>{'Diagnóstico $' + Number(m.precio_videollamada).toLocaleString('es-CL')}</span> : null}
                  {m.precio_visita ? <span style={{ fontSize: 12, color: '#16294f', background: '#eef4ff', borderRadius: 12, padding: '5px 10px', fontWeight: 700 }}>{'Visita $' + Number(m.precio_visita).toLocaleString('es-CL')}</span> : null}
                </div>
              ) : null}
              {m && m.descripcion && <p style={{ fontSize: 14, lineHeight: 1.6, color: '#2b2f3a', margin: '12px 0' }}>{m.descripcion}</p>}
              {gal.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#16294f', margin: '10px 0 8px' }}>{'\u{1F4F8} Trabajos realizados'}</div>
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {gal.map(function (u, i) { return <a key={i} href={u} target="_blank" rel="noreferrer"><img alt="" src={u} style={{ height: 120, borderRadius: 12, flexShrink: 0 }} /></a>; })}
                  </div>
                </div>
              )}
              <div style={{ fontSize: 15, fontWeight: 800, color: '#16294f', margin: '14px 0 6px' }}>{'⭐ Reseñas'}</div>
              <p style={{ fontSize: 13, color: '#9aa1b5', margin: 0 }}>Aún sin reseñas. Se mostrarán acá cuando los clientes lo califiquen.</p>

              {(fichaUrls.carnet || fichaUrls.selfie || (ficha.v && ficha.v.rut)) && (
                <div style={{ marginTop: 16, background: '#f8fafc', border: '1px solid #eef1f7', borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 11, color: '#9aa1b5', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{'\u{1F6E1} Revisión de identidad (solo admin)'}</div>
                  {(fichaUrls.carnet || fichaUrls.selfie) && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      {fichaUrls.carnet && <a href={fichaUrls.carnet} target="_blank" rel="noreferrer" style={{ flex: 1 }}><img alt="Carnet" src={fichaUrls.carnet} style={{ width: '100%', height: 88, objectFit: 'cover', borderRadius: 8, border: '1px solid #eef1f7' }} /></a>}
                      {fichaUrls.selfie && <a href={fichaUrls.selfie} target="_blank" rel="noreferrer" style={{ flex: 1 }}><img alt="Selfie" src={fichaUrls.selfie} style={{ width: '100%', height: 88, objectFit: 'cover', borderRadius: 8, border: '1px solid #eef1f7' }} /></a>}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#5b6275', lineHeight: 1.7 }}>
                    <div>{'RUT: '}<b>{(ficha.v && ficha.v.rut) || '—'}</b></div>
                    <div>{'Teléfono: '}<b>{ficha.telefono || (ficha.v && ficha.v.telefono) || '—'}</b></div>
                    <div>{'Correo: '}<b>{(ficha.v && ficha.v.email) || '—'}</b></div>
                  </div>
                </div>
              )}
              {!m && !fichaUrls.carnet && <div style={{ fontSize: 13, color: '#9aa1b5', marginTop: 12 }}>Esta persona todavía no completó su ficha pública. Contáctala por WhatsApp para que termine su registro.</div>}
              <div style={{ height: 6 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid #eef1f7' }}>
              <button style={{ flex: '0 0 auto', width: 44, background: '#e8f7ef', color: '#0d9456', border: 'none', borderRadius: 12, fontSize: 17, cursor: 'pointer' }} onClick={function () { irAInbox(ficha); }}>{'\u{1F4AC}'}</button>
              {m && !m.verificado && !m.suspendido && (
                <button style={{ flex: 1, fontSize: 13, color: '#b3261e', background: '#fff', border: '1px solid #f3c9c9', borderRadius: 12, padding: 10, cursor: 'pointer' }} onClick={function () { rechazarCard(ficha); }}>{'✕ Rechazar'}</button>
              )}
              {m && !m.verificado && !m.suspendido && (
                <button style={{ flex: 1.5, fontSize: 13, fontWeight: 700, color: '#fff', background: '#0d9456', border: 'none', borderRadius: 12, padding: 10, cursor: 'pointer' }} onClick={function () { aprobarCard(ficha); }}>{'✓ Aprobar'}</button>
              )}
              {m && m.suspendido && (
                <button style={{ flex: 1.5, fontSize: 13, fontWeight: 700, color: '#0d9456', background: '#fff', border: '1px solid #bfe6cf', borderRadius: 12, padding: 10, cursor: 'pointer' }} onClick={function () { reactivarCard(ficha); setFicha(null); }}>{'↻ Reactivar'}</button>
              )}
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
