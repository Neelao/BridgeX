import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const startPort = Number(process.env.PORT || 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function fileFor(url) {
  const clean = normalize(decodeURIComponent(url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  const requested = clean === "/" ? "/index.html" : clean;
  const fullPath = join(root, requested);
  if (existsSync(fullPath) && statSync(fullPath).isFile()) return fullPath;
  return join(root, "index.html");
}

function start(port) {
  const server = createServer((req, res) => {
    const path = fileFor(req.url || "/");
    res.setHeader("Content-Type", types[extname(path)] || "application/octet-stream");
    createReadStream(path).pipe(res);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      start(port + 1);
      return;
    }
    throw error;
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`BridgeX is live at http://127.0.0.1:${port}`);
  });
}

start(startPort);
