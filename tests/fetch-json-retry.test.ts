import { describe, expect, it, vi } from "vitest";
// @ts-expect-error plain .mjs script without type declarations
import { fetchJson } from "../scripts/fetch-json-retry.mjs";

const res = (status: number, body: unknown = {}, headers: Record<string, string> = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  json: async () => body,
});

const opts = (fetchImpl: unknown) => ({
  fetchImpl,
  sleepImpl: vi.fn(async () => {}),
  log: () => {},
  baseDelayMs: 10,
});

describe("fetchJson retry", () => {
  it("returns the body on first success", async () => {
    const f = vi.fn(async () => res(200, { abi: [1] }));
    await expect(fetchJson("u", opts(f))).resolves.toEqual({ abi: [1] });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("retries 503 then succeeds", async () => {
    const f = vi.fn().mockResolvedValueOnce(res(503)).mockResolvedValueOnce(res(503)).mockResolvedValueOnce(res(200, { ok: 1 }));
    const o = opts(f);
    await expect(fetchJson("u", o)).resolves.toEqual({ ok: 1 });
    expect(f).toHaveBeenCalledTimes(3);
    expect(o.sleepImpl).toHaveBeenNthCalledWith(1, 10);
    expect(o.sleepImpl).toHaveBeenNthCalledWith(2, 20);
  });

  it("retries network errors", async () => {
    const f = vi.fn().mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(res(200, { ok: 1 }));
    await expect(fetchJson("u", opts(f))).resolves.toEqual({ ok: 1 });
  });

  it("honours Retry-After", async () => {
    const f = vi.fn().mockResolvedValueOnce(res(429, {}, { "retry-after": "3" })).mockResolvedValueOnce(res(200, {}));
    const o = opts(f);
    await fetchJson("u", o);
    expect(o.sleepImpl).toHaveBeenCalledWith(3000);
  });

  it("gives up after the configured attempts with the last status", async () => {
    const f = vi.fn(async () => res(503));
    await expect(fetchJson("http://x/abi", { ...opts(f), attempts: 3 })).rejects.toThrow("GET http://x/abi → 503");
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("does not retry a permanent 404", async () => {
    const f = vi.fn(async () => res(404));
    await expect(fetchJson("u", opts(f))).rejects.toThrow("→ 404");
    expect(f).toHaveBeenCalledTimes(1);
  });
});
