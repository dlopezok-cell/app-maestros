import { notFound } from 'next/navigation';
import { OFICIOS, COMUNAS, ofPorSlug, comunaPorSlug, SITE } from '../../../../lib/seo';
import Landing from '../../_ui';

export function generateStaticParams() {
  const out = [];
  OFICIOS.forEach(function (o) { COMUNAS.forEach(function (c) { out.push({ oficio: o.slug, comuna: c.slug }); }); });
  return out;
}
export const dynamicParams = true;

export async function generateMetadata({ params }) {
  const of = ofPorSlug(params.oficio), c = comunaPorSlug(params.comuna);
  if (!of || !c) return {};
  const title = of.profesional + ' en ' + c.nombre + ' — Presupuesto gratis';
  const description = '¿Buscas ' + of.profesional.toLowerCase() + ' en ' + c.nombre + '? ' + of.gancho + '. Recibe presupuestos gratis de maestros verificados de ' + c.nombre + ' por video.';
  return { title, description, alternates: { canonical: '/servicios/' + of.slug + '/' + c.slug }, openGraph: { title, description, url: SITE + '/servicios/' + of.slug + '/' + c.slug } };
}

export default function Page({ params }) {
  const of = ofPorSlug(params.oficio), c = comunaPorSlug(params.comuna);
  if (!of || !c) notFound();
  return <Landing of={of} comuna={c} />;
}
