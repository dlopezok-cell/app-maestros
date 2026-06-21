export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] }],
    sitemap: 'https://www.maestrosenlinea.cl/sitemap.xml',
    host: 'https://www.maestrosenlinea.cl',
  };
}
