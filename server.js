const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const adminHandler = require("./api/admin");
const bidsHandler = require("./api/bids");
const bootstrapHandler = require("./api/bootstrap");
const casesHandler = require("./api/cases");
const decisionsHandler = require("./api/decisions");
const lawyersHandler = require("./api/lawyers");
const { readJson, sendJson } = require("./lib/http");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const apiHandlers = {
  "/api/admin": adminHandler,
  "/api/bids": bidsHandler,
  "/api/bootstrap": bootstrapHandler,
  "/api/cases": casesHandler,
  "/api/decisions": decisionsHandler,
  "/api/lawyers": lawyersHandler,
};

function attachResponseHelpers(res) {
  res.status = (statusCode) => ({
    json(payload) {
      sendJson(res, statusCode, payload);
    },
  });
}

function attachQuery(req, parsedUrl) {
  req.query = Object.fromEntries(parsedUrl.searchParams.entries());
}

function serveStatic(res, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const relativePath = safePath.replace(/^[/\\]+/, "");
  const filePath = path.join(PUBLIC_DIR, relativePath);
  const exists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  const finalPath = exists ? filePath : path.join(PUBLIC_DIR, "index.html");
  const extension = path.extname(finalPath);

  res.statusCode = 200;
  res.setHeader("Content-Type", MIME_TYPES[extension] || "text/plain; charset=utf-8");
  res.end(fs.readFileSync(finalPath));
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const handler = apiHandlers[parsedUrl.pathname];

  if (handler) {
    try {
      attachResponseHelpers(res);
      attachQuery(req, parsedUrl);
      req.body = req.method === "POST" ? await readJson(req) : {};
      handler(req, res);
    } catch (error) {
      sendJson(res, 500, { error: error.message || "Server error" });
    }
    return;
  }

  serveStatic(res, parsedUrl.pathname);
});

server.listen(PORT, () => {
  console.log(`Kamieno app listening on http://localhost:${PORT}`);
});
