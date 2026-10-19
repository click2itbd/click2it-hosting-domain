import { auth } from '../firebase';

export function resolveApiBaseUrl(): string {
  // If an explicit custom API URL is provided, use it (trimmed of trailing slashes)
  const customBase = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
  if (customBase) return customBase;
  // Always default to same-origin relative path for universal compatibility across all environments
  return '';
}

async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const cleanBase = resolveApiBaseUrl();
  let cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Ensure /api is prefixed if caller passed an endpoint without /api (e.g., 'domains/pricing')
  if (!cleanPath.startsWith('/api') && !cleanBase.endsWith('/api')) {
    cleanPath = `/api${cleanPath}`;
  } else if (cleanBase.endsWith('/api') && cleanPath.startsWith('/api/')) {
    cleanPath = cleanPath.slice(4);
  }

  const url = `${cleanBase}${cleanPath}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  let authToken = token;
  if (!authToken && typeof window !== 'undefined') {
    if (typeof (auth as any).authStateReady === 'function') {
      try {
        await (auth as any).authStateReady();
      } catch {
        // ignore
      }
    }
    if (auth.currentUser) {
      try {
        authToken = await auth.currentUser.getIdToken();
      } catch {
        // ignore
      }
    }
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
    headers['X-Authorization'] = `Bearer ${authToken}`;
  } else {
    // If an admin or balance endpoint is called without an auth session, abort gracefully to prevent browser 401 console errors
    const isAuthRequiredEndpoint = cleanPath.startsWith('/api/admin') || cleanPath === '/api/domains/balance';
    if (isAuthRequiredEndpoint) {
      throw new Error('Authentication required');
    }
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok && response.status === 401 && typeof window !== 'undefined' && auth.currentUser) {
    try {
      const freshToken = await auth.currentUser.getIdToken(true);
      if (freshToken) {
        headers['Authorization'] = `Bearer ${freshToken}`;
        headers['X-Authorization'] = `Bearer ${freshToken}`;
        response = await fetch(url, {
          ...options,
          headers,
        });
      }
    } catch {
      // ignore
    }
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export function getApiUrl(path: string = ''): string {
  const base = resolveApiBaseUrl();
  if (!path) return base;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (base.endsWith('/api') && cleanPath.startsWith('/api/')) {
    return `${base}${cleanPath.slice(4)}`;
  }
  return `${base}${cleanPath}`;
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  return apiRequest<T>(path, { method: 'GET' }, token);
}

export async function apiPost<T>(path: string, body: any, token?: string): Promise<T> {
  return apiRequest<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
}

export async function apiPut<T>(path: string, body: any, token?: string): Promise<T> {
  return apiRequest<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  }, token);
}

export async function apiDelete<T>(path: string, token?: string, body?: any): Promise<T> {
  return apiRequest<T>(path, {
    method: 'DELETE',
    body: body ? JSON.stringify(body) : undefined,
  }, token);
}
const API_BASE_URL = resolveApiBaseUrl();
export { API_BASE_URL };

export const apiClient = {
  get: async (path: string, token?: string) => {
    const data = await apiGet<any>(path, token);
    return { data };
  },
  post: async (path: string, body?: any, config?: any) => {
    const token = config?.headers?.Authorization?.replace(/^Bearer\s+/i, '');
    const data = await apiPost<any>(path, body, token);
    return { data };
  },
  put: async (path: string, body?: any, config?: any) => {
    const token = config?.headers?.Authorization?.replace(/^Bearer\s+/i, '');
    const data = await apiPut<any>(path, body, token);
    return { data };
  },
  delete: async (path: string, config?: any) => {
    const token = config?.headers?.Authorization?.replace(/^Bearer\s+/i, '');
    const data = await apiDelete<any>(path, token);
    return { data };
  }
};

