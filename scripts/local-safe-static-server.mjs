import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.argv[2] || process.cwd());
const port = Number(process.argv[3] || 8773);
const allowedExtensions = new Set([
  ".html",
  ".css",
  ".js",
  ".mjs",
  ".json",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".mp3",
  ".mp4",
]);
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
};

const send = (response, status, body) => {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(body);
};

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  if (pathname.split("/").some((part) => part.startsWith("."))) {
    send(response, 403, "Forbidden");
    return;
  }
  const filePath = normalize(join(root, pathname));
  if (!filePath.startsWith(root)) {
    send(response, 403, "Forbidden");
    return;
  }
  const extension = extname(filePath).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    send(response, 403, "Forbidden");
    return;
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    send(response, 404, "Not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": contentTypes[extension] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Safe static server listening on http://127.0.0.1:${port}`);
  console.log(`Root: ${root}`);
});
