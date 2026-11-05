/** Byte + wall-clock bounds for non-streaming HTTP bodies. Never await a peer's cancellation. */
export class BodyLimitError extends Error {
  constructor(public readonly limit: number) { super(`Body exceeds ${limit} bytes`); this.name = "BodyLimitError"; }
}

export function cancelBody(body: ReadableStream<Uint8Array> | null | undefined): void {
  if (body && !body.locked) void body.cancel().catch(() => undefined);
}

export async function readBoundedBytes(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
  signal: AbortSignal,
): Promise<Uint8Array> {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new RangeError("Invalid body limit");
  if (signal.aborted) { cancelBody(body); signal.throwIfAborted(); }
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  let onAbort: () => void = () => undefined;
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => {
      // A custom/stalled stream may ignore cancellation indefinitely.
      void reader.cancel(signal.reason).catch(() => undefined);
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
  const chunks: Uint8Array[] = [];
  let total = 0;
  const consume = async () => {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > limit) throw new BodyLimitError(limit);
      chunks.push(value);
    }
    signal.throwIfAborted();
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes;
  };
  try {
    return await Promise.race([consume(), aborted]);
  } catch (error) {
    void reader.cancel(error).catch(() => undefined);
    throw error;
  } finally {
    signal.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }
}

/** Consume headers AND body under the same deadline. For JSON/text, not SSE/video. */
export async function fetchBoundedResponse(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  limitBytes: number,
): Promise<Response> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new RangeError("Invalid fetch deadline");
  const deadline = AbortSignal.timeout(Math.ceil(timeoutMs));
  const signal = init.signal ? AbortSignal.any([init.signal, deadline]) : deadline;
  signal.throwIfAborted();
  const pending = fetch(url, { ...init, signal });
  // Even an instrumented fetch that ignores AbortSignal cannot pin the route.
  // If it resolves late, release its body without awaiting peer cancellation.
  void pending.then((late) => { if (signal.aborted) cancelBody(late.body); }, () => undefined);
  let onAbort = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
  let response: Response;
  try { response = await Promise.race([pending, aborted]); }
  finally { signal.removeEventListener("abort", onAbort); }
  const bytes = await readBoundedBytes(response.body, limitBytes, signal);
  // fetch has already decoded compressed bytes; don't retain wire-length/encoding.
  const headers = new Headers(response.headers);
  headers.delete("content-encoding"); headers.delete("content-length");
  return new Response(response.status === 204 || response.status === 205 || response.status === 304 ? null : bytes as BodyInit, {
    status: response.status, statusText: response.statusText, headers,
  });
}
