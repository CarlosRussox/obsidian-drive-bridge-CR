const crypto = require("node:crypto");
const http = require("node:http");

const { resolveGoogleOAuthHelperConfig } = require("../src/config");
const { parseJsonResponse } = require("../src/google-auth");

const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

async function exchangeCodeForTokens(config, code) {
  const body = new URLSearchParams({
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(`Falha ao trocar o code por tokens: ${JSON.stringify(data)}`);
  }

  return data;
}

async function main() {
  const config = resolveGoogleOAuthHelperConfig();
  const state = crypto.randomBytes(16).toString("hex");
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  authUrl.searchParams.set("client_id", config.googleClientId);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GOOGLE_DRIVE_SCOPE);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("state", state);

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", config.redirectUri);

    if (url.pathname !== "/oauth2callback") {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Rota nao encontrada.");
      return;
    }

    if (url.searchParams.get("state") !== state) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("State invalido.");
      return;
    }

    const code = url.searchParams.get("code");

    if (!code) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Code ausente.");
      return;
    }

    try {
      const tokens = await exchangeCodeForTokens(config, code);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>Autorizacao concluida.</h1><p>Volte ao terminal para copiar o refresh token.</p>");

      console.log("");
      console.log("Refresh token recebido:");
      console.log(tokens.refresh_token || "(nenhum refresh token retornado)");
      console.log("");
      console.log("Cole esse valor em GOOGLE_REFRESH_TOKEN.");

      if (!tokens.refresh_token) {
        console.log(
          "O Google nao retornou refresh_token. Isso costuma acontecer quando o app ja foi autorizado antes. Revogue o acesso do app e rode o fluxo novamente."
        );
      }
    } catch (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Falha ao trocar o code por tokens.");
      console.error(error.message);
    } finally {
      setTimeout(() => server.close(), 250);
    }
  });

  server.listen(config.oauthPort, "127.0.0.1", () => {
    console.log("Abra esta URL no navegador para autorizar o Google Drive:");
    console.log(authUrl.toString());
    console.log("");
    console.log(`Redirect URI esperado: ${config.redirectUri}`);
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
