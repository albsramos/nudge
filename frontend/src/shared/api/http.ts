// The one place the app talks to its own API. Orval's generated functions call this; nothing else should.
import { serverBaseUrl } from '@/shared/lib/settings';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function http<T>(url: string, init?: RequestInit): Promise<T> {
  // The server is chosen at runtime in Settings, since the PWA is a static build on GitHub Pages.
  const baseUrl = serverBaseUrl();
  if (!baseUrl) throw new ApiError(0, 'No reminder server is configured');

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${url}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    // Offline, a wrong URL, or a server that's down (its error page has no CORS headers, so it looks the same).
    throw new ApiError(0, `Couldn't reach the reminder server at ${new URL(baseUrl).host}. Check the URL and that the server is running.`);
  }
  const body = response.status === 204 ? undefined : await response.json().catch(() => undefined);

  if (!response.ok) {
    const message = (body as { message?: string } | undefined)?.message ?? response.statusText;
    throw new ApiError(response.status, message);
  }
  return body as T;
}

// Orval types every hook's error as this.
export type ErrorType<E> = ApiError & { body?: E };
