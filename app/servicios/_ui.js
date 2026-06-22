import Link from 'next/link';
import MaestrosLanding from './MaestrosLanding';
import { OFICIOS, COMUNAS, SITE } from '../../lib/seo';

const NAVY = '#0e1a38', CYAN = '#22d3ee', BLUE = '#2563eb', TXT = '#1c1f2b', MUT = '#5b6275';

function Btn({ href, primary, children }) {
  return <a href={href} style={{ display: 'inline-block', textDecoration: 'none', borderRadius: 12, padding: '13px 22px', fontWeight: 800, fontSize: 15, background: primary ? 'linear-gradient(135deg,#22d3ee,#2563eb)' : '#fff', color: primary ? '#fff' : BLUE, border: primary ? 'none' : '1.5px solid #cfe0fb' }}>{children}</a>;
}
function H2({ children }) { return <h2 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: '34px 0 14px' }}>{children}</h2>; }

export default function Landing({ of, comuna }) {
  const enZona = comuna ? (' en ' + comuna.nombre) : ' a domicilio';
  const titulo = of.profesional + enZona + (comuna ? '' : ' en Chile');
  const otrosOficios = OFICIOS.filter(function (o) { return o.slug !== of.slug; });
  const linkBase = '/servicios/' + of.slug;
  const faqs = [
    { q: '¿Cuánto cuesta ' + of.servicio.toLowerCase() + (comuna ? ' en ' + comuna.nombre : '') + '?', a: 'Depende del trabajo. Por eso recibes presupuestos gratis de varios ' + of.profesional.toLowerCase() + 's de tu zona y eliges el que más te convenga.' },
    { q: '¿Cómo pido un presupuesto?', a: 'Describe tu problema y sube fotos o un video corto. En minutos te llegan cotizaciones de maestros cercanos, sin compromiso.' },
    { q: '¿Es gratis?', a: 'Sí. Pedir presupuesto es 100% gratis. Solo pagas de forma segura por la plataforma si decides contratar.' },
    comuna ? { q: '¿Atienden en ' + comuna.nombre + '?', a: 'Sí. Contamos con ' + of.profesional.toLowerCase() + 's disponibles en ' + comuna.nombre + ' y comunas cercanas.' } : { q: '¿Los maestros son confiables?', a: 'Trabajamos con maestros verificados y con reputación. Además, el pago queda protegido hasta que confirmas el trabajo.' },
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
        <a href="/" style={{ color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(255,255,255,.3)', borderRadius: 9, padding: '7px 12px' }}>Pedir presupuesto</a>
      </header>

      <section style={{ background: NAVY, color: '#fff', padding: '34px 18px 40px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <p style={{ color: CYAN, fontWeight: 700, fontSize: 13, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>{of.servicio}{comuna ? ' · ' + comuna.nombre : ' · Chile'}</p>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: '8px 0 10px', lineHeight: 1.2 }}>{titulo}</h1>
          <p style={{ fontSize: 17, color: '#aab4cf', margin: '0 0 22px' }}>{of.gancho}. Pide presupuesto gratis por video a maestros verificados{comuna ? ' de ' + comuna.nombre : ' de tu comuna'} y elige el mejor.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Btn href="/" primary>Pedir presupuesto gratis</Btn>
            <Btn href="/maestros">Soy maestro, quiero pegas</Btn>
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 18px' }}>
        <MaestrosLanding oficioSlug={of.slug} oficioNombre={of.servicio} profesional={of.profesional} comunaNombre={comuna ? comuna.nombre : null} />
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 18px 50px' }}>
        <H2>Cómo funciona</H2>
        <ol style={{ paddingLeft: 18, margin: 0 }}>
          <li style={{ marginBottom: 8 }}><b>Cuenta tu problema.</b> Describe lo que necesitas y sube fotos o un video corto.</li>
          <li style={{ marginBottom: 8 }}><b>Recibe cotizaciones.</b> Maestros {comuna ? 'de ' + comuna.nombre : 'cercanos'} te envían su presupuesto.</li>
          <li><b>Elige y agenda.</b> Comparas, eliges al mejor y pagas seguro por la plataforma.</li>
        </ol>

        <H2>Servicios de {of.servicio.toLowerCase()}{comuna ? ' en ' + comuna.nombre : ''}</H2>
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          {of.servicios.map(function (s, i) { return <li key={i} style={{ marginBottom: 6 }}>{s}</li>; })}
        </ul>

        <H2>¿Por qué MaestrosEnLínea?</H2>
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          <li style={{ marginBottom: 6 }}><b>Gratis.</b> Pedir y comparar presupuestos no cuesta nada.</li>
          <li style={{ marginBottom: 6 }}><b>Maestros verificados.</b> Con reputación y trabajos reales.</li>
          <li><b>Pago protegido.</b> Tu dinero queda seguro hasta que confirmas el trabajo.</li>
        </ul>

        <H2>Preguntas frecuentes</H2>
        {faqs.map(function (f, i) {
          return <div key={i} style={{ marginBottom: 14 }}>
            <p style={{ fontWeight: 800, color: NAVY, margin: '0 0 3px' }}>{f.q}</p>
            <p style={{ margin: 0, color: MUT }}>{f.a}</p>
          </div>;
        })}

        <div style={{ background: '#f6f8fc', border: '1px solid #e6ecf7', borderRadius: 16, padding: '22px 18px', margin: '30px 0', textAlign: 'center' }}>
          <p style={{ fontWeight: 800, fontSize: 18, color: NAVY, margin: '0 0 12px' }}>¿Necesitas {of.profesional.toLowerCase()}{comuna ? ' en ' + comuna.nombre : ''}?</p>
          <Btn href="/" primary>Pedir presupuesto gratis</Btn>
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
        <p style={{ margin: '8px 0 0' }}>Encuentra al mejor maestro cerca de ti, en todo Chile.</p>
        <p style={{ margin: '6px 0 0' }}><a href="/terminos" style={{ color: '#aab4cf' }}>Términos</a> · <a href="/privacidad" style={{ color: '#aab4cf' }}>Privacidad</a></p>
      </footer>
    </main>
  );
}
