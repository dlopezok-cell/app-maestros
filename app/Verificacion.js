'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Verificacion de identidad del maestro: telefono, direccion (autocompletada),
// RUT, foto del carnet + selfie -> bucket privado "verificaciones".
// La cabecera y esta tarjeta leen el mismo estado (verificaciones.estado).
export default function Verificacion({ usuario, onGuardado }) {
  const [registro, setRegistro] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const [carnet, setCarnet] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [rut, setRut] = useState('');
  const [numSerie, setNumSerie] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [sugs, setSugs] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const debRef = useRef(null);
  const [msg, setMsg] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [cargado, setCargado] = useState(false);

  useEffect(function () {
    if (!usuario) return;
    supabase.from('verificaciones').select('*').eq('user_id', usuario.id).maybeSingle()
      .then(function (r) {
        var d = r.data || null;
        setRegistro(d);
        if (d) {
          if (d.rut) setRut(d.rut);
          if (d.num_serie) setNumSerie(d.num_serie);
          if (d.telefono) setTelefono(d.telefono);
          if (d.direccion) setDireccion(d.direccion);
        }
        setCargado(true);
      });
  }, [usuario]);

  function rutValido(r) {
    const limpio = r.replace(/\./g, '').replace('-', '').toUpperCase();
    if (limpio.length < 8) return false;
    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);
    let suma = 0, mul = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo[i], 10) * mul;
      mul = mul === 7 ? 2 : mul + 1;
    }
    const res = 11 - (suma % 11);
    const dvCalc = res === 11 ? '0' : res === 10 ? 'K' : String(res);
    return dv === dvCalc;
  }

  // Autocompletado de direcciones (Photon / OpenStreetMap, Chile)
  function onDireccion(v) {
    setDireccion(v);
    if (debRef.current) clearTimeout(debRef.current);
    if (!v || v.trim().length < 4) { setSugs([]); return; }
    debRef.current = setTimeout(function () {
      setBuscando(true);
      fetch('https://photon.komoot.io/api/?q=' + encodeURIComponent(v) + '&limit=8&lat=-33.45&lon=-70.66')
        .then(function (r) { return r.json(); })
        .then(function (j) {
          var feats = (j.features || []).filter(function (f) { return f.properties && f.properties.countrycode === 'CL'; });
          setSugs(feats);
          setBuscando(false);
        })
        .catch(function () { setBuscando(false); });
    }, 350);
  }

  function elegirSug(f) {
    var p = f.properties || {};
    var calle = [p.name || p.street, p.housenumber].filter(Boolean).join(' ');
    var com = p.city || p.district || p.county || '';
    setDireccion([calle || p.name, com].filter(Boolean).join(', '));
    setSugs([]);
  }

  var tieneFotos = !!(registro && registro.carnet_path && registro.selfie_path);

  function enviar() {
    if (!rutValido(rut)) { setMsg('RUT invalido. Escribelo como 12.345.678-9'); return; }
    if (!numSerie || numSerie.length < 9) { setMsg('Ingresa el numero de documento del carnet (al frente, ej: 123456789)'); return; }
    if (telefono.replace(/[^0-9]/g, '').length < 8) { setMsg('Ingresa un teléfono válido (ej: +56 9 1234 5678)'); return; }
    if (!direccion || direccion.trim().length < 5) { setMsg('Ingresa tu dirección'); return; }
    if (!tieneFotos && (!carnet || !selfie)) { setMsg('Falta la foto del carnet o la selfie'); return; }
    setSubiendo(true);
    setMsg('Verificando sesión...');
    supabase.auth.getSession().then(function (s) {
      const sesion = s.data ? s.data.session : null;
      if (!sesion) {
        setMsg('Tu sesión no está activa. Si acabas de crear la cuenta, abre el correo de confirmación que te enviamos y vuelve a ingresar.');
        setSubiendo(false);
        return;
      }
      const uid = sesion.user.id;
      const ruta = function (n) { return uid + '/' + n; };
      var carnetPath = registro && registro.carnet_path ? registro.carnet_path : ruta('carnet.jpg');
      var selfiePath = registro && registro.selfie_path ? registro.selfie_path : ruta('selfie.jpg');
      var huboNuevaFoto = !!(carnet || selfie);

      function subirCarnet() {
        if (!carnet) return Promise.resolve();
        carnetPath = ruta('carnet.jpg');
        setMsg('Subiendo carnet...');
        return supabase.storage.from('verificaciones').upload(carnetPath, carnet, { upsert: true }).then(function (r1) {
          if (r1.error) throw new Error('al subir el carnet: ' + r1.error.message);
        });
      }
      function subirSelfie() {
        if (!selfie) return Promise.resolve();
        selfiePath = ruta('selfie.jpg');
        setMsg('Subiendo selfie...');
        return supabase.storage.from('verificaciones').upload(selfiePath, selfie, { upsert: true }).then(function (r2) {
          if (r2.error) throw new Error('al subir la selfie: ' + r2.error.message);
        });
      }

      setMsg('Guardando...');
      subirCarnet().then(subirSelfie).then(function () {
        var nuevoEstado = huboNuevaFoto ? 'pendiente' : (registro && registro.estado ? registro.estado : 'pendiente');
        return supabase.from('verificaciones').upsert({
          user_id: uid,
          email: sesion.user.email,
          rut: rut.trim().toUpperCase(),
          num_serie: numSerie.trim(),
          telefono: telefono.trim(),
          direccion: direccion.trim(),
          carnet_path: carnetPath,
          selfie_path: selfiePath,
          estado: nuevoEstado,
        }, { onConflict: 'user_id' }).select().single();
      }).then(function (r3) {
        if (r3.error) throw new Error('al guardar el registro: ' + r3.error.message);
        setRegistro(r3.data);
        setCarnet(null); setSelfie(null);
        setAbierto(false);
        setMsg(null);
        setSubiendo(false);
        if (onGuardado) onGuardado();
      }).catch(function (e) { setMsg('Error ' + e.message); setSubiendo(false); });
    });
  }

  if (!usuario || !cargado) return null;

  const card = { background: '#fff', borderRadius: 16, padding: 16, margin: '14px 16px', border: '1.5px solid #eee' };
  const btn = { background: '#ff5a3c', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 16px', fontWeight: 800, fontSize: 13, cursor: 'pointer', width: '100%' };
  const editarBtn = { background: '#fff', color: '#ff5a3c', border: '1.5px solid #ffd6cb', borderRadius: 12, padding: '9px 16px', fontWeight: 800, fontSize: 13, cursor: 'pointer', marginTop: 12 };
  const fileBox = { display: 'block', width: '100%', padding: 12, border: '1.5px dashed #ccc', borderRadius: 12, fontSize: 13, marginBottom: 10, background: '#fafafa', cursor: 'pointer' };

  var estado = registro ? registro.estado : null;

  // ---- Vista colapsada (tarjeta de estado + botón para abrir el formulario) ----
  if (!abierto) {
    if (estado === 'aprobado') return (
      <div style={{ ...card, borderColor: '#bce5cf', background: '#f2fbf6' }}>
        <b style={{ color: '#0d9456', fontSize: 14 }}>{'\u{1F6E1} Identidad verificada'}</b>
        <div style={{ fontSize: 12, color: '#7c8499', marginTop: 4 }}>Tu insignia de verificado ya es visible para los clientes.</div>
        <button style={editarBtn} onClick={function () { setAbierto(true); setMsg(null); }}>Editar mis datos</button>
      </div>
    );
    if (estado === 'pendiente') return (
      <div style={{ ...card, borderColor: '#ffe2b8', background: '#fff9f0' }}>
        <b style={{ fontSize: 14 }}>{'\u{23F3} Verificación en revisión'}</b>
        <div style={{ fontSize: 12, color: '#7c8499', marginTop: 4 }}>Recibimos tus datos. Te avisaremos en menos de 24 horas.</div>
        <button style={editarBtn} onClick={function () { setAbierto(true); setMsg(null); }}>Editar / actualizar mis datos</button>
      </div>
    );
    // Sin verificar o rechazado -> banner con botón "Verificar"
    return (
      <div style={card}>
        {estado === 'rechazado' && (
          <div style={{ background: '#fdeeee', border: '1px solid #f5c2c2', borderRadius: 10, padding: 10, fontSize: 12, color: '#b3261e', marginBottom: 10 }}>
            <b>Verificación rechazada.</b>{registro && registro.notas ? ' Motivo: ' + registro.notas : ''} Vuelve a intentarlo con fotos más claras.
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 26 }}>{'\u{1FAAA}'}</span>
          <div style={{ flex: 1 }}>
            <b style={{ fontSize: 14 }}>Verifica tu identidad</b>
            <div style={{ fontSize: 12, color: '#7c8499' }}>Los maestros verificados reciben 3x más trabajos</div>
          </div>
          <button style={{ ...btn, width: 'auto' }} onClick={function () { setAbierto(true); setMsg(null); }}>Verificar</button>
        </div>
      </div>
    );
  }

  // ---- Formulario (abierto) ----
  return (
    <div style={card}>
      <b style={{ fontSize: 14 }}>Tus datos y verificación</b>
      <div style={{ fontSize: 12, color: '#7c8499', margin: '4px 0 12px' }}>Necesitamos tu teléfono, dirección, RUT, una foto de tu carnet (por delante) y una selfie. Solo los verá nuestro equipo y las fotos se eliminan al aprobarte.</div>
      <input value={telefono} onChange={function (e) { setTelefono(e.target.value); }} inputMode="tel" placeholder="Teléfono (ej: +56 9 1234 5678)"
        style={{ width: '100%', padding: 12, border: '1.5px solid #ddd', borderRadius: 12, fontSize: 14, marginBottom: 10 }} />
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <input value={direccion} onChange={function (e) { onDireccion(e.target.value); }} placeholder="Dirección (escribe calle y número)" autoComplete="off"
          style={{ width: '100%', padding: 12, border: '1.5px solid #ddd', borderRadius: 12, fontSize: 14, marginBottom: 0 }} />
        {buscando && <div style={{ fontSize: 11, color: '#9aa1b5', marginTop: 4 }}>Buscando direcciones...</div>}
        {sugs.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, background: '#fff', border: '1.5px solid #eee', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.10)', overflow: 'hidden', marginTop: 4 }}>
            {sugs.map(function (f, i) {
              var p = f.properties || {};
              var linea = [p.name || p.street, p.housenumber].filter(Boolean).join(' ');
              var sub = [p.city || p.district, p.state].filter(Boolean).join(', ');
              return (
                <div key={i} onClick={function () { elegirSug(f); }} style={{ padding: '10px 12px', borderBottom: i < sugs.length - 1 ? '1px solid #f3f3f3' : 'none', cursor: 'pointer', fontSize: 13 }}>
                  <div style={{ fontWeight: 700 }}>{linea || p.name || 'Dirección'}</div>
                  {sub && <div style={{ fontSize: 11, color: '#9aa1b5' }}>{sub}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <input value={rut} onChange={function (e) { setRut(e.target.value); }} placeholder="RUT (ej: 12.345.678-9)"
        style={{ width: '100%', padding: 12, border: '1.5px solid #ddd', borderRadius: 12, fontSize: 14, marginBottom: 10 }} />
      <input value={numSerie} onChange={function (e) { setNumSerie(e.target.value); }} placeholder="N° de documento del carnet (ej: 123456789)"
        style={{ width: '100%', padding: 12, border: '1.5px solid #ddd', borderRadius: 12, fontSize: 14, marginBottom: 10 }} />
      <label style={fileBox}>
        {carnet ? '✅ Carnet nuevo: ' + carnet.name : (tieneFotos ? '\u{1FAAA} Carnet ya cargado — tocar para reemplazar' : '\u{1FAAA} Foto del carnet — tocar para abrir cámara')}
        <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
          onChange={function (e) { setCarnet(e.target.files[0] || null); }} />
      </label>
      <label style={fileBox}>
        {selfie ? '✅ Selfie nueva: ' + selfie.name : (tieneFotos ? '\u{1F933} Selfie ya cargada — tocar para reemplazar' : '\u{1F933} Selfie — tocar para abrir cámara frontal')}
        <input type="file" accept="image/*" capture="user" style={{ display: 'none' }}
          onChange={function (e) { setSelfie(e.target.files[0] || null); }} />
      </label>
      {msg && <p style={{ fontSize: 12, color: msg.indexOf('Error') >= 0 ? '#b3261e' : '#7c8499' }}>{msg}</p>}
      <button style={{ ...btn, opacity: subiendo ? 0.6 : 1 }} disabled={subiendo} onClick={enviar}>
        {subiendo ? 'Guardando...' : 'Guardar y enviar'}
      </button>
      <button style={{ background: 'none', border: 'none', color: '#9aa1b5', fontWeight: 700, fontSize: 12, cursor: 'pointer', width: '100%', marginTop: 8 }}
        onClick={function () { setAbierto(false); setMsg(null); }}>Cancelar</button>
    </div>
  );
}
