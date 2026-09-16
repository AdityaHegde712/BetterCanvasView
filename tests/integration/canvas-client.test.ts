/**
 * @fileoverview Defines HTTP integration contracts for the Canvas API client.
 */

import { describe, expect, it, vi } from "vitest";

import { CanvasClientError, CanvasHttpClient } from "../../src/canvas/client";

const API_ORIGIN = "https://sjsu.instructure.com";

function jsonResponse(
  body: unknown,
  options: { headers?: HeadersInit; status?: number } = {},
): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json", ...options.headers },
    status: options.status ?? 200,
  });
}

function errorCode(error: unknown): string {
  expect(error).toBeInstanceOf(CanvasClientError);
  expect(Object.keys(error as object)).toEqual(["code"]);

  return (error as CanvasClientError).code;
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }

  return input instanceof URL ? input.href : input.url;
}

describe("CanvasHttpClient", () => {
  it("uses the fixed Canvas origin with credentialed JSON GET requests", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ id: 101 }));
    const client = new CanvasHttpClient({ fetch_fn: fetchFn });

    await expect(
      client.get<{ id: number }>("/api/v1/courses/101"),
    ).resolves.toEqual({
      id: 101,
    });

    expect(fetchFn).toHaveBeenCalledOnce();
    expect(fetchFn).toHaveBeenCalledWith(`${API_ORIGIN}/api/v1/courses/101`, {
      credentials: "include",
      headers: { Accept: "application/json" },
      method: "GET",
    });
  });

  it("serially follows only same-origin opaque next links and concatenates pages", async () => {
    let requestCount = 0;
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      requestCount += 1;

      if (url.endsWith("?per_page=100")) {
        return jsonResponse([{ id: 101 }], {
          headers: {
            Link: `<${API_ORIGIN}/api/v1/courses?page=2&per_page=100>; rel="next"`,
          },
        });
      }

      expect(requestCount).toBe(2);
      return jsonResponse([{ id: 102 }]);
    });
    const client = new CanvasHttpClient({ fetch_fn: fetchFn });

    const pages = await client.getAll<{ id: number }>("/api/v1/courses", {
      per_page: 100,
    });

    expect(pages).toEqual([{ id: 101 }, { id: 102 }]);
    expect(fetchFn.mock.calls.map(([url]) => requestUrl(url))).toEqual([
      `${API_ORIGIN}/api/v1/courses?per_page=100`,
      `${API_ORIGIN}/api/v1/courses?page=2&per_page=100`,
    ]);
  });

  it.each([
    ["external", "https://canvas.example.invalid/api/v1/courses?page=2"],
    ["relative", "/api/v1/courses?page=2"],
    ["non-API", `${API_ORIGIN}/login?return_to=%2Fapi%2Fv1%2Fcourses`],
  ])(
    "rejects a %s next link without issuing an escaped request",
    async (_label, next) => {
      void _label;
      const fetchFn = vi.fn(async () =>
        jsonResponse([], { headers: { Link: `<${next}>; rel="next"` } }),
      );
      const client = new CanvasHttpClient({ fetch_fn: fetchFn });

      await expect(client.getAll("/api/v1/courses")).rejects.toSatisfy(
        (error: unknown) => errorCode(error) === "invalid_response",
      );
      expect(fetchFn).toHaveBeenCalledOnce();
    },
  );

  it("rejects cyclic pagination before repeating an already visited request", async () => {
    const secondPage = `${API_ORIGIN}/api/v1/courses?page=2`;
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([{ id: 101 }], {
          headers: { Link: `<${secondPage}>; rel="next"` },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse([{ id: 102 }], {
          headers: { Link: `<${secondPage}>; rel="next"` },
        }),
      );
    const client = new CanvasHttpClient({ fetch_fn: fetchFn });

    await expect(client.getAll("/api/v1/courses")).rejects.toSatisfy(
      (error: unknown) => errorCode(error) === "invalid_response",
    );
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("rejects an arbitrary request URL before it can escape the fixed API origin", async () => {
    const fetchFn = vi.fn(async () => jsonResponse([]));
    const client = new CanvasHttpClient({ fetch_fn: fetchFn });

    await expect(
      client.get("https://canvas.example.invalid/api/v1/courses"),
    ).rejects.toSatisfy(
      (error: unknown) => errorCode(error) === "invalid_response",
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("retries 429 and 5xx responses no more than three total attempts", async () => {
    const sleepFn = vi.fn(async (_delayMs: number) => {
      void _delayMs;
    });
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ message: "slow down" }, { status: 429 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ message: "unavailable" }, { status: 503 }),
      )
      .mockResolvedValueOnce(jsonResponse({ id: 101 }));
    const client = new CanvasHttpClient({
      fetch_fn: fetchFn,
      sleep_fn: sleepFn,
    });

    await expect(
      client.get<{ id: number }>("/api/v1/courses/101"),
    ).resolves.toEqual({
      id: 101,
    });

    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(sleepFn).toHaveBeenCalledTimes(2);
    const delays = sleepFn.mock.calls.map(([delay]) => delay);
    expect(delays[0]).toBeGreaterThan(0);
    expect(delays[1]).toBeGreaterThan(delays[0] as number);
  });

  it("honors Retry-After seconds before retrying", async () => {
    const sleepFn = vi.fn(async () => undefined);
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([], { headers: { "Retry-After": "7" }, status: 429 }),
      )
      .mockResolvedValueOnce(jsonResponse([]));
    const client = new CanvasHttpClient({
      fetch_fn: fetchFn,
      sleep_fn: sleepFn,
    });

    await expect(client.getAll("/api/v1/courses")).resolves.toEqual([]);
    expect(sleepFn).toHaveBeenCalledWith(7_000);
  });

  it("does not retry ordinary 4xx responses and classifies auth responses", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({ message: "missing" }, { status: 404 }),
    );
    const client = new CanvasHttpClient({ fetch_fn: fetchFn });

    await expect(client.get("/api/v1/courses/101")).rejects.toSatisfy(
      (error: unknown) => errorCode(error) === "invalid_response",
    );
    expect(fetchFn).toHaveBeenCalledOnce();

    for (const response of [
      jsonResponse({}, { status: 401 }),
      jsonResponse({}, { status: 403 }),
      new Response("<html><title>Sign in</title></html>", {
        headers: { "Content-Type": "text/html" },
      }),
    ]) {
      await expect(
        new CanvasHttpClient({ fetch_fn: vi.fn(async () => response) }).get(
          "/api/v1/courses/101",
        ),
      ).rejects.toSatisfy(
        (error: unknown) => errorCode(error) === "auth_required",
      );
    }
  });

  it("classifies exhausted rate limits, network failures, and invalid payloads without exposing payloads", async () => {
    const rateLimited = new CanvasHttpClient({
      fetch_fn: vi.fn(async () =>
        jsonResponse({ secret: "never expose" }, { status: 429 }),
      ),
      sleep_fn: async () => undefined,
    });
    await expect(rateLimited.get("/api/v1/courses")).rejects.toSatisfy(
      (error: unknown) => errorCode(error) === "rate_limited",
    );

    const networkFailure = new CanvasHttpClient({
      fetch_fn: async () => Promise.reject(new TypeError("offline")),
      sleep_fn: async () => undefined,
    });
    await expect(networkFailure.get("/api/v1/courses")).rejects.toSatisfy(
      (error: unknown) => errorCode(error) === "network_error",
    );

    for (const response of [
      new Response("{", { headers: { "Content-Type": "application/json" } }),
      jsonResponse({ not: "an array" }),
    ]) {
      await expect(
        new CanvasHttpClient({ fetch_fn: async () => response }).getAll(
          "/api/v1/courses",
        ),
      ).rejects.toSatisfy(
        (error: unknown) => errorCode(error) === "invalid_response",
      );
    }
  });
});
