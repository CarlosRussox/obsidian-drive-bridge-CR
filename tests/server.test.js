const test = require("node:test");
const assert = require("node:assert/strict");

const { createApp } = require("../src/server");

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

test("POST /api/notes creates a note when the API key is valid", async () => {
  const calls = [];
  const config = {
    host: "127.0.0.1",
    port: 0,
    defaultFolder: "Inbox",
    apiToken: "token-de-teste",
    googleClientId: "client-id",
    googleClientSecret: "client-secret",
    googleRefreshToken: "refresh-token",
    googleVaultRootFolderId: "vault-root",
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });

      if (String(url).startsWith("https://oauth2.googleapis.com/token")) {
        return jsonResponse({ access_token: "access-token" });
      }

      if (String(url).includes("mimeType%3D'application%2Fvnd.google-apps.folder'")) {
        return jsonResponse({ files: [] });
      }

      if (
        String(url).startsWith("https://www.googleapis.com/drive/v3/files?fields=id,name") &&
        options.method === "POST"
      ) {
        return jsonResponse({ id: "folder-inbox", name: "Inbox" });
      }

      if (String(url).includes("mimeType!%3D'application%2Fvnd.google-apps.folder'")) {
        return jsonResponse({ files: [] });
      }

      if (String(url).startsWith("https://www.googleapis.com/upload/drive/v3/files")) {
        return jsonResponse({
          id: "file-1",
          name: "Teste HTTP.md",
          webViewLink: "https://drive.google.com/file/d/file-1/view",
          modifiedTime: "2026-03-13T00:00:00.000Z",
        });
      }

      throw new Error(`URL inesperada no teste: ${url}`);
    },
  };

  const server = createApp(config);

  await new Promise((resolve) => {
    server.listen(0, config.host, resolve);
  });

  const address = server.address();
  const response = await fetch(`http://${config.host}:${address.port}/api/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.apiToken,
    },
    body: JSON.stringify({
      title: "Teste HTTP",
      markdown: "Conteudo via HTTP.",
      tags: ["api"],
    }),
  });

  const payload = await response.json();
  const uploadCall = calls.find((call) =>
    String(call.url).startsWith("https://www.googleapis.com/upload/drive/v3/files")
  );
  const uploadBody = String(uploadCall.options.body || "");

  assert.equal(response.status, 201);
  assert.equal(payload.ok, true);
  assert.equal(payload.relativePath, "Inbox/Teste HTTP.md");
  assert.match(uploadBody, /Conteudo via HTTP\./);
  assert.match(uploadBody, /saved_via/);

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});
