'use client';
import { useState, useEffect, useRef } from 'react';
import { FOTO_COCINA, FOTO_BANO, FOTO_PINTURA, FOTO_PORTADA, FOTO_MAESTRO1, FOTO_MAESTRO2, FOTO_MAESTRO3 } from './homeFotos';

// Portada tipo slider de fotos full-bleed. Cada slide: { foto, titulo, cta, link, on }.
// Autoplay 5s + swipe + flechas + puntitos. El botón/tap de cada slide va a su 'link'
// ('cotizar' o vacío = flujo de pedir presupuesto; un path/URL = navega ahí).
function PortadaSlider(props) {
  var slides = props.slides || [];
  var n = slides.length;
  const [idx, setIdx] = useState(0);
  var startX = useRef(null);
  var moved = useRef(false);

  useEffect(function () {
    if (n <= 1) return;
    var t = setInterval(function () { setIdx(function (i) { return (i + 1) % n; }); }, 5000);
    return function () { clearInterval(t); };
  }, [n]);

  if (!n) return null;
  var s = slides[idx % n];
  function go(d) { setIdx(function (i) { return (i + d + n) % n; }); }
  function irLink(sl) {
    var link = (sl && sl.link) || '';
    if (!link || link === 'cotizar') { if (props.onCotizar) props.onCotizar(); return; }
    if (typeof window !== 'undefined') window.location.href = link;
  }
  function tStart(e) { startX.current = e.touches[0].clientX; moved.current = false; }
  function tMove(e) { if (startX.current != null && Math.abs(e.touches[0].clientX - startX.current) > 8) moved.current = true; }
  function tEnd(e) {
    if (startX.current == null) return;
    var dx = e.changedTouches[0].clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  }
  return (
    <div className="hc-sec">
      <div className="hc-slider" onTouchStart={tStart} onTouchMove={tMove} onTouchEnd={tEnd} onClick={function () { if (!moved.current) irLink(s); }}>
        <img className="hc-slidebg" src={s.foto || FOTO_PORTADA} alt="" />
        <div className="hc-slideveil"></div>
        {n > 1 && <button type="button" className="hc-arrow hc-arrL" aria-label="Anterior" onClick={function (e) { e.stopPropagation(); go(-1); }}>{'‹'}</button>}
        {n > 1 && <button type="button" className="hc-arrow hc-arrR" aria-label="Siguiente" onClick={function (e) { e.stopPropagation(); go(1); }}>{'›'}</button>}
        <div className="hc-slidetxt">
          {s.titulo ? <h3>{s.titulo}</h3> : null}
          {s.cta ? <button type="button" className="hc-sbtn" onClick={function (e) { e.stopPropagation(); irLink(s); }}>{s.cta + ' →'}</button> : null}
        </div>
        {n > 1 && (
          <div className="hc-dots">
            {slides.map(function (x, i) { return <span key={i} className={i === (idx % n) ? 'on' : ''} onClick={function (e) { e.stopPropagation(); setIdx(i); }}></span>; })}
          </div>
        )}
      </div>
    </div>
  );
}

// Maestros destacados de referencia (se muestran mientras aún no hay maestros reales).
var REF_MAESTROS = [
  { foto: FOTO_MAESTRO1, nombre: 'Juan R.', spec: 'Gasfíter' },
  { foto: FOTO_MAESTRO2, nombre: 'Andrés P.', spec: 'Cocina y baño' },
  { foto: FOTO_MAESTRO3, nombre: 'Carlos S.', spec: 'Electricista' },
];

