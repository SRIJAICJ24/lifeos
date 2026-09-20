import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve("dist");
const types = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".wasm": "application/wasm",
  ".ttf": "font/ttf",
  ".png": "image/png",
  ".json": "application/json",
};
http
  .createServer((req, res) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    res.setHeader("Cache-Control", "no-cache");
    let file = path.resolve(
      root,
      "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
    );
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory())
      file = path.join(root, "index.html");
    res.setHeader(
      "Content-Type",
      types[path.extname(file)] ?? "application/octet-stream",
    );
    fs.createReadStream(file)
      .on("error", () => {
        res.statusCode = 404;
        res.end();
      })
      .pipe(res);
  })
  .listen(8081, "127.0.0.1", () =>
    console.log("LifeOS preview: http://localhost:8081"),
  );
