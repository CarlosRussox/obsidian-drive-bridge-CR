const http = require("node:http");

const { resolveConfig } = require("./config");
const {
  handleCreateNoteRequest,
  handleHealthRequest,
  jsonHeaders,
} = require("./http-api");

async function readRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function sendResult(res, result) {
  res.writeHead(result.statusCode, jsonHeaders());
  res.end(JSON.stringify(result.payload, null, 2));
}

function createApp(config) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204, jsonHeaders());
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/health") {
      sendResult(res, handleHealthRequest(config));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/notes") {
      const rawBody = await readRawBody(req);
      const result = await handleCreateNoteRequest({
        headers: req.headers,
        rawBody,
        config,
      });
      sendResult(res, result);
      return;
    }

    sendResult(res, {
      statusCode: 404,
      payload: {
        ok: false,
        error: "not_found",
        message: "Endpoint nao encontrado.",
      },
    });
  });
}

function startServer() {
  const config = resolveConfig();
  const server = createApp(config);

  server.listen(config.port, config.host, () => {
    console.log(`Obsidian GPT bridge ouvindo em http://${config.host}:${config.port}`);
    console.log("Storage configurado: Google Drive API");
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createApp,
  startServer,
};
