import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'MaestrosEnLínea.cl — Encuentra al mejor maestro cerca de ti';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Og() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0e1a38', fontFamily: 'sans-serif', padding: '40px' }}>
        <div style={{ fontSize: 92, fontWeight: 800, color: '#ffffff', letterSpacing: '-2px' }}>MaestrosEnLínea.cl</div>
        <div style={{ width: 120, height: 6, background: '#22d3ee', borderRadius: 4, marginTop: 8 }} />
        <div style={{ fontSize: 38, color: '#aab4cf', marginTop: 34, textAlign: 'center', maxWidth: 950 }}>Gasfíter, electricista, pintor y más — cerca de ti, en todo Chile</div>
        <div style={{ fontSize: 28, color: '#22d3ee', marginTop: 36, fontWeight: 700 }}>Pide presupuesto gratis por video</div>
      </div>
    ),
    { width: size.width, height: size.height }
  );
}
