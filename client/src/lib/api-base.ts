const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const apiOriginFromEnv = import.meta.env.VITE_API_ORIGIN
  ? trimTrailingSlash(import.meta.env.VITE_API_ORIGIN)
  : '';

export const API_ORIGIN = apiOriginFromEnv;

export const API_V1_BASE = import.meta.env.VITE_API_V1_BASE
  ? trimTrailingSlash(import.meta.env.VITE_API_V1_BASE)
  : `${API_ORIGIN}/api/v1`.replace(/\/+$/, '') || '/api/v1';

export const withApiOrigin = (path: string) => {
  if (!API_ORIGIN || /^https?:\/\//i.test(path)) {
    return path;
  }
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
};
