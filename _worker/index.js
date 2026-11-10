// dumplingfish.com (wrangler.jsonc next to this file). Serves this repository's files, the same ones
// GitHub Pages serves at dumplingfish.github.io, and adds what Pages cannot:
// - www.dumplingfish.com sends visitors to dumplingfish.com;
// - short addresses (/privacy, /terms, /support) serve their .html pages, which stay the main addresses;
// - the old /mahjongnook-legal/ addresses (only ever used on dumplingfish.github.io) land on the pages here;
// - a real 404 page, cache lifetimes and security headers.

const HOST = 'dumplingfish.com';
const LEGACY = '/mahjongnook-legal';

const SECURITY = {
  // No scripts at all; styles and images from this site only.
  'content-security-policy': "default-src 'none'; img-src 'self'; font-src 'self'; style-src 'self' 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'strict-transport-security': 'max-age=31536000',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === `www.${HOST}`) {
      url.protocol = 'https:';
      url.hostname = HOST;
      return Response.redirect(url.toString(), 301);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD', ...SECURITY } });
    }
    if (url.pathname === LEGACY || url.pathname.startsWith(`${LEGACY}/`)) {
      const rest = url.pathname.slice(LEGACY.length);
      url.pathname = rest === '' || rest === '/' || rest === '/index.html' ? '/' : rest;
      return Response.redirect(url.toString(), 301);
    }

    const path = assetPath(url.pathname);
    const res = await env.ASSETS.fetch(new Request(new URL(path, url), request));
    if (res.status !== 404) return withHeaders(res, res.status, path);

    const page = await env.ASSETS.fetch(new URL('/404.html', url));
    return withHeaders(page, 404, '/404.html');
  },
};

/** The file a request means: "/" is the home page, "/privacy" is privacy.html. */
export function assetPath(pathname) {
  if (pathname.endsWith('/')) return `${pathname}index.html`;
  const last = pathname.slice(pathname.lastIndexOf('/') + 1);
  return last.includes('.') ? pathname : `${pathname}.html`;
}

function withHeaders(res, status, path) {
  const out = new Response(res.body, { status, statusText: status === res.status ? res.statusText : '', headers: res.headers });
  for (const [k, v] of Object.entries(SECURITY)) out.headers.set(k, v);
  out.headers.set('cache-control', cacheFor(path, status));
  return out;
}

function cacheFor(path, status) {
  if (status === 404) return 'public, max-age=60';
  if (path.startsWith('/assets/')) return 'public, max-age=604800';
  if (path === '/app-ads.txt') return 'public, max-age=3600';
  return 'public, max-age=300';
}
