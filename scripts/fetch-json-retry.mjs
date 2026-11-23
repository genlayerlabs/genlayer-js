// fetchJson with retries for transient failures. The drift check depends on
// third-party endpoints (raw.githubusercontent.com, contracts.conduit.xyz)
// that intermittently answer 5xx/429 or drop the connection; a single blip
// must not fail CI. Permanent errors (other 4xx) fail immediately.

export const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class FetchRetriesExhaustedError extends Error {
  constructor(url, cause) {
    super(`GET ${url} failed after retries: ${cause.message}`, { cause });
  }
}

export async function fetchJson(
  url,
  {
    attempts = Number(process.env.FETCH_RETRY_ATTEMPTS) || 6,
    baseDelayMs = 2000,
    maxDelayMs = 30000,
    fetchImpl = fetch,
    sleepImpl = sleep,
    log = (msg) => console.warn(msg),
  } = {},
) {
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new RangeError("FETCH_RETRY_ATTEMPTS must be a positive integer");
  }
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    let retryAfterMs;
    try {
      const res = await fetchImpl(url);
      if (res.ok) return await res.json();
      lastError = new Error(`GET ${url} → ${res.status}`);
      if (!RETRYABLE_STATUS.has(res.status)) throw lastError;
      const retryAfter = Number(res.headers?.get?.("retry-after"));
      if (Number.isFinite(retryAfter) && retryAfter > 0) {
        retryAfterMs = retryAfter * 1000;
      }
    } catch (err) {
      // Non-retryable HTTP status: rethrow as-is. Anything else (network
      // error, truncated/invalid JSON body) is treated as transient.
      if (err === lastError && !RETRYABLE_STATUS.has(Number(/→ (\d+)$/.exec(err.message)?.[1]))) {
        throw err;
      }
      lastError = err;
    }
    if (attempt < attempts) {
      const delay = Math.min(
        retryAfterMs ?? baseDelayMs * 2 ** (attempt - 1),
        maxDelayMs,
      );
      log(
        `${lastError.message}; retry ${attempt}/${attempts - 1} in ${delay}ms`,
      );
      await sleepImpl(delay);
    }
  }
  throw new FetchRetriesExhaustedError(url, lastError);
}
