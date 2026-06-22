import Link from 'next/link';
import { OFICIOS, COMUNAS, SITE } from '../../lib/seo';

const NAVY = '#0e1a38', CYAN = '#22d3ee', BLUE = '#2563eb', TXT = '#1c1f2b', MUT = '#5b6275';

function Btn({ href, primary, children }) {
  return <a href={href} style={{ display: 'inline-block', textDecoration: 'none', borderRadius: 12, padding: '13px 22px', fontWeight: 800, fontSize: 15, background: primary ? 'linear-gradient(135deg,#22d3ee,#2563eb)' : '#fff', color: primary ? '#fff' : BLUE, border: primary ? 'none' : '1.5px solid #cfe0fb' }}>{children}</a>;
}
function H2({ children }) { return <h2 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: '34px 0 14px' }}>{children}</h2>; }

function Pilar({ icon, titulo, texto }) {
  return (
    <div style={{ border: '1px solid #e6ecf7', borderRadius: 14, padding: '16px 16px' }}>
      <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontWeight: 800, color: NAVY, fontSize: 16, marginBottom: 4 }}>{titulo}</div>
      <div style={{ fontSize: 14, color: MUT }}>{texto}</div>
    </div>
  );
}

export default function Landing({ of, comuna }) {
  const enZona = comuna ? (' en ' + comuna.nombre) : ' a domicilio';
  const titulo = of.profesional + enZona + (comuna ? '' : ' en Chile');
  const otrosOficios = OFICIOS.filter(function (o) { return o.slug !== of.slug; });
  const linkBase = '/servicios/' + of.slug;
  const servL = of.servicio.toLowerCase();

  const faqs = [
    { q: '¿Cómo sé cuánto voy a pagar?', a: 'Recibes presupuestos claros y detallados antes de aceptar. El precio que apruebas es el que pagas: sin sorpresas ni cobros ocultos al final.' },
    { q: '¿Cómo pido un presupuesto?', a: 'Creas tu cuenta gratis, describes tu problema y subes fotos o un video corto. En minutos recibes cotizaciones para comparar, sin compromiso.' },
    { q: '¿El pago es seguro?', a: 'Sí. Tu pago queda protegido por la plataforma y solo se libera al maestro cuando confirmas que el trabajo quedó bien hecho.' },
    comuna
      ? { q: '¿Atienden en ' + comuna.nombre + '?', a: 'Sí. Coordinamos profesionales para ' + comuna.nombre + ' y alrededores. Crea tu cuenta y pide tu presupuesto gratis.' }
      : { q: '¿Tiene algún costo crear la cuenta?', a: 'No. Crear tu cuenta y pedir presupuestos es 100% gratis. Solo pagas si decides contratar, de forma segura por la plataforma.' },
  ];

  const canonical = SITE + linkBase + (comuna ? '/' + comuna.slug : '');
  const crumbs = [
    { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE + '/' },
    { '@type': 'ListItem', position: 2, name: 'Servicios', item: SITE + '/servicios' },
    { '@type': 'ListItem', position: 3, name: of.servicio, item: SITE + linkBase },
  ];
  if (comuna) crumbs.push({ '@type': 'ListItem', position: 4, name: comuna.nombre, item: canonical });
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'BreadcrumbList', itemListElement: crumbs },
      { '@type': 'Service', serviceType: of.servicio, name: titulo, areaServed: { '@type': comuna ? 'City' : 'Country', name: comuna ? comuna.nombre : 'Chile' }, provider: { '@type': 'Organization', name: 'MaestrosEnLínea.cl', url: SITE }, url: canonical },
      { '@type': 'FAQPage', mainEntity: faqs.map(function (f) { return { '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }; }) },
    ],
  };

  return (
    <main style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', color: TXT, lineHeight: 1.6, background: '#fff' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header style={{ background: NAVY, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ color: '#fff', fontWeight: 800, fontSize: 17, textDecoration: 'none' }}>MaestrosEnLínea<span style={{ color: CYAN }}>.cl</span></a>
        <a href="/" style={{ color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(255,255,255,.3)', borderRadius: 9, padding: '7px 12px' }}>Crear cuenta</a>
      </header>

      <section style={{ background: NAVY, color: '#fff', padding: '34px 18px 40px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <span style={{ display: 'inline-block', background: 'rgba(34,211,238,.15)', color: CYAN, border: '1px solid rgba(34,211,238,.4)', borderRadius: 999, padding: '5px 12px', fontSize: 12.5, fontWeight: 800, marginBottom: 12 }}>🇨🇱 Startup chilena · La primera plataforma en Chile para cotizar maestros</span>
          <p style={{ color: CYAN, fontWeight: 700, fontSize: 13, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>{of.servicio}{comuna ? ' · ' + comuna.nombre : ' · Chile'}</p>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: '8px 0 10px', lineHeight: 1.2 }}>{titulo}</h1>
          <p style={{ fontSize: 17, color: '#aab4cf', margin: '0 0 22px' }}>Pide en un solo lugar y te llegan varios presupuestos. Comparas, eliges al maestro <b style={{ color: '#fff' }}>mejor evaluado</b> y <b style={{ color: '#fff' }}>pagas seguro</b>: el precio que apruebas es el que pagas, sin sorpresas.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Btn href="/" primary>Crear cuenta y pedir presupuesto</Btn>
            <Btn href="#como">Ver cómo funciona</Btn>
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 18px 50px' }}>
        <H2>Una nueva forma de contratar {servL}</H2>
        <p style={{ margin: '0 0 18px', color: MUT }}>Contratar un maestro solía ser una apuesta: precios que cambian al final, no saber a quién le abres la puerta y pagar por adelantado sin garantía. <b>MaestrosEnLínea es la primera plataforma en Chile que lo da vuelta:</b> pides en un solo lugar, te llegan presupuestos de maestros verificados y eliges al mejor evaluado.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
          <Pilar icon="📍" titulo="Pide en un solo lugar" texto="Publica tu necesidad una vez y te llegan varios presupuestos. Sin llamar a diez maestros ni perseguir cotizaciones." />
          <Pilar icon="💸" titulo="Sin sorpresas en el precio" texto="Recibes presupuestos claros y detallados, y tú apruebas antes de pagar. Lo que ves es lo que pagas, sin cobros ocultos." />
          <Pilar icon="⭐" titulo="Maestros verificados" texto="Profesionales con identidad verificada. Comparas sus evaluaciones y eliges al mejor calificado para tu trabajo." />
          <Pilar icon="🔒" titulo="Protegemos tu pago" texto="Tu dinero queda protegido por la plataforma y solo se libera al maestro cuando confirmas que el trabajo quedó bien." />
        </div>

        <h2 id="como" style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: '34px 0 14px' }}>Cómo funciona</h2>
        <ol style={{ paddingLeft: 18, margin: 0 }}>
          <li style={{ marginBottom: 8 }}><b>Crea tu cuenta gratis y cuenta tu problema.</b> Describe lo que necesitas y sube fotos o un video corto.</li>
          <li style={{ marginBottom: 8 }}><b>Recibe presupuestos y compáralos.</b> Cotizaciones claras{comuna ? ' de profesionales para ' + comuna.nombre : ''}, sin compromiso.</li>
          <li><b>Aprueba y paga seguro.</b> Eliges el que más te convenga y el pago queda protegido hasta que confirmas el trabajo.</li>
        </ol>

        <H2>Trabajos de {servL}{comuna ? ' en ' + comuna.nombre : ''}</H2>
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          {of.servicios.map(function (s, i) { return <li key={i} style={{ marginBottom: 6 }}>{s}</li>; })}
        </ul>

        <H2>Preguntas frecuentes</H2>
        {faqs.map(function (f, i) {
          return <div key={i} style={{ marginBottom: 14 }}>
            <p style={{ fontWeight: 800, color: NAVY, margin: '0 0 3px' }}>{f.q}</p>
            <p style={{ margin: 0, color: MUT }}>{f.a}</p>
          </div>;
        })}

        <div style={{ background: '#f6f8fc', border: '1px solid #e6ecf7', borderRadius: 16, padding: '24px 18px', margin: '30px 0', textAlign: 'center' }}>
          <p style={{ fontWeight: 800, fontSize: 19, color: NAVY, margin: '0 0 6px' }}>Pide tu presupuesto de {servL}{comuna ? ' en ' + comuna.nombre : ''}</p>
          <p style={{ margin: '0 0 14px', color: MUT, fontSize: 14.5 }}>Gratis, sin compromiso y con pago protegido. Pruébalo en 2 minutos.</p>
          <Btn href="/" primary>Crear cuenta y pedir presupuesto</Btn>
        </div>

        {!comuna && (
          <>
            <H2>{of.profesional} por comuna</H2>
            <p style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: 0 }}>
              {COMUNAS.map(function (c) { return <Link key={c.slug} href={linkBase + '/' + c.slug} style={{ fontSize: 13.5, color: BLUE, textDecoration: 'none', background: '#eef4ff', borderRadius: 8, padding: '6px 10px' }}>{of.profesional} en {c.nombre}</Link>; })}
            </p>
          </>
        )}

        {comuna && (
          <>
            <H2>{of.profesional} en otras comunas</H2>
            <p style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: 0 }}>
              {COMUNAS.filter(function (c) { return c.slug !== comuna.slug; }).slice(0, 14).map(function (c) { return <Link key={c.slug} href={linkBase + '/' + c.slug} style={{ fontSize: 13.5, color: BLUE, textDecoration: 'none', background: '#eef4ff', borderRadius: 8, padding: '6px 10px' }}>{c.nombre}</Link>; })}
            </p>
          </>
        )}

        <H2>Otros servicios{comuna ? ' en ' + comuna.nombre : ''}</H2>
        <p style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: 0 }}>
          {otrosOficios.map(function (o) { return <Link key={o.slug} href={'/servicios/' + o.slug + (comuna ? '/' + comuna.slug : '')} style={{ fontSize: 13.5, color: BLUE, textDecoration: 'none', background: '#eef4ff', borderRadius: 8, padding: '6px 10px' }}>{o.profesional}{comuna ? ' en ' + comuna.nombre : ''}</Link>; })}
        </p>
      </div>

      <footer style={{ background: NAVY, color: '#aab4cf', padding: '22px 18px', fontSize: 13, textAlign: 'center' }}>
        <a href="/" style={{ color: '#fff', fontWeight: 800, textDecoration: 'none' }}>MaestrosEnLínea.cl</a>
        <p style={{ margin: '8px 0 0' }}>Presupuestos claros, pago seguro y sin sorpresas. En todo Chile.</p>
        <p style={{ margin: '6px 0 0' }}><a href="/terminos" style={{ color: '#aab4cf' }}>Términos</a> · <a href="/privacidad" style={{ color: '#aab4cf' }}>Privacidad</a> · <a href="/unete" style={{ color: '#aab4cf' }}>¿Eres maestro?</a></p>
      </footer>
    </main>
  );
}
