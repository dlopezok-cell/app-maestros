// app/api/maps-extract/route.js
// Extrae negocios desde Google Places (Text Search + Place Details) para sumar
// sus teléfonos a la lista de campaña. Devuelve nombre + teléfono + dirección.
// Seguridad: solo el admin o un usuario de panel activo puede llamarla.
// Config (variables de entorno en Vercel):
//   GOOGLE_MAPS_SERVER_KEY  -> key SIN restricción de dominio (o restringida por IP),
//                              con "Places API" habilitada y facturación activa.
//   (si no existe, usa NEXT_PUBLIC_GOOGLE_MAPS_API_KEY como respaldo)
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const ADMIN_EMAIL = 'dlopezok@gmail.com';
const BASE = 'https://maps.googleapis.com/maps/api/place';

// Convierte un teléfono chileno a formato WhatsApp (56 + 9 dígitos para celular).
function aWhatsapp(tel) {
  var d = String(tel || '').replace(/\D/g, '');
  if (d.indexOf('56') === 0) d = d.slice(2);
  if (d.length > 9) d = d.slice(-9);
  return d ? '56' + d : '';
}
function esMovil(w) { return /^569\d{8}$/.test(w); }

export async function GET(req) {
  try {
    const key = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) return Response.json({ error: 'Falta GOOGLE_MAPS_SERVER_KEY en Vercel.' }, { status: 200 });

    // --- Validar admin / usuario de panel activo ---
    const authHeader = req.headers.get('authorization') || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) return Response.json({ error: 'No autorizado.' }, { status: 401 });
    const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const ures = await supa.auth.getUser(jwt);
    const user = ures && ures.data ? ures.data.user : null;
    if (!user) return Response.json({ error: 'No autorizado.' }, { status: 401 });
    if (user.email !== ADMIN_EMAIL) {
      const pu = await supa.from('panel_usuarios').select('activo').eq('email', user.email).maybeSingle();
      if (!pu.data || !pu.data.activo) return Response.json({ error: 'No autorizado.' }, { status: 401 });
    }

    // --- Parámetros ---
    const url = new URL(req.url);
    const oficio = (url.searchParams.get('oficio') || '').trim();
    const lugar = (url.searchParams.get('lugar') || '').trim();
    if (!oficio || !lugar) return Response.json({ error: 'Falta oficio o lugar.' }, { status: 200 });
    const query = oficio + ' en ' + lugar + ', Chile';

    // --- Text Search ---
    const ts = await fetch(BASE + '/textsearch/json?query=' + encodeURIComponent(query) + '&language=es&region=cl&key=' + encodeURIComponent(key));
    const tsd = await ts.json();
    if (tsd.status && tsd.status !== 'OK' && tsd.status !== 'ZERO_RESULTS') {
      return Response.json({ error: 'Google: ' + (tsd.error_message || tsd.status) }, { status: 200 });
    }
    const places = (tsd.results || []).slice(0, 20);

    // --- Place Details (teléfono) para cada resultado ---
    const out = [];
    for (let i = 0; i < places.length; i++) {
      const p = places[i];
      try {
        const dr = await fetch(BASE + '/details/json?place_id=' + encodeURIComponent(p.place_id) + '&fields=name,formatted_phone_number,international_phone_number,formatted_address&language=es&key=' + encodeURIComponent(key));
        const dd = await dr.json();
        const det = dd.result || {};
        const tel = det.international_phone_number || det.formatted_phone_number || '';
        const w = aWhatsapp(tel);
        if (!w) continue; // sin teléfono no sirve para la campaña
        out.push({
          place_id: p.place_id,
          nombre: det.name || p.name || '',
          telefono: tel,
          whatsapp: w,
          esMovil: esMovil(w),
          direccion: det.formatted_address || p.formatted_address || ''
        });
      } catch (e) { /* salta este lugar */ }
    }

    return Response.json({ ok: true, query: query, total: out.length, results: out }, { status: 200 });
  } catch (e) {
    return Response.json({ error: e.message || 'Error inesperado' }, { status: 200 });
  }
}
