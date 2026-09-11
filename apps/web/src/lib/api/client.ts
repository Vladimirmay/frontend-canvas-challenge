import { ApiError } from './errors';
import { isAbortError } from '../async/abort';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://127.0.0.1:4001';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT';
  /** JSON-serializable body; stringified once here. Use `rawBody` when the exact bytes matter. */
  body?: unknown;
  /** Pre-serialized body sent verbatim (needed where byte-exact ETag semantics matter). */
  rawBody?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface ApiResponse<T> {
  data: T;
  /** ETag response header, if present. */
  etag: string | null;
  /** Exact response body text (empty for 204/304), for callers that need byte-level comparison. */
  raw: string;
  response: Response;
}

interface ErrorBody {
  error?: { code?: string; message?: string };
}

/**
 * The single chokepoint for every HTTP call the app makes: URL/header construction, JSON
 * parsing, and error normalization all happen here exactly once. Callers always get parsed
 * data or a thrown ApiError — never a raw Response or a bespoke try/catch around fetch.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
  const { method = 'GET', body, rawBody, headers, signal } = options;
  const hasBody = rawBody !== undefined || body !== undefined;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: rawBody ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError('NETWORK_ERROR', 'Не удалось выполнить запрос к серверу.');
  }

  const etag = response.headers.get('ETag');

  if (response.status === 204 || response.status === 304) {
    return { data: null as T, etag, raw: '', response };
  }

  const raw = await response.text();
  let parsed: unknown = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new ApiError('INVALID_RESPONSE', 'Сервер вернул некорректный ответ.', response.status);
    }
  }

  if (!response.ok) {
    const body = parsed as ErrorBody | null;
    throw new ApiError(
      body?.error?.code ?? 'UNKNOWN_ERROR',
      body?.error?.message ?? 'Не удалось выполнить запрос.',
      response.status,
    );
  }

  return { data: parsed as T, etag, raw, response };
}
