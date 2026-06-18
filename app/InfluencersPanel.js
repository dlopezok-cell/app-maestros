'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const SITE = 'https://www.maestrosenlinea.cl';
const ORANGE = '#2563eb';

function slug(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 30);
}

export default function InfluencersPanel() {
  const [codigos, setCodigos] = useState([]);
  const [clics, setClics] = useState({});
  const [interes, setInteres] = useState({});
  const [maes, setMaes] = useState({});
  const [clis, setClis] = useState({});
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [plataforma, setPlataforma] = useState('Instagram');
  const [destino, setDestino] = useState('maestros');
  const [msg, setMsg] = useState('');

  useEffect(function () { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    try {
      var c = await supabase.from('ref_codes').select('*').order('creado_en', { ascending: false });
      setCodigos(c.data || []);
      var cl = await supabase.from('ref_clics').select('codigo');
      var cc = {}; (cl.data || []).forEach(function (x) { cc[x.codigo] = (cc[x.codigo] || 0) + 1; });
      setClics(cc);
      var mi = await supabase.from('maestros_interesados').select('ref');
      var im = {}; (mi.data || []).forEach(function (x) { if (x.ref) im[x.ref] = (im[x.ref] || 0) + 1; });
      setInteres(im);
      var pf = await supabase.from('perfiles').select('rol, ref');
      var mm = {}, kk = {};
      (pf.data || []).forEach(function (x) {
        if (!x.ref) return;
        if (x.rol === 'maestro') mm[x.ref] = (mm[x.ref] || 0) + 1;
        else kk[x.ref] = (kk[x.ref] || 0) + 1;
      });
      setMaes(mm); setClis(kk);
    } catch (e) {}
    setCargando(false);
  }

  async function crear() {
    var cod = slug(codigo || nombre);
    if (!cod) { setMsg('Escribe un nombre o código.'); return; }
    setMsg('Creando…');
    var r = await supabase.from('ref_codes').insert({ codigo: cod, nombre: nombre || cod, plataforma: plataforma, destino: destino });
    if (r.error) { setMsg(r.error.message.indexOf('duplicate') >= 0 ? 'Ese código ya existe, elige otro.' : r.error.message); return; }
    setNombre(''); setCodigo(''); setMsg('¡Código creado!');
    cargar();
  }
  function copiar(cod) {
    var link = SITE + '/r/' + cod;
    if (navigator.clipboard) navigator.clipboard.writeText(link);
    setMsg('Link de "' + cod + '" copiado: ' + link);
  }

  var input = { fontSize: 14, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 9, background: '#fff', width: '100%' };
  var lbl = { fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 4, display: 'block' };
  var th = { padding: '8px 10px', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', textAlign: 'left' };
  var td = { padding: '8px 10px', fontSize: 13, borderTop: '1px solid #f1f1f1' };

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg,#22d3ee,#2563eb)', color: '#fff', borderRadius: 14, padding: '14px 18px', marginBottom: 14 }}>
        <span style={{ fontSize: 22 }}>{'\u{1F517}'}</span>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Influencers · códigos de seguimiento</div>
          <div style={{ fontSize: 13, opacity: .9 }}>Crea un link por influencer y mide clics, interesados y registros.</div>
        </div>
      </div>

      {/* Crear código */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Crear nuevo código</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ minWidth: 170, flex: 1 }}><label style={lbl}>Nombre del influencer</label><input value={nombre} onChange={function (e) { setNombre(e.target.value); if (!codigo) setCodigo(slug(e.target.value)); }} placeholder="ej: Juana López" style={input} /></div>
          <div style={{ width: 160 }}><label style={lbl}>Código (link)</label><input value={codigo} onChange={function (e) { setCodigo(slug(e.target.value)); }} placeholder="juanalopez" style={input} /></div>
          <div style={{ width: 150 }}><label style={lbl}>Plataforma</label><select value={plataforma} onChange={function (e) { setPlataforma(e.target.value); }} style={input}>{['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Otro'].map(function (p) { return <option key={p} value={p}>{p}</option>; })}</select></div>
          <div style={{ width: 200 }}><label style={lbl}>El link lleva a</label><select value={destino} onChange={function (e) { setDestino(e.target.value); }} style={input}><option value="maestros">Inscripción maestros (/unete)</option><option value="home">Página de inicio (/)</option><option value="cliente">App cliente (/)</option></select></div>
          <button onClick={crear} style={{ background: ORANGE, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Crear código</button>
        </div>
        {codigo && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>Link que compartirá: <b>{SITE + '/r/' + slug(codigo)}</b></div>}
        {msg && <div style={{ fontSize: 12, color: ORANGE, marginTop: 6 }}>{msg}</div>}
      </div>

      {/* Tabla de códigos */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#fafafa' }}>
              <th style={th}>Influencer</th><th style={th}>Va a</th><th style={th}>Clics</th><th style={th}>Form 1</th><th style={th}>Form 2 / Clientes</th><th style={th}>Conv.</th><th style={th}>Link</th>
            </tr></thead>
            <tbody>
              {codigos.map(function (c) {
                var cl = clics[c.codigo] || 0;
                var f1 = interes[c.codigo] || 0;
                var f2 = c.destino === 'cliente' ? (clis[c.codigo] || 0) : (maes[c.codigo] || 0);
                var conv = cl > 0 ? Math.round((c.destino === 'cliente' ? f2 : f1) / cl * 100) : 0;
                return (
                  <tr key={c.codigo}>
                    <td style={td}><b>{c.nombre || c.codigo}</b><div style={{ fontSize: 11, color: '#9ca3af' }}>{(c.plataforma || '') + ' · /r/' + c.codigo}</div></td>
                    <td style={td}>{c.destino === 'cliente' ? 'App cliente' : c.destino === 'home' ? 'Inicio (/)' : 'Inscripción (/unete)'}</td>
                    <td style={td}>{cl}</td>
                    <td style={td}>{f1}</td>
                    <td style={td}>{f2}</td>
                    <td style={Object.assign({}, td, { color: ORANGE, fontWeight: 700 })}>{conv}%</td>
                    <td style={td}><button onClick={function () { copiar(c.codigo); }} style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 700, color: '#075E54' }}>Copiar link</button></td>
                  </tr>
                );
              })}
              {!cargando && codigos.length === 0 && <tr><td style={td} colSpan="7"><span style={{ color: '#9ca3af' }}>Aún no hay códigos. Crea el primero arriba.</span></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 10 }}>Form 1 = dejaron datos (interés). Form 2/Clientes = registro completo. "Conv." = conversión sobre los clics. Comparte el link /r/&lt;código&gt; en la bio o post del influencer.</div>
    </div>
  );
}
