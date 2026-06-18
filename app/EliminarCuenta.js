'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

// Zona de peligro: el usuario elimina su cuenta y todos sus datos.
// Requisito de App Store y Play Store + derecho de cancelación (Ley 21.719).
// Llama a la RPC eliminar_mi_cuenta(), cierra sesión y redirige.
export default function EliminarCuenta(props) {
  var redirigir = props && props.redirigir ? props.redirigir : '/';
  var [abierto, setAbierto] = useState(false);
  var [texto, setTexto] = useState('');
  var [cargando, setCargando] = useState(false);
  var [error, setError] = useState(null);

  function eliminar() {
    setError(null);
    setCargando(true);
    supabase.rpc('eliminar_mi_cuenta').then(function (r) {
      if (r.error) {
        setCargando(false);
        setError('No se pudo eliminar: ' + r.error.message + '. Si el problema persiste, escríbenos a hola@maestrosenlinea.cl.');
        return;
      }
      supabase.auth.signOut().then(function () {
        if (typeof window !== 'undefined') window.location.href = redirigir;
      });
    });
  }

  var card = { border: '1px solid #f1c2bd', background: '#eef4ff', borderRadius: 16, padding: 16, marginTop: 18 };
  var btnRojo = { width: '100%', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 12, padding: 13, fontWeight: 800, fontSize: 14, cursor: 'pointer' };
  var btnGhost = { flex: 1, background: '#fff', color: '#41434d', border: '1.5px solid #e4e4ea', borderRadius: 12, padding: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer' };
  var inp = { width: '100%', padding: 12, borderRadius: 12, border: '1.5px solid #e4b4ae', fontSize: 14, marginTop: 10, marginBottom: 4, boxSizing: 'border-box' };

  return (
    <div style={card}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#a3271b', marginBottom: 4 }}>Eliminar mi cuenta</div>
      <div style={{ fontSize: 12.5, color: '#6b5450', lineHeight: 1.5 }}>
        Esto borra de forma permanente tu cuenta y tus datos (perfil, cotizaciones, mensajes y reservas). No se puede deshacer.
      </div>

      {!abierto && (
        <button onClick={function () { setAbierto(true); }} style={{ ...btnRojo, marginTop: 12 }}>Eliminar mi cuenta</button>
      )}

      {abierto && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12.5, color: '#6b5450' }}>Para confirmar, escribe <b>ELIMINAR</b>:</div>
          <input value={texto} onChange={function (e) { setTexto(e.target.value); }} placeholder="ELIMINAR" style={inp} />
          {error && <div style={{ fontSize: 12.5, color: '#b3261e', margin: '6px 0' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={function () { setAbierto(false); setTexto(''); setError(null); }} disabled={cargando} style={btnGhost}>Cancelar</button>
            <button
              onClick={eliminar}
              disabled={cargando || texto.trim().toUpperCase() !== 'ELIMINAR'}
              style={{ ...btnRojo, flex: 1, opacity: (cargando || texto.trim().toUpperCase() !== 'ELIMINAR') ? 0.5 : 1, width: 'auto' }}
            >
              {cargando ? 'Eliminando...' : 'Sí, eliminar todo'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
