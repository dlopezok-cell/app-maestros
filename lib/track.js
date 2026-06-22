'use client';
// === Pega aquí tus IDs cuando los tengas. Mientras estén vacíos, NO se carga nada (cero riesgo). ===
export const GA4_ID = '';            // Google Analytics 4, ej: 'G-XXXXXXXXXX'
export const GADS_ID = 'AW-18261145349';           // Google Ads
export const GADS_LEAD_LABEL = '4cYxCKneusMcEIXuy4NE';   // etiqueta de la conversión "Solicitud de presupuesto"

let cargado = false;
export function initAnalytics() {
  if (cargado || typeof window === 'undefined') return;
  const id = GA4_ID || GADS_ID;
  if (!id) return; // sin IDs => no hace nada
  cargado = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  if (GA4_ID) window.gtag('config', GA4_ID);
  if (GADS_ID) window.gtag('config', GADS_ID);
}

// Llamar cuando el cliente envía una solicitud de presupuesto.
export function trackSolicitud(valor) {
  try {
    initAnalytics();
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
    if (GA4_ID) window.gtag('event', 'generate_lead', { currency: 'CLP', value: valor || 0 });
    if (GADS_ID && GADS_LEAD_LABEL) window.gtag('event', 'conversion', { send_to: GADS_ID + '/' + GADS_LEAD_LABEL, currency: 'CLP', value: valor || 0 });
  } catch (e) {}
}
