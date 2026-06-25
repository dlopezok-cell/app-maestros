# MaestrosEnLínea.cl — Contexto del proyecto (traspaso a Claude Code)

> Pega este archivo como `CLAUDE.md` en la raíz del repo. Claude Code lo lee automáticamente.
> Es el "cerebro" del proyecto: arquitectura, convenciones, despliegue, base de datos y lo pendiente.

---

## 1. Qué es

**MaestrosEnLínea.cl** — marketplace chileno de servicios para el hogar (estilo Airbnb/Uber para
"maestros": gasfíter, electricista, pintor, fletes, etc.). Conecta **clientes** que piden presupuestos
con **maestros** que cotizan. Hay chat in-app, reseñas, pagos en garantía (escrow), verificación de
identidad, panel de administración y captación de maestros por WhatsApp.

- **Web (clientes):** https://www.maestrosenlinea.cl  (ruta `/`)
- **Web (maestros):** https://www.maestrosenlinea.cl/maestros
- **Panel admin:** https://www.maestrosenlinea.cl/admin
- **App iOS:** envuelta con **Capacitor** (mismo sitio Next.js dentro de un WebView). En revisión en App Store.

---

## 2. Stack

- **Next.js 14** (app-router) desplegado en **Vercel** (auto-deploy desde GitHub `main`).
- **Supabase** (Postgres + Auth + Storage + RLS). Auth: email/password, Google y Apple OAuth, magic links.
- **Cloudinary** para subir fotos/videos/audio (preset unsigned `maestros_unsigned`).
- **WhatsApp Cloud API (Meta)** para notificaciones y captación.
- **Flow** (pasarela chilena) para pagos.
- **Zoho SMTP** (nodemailer) para correos transaccionales.
- **Capacitor** para empaquetar la app iOS (proyecto Xcode aparte, no en este repo salvo `capacitor.config.json` y `www/`).

---

## 3. Repos, despliegue y credenciales

- **GitHub:** `dlopezok-cell/app-maestros`  (rama `main`).
- **Despliegue:** al hacer commit en `main`, **Vercel** despliega solo (~1–2 min).
  - Hasta ahora se subieron archivos por la **web de GitHub** (Add file → Upload files / editar archivo → Commit).
  - En Claude Code lo normal será `git clone`, editar, `git commit && git push`.
