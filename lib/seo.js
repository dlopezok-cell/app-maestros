// Datos para las páginas SEO (oficios + comunas). Sin secretos.
export const SITE = 'https://www.maestrosenlinea.cl';

export const OFICIOS = [
  { slug: 'gasfiteria', servicio: 'Gasfitería', profesional: 'Gasfíter', gancho: 'Fugas, destapes, llaves, WC y calefont',
    servicios: ['Reparación de fugas de agua', 'Destape de cañerías y desagües', 'Instalación y cambio de llaves y grifería', 'Reparación de WC, lavamanos y duchas', 'Instalación de calefont y termos'] },
  { slug: 'electricidad', servicio: 'Electricidad', profesional: 'Electricista', gancho: 'Tableros, enchufes, luminarias y fallas',
    servicios: ['Reparación de cortocircuitos y tableros', 'Instalación de enchufes e interruptores', 'Cambio de luminarias y focos LED', 'Instalación de automáticos y diferenciales', 'Diagnóstico de fallas eléctricas'] },
  { slug: 'cerrajeria', servicio: 'Cerrajería', profesional: 'Cerrajero', gancho: 'Apertura de puertas, chapas y copias de llaves',
    servicios: ['Apertura de puertas y vehículos', 'Cambio y reparación de cerraduras', 'Copias de llaves', 'Instalación de chapas de seguridad', 'Atención de emergencias'] },
  { slug: 'pintura', servicio: 'Pintura', profesional: 'Pintor', gancho: 'Interiores, exteriores, rejas y departamentos',
    servicios: ['Pintura de interiores y exteriores', 'Reparación de muros y estucos', 'Pintura de rejas y portones', 'Esmalte y barniz de maderas', 'Pintura de departamentos completos'] },
  { slug: 'calefont', servicio: 'Calefont', profesional: 'Técnico de calefont', gancho: 'Reparación, instalación y mantención de calefont',
    servicios: ['Reparación de calefont', 'Instalación y cambio de calefont', 'Mantención y limpieza', 'Solución de fallas de encendido', 'Cambio de termos eléctricos'] },
  { slug: 'piscinas', servicio: 'Piscinas', profesional: 'Especialista en piscinas', gancho: 'Filtros, bombas, mantención y filtraciones',
    servicios: ['Reparación de filtros y bombas', 'Mantención y limpieza', 'Detección de filtraciones', 'Tratamiento del agua', 'Puesta a punto de temporada'] },
  { slug: 'jardineria', servicio: 'Jardinería', profesional: 'Jardinero', gancho: 'Mantención, poda, riego y diseño de jardines',
    servicios: ['Mantención de jardines', 'Corte de pasto y poda', 'Diseño y plantación', 'Instalación de riego', 'Limpieza de patios'] },
  { slug: 'carpinteria', servicio: 'Carpintería', profesional: 'Carpintero', gancho: 'Muebles a medida, puertas, closets y reparaciones',
    servicios: ['Muebles a medida', 'Reparación de puertas y ventanas', 'Instalación de repisas y closets', 'Trabajos en melamina y madera', 'Reparaciones del hogar'] },
  { slug: 'domotica', servicio: 'Domótica', profesional: 'Especialista en domótica', gancho: 'Automatización e iluminación inteligente',
    servicios: ['Automatización del hogar', 'Instalación de domótica', 'Control por app y voz', 'Iluminación inteligente', 'Sensores y escenas'] },
  { slug: 'camarasyalarmas', servicio: 'Cámaras y Alarmas', profesional: 'Técnico de cámaras y alarmas', gancho: 'CCTV, alarmas y monitoreo por celular',
    servicios: ['Instalación de cámaras de seguridad', 'Configuración de alarmas', 'Monitoreo por celular', 'Mantención de sistemas CCTV', 'Cercos eléctricos'] },
  { slug: 'lineablanca', servicio: 'Línea Blanca', profesional: 'Técnico de línea blanca', gancho: 'Lavadoras, refrigeradores, hornos y secadoras',
    servicios: ['Reparación de lavadoras', 'Reparación de refrigeradores', 'Reparación de hornos y cocinas', 'Reparación de secadoras', 'Mantención de electrodomésticos'] },
  { slug: 'contratista', servicio: 'Contratista', profesional: 'Contratista', gancho: 'Remodelaciones, ampliaciones y terminaciones',
    servicios: ['Remodelaciones', 'Ampliaciones', 'Construcción ligera', 'Terminaciones', 'Proyectos a la medida'] },
];

export const COMUNAS = [
  { slug: 'providencia', nombre: 'Providencia' }, { slug: 'las-condes', nombre: 'Las Condes' },
  { slug: 'nunoa', nombre: 'Ñuñoa' }, { slug: 'santiago', nombre: 'Santiago Centro' },
  { slug: 'maipu', nombre: 'Maipú' }, { slug: 'la-florida', nombre: 'La Florida' },
  { slug: 'puente-alto', nombre: 'Puente Alto' }, { slug: 'vitacura', nombre: 'Vitacura' },
  { slug: 'la-reina', nombre: 'La Reina' }, { slug: 'penalolen', nombre: 'Peñalolén' },
  { slug: 'macul', nombre: 'Macul' }, { slug: 'san-miguel', nombre: 'San Miguel' },
  { slug: 'recoleta', nombre: 'Recoleta' }, { slug: 'independencia', nombre: 'Independencia' },
  { slug: 'quilicura', nombre: 'Quilicura' }, { slug: 'huechuraba', nombre: 'Huechuraba' },
  { slug: 'lo-barnechea', nombre: 'Lo Barnechea' }, { slug: 'estacion-central', nombre: 'Estación Central' },
  { slug: 'san-bernardo', nombre: 'San Bernardo' }, { slug: 'la-cisterna', nombre: 'La Cisterna' },
  { slug: 'vina-del-mar', nombre: 'Viña del Mar' }, { slug: 'valparaiso', nombre: 'Valparaíso' },
  { slug: 'concepcion', nombre: 'Concepción' }, { slug: 'la-serena', nombre: 'La Serena' },
];

export function ofPorSlug(slug) { return OFICIOS.filter(function (o) { return o.slug === slug; })[0] || null; }
export function comunaPorSlug(slug) { return COMUNAS.filter(function (c) { return c.slug === slug; })[0] || null; }
