const DEFAULT_API_BASE_URL = "http://localhost:8000/api/v1";
const REQUEST_TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

function getBaseUrl(): string {
  const configured = import.meta.env?.VITE_API_BASE_URL;
  return (configured && configured.trim() !== "" ? configured : DEFAULT_API_BASE_URL).replace(
    /\/+$/,
    "",
  );
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
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

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
      throw new ApiError(message, response.status, errors);
    }

    return payload as T;
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
