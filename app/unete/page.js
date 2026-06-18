'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

// Landing de reclutamiento de maestros (pre-lanzamiento). Captura interés en
// maestros_interesados. Incluye oferta "Maestro Fundador" y referidos.
export default function Unete() {
  const [cats, setCats] = useState([]);
  const [nombre, setNombre] = useState('');
  const [oficio, setOficio] = useState('');
  const [oficioOtro, setOficioOtro] = useState('');
  const [comuna, setComuna] = useState('');
  const REGIONES = ['Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo', 'Valparaíso', 'Metropolitana de Santiago', "O'Higgins", 'Maule', 'Ñuble', 'Biobío', 'La Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes'];
  const [tel, setTel] = useState('');
  const [ref, setRef] = useState('');
  const [inf, setInf] = useState('');
  const [msg, setMsg] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(function () {
    supabase.from('catalogos').select('valor, slug').eq('tipo', 'especialidad').eq('activo', true).order('orden', { ascending: true })
      .then(function (r) { var d = r.data || []; setCats(d); if (d.length) setOficio(d[0].valor); });
    if (typeof window !== 'undefined') {
      var params = new URLSearchParams(window.location.search);
      var q = params.get('ref');
      if (q) setRef(q);
      // Código de influencer: viene en ?inf= o en la cookie mel_ref (la deja /r/<código>).
      var iq = params.get('inf');
      if (!iq) { var m = document.cookie.match(/(?:^|; )mel_ref=([^;]+)/); if (m) iq = decodeURIComponent(m[1]); }
      if (iq) setInf(iq);
    }
  }, []);

  function enviar() {
    if (!nombre.trim()) { setMsg('Escribe tu nombre'); return; }
    var n = (tel || '').replace(/\D/g, '');
    if (n.length < 8) { setMsg('Escribe tu WhatsApp (8 dígitos)'); return; }
    if (oficio === 'Otro' && !oficioOtro.trim()) { setMsg('Especifica tu oficio'); return; }
    var oficioFinal = oficio === 'Otro' ? oficioOtro.trim() : oficio;
    setEnviando(true); setMsg('Enviando...');
    supabase.from('maestros_interesados').insert({
      nombre: nombre.trim(),
      oficio: oficioFinal || null,
      comuna: comuna.trim() || null,
      whatsapp: '+56 9 ' + n.slice(-8),
      referido_por: ref.trim() || null,
      ref: inf.trim() || null,
    }).then(function (r) {
      setEnviando(false);
      if (r.error) { setMsg('Error: ' + r.error.message); return; }
      try { fetch('/api/notificar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'maestro_interesado', nombre: nombre.trim(), oficio: oficioFinal, comuna: comuna }) }); } catch (e) {}
      setOk(true);
    });
  }

  function compartir() {
    var url = (typeof window !== 'undefined' ? window.location.origin : 'https://maestrosenlinea.cl') + '/unete?ref=' + encodeURIComponent(nombre.trim());
    var texto = 'Te recomiendo sumarte a MaestrosEnLínea: recibes trabajos sin pagar publicidad y como Maestro Fundador tienes 0% de comisión. Inscríbete aquí: ' + url;
    var wa = 'https://wa.me/?text=' + encodeURIComponent(texto);
    if (typeof window !== 'undefined') window.open(wa, '_blank');
  }

  var wrap = { minHeight: '100vh', background: '#fff', color: '#16181f', padding: '20px 18px 44px', boxSizing: 'border-box' };
  var col = { width: '100%', maxWidth: 440, margin: '0 auto' };
  var inp = { width: '100%', padding: 13, borderRadius: 12, border: '1.5px solid #e4e4ea', fontSize: 14, marginBottom: 10, boxSizing: 'border-box', background: '#fff' };
  var feat = function (e, t) { return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
      <span style={{ fontSize: 18 }}>{e}</span><span style={{ fontSize: 13.5, color: '#41434d' }}>{t}</span>
    </div>
  ); };

  if (ok) return (
    <main><div style={wrap}><div style={{ ...col, textAlign: 'center', paddingTop: 40 }}>
      <div style={{ fontSize: 52 }}>{'\u{1F389}'}</div>
      <h1 style={{ fontSize: 24, fontWeight: 900, margin: '10px 0 6px' }}>¡Quedaste inscrito!</h1>
      <p style={{ fontSize: 14.5, color: '#6b7184', lineHeight: 1.5, margin: '0 auto 18px', maxWidth: 360 }}>Te contactaremos por WhatsApp para activar tu cuenta de <b>Maestro Fundador</b> antes del lanzamiento. Eres de los primeros 🚀</p>
      <a href="/maestros" style={{ textDecoration: 'none', display: 'block', marginBottom: 12 }}>
        <div style={{ background: 'linear-gradient(150deg,#22d3ee,#2563eb)', color: '#fff', borderRadius: 14, padding: 15, fontWeight: 800, fontSize: 15, boxShadow: '0 8px 20px rgba(255,90,60,.3)' }}>Completar mi ficha ahora →</div>
      </a>
      <p style={{ fontSize: 11.5, color: '#9aa1b5', margin: '0 0 18px' }}>O hazlo después cuando te contactemos. Toma ~3 minutos: foto, dirección y verificación.</p>
      <div style={{ background: '#eef4ff', border: '1px solid #dbe7fb', borderRadius: 16, padding: 16, textAlign: 'left', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{'\u{1F381}'} Gana invitando a otros maestros</div>
        <div style={{ fontSize: 12.5, color: '#6b5a3a', lineHeight: 1.45 }}>Comparte tu invitación: por cada maestro que se sume con tu nombre, los dos ganan beneficios de fundador.</div>
      </div>
      <button onClick={compartir} style={{ width: '100%', background: '#25d366', color: '#fff', border: 'none', borderRadius: 14, padding: 15, fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>{'\u{1F4F2} Invitar maestros por WhatsApp'}</button>
      <a href="/" style={{ display: 'inline-block', marginTop: 16, color: '#9aa1b5', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Volver al inicio</a>
    </div></div></main>
  );

  return (
    <main>
      <div style={wrap}>
        <div style={col}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 22 }}>{'\u{1F6E0}'}</span>
            <span style={{ fontSize: 15, fontWeight: 800 }}>MaestrosEnLínea</span>
          </div>

          <div style={{ background: 'linear-gradient(150deg,#1f2547,#3a2a6b)', color: '#fff', borderRadius: 20, padding: '22px 18px', marginBottom: 18, textAlign: 'center' }}>
            <span style={{ display: 'inline-block', background: '#ffd23c', color: '#2a2350', fontWeight: 900, fontSize: 10.5, padding: '4px 11px', borderRadius: 20, letterSpacing: .5 }}>MAESTRO FUNDADOR</span>
            <h1 style={{ fontSize: 24, fontWeight: 900, margin: '12px 0 6px', lineHeight: 1.15 }}>Recibe trabajos sin pagar publicidad</h1>
            <p style={{ fontSize: 13.5, opacity: .9, lineHeight: 1.5, margin: 0 }}>Súmate gratis antes del lanzamiento. Los primeros maestros entran con <b>0% de comisión</b> y el sello <b>Fundador</b>.</p>
          </div>

          <div style={{ marginBottom: 18 }}>
            {feat('\u{1F4B0}', 'Te llegan clientes de tu comuna directo al celular')}
            {feat('\u{1F6E1}', 'Pago protegido: el cliente paga y tú cobras seguro')}
            {feat('\u{1F4F8}', 'El cliente manda fotos y video; cotizas sin moverte')}
            {feat('\u{2B50}', 'Construye tu reputación con reseñas reales')}
          </div>

          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Inscríbete en 30 segundos</div>
          <input value={nombre} onChange={function (e) { setNombre(e.target.value); }} placeholder="Tu nombre y apellido" style={inp} />
          <label style={{ fontSize: 12, fontWeight: 700, color: '#5b6275' }}>Tu especialidad</label>
          <select value={oficio} onChange={function (e) { setOficio(e.target.value); }} style={{ ...inp, marginTop: 4 }}>
            {cats.map(function (c) { return <option key={c.slug} value={c.valor}>{c.valor}</option>; })}
            <option value="Otro">Otro</option>
          </select>
          {oficio === 'Otro' && (
            <input value={oficioOtro} onChange={function (e) { setOficioOtro(e.target.value); }} placeholder="Especifica tu oficio (ej: Cerrajería)" autoFocus style={{ ...inp, border: '1.5px solid #2563eb' }} />
          )}
          <label style={{ fontSize: 12, fontWeight: 700, color: '#5b6275' }}>Tu región</label>
          <select value={comuna} onChange={function (e) { setComuna(e.target.value); }} style={{ ...inp, marginTop: 4, color: comuna ? '#16181f' : '#9aa1b5' }}>
            <option value="">Selecciona tu región</option>
            {REGIONES.map(function (r) { return <option key={r} value={r} style={{ color: '#16181f' }}>{r}</option>; })}
          </select>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#5b6275' }}>Tu WhatsApp</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 4, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 11px', background: '#f5f5f7', borderRadius: 12, fontSize: 14, fontWeight: 700, color: '#41434d' }}>{'\u{1F1E8}\u{1F1F1} +56 9'}</div>
            <input value={tel} onChange={function (e) { setTel(e.target.value.replace(/\D/g, '').slice(0, 8)); }} placeholder="1234 5678" inputMode="numeric" style={{ ...inp, marginBottom: 0 }} />
          </div>
          <input value={ref} onChange={function (e) { setRef(e.target.value); }} placeholder="¿Quién te invitó? (opcional)" style={inp} />

          {msg && <p style={{ fontSize: 13, color: msg.indexOf('Error') >= 0 || msg.indexOf('Escribe') >= 0 ? '#b3261e' : '#0d9456', margin: '2px 0 8px' }}>{msg}</p>}
          <button onClick={enviar} disabled={enviando} style={{ width: '100%', background: 'linear-gradient(150deg,#22d3ee,#2563eb)', color: '#fff', border: 'none', borderRadius: 14, padding: 15, fontWeight: 800, fontSize: 15, cursor: 'pointer', opacity: enviando ? 0.6 : 1, boxShadow: '0 8px 20px rgba(255,90,60,.3)' }}>{enviando ? 'Enviando...' : 'Quiero sumarme como Fundador'}</button>
          <p style={{ fontSize: 11, color: '#9aa1b5', textAlign: 'center', marginTop: 10 }}>Gratis. Te contactamos por WhatsApp para activarte.</p>
        </div>
      </div>
    </main>
  );
}