// Home del cliente. Paleta: azul marino + cyan + azul royal (estilo fintech).
// Estilos propios con prefijo hc- y todo dentro de .hcli para no chocar con globals.css.
var CSS = `
.hcli{--navy:#0e1a38;--navy-deep:#0a1430;--coral:#2563eb;--cyan:#22d3ee;--azul:#2563eb;--azul-claro:#e7f0fb;--gris:#6e7a89;--linea:#e6eaef;background:#fff;color:#0b1426}
.hcli svg{fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.hc-appbar{background:var(--navy);color:#fff;padding:30px 18px 16px;border-radius:0 0 22px 22px}
.hc-row{display:flex;justify-content:space-between;align-items:center}
.hc-brand{font-weight:800;font-size:17px;letter-spacing:-.3px;display:flex;align-items:center;gap:8px}
.hc-brand svg{stroke:#fff;width:22px;height:22px}
.hc-bell svg{stroke:#fff;opacity:.9;width:21px;height:21px}
.hc-maestro{display:flex;flex-direction:column;align-items:center;gap:1px;text-decoration:none}
.hc-maestro svg{stroke:#fff;opacity:.92;width:21px;height:21px}
.hc-maestro span{font-size:9.5px;font-weight:700;color:#fff;opacity:.92;letter-spacing:.2px}
.hc-tagline{font-size:11.5px;opacity:.8;margin-top:6px}
.hc-search{display:flex;align-items:center;gap:9px;background:#fff;border-radius:30px;padding:4px 15px;margin-top:13px}
.hc-search svg{stroke:var(--gris);width:18px;height:18px;flex:none}
.hc-search input{border:none;outline:none;background:transparent;width:100%;font-size:16px;color:#1c1f2b;padding:9px 0}
.hc-sec{padding:16px 16px 0}
.hc-sec h4{font-size:15px;margin-bottom:2px}
.hc-seehead{display:flex;justify-content:space-between;align-items:baseline}
.hc-seehead a{font-size:12px;color:var(--azul);font-weight:700;text-decoration:none}
.hc-videohero{background:linear-gradient(135deg,#13244e,#0e1a38);border-radius:20px;padding:18px;color:#fff;position:relative;overflow:hidden;box-shadow:0 8px 22px rgba(14,26,56,.32);cursor:pointer}
.hc-herobg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
.hc-heroveil{position:absolute;inset:0;background:linear-gradient(135deg,rgba(14,26,56,.82),rgba(10,20,48,.94));z-index:1}
.hc-videohero .hc-cam,.hc-videohero .hc-tag,.hc-videohero h3,.hc-videohero p,.hc-videohero .hc-btn{position:relative;z-index:2}
.hc-tag{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.5px;background:rgba(34,211,238,.22);color:#aef0fa;padding:4px 10px;border-radius:20px;text-transform:uppercase}
.hc-videohero h3{font-size:21px;margin-top:10px;line-height:1.2;font-weight:800}
.hc-videohero p{font-size:12.5px;opacity:.9;margin-top:6px;max-width:230px}
.hc-cam{position:absolute;right:16px;top:18px}
.hc-cam svg{width:42px;height:42px;stroke:#fff;opacity:.8}
.hc-btn{margin-top:14px;display:inline-flex;align-items:center;gap:7px;background:linear-gradient(135deg,#22d3ee,#2563eb);color:#fff;font-weight:800;padding:12px 22px;border-radius:30px;font-size:14px;border:none;box-shadow:0 8px 18px rgba(37,99,235,.4);cursor:pointer}
.hc-slider{position:relative;border-radius:20px;overflow:hidden;height:162px;box-shadow:0 8px 22px rgba(14,26,56,.32);cursor:pointer;background:#13244e;user-select:none}
.hc-slidebg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
.hc-slideveil{position:absolute;inset:0;background:linear-gradient(to top,rgba(8,16,38,.88),rgba(8,16,38,.05) 62%);z-index:1}
.hc-slidetxt{position:absolute;left:16px;right:16px;bottom:24px;z-index:2;color:#fff}
.hc-slidetxt h3{font-size:19px;font-weight:800;line-height:1.18;margin:0;text-shadow:0 1px 5px rgba(0,0,0,.45)}
.hc-sbtn{margin-top:11px;background:#fff;color:#13244e;font-weight:800;padding:9px 18px;border-radius:24px;font-size:13px;border:none;cursor:pointer}
.hc-arrow{position:absolute;top:50%;transform:translateY(-50%);z-index:3;width:30px;height:30px;border-radius:50%;border:none;background:rgba(255,255,255,.26);color:#fff;font-size:21px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
.hc-arrL{left:9px}.hc-arrR{right:9px}
.hc-dots{position:absolute;left:0;right:0;bottom:9px;z-index:3;display:flex;gap:5px;justify-content:center}
.hc-dots span{width:6px;height:6px;border-radius:4px;background:rgba(255,255,255,.5);cursor:pointer;transition:width .2s}
.hc-dots span.on{width:17px;background:#fff}
.hc-trustrip{display:flex;justify-content:space-between;gap:6px;margin-top:13px}
.hc-trustrip span{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;text-align:center;font-size:10px;font-weight:600;color:#54616f}
.hc-trustrip svg{width:19px;height:19px;stroke:var(--azul)}
.hc-hsteps{display:flex;gap:6px;margin-top:14px;align-items:flex-start}
.hc-hstep{flex:1;text-align:center;position:relative}
.hc-hstep .hc-n{width:54px;height:54px;border-radius:18px;margin:0 auto;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#22d3ee,#1e3a8a);position:relative;box-shadow:0 8px 16px rgba(37,99,235,.32)}
.hc-hstep .hc-n svg{width:25px;height:25px;stroke:#fff}
.hc-hstep .hc-num{position:absolute;top:-5px;right:-5px;width:20px;height:20px;border-radius:50%;background:var(--coral);color:#fff;font-size:10.5px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #fff}
.hc-hstep b{display:block;font-size:12px;margin-top:9px;line-height:1.2}
.hc-hstep .hc-arrow{position:absolute;top:22px;right:-9px;color:#cdd4dc;font-size:17px;font-weight:700}
.hc-cats{display:flex;gap:15px;margin-top:13px;overflow-x:auto;padding-bottom:6px;-webkit-overflow-scrolling:touch}
.hc-cats::-webkit-scrollbar{height:0}
.hc-cat{flex:none;width:62px;text-align:center;font-size:11px;font-weight:700;color:#3a4654;cursor:pointer}
.hc-cat .hc-circle{width:60px;height:60px;border-radius:50%;background:var(--azul-claro);display:flex;align-items:center;justify-content:center;margin:0 auto 7px;font-size:27px}
.hc-cat.on .hc-circle{background:#e2f7fb;box-shadow:0 0 0 2px var(--cyan) inset}
.hc-proj{position:relative;border-radius:18px;overflow:hidden;margin-top:12px;height:162px;cursor:pointer;box-shadow:0 8px 20px rgba(14,26,56,.18)}
.hc-proj img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.hc-proj .hc-veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(14,26,56,0) 28%,rgba(14,26,56,.5) 60%,rgba(10,20,48,.93) 100%)}
.hc-proj .hc-bc{position:relative;z-index:2;height:100%;display:flex;flex-direction:column;justify-content:flex-end;padding:16px 18px}
.hc-proj .hc-ptitle{font-size:20px;display:block;color:#fff;font-weight:800;line-height:1.16}
.hc-proj .hc-prow{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:5px}
.hc-proj .hc-desc{font-size:12.5px;color:#dfe7f5;line-height:1.3;flex:1}
.hc-proj .hc-go{font-size:13px;font-weight:800;color:#22d3ee;white-space:nowrap;flex:none}
.hc-hscroll{display:flex;gap:10px;overflow-x:auto;margin-top:11px;padding-bottom:4px}
.hc-hscroll::-webkit-scrollbar{height:0}
.hc-prom{min-width:128px;border:1px solid var(--linea);border-radius:16px;padding:13px 11px;text-align:center;background:#fff;cursor:pointer}
.hc-mphoto{width:66px;height:66px;border-radius:50%;margin:0 auto 9px;background:linear-gradient(135deg,#e7f0fb,#dbe7fb);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;color:#fff;font-weight:800;font-size:26px}
.hc-mphoto img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hc-mname{font-size:13px;font-weight:800}
.hc-mspec{font-size:11px;color:var(--gris)}
.hc-mbadge{display:inline-flex;align-items:center;gap:3px;font-size:9.5px;font-weight:800;color:#1d6f43;background:#e6f5ec;padding:3px 8px;border-radius:20px;margin-top:7px}
.hc-mbadge svg{width:11px;height:11px;stroke:#1d6f43;stroke-width:2.5}
.hc-trust{display:flex;gap:11px;background:#f3f5f8;border-radius:14px;padding:12px;margin-top:15px;align-items:center}
.hc-trust svg{width:24px;height:24px;stroke:var(--azul)}
.hc-trust b{font-size:12.5px}
.hc-trust p{font-size:11px;color:var(--gris)}
.hc-mbanner{display:flex;align-items:center;gap:12px;background:var(--navy-deep);border-radius:18px;padding:15px 16px;margin-top:14px;color:#fff;text-decoration:none}
.hc-mbanner svg{width:30px;height:30px;stroke:#5fd3ea;flex:none}
.hc-mbanner .hc-tx{flex:1}
.hc-mbanner .hc-tx b{font-size:15px;display:block}
.hc-mbanner .hc-tx p{font-size:11.5px;color:#9aa6b4;margin-top:2px;line-height:1.35}
.hc-mbanner .hc-cta2{flex:none;background:var(--coral);color:#fff;font-weight:800;font-size:12px;padding:11px 15px;border-radius:30px;white-space:nowrap}
.hc-empty{font-size:13px;color:#9aa1b5;margin-top:8px}
.hc-footer{text-align:center;font-size:11px;color:#b6bccb;padding:22px 0 8px}
.hc-footer a{color:#9aa1b5;text-decoration:none}
`;

