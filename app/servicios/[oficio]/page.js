import { notFound } from 'next/navigation';
import { OFICIOS, ofPorSlug, SITE } from '../../../lib/seo';
import Landing from '../_ui';

export function generateStaticParams() { return OFICIOS.map(function (o) { return { oficio: o.slug }; }); }
export const dynamicParams = true;

export async function generateMetadata({ params }) {
  const of = ofPorSlug(params.oficio);
  if (!of) return {};
  const title = of.profesional + ' a domicilio en Chile — Presupuesto gratis';
  const description = of.profesional + ' cerca de ti: ' + of.gancho.toLowerCase() + '. Pide presupuesto gratis por video a maestros verificados de tu comuna.';
  return { title, description, alternates: { canonical: '/servicios/' + of.slug }, openGraph: { title, description, url: SITE + '/servicios/' + of.slug } };
}

export default function Page({ params }) {
  const of = ofPorSlug(params.oficio);
  if (!of) notFound();
  return <Landing of={of} />;
}
