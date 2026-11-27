// kaliwaru.net movie — proxy HLS untuk Cloudflare Workers (gratis)
// Cara pakai:
// 1. https://dash.cloudflare.com → Workers & Pages → Create Worker → namai misalnya kaliwaru-proxy
// 2. Replace kode default dengan file ini, lalu Deploy.
// 3. Di aplikasi, buka menu ⓘ → tempel URL worker (https://nama.workers.dev) → Simpan.
//
// Fungsi: meneruskan manifest M3U8 + segmen, menulis ulang URL relatif supaya
// segmen ikut lewat proxy, memperbaiki MIME .pict menjadi video/mp2t, dan
// menambahkan header CORS + dukungan Range.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Content-Type',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const reqUrl = new URL(request.url);
    const target = reqUrl.searchParams.get('url');
    if (!target) {
      return new Response('Missing ?url= parameter', { status: 400, headers: CORS });
    }

    let parsed;
    try {
      parsed = new URL(target);
    } catch (_) {
      return new Response('Invalid URL', { status: 400, headers: CORS });
    }
    if (!/^https?:$/i.test(parsed.protocol)) {
      return new Response('Only http(s) targets are allowed', { status: 400, headers: CORS });
    }

    const proxyBase = reqUrl.origin + reqUrl.pathname;
    const wrap = (absolute) => proxyBase + '?url=' + encodeURIComponent(absolute);

    const headers = new Headers({
      'User-Agent': 'Mozilla/5.0 (compatible; kaliwaruMovieProxy/1.0)',
      'Accept-Encoding': 'identity',
    });
    const range = request.headers.get('Range');
    if (range) headers.set('Range', range);

    let upstream;
    try {
      upstream = await fetch(parsed.href, { headers, redirect: 'follow' });
    } catch (err) {
      return new Response('Upstream error: ' + (err && err.message ? err.message : 'unknown'), {
        status: 502,
        headers: CORS,
      });
    }

    const finalUrl = upstream.url || parsed.href;
    const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
    const isManifest = contentType.includes('mpegurl') || contentType.includes('m3u8');

    if (!isManifest) {
      // Segmen bisa disajikan sebagai image/x-pict padahal isinya MPEG-TS.
      // Deteksi dari magic byte: 0x47 = TS, "ftyp" = MP4.
      const buf = await upstream.arrayBuffer();
      const head = new Uint8Array(buf.slice(0, 16));
      let outType = contentType || 'application/octet-stream';
      if (head.length > 4 && head[0] === 0x47) outType = 'video/mp2t';
      else if (head.length >= 8 && String.fromCharCode.apply(null, head.slice(4, 8)) === 'ftyp') outType = 'video/mp4';

      const h = new Headers(CORS);
      h.set('Content-Type', outType);
      h.set('Accept-Ranges', 'bytes');
      const len = upstream.headers.get('content-length');
      if (len) h.set('Content-Length', len);
      const cr = upstream.headers.get('content-range');
      if (cr) h.set('Content-Range', cr);
      return new Response(buf, { status: upstream.status, headers: h });
    }

    const text = await upstream.text();
    const base = new URL(finalUrl);
    const resolve = (ref) => {
      if (/^[a-z][a-z0-9+.-]*:\/\//i.test(ref)) return ref;
      return new URL(ref, base).href;
    };

    const rewritten = text.split(/\r?\n/).map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        // #EXT-X-KEY, #EXT-X-MAP, dll.
        return line.replace(/URI="([^"]+)"/g, (_m, ref) => 'URI="' + wrap(resolve(ref)) + '"');
      }
      if (!trimmed) return line;
      if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
        return line; // skd:// untuk DRM tidak bisa diproksikan
      }
      return wrap(resolve(trimmed));
    }).join('\n');

    const h = new Headers(CORS);
    h.set('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
    h.set('Cache-Control', 'no-store');
    return new Response(rewritten, { status: 200, headers: h });
  },
};
