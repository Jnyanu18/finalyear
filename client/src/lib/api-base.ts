const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');
const normalizePath = (value: string) => (value.startsWith('/') ? value : `/${value}`);
const toWsProtocol = (value: string) =>
  trimTrailingSlash(value)
    .replace(/^http:\/\//i, 'ws://')
    .replace(/^https:\/\//i, 'wss://');

const apiOriginFromEnv = import.meta.env.VITE_API_ORIGIN
  ? trimTrailingSlash(import.meta.env.VITE_API_ORIGIN)
  : '';
const wsOriginFromEnv = import.meta.env.VITE_WS_ORIGIN
  ? toWsProtocol(import.meta.env.VITE_WS_ORIGIN)
  : apiOriginFromEnv
    ? toWsProtocol(apiOriginFromEnv)
    : '';

export const API_ORIGIN = apiOriginFromEnv;
export const WS_ORIGIN = wsOriginFromEnv;

export const API_V1_BASE = import.meta.env.VITE_API_V1_BASE
  ? trimTrailingSlash(import.meta.env.VITE_API_V1_BASE)
  : `${API_ORIGIN}/api/v1`.replace(/\/+$/, '') || '/api/v1';

export const withApiOrigin = (path: string) => {
  if (!API_ORIGIN || /^https?:\/\//i.test(path)) {
    return path;
  }
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
};

export const toWebSocketUrl = (path: string) => {
  const normalizedPath = normalizePath(path);

  if (WS_ORIGIN) {
    return `${WS_ORIGIN}${normalizedPath}`;
  }

  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${window.location.host}${normalizedPath}`;
  }

  return null;
};
