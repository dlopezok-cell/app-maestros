// app/r/[codigo]/route.js
// Link corto de seguimiento por influencer: cuenta el clic, guarda el código en
// una cookie y redirige a /unete (maestros) o a la app (clientes) con ?ref=.
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
const SITE = 'https://www.maestrosenlinea.cl';

export async function GET(req, ctx) {
  let codigo = '';
  try { codigo = ctx && ctx.params && ctx.params.codigo ? String(ctx.params.codigo) : ''; } catch (e) {}
  codigo = codigo.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);

  let destino = 'maestros';
  try {
    if (codigo) {
      const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const r = await admin.from('ref_codes').select('destino, activo').eq('codigo', codigo).maybeSingle();
      if (r.data) {
        destino = r.data.destino || 'maestros';
        if (r.data.activo !== false) {
          await admin.from('ref_clics').insert({ codigo: codigo });
        }
      }
    }
  } catch (e) {}

  // Usamos ?inf= (no ?ref=) para no chocar con el referido maestro→maestro de /unete.
  // destino: 'cliente' -> app cliente | 'home' -> página de inicio | resto -> ficha de inscripción (/unete)
  let url;
  if (destino === 'cliente') url = SITE + '/?app=1&inf=' + encodeURIComponent(codigo);
  else if (destino === 'home') url = SITE + '/?inf=' + encodeURIComponent(codigo);
  else url = SITE + '/unete?inf=' + encodeURIComponent(codigo);

  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      'Set-Cookie': 'mel_ref=' + encodeURIComponent(codigo) + '; Path=/; Max-Age=2592000; SameSite=Lax',
      'Cache-Control': 'no-store'
    }
  });
}
