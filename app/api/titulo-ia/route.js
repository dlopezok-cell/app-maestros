// app/api/titulo-ia/route.js
// Genera un título corto (con IA) a partir de lo que describe el cliente, para mostrarlo
// en la lista de cotizaciones del maestro. Ej: "Fuga bajo el lavaplatos".
export const runtime = 'nodejs';

function fallback(desc, oficio) {
  var t = (desc || '').replace(/\s+/g, ' ').trim();
  if (!t) return (oficio ? oficio.charAt(0).toUpperCase() + oficio.slice(1) : 'Nueva solicitud');
  var palabras = t.split(' ').slice(0, 6).join(' ');
  return palabras.charAt(0).toUpperCase() + palabras.slice(1);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const oficio = (body.oficio || '').toString().slice(0, 60);
    const descripcion = (body.descripcion || '').toString().slice(0, 800);

    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return Response.json({ titulo: fallback(descripcion, oficio) });

    const prompt =
      'Genera un TÍTULO corto (3 a 6 palabras) en español que resuma el pedido del cliente ' +
      'para una app de servicios para el hogar en Chile. Debe ser claro y concreto, en minúscula ' +
      'tipo oración (solo la primera palabra con mayúscula), SIN punto final, SIN comillas. ' +
      'Devuelve SOLO el título, sin nada más.\n\n' +
      'Oficio: ' + (oficio || 'no indicado') + '\n' +
      'Lo que describe el cliente: ' + (descripcion || 'no indicado') + '\n\nTítulo:';

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 30, messages: [{ role: 'user', content: prompt }] }),
    });
    const j = await r.json();
    if (!r.ok) return Response.json({ titulo: fallback(descripcion, oficio) });

    let t = '';
    if (j.content && j.content[0] && j.content[0].text) t = j.content[0].text.trim();
    t = t.replace(/^["'\s]+|["'\s.]+$/g, '').replace(/\s+/g, ' ').trim();
    if (!t) t = fallback(descripcion, oficio);
    t = t.slice(0, 60);
    return Response.json({ titulo: t });
  } catch (e) {
    return Response.json({ titulo: 'Nueva solicitud' });
  }
}
