import './globals.css';

export const metadata = {
  metadataBase: new URL('https://www.maestrosenlinea.cl'),
  title: {
    default: 'MaestrosEnLínea.cl — Gasfíter, electricista, pintor y más cerca de ti',
    template: '%s · MaestrosEnLínea.cl',
  },
  description: 'Pide presupuesto gratis por video a maestros verificados de tu comuna. Gasfitería, electricidad, pintura, cerrajería y más, en todo Chile.',
  keywords: ['maestros', 'gasfíter', 'electricista', 'pintor', 'cerrajero', 'maestro a domicilio', 'presupuesto', 'cotización', 'Chile', 'Santiago'],
  applicationName: 'MaestrosEnLínea',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    url: 'https://www.maestrosenlinea.cl',
    siteName: 'MaestrosEnLínea.cl',
    title: 'MaestrosEnLínea.cl — Encuentra al mejor maestro cerca de ti',
    description: 'Pide presupuesto gratis por video a maestros verificados de tu comuna. Gasfitería, electricidad, pintura y más en todo Chile.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MaestrosEnLínea.cl — Encuentra al mejor maestro cerca de ti',
    description: 'Presupuesto gratis por video con maestros verificados de tu comuna.',
  },
};

export const viewport = {
  themeColor: '#0e1a38',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
