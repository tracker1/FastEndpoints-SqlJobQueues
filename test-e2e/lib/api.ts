const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";

export interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<{ status: number; headers: Headers; data: T }> {
  const { method = "GET", headers = {}, body } = options;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await response.json()) as T;
  return { status: response.status, headers: response.headers, data };
}

export function getBaseUrl(): string {
  return BASE_URL;
}
