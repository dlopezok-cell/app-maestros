'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import CabeceraMaestro from '../CabeceraMaestro';
import Verificacion from '../Verificacion';
import PresupuestosMaestro from '../PresupuestosMaestro';
import RegistroMaestro from '../RegistroMaestro';
import GaleriaMaestro from '../GaleriaMaestro';
import Bienvenida from '../Bienvenida';

const OWNER = 'dlopezok@gmail.com';

// App de MAESTROS (ruta /maestros). Separada de la app de clientes.
export default function Maestros() {
  const [usuario, setUsuario] = useState(null);
  const [cargado, setCargado] = useState(false);

  useEffect(function () {
    supabase.auth.getUser().then(function (r) {
      if (r.data && r.data.user) setUsuario(r.data.user);
      setCargado(true);
    });
  }, []);

  function salir() {
    supabase.auth.signOut().then(function () { setUsuario(null); });
  }

  if (!cargado) return <main><div className="body" style={{ paddingTop: 30 }}><p>Cargando...</p></div></main>;

  if (!usuario || (usuario.email || '').toLowerCase() !== OWNER) return <Bienvenida />;

  return (
    <main>
      <CabeceraMaestro usuario={usuario} />
      <RegistroMaestro usuario={usuario} />
      <GaleriaMaestro usuario={usuario} />
      <Verificacion usuario={usuario} />
      <PresupuestosMaestro usuario={usuario} />

      <div className="body" style={{ paddingTop: 4, paddingBottom: 34 }}>
        <button className="gbtn full" style={{ background: '#fff', color: '#b3261e', border: '1.5px solid #f0c8c2', boxShadow: 'none' }} onClick={salir}>Cerrar sesión</button>
        <a href="/" style={{ display: 'block', textAlign: 'center', color: '#9aa1b5', fontWeight: 700, fontSize: 13, marginTop: 14, textDecoration: 'none' }}>Ir a la app de clientes →</a>
      </div>
    </main>
  );
}
