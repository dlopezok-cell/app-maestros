// Auto-login del maestro al abrir el botón del WhatsApp.
// El botón apunta a /maestros?pedido=<id>.<token>; la página de maestros detecta el
// token y redirige acá. Validamos el token (un solo uso, expira), generamos un magic
// link de Supabase para el maestro y redirigimos a él: la sesión queda iniciada dentro
// del navegador de WhatsApp y aterriza en su cotización, sin pedir clave.
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SITE = 'https://www.maestrosenlinea.cl';

function admin() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); }

export async function GET(req) {
  const url = new URL(req.url);
  const token = url.searchParams.get('t') || '';
  const pedido = url.searchParams.get('pedido') || '';
  const dest = SITE + '/maestros' + (pedido ? ('?pedido=' + encodeURIComponent(pedido)) : '');

  // Sin token: a la página normal (pedirá login si hace falta).
  if (!token) return Response.redirect(dest, 302);

  try {
    const sb = admin();
    const tr = await sb.from('wa_login').select('maestro_id, used, expira, presupuesto_id').eq('token', token).maybeSingle();
    const row = tr.data;
    if (!row || row.used === true || (row.expira && new Date(row.expira) < new Date())) return Response.redirect(dest, 302);

    const destFinal = SITE + '/maestros?pedido=' + encodeURIComponent(pedido || row.presupuesto_id || '');

    // Email del maestro (en auth.users; maestros.id == auth user id).
    const ur = await sb.auth.admin.getUserById(row.maestro_id);
    const email = ur && ur.data && ur.data.user && ur.data.user.email;
    if (!email) return Response.redirect(destFinal, 302);

    // Magic link de Supabase que inicia sesión y redirige a la cotización.
    const gl = await sb.auth.admin.generateLink({ type: 'magiclink', email: email, options: { redirectTo: destFinal } });
    // Marcamos el token como usado (un solo uso).
    try { await sb.from('wa_login').update({ used: true }).eq('token', token); } catch (e) {}

    const link = gl && gl.data && gl.data.properties && gl.data.properties.action_link;
    if (!link) return Response.redirect(destFinal, 302);
    return Response.redirect(link, 302);
  } catch (e) {
    return Response.redirect(dest, 302);
  }
}
