/**
 * @fileoverview Provides a fixed-origin, GET-only client for the Canvas API.
 */

import { getNextPageUrl } from "./pagination";

const CANVAS_ORIGIN = "https://sjsu.instructure.com";
const CANVAS_API_PREFIX = "/api/v1/";
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRY_DELAY_MS = 30_000;
const BASE_RETRY_DELAY_MS = 1_000;

export type CanvasClientErrorCode =
  "auth_required" | "network_error" | "rate_limited" | "invalid_response";

export type CanvasQueryValue =
  string | number | boolean | readonly (string | number | boolean)[];

export type CanvasQuery = Record<string, CanvasQueryValue>;

export interface CanvasClient {
  get<T>(path: string, query?: CanvasQuery | URLSearchParams): Promise<T>;
  getAll<T>(path: string, query?: CanvasQuery | URLSearchParams): Promise<T[]>;
}

interface CanvasHttpClientOptions {
  fetch_fn?: typeof fetch;
  sleep_fn?: (delayMs: number) => Promise<void>;
  max_attempts?: number;
  request_timeout_ms?: number;
}

/** Represents a privacy-safe Canvas transport failure. */
export class CanvasClientError extends Error {
  readonly code: CanvasClientErrorCode;

  /**
   * Creates an error that exposes only a stable classification code.
   *
   * @param code - Stable failure category for application handling.
   */
  constructor(code: CanvasClientErrorCode) {
    super(code);
    this.code = code;
  }
}

/** Waits for a retry delay without blocking the extension worker thread. */
async function defaultSleep(delayMs: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

/** Checks whether an HTTP status is eligible for a bounded retry. */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/** Returns a bounded Retry-After or exponential fallback delay. */
function getRetryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("Retry-After");

  if (retryAfter !== null) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1_000, MAX_RETRY_DELAY_MS);
    }

    const retryAt = Date.parse(retryAfter);
    if (!Number.isNaN(retryAt)) {
      return Math.min(Math.max(retryAt - Date.now(), 0), MAX_RETRY_DELAY_MS);
    }
  }

  return Math.min(
    BASE_RETRY_DELAY_MS * 2 ** Math.max(attempt - 1, 0),
    MAX_RETRY_DELAY_MS,
  );
}

/** Validates an absolute Canvas API continuation URL. */
function validateAbsoluteApiUrl(value: string): URL {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new CanvasClientError("invalid_response");
  }

  const isTrustedApiUrl =
    url.origin === CANVAS_ORIGIN &&
    url.pathname.startsWith(CANVAS_API_PREFIX) &&
    url.username === "" &&
    url.password === "";

  if (!isTrustedApiUrl) {
    throw new CanvasClientError("invalid_response");
  }

  return url;
}

/** Builds a fixed-origin API URL from an application-owned relative path. */
function buildInitialApiUrl(
  path: string,
  query?: CanvasQuery | URLSearchParams,
): URL {
  if (!path.startsWith(CANVAS_API_PREFIX)) {
    throw new CanvasClientError("invalid_response");
  }

  const url = validateAbsoluteApiUrl(`${CANVAS_ORIGIN}${path}`);
  appendQuery(url.searchParams, query);

  return url;
}

/** Appends deterministic query values, including repeated array parameters. */
function appendQuery(
  searchParams: URLSearchParams,
  query?: CanvasQuery | URLSearchParams,
): void {
  if (query === undefined) {
    return;
  }

  if (query instanceof URLSearchParams) {
    for (const [key, value] of query) {
      searchParams.append(key, value);
    }
    return;
  }

  for (const [key, value] of Object.entries(query)) {
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      searchParams.append(key, String(item));
    }
  }
}

/** Parses JSON without propagating payload text or parser diagnostics. */
async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new CanvasClientError("invalid_response");
  }
}

