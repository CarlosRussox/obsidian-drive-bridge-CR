const fs = require("node:fs");
const path = require("node:path");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const env = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, value] = match;
    const unquoted = value.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    env[key] = unquoted;
  }

  return env;
}

function readMergedEnv(env = process.env) {
  const fileEnv = parseEnvFile(path.resolve(process.cwd(), ".env"));
  return { ...fileEnv, ...env };
}

function requiredString(merged, key, message) {
  const value = String(merged[key] || "").trim();

  if (!value) {
    throw new Error(message);
  }

  return value;
}

function resolveConfig(env = process.env) {
  const merged = readMergedEnv(env);
  const host = String(merged.HOST || "127.0.0.1").trim();
  const port = Number(merged.PORT || 8787);
  const defaultFolder = String(merged.DEFAULT_FOLDER || "Inbox").trim();

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT precisa ser um numero inteiro entre 1 e 65535.");
  }

  return {
    host,
    port,
    defaultFolder,
    apiToken: requiredString(
      merged,
      "API_TOKEN",
      "API_TOKEN nao foi definido. Crie um token forte no .env ou nas env vars da Vercel."
    ),
    googleClientId: requiredString(
      merged,
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_ID nao foi definido."
    ),
    googleClientSecret: requiredString(
      merged,
      "GOOGLE_CLIENT_SECRET",
      "GOOGLE_CLIENT_SECRET nao foi definido."
    ),
    googleRefreshToken: requiredString(
      merged,
      "GOOGLE_REFRESH_TOKEN",
      "GOOGLE_REFRESH_TOKEN nao foi definido."
    ),
    googleVaultRootFolderId: requiredString(
      merged,
      "GOOGLE_VAULT_ROOT_FOLDER_ID",
      "GOOGLE_VAULT_ROOT_FOLDER_ID nao foi definido."
    ),
  };
}

function resolveGoogleOAuthHelperConfig(env = process.env) {
  const merged = readMergedEnv(env);
  const oauthPort = Number(merged.GOOGLE_OAUTH_PORT || 53682);

  if (!Number.isInteger(oauthPort) || oauthPort < 1 || oauthPort > 65535) {
    throw new Error("GOOGLE_OAUTH_PORT precisa ser um numero inteiro entre 1 e 65535.");
  }

  return {
    googleClientId: requiredString(
      merged,
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_ID nao foi definido."
    ),
    googleClientSecret: requiredString(
      merged,
      "GOOGLE_CLIENT_SECRET",
      "GOOGLE_CLIENT_SECRET nao foi definido."
    ),
    oauthPort,
    redirectUri: `http://127.0.0.1:${oauthPort}/oauth2callback`,
  };
}

module.exports = {
  parseEnvFile,
  readMergedEnv,
  resolveConfig,
  resolveGoogleOAuthHelperConfig,
};
