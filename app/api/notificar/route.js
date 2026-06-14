// app/api/notificar/route.js
// Envía avisos por correo desde hola@maestrosenlinea.cl usando el SMTP de Zoho.
// Resuelve el correo del destinatario con la service role key (auth.users).
// Llamado "fire and forget" desde el frontend; siempre responde 200 para no
// frenar la UI.
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.maestrosenlinea.cl';

function plantilla(titulo, cuerpoHtml, cta, ctaUrl) {
  return (
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1c1f2b">' +
    '<div style="background:#26215C;border-radius:14px 14px 0 0;padding:18px 22px;color:#fff;font-weight:800;font-size:16px">\u{1F6E0} MaestrosEnLínea</div>' +
    '<div style="border:1px solid #eee;border-top:none;border-radius:0 0 14px 14px;padding:22px">' +
    '<h2 style="margin:0 0 10px;font-size:18px">' + titulo + '</h2>' +
    cuerpoHtml +
    (cta ? '<p style="margin-top:18px"><a href="' + ctaUrl + '" style="background:#ff5a3c;color:#fff;padding:11px 18px;border-radius:10px;text-decoration:none;font-weight:800;display:inline-block">' + cta + '</a></p>' : '') +
    '<p style="margin-top:18px;font-size:12px;color:#9aa1b5">Recibes este correo porque tienes una cuenta en MaestrosEnLínea.</p>' +
    '</div></div>'
  );
}

export async function POST(req) {
  const user = process.env.ZOHO_MAIL_USER;
  const pass = process.env.ZOHO_MAIL_PASS;
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!user || !pass) {
    return Response.json({ error: 'Falta ZOHO_MAIL_USER / ZOHO_MAIL_PASS en Vercel' }, { status: 500 });
  }
  if (!supaUrl || !serviceKey) {
    return Response.json({ error: 'Falta configuracion de Supabase' }, { status: 500 });
  }

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const tipo = body.tipo;
  const admin = createClient(supaUrl, serviceKey);

  async function emailDe(uid) {
    if (!uid) return null;
    try { const r = await admin.auth.admin.getUserById(uid); return r.data && r.data.user ? r.data.user.email : null; } catch { return null; }
  }
  async function nombreDe(uid) {
    if (!uid) return '';
    try { const r = await admin.from('perfiles').select('nombre').eq('id', uid).maybeSingle(); return r.data ? (r.data.nombre || '') : ''; } catch { return ''; }
  }
  function plata(n) { return '$' + (Number(n) || 0).toLocaleString('es-CL'); }

  let to = null, subject = '', html = '';

  try {
    if (tipo === 'cotizacion') {
      // Avisar al CLIENTE que recibio una cotizacion
      const r = await admin.from('presupuestos').select('cliente_id, oficio, descripcion').eq('id', body.presupuestoId).maybeSingle();
      const p = r.data;
      if (!p) return Response.json({ ok: true });
      to = await emailDe(p.cliente_id);
      const maestro = await nombreDe(body.maestroId);
      const monto = body.monto ? plata(body.monto) : '';
      subject = 'Tienes una nueva cotización en MaestrosEnLínea';
      html = plantilla(
        '¡Recibiste una cotización! \u{1F389}',
        '<p>' + (maestro || 'Un maestro') + ' te envió un presupuesto' + (monto ? ' por <b>' + monto + '</b>' : '') + ' para tu solicitud de <b>' + (p.oficio || 'servicio') + '</b>.</p>' +
        (p.descripcion ? '<p style="color:#5b6275">“' + p.descripcion + '”</p>' : ''),
        'Ver mi cotización', SITE
      );
    } else if (tipo === 'presupuesto_maestro') {
      // Avisar a UN maestro que le llego una solicitud directa
      to = await emailDe(body.maestroId);
      const oficio = body.oficio || 'un servicio';
      subject = 'Nueva solicitud de presupuesto';
      html = plantilla(
        'Tienes una nueva solicitud \u{1F4CB}',
        '<p>Un cliente te pidió un presupuesto de <b>' + oficio + '</b>. Entra a tu panel para ver el video y responder con tu cotización.</p>',
        'Abrir mi panel', SITE + '/maestros'
      );
    } else if (tipo === 'mensaje') {
      // Avisar a la otra parte que recibio un mensaje en el chat
      const r = await admin.from('presupuestos').select('cliente_id, oficio').eq('id', body.presupuestoId).maybeSingle();
      const p = r.data;
      if (!p) return Response.json({ ok: true });
      // si escribe el cliente -> avisar al maestro; si escribe el maestro -> avisar al cliente
      const paraId = body.autorRol === 'cliente' ? body.maestroId : p.cliente_id;
      to = await emailDe(paraId);
      subject = 'Nuevo mensaje en tu conversación';
      html = plantilla(
        'Tienes un mensaje nuevo \u{1F4AC}',
        '<p>Te escribieron en la conversación de tu ' + (p.oficio ? 'solicitud de <b>' + p.oficio + '</b>' : 'cotización') + '. Entra para responder.</p>',
        'Ver conversación', SITE
      );
    } else {
      return Response.json({ error: 'tipo desconocido' }, { status: 400 });
    }

    if (!to) return Response.json({ ok: true, skipped: 'sin email' });

    const transport = nodemailer.createTransport({
      host: 'smtp.zoho.com', port: 465, secure: true,
      auth: { user, pass },
    });
    await transport.sendMail({ from: '"MaestrosEnLínea" <' + user + '>', to, subject, html });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 200 });
  }
}
