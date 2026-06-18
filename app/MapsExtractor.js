'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

// Extrae negocios desde Google Maps (Places API) por oficio + lugar y permite
// agregar sus teléfonos a la lista de campaña (tabla campana_contactos).
const ORANGE = '#2563eb';
const WA = '#0d9456';
const REGIONES = ['Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo', 'Valparaíso', 'Metropolitana de Santiago', "O'Higgins", 'Maule', 'Ñuble', 'Biobío', 'La Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes'];
const OFICIOS_RAPIDOS = ['Gasfíter', 'Electricista', 'Cerrajero', 'Pintor', 'Carpintero', 'Maestro construcción', 'Jardinero', 'Climatización', 'Soldador', 'Vidriería', 'Mudanzas', 'Pisos / cerámica'];

export default function MapsExtractor() {
  const [oficio, setOficio] = useState('');
  const [lugar, setLugar] = useState('');
  const [region, setRegion] = useState('Metropolitana de Santiago');
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [sel, setSel] = useState({});
  const [msg, setMsg] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function jwt() {
    var s = await supabase.auth.getSession();
    return s && s.data && s.data.session ? s.data.session.access_token : null;
  }

  async function buscar() {
    if (!oficio.trim() || !lugar.trim()) { setMsg('Escribe el oficio y la comuna o ciudad.'); return; }
    setBuscando(true); setMsg('Buscando en Google Maps…'); setResultados([]); setSel({});
    try {
      var token = await jwt();
      if (!token) { setMsg('Inicia sesión.'); setBuscando(false); return; }
      var url = '/api/maps-extract?oficio=' + encodeURIComponent(oficio.trim()) + '&lugar=' + encodeURIComponent(lugar.trim());
      var r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
      var d = await r.json();
      if (!d.ok) { setMsg(d.error || 'No se pudo buscar.'); setBuscando(false); return; }
      setResultados(d.results || []);
      // Por defecto marcamos solo los celulares (los que sirven para WhatsApp).
      var s = {}; (d.results || []).forEach(function (x) { if (x.esMovil) s[x.whatsapp] = true; });
      setSel(s);
      setMsg(d.total ? ('Encontrados ' + d.total + ' con teléfono. Revisa y agrega los que quieras.') : 'Sin resultados con teléfono. Prueba otro término.');
    } catch (e) { setMsg('Error: ' + e.message); }
    setBuscando(false);
  }

  function toggle(w) { setSel(function (s) { var n = Object.assign({}, s); n[w] = !n[w]; return n; }); }
  function todos(v) { var s = {}; if (v) resultados.forEach(function (x) { s[x.whatsapp] = true; }); setSel(s); }

  async function agregar() {
    var elegidos = resultados.filter(function (x) { return sel[x.whatsapp]; });
    if (!elegidos.length) { setMsg('Marca al menos un contacto.'); return; }
    setGuardando(true); setMsg('Agregando a la campaña…');
    var filas = elegidos.map(function (x) {
      return {
        whatsapp: x.whatsapp,
        nombre: x.nombre,
        telefono: x.telefono,
        oficio: oficio.trim(),
        comuna: lugar.trim(),
        region: region,
        seg: 'Maps',
        place_id: x.place_id,
        fuente: 'google_maps'
      };
    });
    var r = await supabase.from('campana_contactos').upsert(filas, { onConflict: 'whatsapp', ignoreDuplicates: true });
    setGuardando(false);
    if (r.error) { setMsg('Error al guardar: ' + r.error.message); return; }
    setMsg('¡Listo! Se agregaron ' + elegidos.length + ' contactos a la campaña. Ya aparecen en la pestaña Campaña (Tipo: Maps).');
  }

  var input = { fontSize: 14, padding: '9px 11px', border: '1px solid #e5e7eb', borderRadius: 9, background: '#fff', width: '100%', boxSizing: 'border-box' };
  var lbl = { fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 4, display: 'block' };
  var nSel = resultados.filter(function (x) { return sel[x.whatsapp]; }).length;

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg,#22d3ee,#2563eb)', color: '#fff', borderRadius: 14, padding: '14px 18px', marginBottom: 14 }}>
        <span style={{ fontSize: 22 }}>{'\u{1F5FA}\u{FE0F}'}</span>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Extraer contactos de Google Maps</div>
          <div style={{ fontSize: 13, opacity: .9 }}>Busca por oficio y comuna; agrega los teléfonos a tu lista de campaña.</div>
        </div>
      </div>

      {/* Buscador */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', marginBottom: 10 }}>
          <div style={{ minWidth: 180, flex: 1 }}><label style={lbl}>Oficio / qué buscar</label><input value={oficio} onChange={function (e) { setOficio(e.target.value); }} placeholder="ej: gasfíter" style={input} onKeyDown={function (e) { if (e.key === 'Enter') buscar(); }} /></div>
          <div style={{ minWidth: 160, flex: 1 }}><label style={lbl}>Comuna o ciudad</label><input value={lugar} onChange={function (e) { setLugar(e.target.value); }} placeholder="ej: Maipú" style={input} onKeyDown={function (e) { if (e.key === 'Enter') buscar(); }} /></div>
          <div style={{ width: 200 }}><label style={lbl}>Región (para clasificar)</label><select value={region} onChange={function (e) { setRegion(e.target.value); }} style={input}>{REGIONES.map(function (r) { return <option key={r} value={r}>{r}</option>; })}</select></div>
          <button onClick={buscar} disabled={buscando} style={{ background: ORANGE, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: buscando ? .6 : 1 }}>{buscando ? 'Buscando…' : 'Buscar'}</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {OFICIOS_RAPIDOS.map(function (o) { return <button key={o} onClick={function () { setOficio(o); }} type="button" style={{ fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f3f4f6', color: '#374151' }}>{o}</button>; })}
        </div>
        {msg && <div style={{ fontSize: 12, color: ORANGE, marginTop: 10 }}>{msg}</div>}
      </div>

      {/* Resultados */}
      {resultados.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #f1f1f1' }}>
            <div style={{ fontSize: 13, color: '#374151' }}><b>{nSel}</b> seleccionados de {resultados.length}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={function () { todos(true); }} style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>Todos</button>
              <button onClick={function () { todos(false); }} style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>Ninguno</button>
              <button onClick={agregar} disabled={guardando || !nSel} style={{ background: WA, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 700, opacity: (guardando || !nSel) ? .6 : 1 }}>Agregar a campaña</button>
            </div>
          </div>
          {resultados.map(function (x) {
            var on = !!sel[x.whatsapp];
            return (
              <div key={x.place_id} onClick={function () { toggle(x.whatsapp); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: '1px solid #f6f6f6', cursor: 'pointer', background: on ? '#eef4ff' : '#fff' }}>
                <span style={{ fontSize: 18, color: on ? WA : '#cbd5e1' }}>{on ? '☑' : '☐'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.nombre}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.direccion}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, color: '#374151' }}>{x.telefono}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: x.esMovil ? '#eafaf1' : '#eef4ff', color: x.esMovil ? WA : '#b07a1e' }}>{x.esMovil ? 'Celular' : 'Fijo'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 12, lineHeight: 1.5 }}>
        Los datos provienen de la ficha pública de cada negocio en Google Maps (API de Places). Marcamos como "Celular" los que sirven para WhatsApp; los "Fijo" no reciben mensajes de WhatsApp. Cada búsqueda consume cuota de tu cuenta de Google Cloud.
      </div>
    </div>
  );
}
