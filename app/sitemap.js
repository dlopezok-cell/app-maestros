import { OFICIOS, COMUNAS } from '../lib/seo';

export default function sitemap() {
  const base = 'https://www.maestrosenlinea.cl';
  const now = new Date();
  const out = [
    { url: base + '/', lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: base + '/servicios', lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: base + '/maestros', lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: base + '/unete', lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: base + '/terminos', lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: base + '/privacidad', lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];
  OFICIOS.forEach(function (o) {
    out.push({ url: base + '/servicios/' + o.slug, lastModified: now, changeFrequency: 'weekly', priority: 0.8 });
    COMUNAS.forEach(function (c) {
      out.push({ url: base + '/servicios/' + o.slug + '/' + c.slug, lastModified: now, changeFrequency: 'weekly', priority: 0.6 });
    });
  });
  return out;
}
