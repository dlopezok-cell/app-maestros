// app/api/cotizar-ia/route.js
// Asistente de IA que ayuda al maestro a armar una cotización DESGLOSADA por ítem.
// Toma en cuenta: el problema del cliente, la descripción que el maestro ya escribió,
// lo que el maestro marcó en "Incluye", los ítems que ya puso y la CONVERSACIÓN previa
// con el cliente. Devuelve ítems (mano de obra + materiales), montos NETOS en CLP,
// etiquetas de "incluye" y condiciones. El maestro luego edita todo.
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const oficio = (body.oficio || '').toString().slice(0, 60);
    const descripcion = (body.descripcion || '').toString().slice(0, 800);
    const notas = (body.notas || '').toString().slice(0, 800);
    const descMaestro = (body.descMaestro || '').toString().slice(0, 800);
    const conversacion = (body.conversacion || '').toString().slice(0, 1600);
    const incluyeSel = Array.isArray(body.incluye) ? body.incluye.slice(0, 8) : [];
    const itemsActuales = Array.isArray(body.items) ? body.items.slice(0, 10) : [];

    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return Response.json({ error: 'Falta configurar ANTHROPIC_API_KEY en el servidor.' }, { status: 500 });

    var itemsTxt = itemsActuales
      .filter(function (it) { return it && it.desc; })
      .map(function (it) { return '- ' + it.desc + (it.valor ? ' ($' + it.valor + ')' : ''); })
      .join('\n');

    const prompt =
      'Eres un asistente que ayuda a un maestro (técnico de oficios en Chile: gasfitería, electricidad, cerrajería, etc.) ' +
      'a armar la cotización de un trabajo en la app MaestrosEnLínea. ' +
      'Con TODO el contexto disponible, propón una cotización DESGLOSADA y realista en pesos chilenos (CLP). ' +
      'Los montos son NETOS (sin IVA; el IVA se suma aparte). No exageres los precios; usa valores de mercado razonables en Chile. ' +
      'IMPORTANTE: respeta y mejora la descripción que el maestro ya escribió, respeta los ítems y los "incluye" que ya marcó (puedes agregar), ' +
      'y usa la conversación con el cliente para entender mejor el trabajo. No ignores nada de eso. No inventes datos personales del cliente. ' +
      'Devuelve EXCLUSIVAMENTE un JSON válido (sin texto antes ni después, sin ```), con esta forma exacta:\n' +
      '{"descripcion":"Reparación de fuga bajo el lavaplatos: cambio de sifón y sellado.",' +
      '"items":[{"tipo":"mano_obra","desc":"Mano de obra","valor":30000},{"tipo":"material","desc":"Sifón PVC 40 mm","valor":8000}],' +
      '"incluye":["Materiales","Visita técnica"],"condiciones":"Validez 15 días. Garantía 1 mes."}\n' +
      'Reglas: "descripcion" es 1-2 líneas claras para el cliente, basada en lo que el maestro escribió y la conversación. ' +
      'Incluye 1 ítem de mano de obra (desc exactamente "Mano de obra", sin "por hora") y los materiales típicos del trabajo (máx 6 ítems en total), cada uno con su precio NETO estimado. ' +
      '"incluye" son etiquetas cortas elegidas SOLO de esta lista: Materiales, Mano de obra, Visita técnica, Retiro de escombros (respeta las que ya marcó el maestro). ' +
      '"condiciones" es UNA línea con validez (15 o 30 días) y garantía (Sin garantía, 1 mes, 2 meses o 3 meses).\n\n' +
      'Oficio: ' + (oficio || 'no indicado') + '\n' +
      'Problema descrito por el cliente: ' + (descripcion || 'no indicado') + '\n' +
      (descMaestro ? ('Descripción que ya escribió el maestro (respétala y mejórala): ' + descMaestro + '\n') : '') +
      (incluyeSel.length ? ('El maestro marcó que INCLUYE: ' + incluyeSel.join(', ') + '\n') : '') +
      (itemsTxt ? ('Ítems que el maestro ya puso:\n' + itemsTxt + '\n') : '') +
      (conversacion ? ('Conversación previa con el cliente:\n' + conversacion + '\n') : '') +
      (notas ? ('Notas/ajustes del maestro: ' + notas + '\n') : '') +
      '\nJSON:';

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 700, messages: [{ role: 'user', content: prompt }] }),
    });
    const j = await r.json();
    if (!r.ok) return Response.json({ error: (j.error && j.error.message) || 'Error al generar la cotización.' }, { status: 500 });

    let texto = '';
    if (j.content && j.content[0] && j.content[0].text) texto = j.content[0].text.trim();
    texto = texto.replace(/```json/gi, '').replace(/```/g, '').trim();
    const a = texto.indexOf('{'); const b = texto.lastIndexOf('}');
    if (a >= 0 && b > a) texto = texto.slice(a, b + 1);

    let data;
    try { data = JSON.parse(texto); } catch (e) { return Response.json({ error: 'La IA no devolvió un formato válido. Intenta de nuevo.' }, { status: 502 }); }

    const items = Array.isArray(data.items) ? data.items.filter(function (it) { return it && it.desc; }).slice(0, 6).map(function (it) {
      return { tipo: it.tipo === 'material' ? 'material' : 'mano_obra', desc: String(it.desc).slice(0, 80), valor: Math.max(0, Math.round(Number(it.valor) || 0)) };
    }) : [];
    const permitidas = ['Materiales', 'Mano de obra', 'Visita técnica', 'Retiro de escombros'];
    const incluye = Array.isArray(data.incluye) ? data.incluye.filter(function (x) { return permitidas.indexOf(x) >= 0; }) : [];
    const condiciones = (data.condiciones || '').toString().slice(0, 200);
    const descTrabajo = (data.descripcion || '').toString().slice(0, 300);

    return Response.json({ descripcion: descTrabajo, items: items, incluye: incluye, condiciones: condiciones });
  } catch (e) {
    return Response.json({ error: 'Error inesperado: ' + String(e) }, { status: 500 });
  }
}
