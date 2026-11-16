export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers();
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${import.meta.env.VITE_API_URL ?? ''}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: 'include',
  });

  if (response.status === 204) {
    if (!response.ok) throw new ApiError('The request could not be completed', response.status);
    return undefined as T;
  }

  const payload: unknown = await response.json();
  if (!response.ok) {
    const detail = typeof payload === 'object' && payload !== null && 'detail' in payload
      ? String(payload.detail)
      : `Request failed (HTTP ${response.status})`;
    throw new ApiError(detail, response.status);
  }
  return payload as T;
}
