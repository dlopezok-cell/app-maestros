// Endpoint server-side: genera una descripcion profesional del maestro con IA (Anthropic).
// La API key vive solo en el servidor (process.env.ANTHROPIC_API_KEY), nunca en el navegador.
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const nombre = body.nombre || '';
    const oficios = body.oficios || [];
    const anos = body.anos || '';
    const tipos = body.tipos || [];
    const zona = body.zona || '';
    const sello = body.sello || '';
    const fds = body.fds, urgencias = body.urgencias, garantia = body.garantia, boleta = body.boleta;

    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      return Response.json({ error: 'Falta configurar ANTHROPIC_API_KEY en el servidor.' }, { status: 500 });
    }

    const datos = [
      nombre ? 'Nombre: ' + nombre : '',
      oficios.length ? 'Oficios/especialidades: ' + oficios.join(', ') : '',
      anos ? 'Años de experiencia: ' + anos : '',
      tipos.length ? 'Tipos de trabajo: ' + tipos.join(', ') : '',
      zona ? 'Zonas/comunas donde trabaja: ' + zona : '',
      sello ? 'Lo que lo diferencia (su sello): ' + sello : '',
      fds ? 'Trabaja fines de semana' : '',
      urgencias ? 'Atiende urgencias' : '',
      garantia ? 'Ofrece garantía en sus trabajos' : '',
      boleta ? 'Emite boleta' : ''
    ].filter(Boolean).join('\n');

    const prompt =
      'Eres un redactor que escribe descripciones de perfil para maestros (técnicos de oficios como gasfitería, electricidad, etc.) en una app chilena llamada MaestrosEnLínea. ' +
      'Con los datos entregados, escribe UNA descripción profesional, cálida y confiable, en PRIMERA PERSONA, en español de Chile, de 2 a 4 oraciones (máximo ~65 palabras). ' +
      'No inventes datos que no aparezcan. No uses emojis. No exageres ni prometas cosas imposibles. Suena cercano, serio y que genere confianza. ' +
      'Devuelve SOLO la descripción, sin títulos ni comillas.\n\nDatos del maestro:\n' + datos + '\n\nDescripción:';

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 350,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const j = await r.json();
    if (!r.ok) {
      return Response.json({ error: (j.error && j.error.message) || 'Error al generar la descripción.' }, { status: 500 });
    }
    let texto = '';
    if (j.content && j.content[0] && j.content[0].text) texto = j.content[0].text.trim();
    return Response.json({ descripcion: texto });
  } catch (e) {
    return Response.json({ error: 'Error inesperado: ' + String(e) }, { status: 500 });
  }
}
