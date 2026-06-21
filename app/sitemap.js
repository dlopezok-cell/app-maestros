export default function sitemap() {
  const base = 'https://www.maestrosenlinea.cl';
  const now = new Date();
  return [
    { url: base + '/', lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: base + '/maestros', lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: base + '/unete', lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: base + '/terminos', lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: base + '/privacidad', lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
