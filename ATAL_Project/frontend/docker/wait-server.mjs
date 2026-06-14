/**
 * Minimal static server shown on :3000 until the backend is healthy and
 * frontend startup tests complete. Replaced by `next dev` in entrypoint.sh.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const WAIT_HTML = path.join(__dirname, "wait-page.html");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOSTNAME || "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME[ext] || "application/octet-stream";
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentTypeFor(filePath) });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = req.url?.split("?")[0] || "/";

  if (url === "/" || url === "/waiting") {
    sendFile(res, WAIT_HTML);
    return;
  }

  if (url.startsWith("/")) {
    const candidate = path.join(PUBLIC, url);
    if (candidate.startsWith(PUBLIC) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      sendFile(res, candidate);
      return;
    }
  }

  res.writeHead(200, { "Content-Type": "text/html" });
  fs.readFile(WAIT_HTML, (err, data) => {
    res.end(err ? "Starting…" : data);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[ui-console] Wait page listening on http://${HOST}:${PORT}`);
});
