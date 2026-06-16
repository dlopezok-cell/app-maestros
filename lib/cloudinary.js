// Subida de media a Cloudinary (cuenta drmpw7n8s), sin pasar por nuestro servidor.
// Usa un "upload preset" UNSIGNED creado en el panel de Cloudinary.
//
// Estrategia tipo WhatsApp, por superficie:
//  - FOTOS: se comprimen EN EL TELÉFONO con canvas antes de subir (rápido y confiable,
//    funciona también dentro del WebView de la app). Bajamos resolución + calidad.
//  - VIDEO: se sube a Cloudinary y se entrega optimizado (q_auto). La compresión nativa
//    con el chip del teléfono queda para una versión nativa futura (v1.1).
// Además, guardamos una URL de ENTREGA optimizada (f_auto,q_auto imagen / q_auto video).

var CLOUD = 'drmpw7n8s';
var PRESET = 'maestros_unsigned'; // <-- debe existir como preset UNSIGNED en Cloudinary

// Límites del plan Free de Cloudinary (en bytes).
export var LIMITES = { foto: 20 * 1024 * 1024, video: 100 * 1024 * 1024 };

// Comprime una imagen en el teléfono (canvas). Devuelve un Blob más liviano,
// o el archivo original si no es imagen o si algo falla.
export function comprimirImagen(file, maxLado, calidad) {
  maxLado = maxLado || 1600;
  calidad = calidad || 0.72;
  return new Promise(function (resolve) {
    if (!file || (file.type || '').indexOf('image') !== 0) { resolve(file); return; }
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      try {
        var w = img.width, h = img.height;
        var escala = Math.min(1, maxLado / Math.max(w, h));
        var nw = Math.max(1, Math.round(w * escala));
        var nh = Math.max(1, Math.round(h * escala));
        var c = document.createElement('canvas');
        c.width = nw; c.height = nh;
        c.getContext('2d').drawImage(img, 0, 0, nw, nh);
        c.toBlob(function (blob) {
          URL.revokeObjectURL(url);
          // Solo usamos la versión comprimida si realmente quedó más liviana.
          resolve(blob && blob.size > 0 && blob.size < file.size ? blob : file);
        }, 'image/jpeg', calidad);
      } catch (e) { URL.revokeObjectURL(url); resolve(file); }
    };
    img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// Inserta una transformación de compresión en la URL que devuelve Cloudinary.
function urlComprimida(secureUrl, esVideo, esAudio) {
  if (!secureUrl || esAudio) return secureUrl;
  var t = esVideo ? 'q_auto' : 'f_auto,q_auto';
  return secureUrl.replace('/upload/', '/upload/' + t + '/');
}

function subirRaw(file, onProgress) {
  onProgress = onProgress || function () {};
  var mime = file.type || '';
  var esVideo = mime.indexOf('video') === 0;
  var esAudio = mime.indexOf('audio') === 0;
  var resourceType = (esVideo || esAudio) ? 'video' : 'image';
  var endpoint = 'https://api.cloudinary.com/v1_1/' + CLOUD + '/' + resourceType + '/upload';

  return new Promise(function (resolve, reject) {
    var fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', PRESET);

    var xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint, true);
    xhr.upload.onprogress = function (e) {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = function () {
      var r = null;
      try { r = JSON.parse(xhr.responseText); } catch (err) {}
      if (xhr.status >= 200 && xhr.status < 300 && r && r.secure_url) {
        resolve({ url: urlComprimida(r.secure_url, esVideo, esAudio), bytes: r.bytes });
      } else {
        reject(new Error((r && r.error && r.error.message) || ('Error ' + xhr.status)));
      }
    };
    xhr.onerror = function () { reject(new Error('No se pudo conectar con Cloudinary')); };
    xhr.send(fd);
  });
}

// Sube un File o Blob a Cloudinary. Comprime imágenes en el teléfono antes de subir.
// Devuelve { url, bytes }. onProgress(pct 0..100) es opcional.
export function subirACloudinary(file, onProgress) {
  return comprimirImagen(file).then(function (f) { return subirRaw(f, onProgress); });
}