/** Implements the read-only Canvas transport and pagination boundary. */
export class CanvasHttpClient implements CanvasClient {
  readonly #fetchFn: typeof fetch;
  readonly #sleepFn: (delayMs: number) => Promise<void>;
  readonly #maxAttempts: number;
  readonly #requestTimeoutMs: number;

  /**
   * Creates a Canvas client with optional deterministic test dependencies.
   *
   * @param options - Fetch, sleep, and retry dependencies.
   */
  constructor(options: CanvasHttpClientOptions = {}) {
    const maxAttempts = options.max_attempts ?? DEFAULT_MAX_ATTEMPTS;
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
      throw new RangeError("max_attempts must be a positive integer.");
    }
    const requestTimeoutMs =
      options.request_timeout_ms ?? DEFAULT_REQUEST_TIMEOUT_MS;
    if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1) {
      throw new RangeError("request_timeout_ms must be a positive integer.");
    }

    this.#fetchFn =
      options.fetch_fn ??
      ((input: RequestInfo | URL, init?: RequestInit) =>
        globalThis.fetch(input, init));
    this.#sleepFn = options.sleep_fn ?? defaultSleep;
    this.#maxAttempts = maxAttempts;
    this.#requestTimeoutMs = requestTimeoutMs;
  }

  /** Fetches and parses one fixed-origin Canvas JSON resource. */
  async get<T>(
    path: string,
    query?: CanvasQuery | URLSearchParams,
  ): Promise<T> {
    const url = buildInitialApiUrl(path, query);
    return (await this.#requestJson(url)) as T;
  }

  /** Fetches every array page by following validated opaque next links. */
  async getAll<T>(
    path: string,
    query?: CanvasQuery | URLSearchParams,
  ): Promise<T[]> {
    let url: URL | null = buildInitialApiUrl(path, query);
    const visited = new Set<string>();
    const items: T[] = [];

    while (url !== null) {
      if (visited.has(url.href)) {
        throw new CanvasClientError("invalid_response");
      }
      visited.add(url.href);

      const response = await this.#request(url);
      const payload = await parseJson(response);
      if (!Array.isArray(payload)) {
        throw new CanvasClientError("invalid_response");
      }
      items.push(...(payload as T[]));

      const next = getNextPageUrl(response.headers.get("Link"));
      url = next === null ? null : validateAbsoluteApiUrl(next);
    }

    return items;
  }

  /** Performs a validated request and parses its JSON body. */
  async #requestJson(url: URL): Promise<unknown> {
    return parseJson(await this.#request(url));
  }

  /** Performs one GET request with bounded retries and response validation. */
  async #request(url: URL): Promise<Response> {
    for (let attempt = 1; attempt <= this.#maxAttempts; attempt += 1) {
      let response: Response;

      try {
        response = await this.#fetchWithTimeout(url);
      } catch {
        throw new CanvasClientError("network_error");
      }

      if (response.status === 401 || response.status === 403) {
        throw new CanvasClientError("auth_required");
      }

      if (isRetryableStatus(response.status)) {
        if (attempt === this.#maxAttempts) {
          throw new CanvasClientError(
            response.status === 429 ? "rate_limited" : "network_error",
          );
        }

        await this.#sleepFn(getRetryDelay(response, attempt));
        continue;
      }

      if (!response.ok) {
        throw new CanvasClientError("invalid_response");
      }

      const contentType = response.headers.get("Content-Type")?.toLowerCase();
      if (response.redirected || !contentType?.includes("application/json")) {
        throw new CanvasClientError("auth_required");
      }

      return response;
    }

    throw new CanvasClientError("network_error");
  }

  /** Bounds a fetch duration while preserving the fixed request-init contract. */
  async #fetchWithTimeout(url: URL): Promise<Response> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timeoutId = setTimeout(() => {
        reject(new CanvasClientError("network_error"));
      }, this.#requestTimeoutMs);
    });

    try {
      return await Promise.race([
        this.#fetchFn(url.href, {
          credentials: "include",
          headers: { Accept: "application/json" },
          method: "GET",
        }),
        timeout,
      ]);
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }
}
