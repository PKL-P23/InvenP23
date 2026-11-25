export const serviceOrigin = 'https://rakruang-qr.geksonsimanjuntak00.chatgpt.site';

export function pageHref(path) {
  return path === '/pengelola' ? serviceOrigin + path : '#' + path;
}

export function routePath(hash) {
  return hash.startsWith('#/') ? hash.slice(1).replace(/\/$/, '') || '/' : '/';
}
