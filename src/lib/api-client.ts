const DEFAULT_API_BASE_URL = "http://localhost:8000/api/v1";
const REQUEST_TIMEOUT_MS = 10_000;

let inMemoryAuthToken: string | null = null;

export function setAuthToken(token: string | null): void {
  inMemoryAuthToken = token && token.trim() !== "" ? token.trim() : null;
}

export function getAuthToken(): string | null {
  return inMemoryAuthToken;
}

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  errorCode?: string;
  meta?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string[]>,
    errorCode?: string,
    meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.errorCode = errorCode;
    this.meta = meta;
  }
}

function getBaseUrl(): string {
  const configured = import.meta.env?.VITE_API_BASE_URL;
  return (
    configured && configured.trim() !== "" ? configured : DEFAULT_API_BASE_URL
  ).replace(/\/+$/, "");
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(extra ?? {}),
  };

  if (inMemoryAuthToken) {
    headers.Authorization = `Bearer ${inMemoryAuthToken}`;
  }

  return headers;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload.message === "string"
        ? payload.message
        : `Request failed with status ${response.status}`;
    const errors =
      payload && typeof payload.errors === "object"
        ? (payload.errors as Record<string, string[]>)
        : undefined;
    const errorCode =
      payload && typeof payload.error_code === "string"
        ? payload.error_code
        : undefined;
    const meta =
      payload && typeof payload.meta === "object" && payload.meta !== null
        ? (payload.meta as Record<string, unknown>)
        : undefined;
    throw new ApiError(message, response.status, errors, errorCode, meta);
  }

  return payload as T;
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const searchParams = new URLSearchParams();

  if (params) {
    for (const [key, rawValue] of Object.entries(params)) {
      if (rawValue === undefined) {
        continue;
      }
      const strValue = String(rawValue).trim();
      if (strValue !== "") {
        searchParams.set(key, strValue);
      }
    }
  }

  const query = searchParams.toString();
  const url = `${getBaseUrl()}${normalizedPath}${query ? `?${query}` : ""}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: buildHeaders(),
      signal: controller.signal,
    });

    return await parseResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    const message =
      error instanceof Error ? error.message : "Network error occurred";
    throw new ApiError(message, 0);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  options?: { headers?: Record<string, string> },
): Promise<T> {
  return apiMutate<T>("POST", path, body, options);
}

export async function apiPut<T>(
  path: string,
  body?: unknown,
  options?: { headers?: Record<string, string> },
): Promise<T> {
  return apiMutate<T>("PUT", path, body, options);
}

export async function apiPatch<T>(
  path: string,
  body?: unknown,
  options?: { headers?: Record<string, string> },
): Promise<T> {
  return apiMutate<T>("PATCH", path, body, options);
}

async function apiMutate<T>(
  method: "POST" | "PUT" | "PATCH",
  path: string,
  body?: unknown,
  options?: { headers?: Record<string, string> },
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${getBaseUrl()}${normalizedPath}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      headers: buildHeaders({
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      }),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    return await parseResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    const message =
      error instanceof Error ? error.message : "Network error occurred";
    throw new ApiError(message, 0);
  } finally {
    clearTimeout(timeoutId);
  }
}
