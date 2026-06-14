/**
 * Exit 0 only when Django /health/ready/ returns JSON { status: "ready" }.
 * Busybox wget --spider treats some 5xx responses as success — do not use for readiness.
 */
const url = process.argv[2];
if (!url) {
  console.error("usage: node check-backend-ready.mjs <ready-url>");
  process.exit(2);
}

try {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) process.exit(1);
  const body = await res.json();
  process.exit(body?.status === "ready" ? 0 : 1);
} catch {
  process.exit(1);
}