- **Vercel:** proyecto `app-maestros-three.vercel.app` → dominio `maestrosenlinea.cl`.
- **Supabase project ref:** `hwacptgxkzovesgduuma`  → URL `https://hwacptgxkzovesgduuma.supabase.co`
- **Variables de entorno** (los **valores** viven en Vercel → Settings → Environment Variables; NO están en el repo):
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (solo server, para los `/api/*`)
  - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (Places autocomplete + mapa interactivo)
  - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` + preset `maestros_unsigned`
  - `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_WABA_ID`
  - `CAPTACION_TEMPLATE` (plantilla Meta de captación, `tengo_un_cliente`)
  - `NOTIF_SOLICITUD_TEMPLATE` (`nueva_solicitud`), `NOTIF_MENSAJE_TEMPLATE` (`nuevo_mensaje`), `NOTIF_SOLICITUD_MAX` (10)
  - `ZOHO_MAIL_USER`, `ZOHO_MAIL_PASS` (host `smtp.zoho.com:465`, cuenta `hola@maestrosenlinea.cl`)
  - Claves de Flow (pagos) y Anthropic (para `/api/describir-maestro`).

---

## 4. Convenciones de código (IMPORTANTE — seguir el estilo existente)

- Componentes **`'use client'`** con **estilos inline** (objetos `style={{...}}`), no Tailwind ni CSS modules.
- JavaScript estilo **ES5** dentro de los componentes: `function (e) {...}`, `var`, `.then()` en vez de async/await
  en el cliente (los `/api/*` sí usan async/await + ES6).
- Paleta: navy/cyan/azul royal. Azul principal `#2563eb`, acento cyan `#22d3ee`.
- Para **responsive con estilos inline**: bloque `<style>` con media queries + toggle de `className`
  (ej. `.mel-adminnav-mobile` / `.mel-adminnav-desktop`).
- Validar JSX/JS con esbuild antes de subir: `esbuild archivo.js --loader:.js=jsx --jsx=automatic` (sin `--bundle`).

---

## 5. Mapa de archivos clave (`app/`)

**Cliente:**
- `app/page.js` — home cliente + login (Google/Apple/correo) + ficha de maestro + reseñas.
- `app/HomeCliente.js` — home modular por **widgets** (bloques on/off/reordenables desde admin).
- `app/PresupuestoCliente.js` — crear solicitud (sube fotos/videos), ver cotizaciones, reseñar.
  - Al crear solicitud llama a `/api/captar-maestros` y `/api/notif-solicitud`.
- `app/PerfilCliente.js` — datos + direcciones (CRUD).
- `app/MensajesCliente.js` — bandeja de chats del cliente.

**Maestros:**
- `app/maestros/page.js` — app del maestro (pestañas Perfil/Cotizaciones/Agenda/Ganancias) + deep-link `?pedido=`.
- `app/RegistroMaestro.js` — registro en 3 pasos (identidad, oficios, zona/comunas, foto, descripción IA).
- `app/PresupuestosMaestro.js` — ver solicitudes (mapa interactivo Google Maps, círculo ~1 km), cotizar.
- `app/GaleriaMaestro.js`, `app/CabeceraMaestro.js`.

**Chat (UGC):**
- `app/ChatCotizacion.js` — chat full-screen cliente↔maestro. Texto/imagen/video/audio (mp4 en iOS).
  Oculta teléfonos/correos/links hasta pagar. **Tiene botón Reportar (⚠ → tabla `denuncias`).**
  NOTA: aquí va el futuro botón **Bloquear** (ver pendiente App Store).

**Admin (`app/admin/page.js`):** ssecciones agrupadas (Resumen, Marketing, Operaciones, Finanzas,
Comunidad, Config). Incluye Conversaciones, Disputas/denuncias, Comunicados, Catálogos, Portada/Constructor
del Home, Usuarios del panel (acceso por categorías), Captación auto, Agente IA, Influencers, etc.

**Páginas legales:** `app/terminos/page.js`, `app/privacidad/page.js` (Ley 21.719 + EULA Apple).

**API (`app/api/*`)** — runtime nodejs, usan `SUPABASE_SERVICE_ROLE_KEY`:
- `notif-solicitud` — avisa por WhatsApp a maestros que calzan con una solicitud nueva.
- `notif-mensaje` — avisa al maestro cuando el cliente escribe en el chat.
- `notif-programados` — cron que envía los avisos encolados fuera de horario.
- `wa-login` — **auto-login del maestro** desde el botón del WhatsApp (genera magic link).
- `captar-maestros`, `captar-programados`, `captar-followup` — sistema de captación.
- `wa-webhook` / `wasapi-webhook` — agente IA por WhatsApp.
- `pagar` / `mp-webhook` — pagos. `describir-maestro` — descripción con IA (Anthropic).
- `maps-extract` — extraer maestros de Google Places. `notificar` — correos Zoho.

**Crons (`vercel.json`):** captar-programados (14:00 UTC), captar-followup (15:00 UTC),
notif-programados (14:30 UTC). (UTC ≈ Chile +4/+3.)

---

## 6. Base de datos (Supabase) — tablas principales

- `perfiles` (id = auth.user.id, rol, **nombre**, **telefono**, avatar_url, direccion, comuna, lat, lng, ref).
  ⚠️ **El teléfono del usuario/maestro vive en `perfiles.telefono`, NO en `maestros`.** (Sin código país; normalizar a +56.)
- `maestros` (id = auth.user.id; oficio, **oficios[]**, descripcion, **region**, **comunas[]**, rating_promedio,
  total_trabajos, verificado, suspendido, disponible, foto_url, galeria, precios…). **No tiene** columnas `telefono` ni `activo`.
- `presupuestos` (solicitudes: oficio, comuna, titulo, descripcion, archivos jsonb, lat/lng, estado, cliente_id, maestro_id…).
- `cotizaciones`, `reservas` (escrow: pendiente_pago/pagado/en_garantia/liberado), `mensajes` (chat:
  presupuesto_id, maestro_id, autor_rol, texto, media_url, media_tipo), `resenas` (estrellas, comentario).
- `denuncias` (reportes del chat: presupuesto_id, maestro_id, reportante_id, reportante_rol, motivo).
- `home_config` (id=1): portada, textos, `home_widgets` jsonb, captación (`captacion_activa`, `captacion_max`,
  `captacion_msg_si/no`, `captacion_test`, **`captacion_hora_ini`/`captacion_hora_fin`/`captacion_dias`** — horario de envío, hoy 09:00–23:00).
- `wa_notif` (control de avisos WhatsApp: tipo solicitud/mensaje, dedup + enfriamiento 30 min + cola).
- `wa_login` (tokens de un solo uso para el auto-login del maestro desde el botón de WhatsApp).
- `catalogos` (tipo: especialidad/comuna…), `panel_usuarios` (equipo del admin), `maestros_interesados`,
  `campana_contactos`, `ref_codes`/`ref_clics` (influencers), `ia_config`/`wa_mensajes` (agente IA),
  `direcciones`, `comunicados`, `mensajes_soporte`.
- RLS activado en todo; los `/api/*` usan service role.

---

## 7. Funcionalidad WhatsApp (recién terminada y andando)

- **Solicitud nueva** → avisa a maestros que calzan (oficio + zona; si el maestro no definió comunas, atiende
  en cualquier comuna), **máx 10, ordenados por mejor calificación**. Plantilla Meta `nueva_solicitud`.
- **Cliente escribe en el chat** → avisa al maestro (plantilla `nuevo_mensaje`), enfriamiento 30 min.
- **Botón del WhatsApp** lleva `?pedido=<id>.<token>`; la página `app/maestros/page.js` detecta el token y
  redirige a `/api/wa-login`, que hace **auto-login** (magic link de Supabase) y deja al maestro en la cotización
  **sin pedir clave**. Tabla `wa_login`.
- Horario de envío 09:00–23:00 (Chile); fuera de hora se encola y sale con el cron.

---

## 8. ⏳ PENDIENTE PRIORITARIO — Rechazo de App Store (Guideline 1.2: UGC)

**Estado:** App **Rechazada** (versión 1.0, build 1.0(4)). App Store Connect → app id `6780667661`.
Submission ID: `c477776f-273c-46f7-a996-ccd54ec3e698`.

**Lo que Apple exige** para apps con contenido de usuarios (chat, reseñas, perfiles, fotos):
1. **EULA aceptado ANTES de registrarse/iniciar sesión**, con texto explícito de **tolerancia cero** a contenido
   objetable y usuarios abusivos.
2. **Filtro de contenido objetable** (moderación).
3. **Mecanismo para reportar/denunciar** contenido.
4. **Mecanismo para bloquear usuarios** que además **avise al desarrollador** y **quite el contenido al instante**.

Y piden un **video grabado en un iPhone físico** mostrando: el EULA antes del login, el reporte y el bloqueo,
pegado en "App Review Information → Notes".

**Estado real en el código (revisado):**
- ✅ **Reportar**: ya existe (botón ⚠ en `ChatCotizacion.js` → tabla `denuncias`).
- ❌ **EULA antes de login**: NO existe. Falta un checkbox obligatorio en el login (cliente y maestro).
- ❌ **Bloquear usuario**: NO existe en código (los Términos lo mencionan, pero no está implementado → causa probable del rechazo).
- ⚠️ **Filtro**: parcial (oculta teléfonos/correos/links). Conviene reforzar con filtro de groserías.

**Plan acordado (falta implementar):**
1. **Gate de EULA antes del login** en `app/page.js` (cliente) y el login de maestros: checkbox
   "Acepto los Términos y la política de **tolerancia cero** a contenido objetable y usuarios abusivos"
   que deshabilita los botones de Google/Apple/correo hasta marcarlo.
2. **Bloquear usuario en el chat** (`ChatCotizacion.js`): botón "Bloquear" que (a) oculta los mensajes del
   bloqueado al instante, (b) guarda el bloqueo en una tabla nueva `bloqueos` (bloqueador_id, bloqueado_id,
   presupuesto_id, creado_en) y (c) registra una denuncia para avisar al equipo. Filtrar mensajes de usuarios bloqueados.
3. **Reforzar `app/terminos/page.js`** con la frase explícita de tolerancia cero.
4. (Opcional) filtro básico de groserías en `ChatCotizacion.js`.
5. Tras desplegar: empaquetar nuevo build en Xcode (Capacitor), subir a App Store Connect, grabar el video,
   pegarlo en Notas de revisión y **responder al equipo de revisión** + **reenviar**.

> SQL sugerido para el bloqueo:
> ```sql
> create table if not exists public.bloqueos (
>   id bigserial primary key,
>   bloqueador_id uuid, bloqueado_id uuid, presupuesto_id uuid,
>   creado_en timestamptz not null default now()
> );
> alter table public.bloqueos enable row level security;
> -- política: el usuario puede insertar/ver sus propios bloqueos (auth.uid() = bloqueador_id)
> ```

---

## 9. Otros pendientes menores (backlog)
- Home cliente: filtro de especialidades desde catálogo (#98).
- Google Places verify (#99).
- v1.1: compresión nativa de video (hardware) en la app iOS (#168).
- Endurecer preset Cloudinary `maestros_unsigned` (#176).

---

## 10. Cómo continuar en Claude Code
1. `git clone https://github.com/dlopezok-cell/app-maestros.git && cd app-maestros`
2. Copiar este archivo como `CLAUDE.md` en la raíz (si no está) y crear `.env.local` con las variables del punto 3
   (pídeselas a Diego / cópialas de Vercel).
3. `npm install && npm run dev` para correr local.
4. Para SQL: Supabase → SQL Editor (proyecto `hwacptgxkzovesgduuma`).
5. Empezar por el **pendiente del App Store (sección 8)**: es lo que bloquea la publicación.
6. Deploy: `git push` a `main` → Vercel despliega solo.

— Última actualización: junio 2026. Lo último terminado: avisos WhatsApp + auto-login (sección 7).
Lo que sigue: arreglar el rechazo 1.2 de App Store (sección 8).
