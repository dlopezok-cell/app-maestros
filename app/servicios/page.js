import Link from 'next/link';
import { OFICIOS } from '../../lib/seo';

export const metadata = {
  title: 'Servicios de maestros a domicilio en Chile',
  description: 'Gasfíter, electricista, pintor, cerrajero y más. Pide presupuesto gratis por video a maestros verificados de tu comuna.',
  alternates: { canonical: '/servicios' },
  openGraph: { title: 'Servicios de maestros a domicilio en Chile', description: 'Pide presupuesto gratis a maestros verificados de tu comuna.', url: 'https://www.maestrosenlinea.cl/servicios' },
};

export default function ServiciosIndex() {
  return (
    <main style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', color: '#1c1f2b', lineHeight: 1.6 }}>
      <header style={{ background: '#0e1a38', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ color: '#fff', fontWeight: 800, fontSize: 17, textDecoration: 'none' }}>MaestrosEnLínea<span style={{ color: '#22d3ee' }}>.cl</span></a>
        <a href="/" style={{ color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(255,255,255,.3)', borderRadius: 9, padding: '7px 12px' }}>Pedir presupuesto</a>
      </header>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 18px 50px' }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: '#0e1a38', margin: '0 0 8px' }}>Servicios de maestros a domicilio</h1>
        <p style={{ fontSize: 17, color: '#5b6275', margin: '0 0 24px' }}>Elige el servicio que necesitas y recibe presupuestos gratis de maestros verificados de tu comuna, en todo Chile.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {OFICIOS.map(function (o) {
            return <Link key={o.slug} href={'/servicios/' + o.slug} style={{ textDecoration: 'none', border: '1px solid #e6ecf7', borderRadius: 14, padding: '16px 16px', display: 'block' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0e1a38' }}>{o.profesional}</div>
              <div style={{ fontSize: 13, color: '#5b6275', marginTop: 3 }}>{o.gancho}</div>
            </Link>;
          })}
        </div>
      </div>
      <footer style={{ background: '#0e1a38', color: '#aab4cf', padding: '22px 18px', fontSize: 13, textAlign: 'center' }}>
        <a href="/" style={{ color: '#fff', fontWeight: 800, textDecoration: 'none' }}>MaestrosEnLínea.cl</a>
        <p style={{ margin: '8px 0 0' }}>Encuentra al mejor maestro cerca de ti, en todo Chile.</p>
      </footer>
    </main>
  );
}
