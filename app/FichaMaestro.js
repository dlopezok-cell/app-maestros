'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Verificacion from './Verificacion';
import RegistroMaestro from './RegistroMaestro';
import GaleriaMaestro from './GaleriaMaestro';

// Ficha del maestro en una sola tarjeta con secciones plegables (acordeón).
// Cada sección se edita y guarda por separado; al guardar se cierra y muestra
// un resumen. Reabrir = tocar la sección. Los hijos van en modo "plano".
const NOMBRE_OFICIO = { gasfiteria: 'Gasfitería', electricidad: 'Electricidad', cerrajeria: 'Cerrajería', pintura: 'Pintura', calefont: 'Calefont', limpieza: 'Limpieza' };

export default function FichaMaestro({ usuario }) {
  const [abierta, setAbierta] = useState(null); // 'identidad' | 'ficha' | 'galeria' | null
  const [r, setR] = useState({});
  const [cargado, setCargado] = useState(false);

  function cargar() {
    if (!usuario) return;
    Promise.all([
      supabase.from('perfiles').select('nombre').eq('id', usuario.id).maybeSingle(),
      supabase.from('verificaciones').select('telefono, direccion, estado').eq('user_id', usuario.id).maybeSingle(),
      supabase.from('maestros').select('oficios, oficio, anos_experiencia, precio_videollamada, descripcion, galeria').eq('id', usuario.id).maybeSingle()
    ]).then(function (res) {
      var p = res[0].data || {}, v = res[1].data || {}, m = res[2].data || {};
      setR({
        nombre: p.nombre || (usuario.email || '').split('@')[0],
        telefono: v.telefono || '', direccion: v.direccion || '', estado: v.estado || null,
        oficios: (m.oficios && m.oficios.length ? m.oficios : (m.oficio ? [m.oficio] : [])),
        anos: m.anos_experiencia, precio: m.precio_videollamada, descripcion: m.descripcion || '',
        galeria: m.galeria || []
      });
      setCargado(true);
    });
  }
  useEffect(cargar, [usuario]);

  function onGuardado() { setAbierta(null); cargar(); window.scrollTo(0, 0); }
  function toggle(id) { setAbierta(abierta === id ? null : id); }

  // resúmenes
  var oficiosTxt = (r.oficios || []).map(function (o) { return NOMBRE_OFICIO[o] || o; }).join(' · ');
  var idResumen = [r.nombre, r.telefono, r.direccion].filter(Boolean).join(' · ');
  var fichaResumen = [oficiosTxt, r.anos ? r.anos + ' años' : '', r.precio ? '$' + Number(r.precio).toLocaleString('es-CL') : ''].filter(Boolean).join(' · ');
  var galResumen = (r.galeria && r.galeria.length) ? r.galeria.length + ' foto' + (r.galeria.length === 1 ? '' : 's') : '';

  var idChip = r.estado === 'aprobado'
    ? { t: '✓ Verificado', bg: '#E1F5EE', fg: '#0F6E56' }
    : (r.estado === 'pendiente' ? { t: 'En revisión', bg: '#fff7ea', fg: '#b07a1e' } : { t: 'Falta verificar', bg: '#f1f0f5', fg: '#7c8499' });

  const wrap = { background: '#fff', borderRadius: 18, border: '1px solid #eef0f5', overflow: 'hidden', margin: '14px 16px' };
  const sep = { borderTop: '1px solid #f1f1f5' };

  function Seccion(props) {
    var open = abierta === props.id;
    var hayResumen = !!props.resumen;
    return (
      <div style={open ? { ...sep, background: '#faf9ff' } : sep}>
        <button onClick={function () { toggle(props.id); }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '14px 15px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ fontSize: 19 }}>{props.icono}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#1c1f2b' }}>{props.titulo}</span>
            <span style={{ display: 'block', fontSize: 12, color: hayResumen ? '#7c8499' : '#b6bccb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{props.resumen || 'Sin completar'}</span>
          </span>
          {props.chip && !open && <span style={{ fontSize: 11, fontWeight: 700, color: props.chip.fg, background: props.chip.bg, borderRadius: 999, padding: '3px 9px', whiteSpace: 'nowrap' }}>{props.chip.t}</span>}
          <span style={{ fontSize: 13, color: '#9aa1b5', fontWeight: 800 }}>{open ? '⌃' : (hayResumen ? 'Editar' : 'Completar')}</span>
        </button>
        {open && <div style={{ padding: '0 15px 16px' }}>{props.children}</div>}
      </div>
    );
  }

  if (!cargado) return <div className="body" style={{ paddingTop: 16 }}><p style={{ fontSize: 13, color: '#9aa1b5' }}>Cargando tu ficha...</p></div>;

  return (
    <div style={wrap}>
      <div style={{ padding: '14px 16px 10px' }}>
        <b style={{ fontSize: 15 }}>Mi ficha de maestro</b>
        <div style={{ fontSize: 12, color: '#7c8499', marginTop: 2 }}>Toca cada sección para completarla o editarla. Cada una se guarda por separado.</div>
      </div>

      <Seccion id="identidad" icono={'\u{1FAAA}'} titulo="Datos e identidad" resumen={idResumen} chip={idChip}>
        <Verificacion usuario={usuario} plano onGuardado={onGuardado} />
      </Seccion>

      <Seccion id="ficha" icono={'\u{1F6E0}'} titulo="Ficha profesional" resumen={fichaResumen}>
        <RegistroMaestro usuario={usuario} plano onGuardado={onGuardado} />
      </Seccion>

      <Seccion id="galeria" icono={'\u{1F4F8}'} titulo="Galería de trabajos" resumen={galResumen}>
        <GaleriaMaestro usuario={usuario} plano onGuardado={onGuardado} />
      </Seccion>
    </div>
  );
}
