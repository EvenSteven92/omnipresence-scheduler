const WORKER_URL = (process.env.OMNI_WORKER_URL ?? "http://127.0.0.1:8787").replace(/\/$/, "");

/**
 * Forward a TanStack API request to the local OmniPresence worker.
 * Preserves method, query, body, and redirect responses (OAuth).
 */
export async function proxyToWorker(request: Request, workerPath: string): Promise<Response> {
  const incoming = new URL(request.url);
  const target = `${WORKER_URL}${workerPath}${incoming.search}`;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("authorization", authorization);

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  try {
    const res = await fetch(target, init);
    const outHeaders = new Headers(res.headers);
    // Avoid hop-by-hop issues
    outHeaders.delete("transfer-encoding");
    outHeaders.delete("connection");
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: outHeaders,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Local worker unreachable";
    return Response.json(
      {
        detail: `Worker offline (${WORKER_URL}). Start it with: cd worker && npm start — ${message}`,
        online: false,
      },
      { status: 503 },
    );
  }
}

export function workerBaseUrl() {
  return WORKER_URL;
}
