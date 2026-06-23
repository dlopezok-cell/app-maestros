// app/api/mapa-zona/route.js
// Devuelve una imagen de mapa (Google Static Maps) con un círculo de ~3 km
// alrededor de la ubicación, con el CENTRO DESPLAZADO (estilo Airbnb) para que
// la casa exacta no quede en el centro. La llave de Google queda en el servidor.
export const runtime = 'nodejs';

function jitterCoord(lat, lng, id) {
  var h = 2166136261; var sId = String(id || '');
  for (var i = 0; i < sId.length; i++) { h = (h ^ sId.charCodeAt(i)) >>> 0; h = (h * 16777619) >>> 0; }
  var ang = (h % 360) * Math.PI / 180;
  var dist = 0.006 + ((h >>> 8) % 100) / 100 * 0.006; // ~0.6 a 1.2 km
  var dLat = dist * Math.cos(ang);
  var dLng = dist * Math.sin(ang) / Math.max(0.2, Math.cos(lat * Math.PI / 180));
  return [lat + dLat, lng + dLng];
}

function svgFallback() {
  var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" width="640" height="320">' +
    '<rect width="640" height="320" fill="#e8edf2"/>' +
    '<rect x="90" y="0" width="16" height="320" fill="#dfe5ec"/>' +
    '<rect x="300" y="0" width="20" height="320" fill="#dfe5ec"/>' +
    '<rect x="510" y="0" width="16" height="320" fill="#dfe5ec"/>' +
    '<rect x="0" y="92" width="640" height="16" fill="#dfe5ec"/>' +
    '<rect x="0" y="226" width="640" height="20" fill="#dfe5ec"/>' +
    '<circle cx="320" cy="160" r="128" fill="#2563eb" fill-opacity="0.14" stroke="#2563eb" stroke-opacity="0.6" stroke-width="3"/>' +
    '<text x="320" y="300" font-family="Arial" font-size="15" fill="#5b6275" text-anchor="middle">Zona aproximada (radio ~3 km)</text></svg>';
  return new Response(s, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600' } });
}

export async function GET(req) {
  var u = new URL(req.url);
  var lat = parseFloat(u.searchParams.get('lat'));
  var lng = parseFloat(u.searchParams.get('lng'));
  var id = u.searchParams.get('id') || '';
  if (isNaN(lat) || isNaN(lng)) return svgFallback();

  var key = process.env.GOOGLE_MAPS_SERVER_KEY;
  var c = jitterCoord(lat, lng, id);
  var clat = c[0], clng = c[1];

  // Puntos del círculo de 3 km.
  var R = 3, pts = [];
  for (var i = 0; i <= 36; i++) {
    var a = i * 10 * Math.PI / 180;
    var dlat = (R / 111.32) * Math.cos(a);
    var dlng = (R / (111.32 * Math.max(0.2, Math.cos(clat * Math.PI / 180)))) * Math.sin(a);
    pts.push((clat + dlat).toFixed(5) + ',' + (clng + dlng).toFixed(5));
  }
  var path = 'fillcolor:0x2563eb22|color:0x2563ebcc|weight:2|' + pts.join('|');

  if (key) {
    var gurl = 'https://maps.googleapis.com/maps/api/staticmap?center=' + clat.toFixed(6) + ',' + clng.toFixed(6) +
      '&zoom=13&size=640x320&scale=2&maptype=roadmap&path=' + encodeURIComponent(path) + '&key=' + key;
    try {
      var r = await fetch(gurl);
      if (r.ok) {
        var ct = r.headers.get('content-type') || '';
        if (ct.indexOf('image') === 0) {
          var buf = await r.arrayBuffer();
          return new Response(buf, { headers: { 'Content-Type': ct, 'Cache-Control': 'public, max-age=86400' } });
        }
      }
    } catch (e) {}
  }
  return svgFallback();
}