var ICON = {
  compass: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>,
  bell: <svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  tool: <svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.2 5.2L3 18l3 3 6.5-6.5a4 4 0 0 0 5.2-5.2l-2.4 2.4-2.1-.6-.6-2.1z"/></svg>,
  search: <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  cam: <svg viewBox="0 0 24 24"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>,
  shield: <svg viewBox="0 0 24 24"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>,
  lock: <svg viewBox="0 0 24 24"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  checkc: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>,
  file: <svg viewBox="0 0 24 24"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>,
  check: <svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>,
  mega: <svg viewBox="0 0 24 24"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>,
};

export default function HomeCliente(props) {
  var cats = props.cats || [];
  var lista = props.lista || [];
  var oficio = props.oficio;
  var EMO = props.EMO || {};
  var nombreM = props.nombreM || function (m) { return (m.perfiles && m.perfiles.nombre) || 'Maestro'; };
  var fotoM = props.fotoM || function (m) { return m.foto_url || null; };
  var oficiosM = props.oficiosM || function (m) { return m.oficios && m.oficios.length ? m.oficios : (m.oficio ? [m.oficio] : []); };
  var ofNombre = props.ofNombre || function (s) { return s || ''; };
  function setOficio(s) { if (props.setOficio) props.setOficio(s); }
  function onCotizar() { if (props.onCotizar) props.onCotizar(); }
  function onMaestro(m) { if (props.onMaestro) props.onMaestro(m); }

  // Slides de la portada (editables desde el admin). Si hay al menos uno activo con foto,
  // la portada se muestra como slider; si no, cae a la portada de video por defecto.
  var slidesRaw = props.homeSlides;
  if (typeof slidesRaw === 'string') { try { slidesRaw = JSON.parse(slidesRaw); } catch (e) { slidesRaw = null; } }
  var slidesOn = (Array.isArray(slidesRaw) ? slidesRaw : []).filter(function (s) { return s && s.on !== false && s.foto; });

  var BLOQUES = {
    hero: (slidesOn.length > 0 ? (
      <PortadaSlider slides={slidesOn} onCotizar={onCotizar} />
    ) : (
      <div className="hc-sec">
        <div className="hc-videohero" onClick={onCotizar}>
          <img className="hc-herobg" src={FOTO_PORTADA} alt="" />
          <div className="hc-heroveil"></div>
          <span className="hc-cam">{ICON.cam}</span>
          <span className="hc-tag">Nuevo</span>
          <h3>Pide presupuesto<br />por video</h3>
          <p>Pide en un solo lugar y te llegan varios presupuestos de maestros verificados. Eliges al mejor evaluado y pagas seguro, sin sorpresas.</p>
          <button className="hc-btn">Grabar video →</button>
        </div>
      </div>
    )),
    confianza: (
      <div className="hc-sec">
        <div className="hc-trustrip">
          <span>{ICON.shield}Maestros verificados</span>
          <span>{ICON.checkc}Sin sorpresas en el precio</span>
          <span>{ICON.lock}Protegemos tu pago</span>
        </div>
      </div>
    ),
    pasos: (
      <div className="hc-sec">
        <h4>¿Cómo funciona?</h4>
        <div className="hc-hsteps">
          <div className="hc-hstep">
            <div className="hc-n">{ICON.cam}<span className="hc-num">1</span></div>
            <b>Subes tu video</b><span className="hc-arrow">›</span>
          </div>
          <div className="hc-hstep">
            <div className="hc-n">{ICON.file}<span className="hc-num">2</span></div>
            <b>Recibes cotizaciones</b><span className="hc-arrow">›</span>
          </div>
          <div className="hc-hstep">
            <div className="hc-n">{ICON.shield}<span className="hc-num">3</span></div>
            <b>Pago seguro</b>
          </div>
        </div>
      </div>
    ),
    especialidades: (
      <div className="hc-sec">
        <h4>¿Qué necesitas?</h4>
        <div className="hc-cats">
          <div className={'hc-cat' + (oficio == null ? ' on' : '')} onClick={function () { setOficio(null); }}>
            <div className="hc-circle">{'✨'}</div>Todos
          </div>
          {cats.map(function (c) {
            return (
              <div key={c.slug} className={'hc-cat' + (oficio === c.slug ? ' on' : '')} onClick={function () { setOficio(c.slug); }}>
                <div className="hc-circle">{EMO[c.slug] || '\u{1F6E0}'}</div>{c.valor}
              </div>
            );
          })}
        </div>
      </div>
    ),
    trabajo: (
      <div className="hc-sec">
        <div className="hc-seehead"><h4>Proyectos destacados</h4></div>
        <div className="hc-proj">
          <img src={FOTO_COCINA} alt="" />
          <div className="hc-veil"></div>
          <div className="hc-bc"><b className="hc-ptitle">Remodela tu cocina</b><div className="hc-prow"><span className="hc-desc">Diseño + instalación con maestros verificados</span><span className="hc-go">Pronto</span></div></div>
        </div>
        <div className="hc-proj">
          <img src={FOTO_BANO} alt="" />
          <div className="hc-veil"></div>
          <div className="hc-bc"><b className="hc-ptitle">Remodela tu baño</b><div className="hc-prow"><span className="hc-desc">Renovación completa, lista en pocos días</span><span className="hc-go">Pronto</span></div></div>
        </div>
        <div className="hc-proj">
          <img src={FOTO_PINTURA} alt="" />
          <div className="hc-veil"></div>
          <div className="hc-bc"><b className="hc-ptitle">Mantención del hogar</b><div className="hc-prow"><span className="hc-desc">Arreglos y mejoras con maestros verificados</span><span className="hc-go">Pronto</span></div></div>
        </div>
      </div>
    ),
    destacados: (
      <div className="hc-sec">
        <div className="hc-seehead"><h4>Maestros destacados</h4></div>
        <div className="hc-hscroll">
          {lista.length > 0
            ? lista.slice(0, 10).map(function (m) {
                var f = fotoM(m);
                return (
                  <div key={m.id} className="hc-prom" onClick={function () { onMaestro(m); }}>
                    <div className="hc-mphoto">{f ? <img src={f} alt="" /> : nombreM(m).charAt(0).toUpperCase()}</div>
                    <div className="hc-mname">{nombreM(m)}</div>
                    <div className="hc-mspec">{(function(){var a=oficiosM(m).map(ofNombre);return a.slice(0,3).join(' · ') + (a.length>3?' +'+(a.length-3):'');})() || 'Maestro'}</div>
                    {m.verificado && <span className="hc-mbadge">{ICON.check}Verificado</span>}
                  </div>
                );
              })
            : REF_MAESTROS.map(function (m, i) {
                return (
                  <div key={i} className="hc-prom" onClick={onCotizar}>
                    <div className="hc-mphoto"><img src={m.foto} alt="" /></div>
                    <div className="hc-mname">{m.nombre}</div>
                    <div className="hc-mspec">{m.spec}</div>
                    <span className="hc-mbadge">{ICON.check}Verificado</span>
                  </div>
                );
              })}
        </div>

        <div className="hc-trust">
          <span>{ICON.shield}</span>
          <div><b>Maestros verificados</b><p>Revisamos antecedentes de cada maestro antes de sumarlo.</p></div>
        </div>

      </div>
    ),
    eres_maestro: (
      <div className="hc-sec">
        <a className="hc-mbanner" href="/maestros">
          <span>{ICON.mega}</span>
          <div className="hc-tx"><b>¿Eres maestro?</b><p>Súmate gratis · 0% comisión de Fundador.</p></div>
          <span className="hc-cta2">Quiero unirme</span>
        </a>
      </div>
    ),
  };
  var ORDEN_DEF = ['hero', 'confianza', 'pasos', 'especialidades', 'trabajo', 'destacados', 'eres_maestro'];
  var rawW = props.homeWidgets;
  if (typeof rawW === 'string') { try { rawW = JSON.parse(rawW); } catch (e) { rawW = null; } }
  var verBuscador = !(Array.isArray(rawW) && rawW.some(function (w) { return w && w.k === 'buscador' && w.on === false; }));
  var orden = Array.isArray(rawW) ? rawW.filter(function (w) { return w && BLOQUES[w.k]; }).map(function (w) { return { k: w.k, on: w.on !== false }; }) : null;
  if (!orden) { orden = ORDEN_DEF.map(function (k) { return { k: k, on: true }; }); }
  else { ORDEN_DEF.forEach(function (k) { if (!orden.some(function (w) { return w.k === k; })) orden.push({ k: k, on: true }); }); }

  return (
    <div className="hcli">
      <style>{CSS}</style>

      <div className="hc-appbar">
        <div className="hc-row">
          <div className="hc-brand">{ICON.compass} MaestrosEnLínea</div>
          
        </div>
        <div className="hc-tagline">🇨🇱 La primera plataforma en Chile · pide, compara y paga seguro</div>
        {verBuscador && (
          <form className="hc-search" onSubmit={function (e) { e.preventDefault(); if (props.onBuscar) props.onBuscar(props.q || ''); }}>
            {ICON.search}
            <input value={props.q || ''} onChange={function (e) { if (props.setQ) props.setQ(e.target.value); }} placeholder="¿Qué necesitas arreglar o remodelar?" enterKeyHint="search" />
          </form>
        )}
      </div>

      {orden.filter(function (w) { return w.on; }).map(function (w) { return <div key={w.k} style={{ display: 'contents' }}>{BLOQUES[w.k]}</div>; })}
      <div className="hc-footer" style={{ paddingBottom: 2 }}>
        <a href="/servicios/gasfiteria">Gasfíter</a> · <a href="/servicios/electricidad">Electricista</a> · <a href="/servicios/pintura">Pintor</a> · <a href="/servicios/cerrajeria">Cerrajero</a> · <a href="/servicios/calefont">Calefont</a> · <a href="/servicios">Ver todos los servicios</a>
      </div>
      <div className="hc-footer">
        <a href="/terminos">Términos</a> · <a href="/privacidad">Privacidad</a> · MaestrosEnLínea
      </div>
    </div>
  );
}
