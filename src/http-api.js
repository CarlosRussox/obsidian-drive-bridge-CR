const { createNote } = require("./note-store");

const MAX_BODY_SIZE = 1_000_000;

function jsonHeaders() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

function getHeader(headers, name) {
  if (!headers) {
    return null;
  }

  if (typeof headers.get === "function") {
    return headers.get(name);
  }

  return headers[name] || headers[name.toLowerCase()] || null;
}

function isAuthorized(headers, apiToken) {
  const apiKeyHeader = getHeader(headers, "x-api-key");
  const authorization = getHeader(headers, "authorization");

  if (typeof apiKeyHeader === "string" && apiKeyHeader === apiToken) {
    return true;
  }

  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length) === apiToken;
  }

  return false;
}

function parseJsonBody(rawBody) {
  if (!rawBody || !rawBody.trim()) {
    const error = new Error("O corpo JSON e obrigatorio.");
    error.code = "empty_body";
    error.statusCode = 400;
    throw error;
  }

  if (rawBody.length > MAX_BODY_SIZE) {
    const error = new Error("O payload passou de 1 MB.");
    error.code = "payload_too_large";
    error.statusCode = 413;
    throw error;
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    const error = new Error("Nao foi possivel interpretar o JSON enviado.");
    error.code = "invalid_json";
    error.statusCode = 400;
    throw error;
  }
}

function mapError(error) {
  if (error.code === "VALIDATION_ERROR") {
    return {
      statusCode: 400,
      payload: {
        ok: false,
        error: "validation_error",
        message: error.message,
      },
    };
  }

  if (error.code === "DUPLICATE_NOTE") {
    return {
      statusCode: 409,
      payload: {
        ok: false,
        error: "duplicate_note",
        message: error.message,
        details: error.details || null,
      },
    };
  }

  if (error.code === "GOOGLE_AUTH_ERROR") {
    return {
      statusCode: 502,
      payload: {
        ok: false,
        error: "google_auth_error",
        message: error.message,
        details: error.details || null,
      },
    };
  }

  if (error.code === "GOOGLE_DRIVE_ERROR") {
    return {
      statusCode: error.statusCode || 502,
      payload: {
        ok: false,
        error: "google_drive_error",
        message: error.message,
        details: error.details || null,
      },
    };
  }

  if (error.statusCode) {
    return {
      statusCode: error.statusCode,
      payload: {
        ok: false,
        error: error.code || "request_error",
        message: error.message,
      },
    };
  }

  return {
    statusCode: 500,
    payload: {
      ok: false,
      error: "internal_error",
      message: "Falha inesperada ao salvar a nota.",
    },
  };
}

function handleHealthRequest(config) {
  return {
    statusCode: 200,
    payload: {
      ok: true,
      service: "obsidian-gpt-bridge",
      storage: "google-drive",
      defaultFolder: config.defaultFolder,
    },
  };
}

async function handleCreateNoteRequest({ headers, rawBody, config, dependencies }) {
  if (!isAuthorized(headers, config.apiToken)) {
    return {
      statusCode: 401,
      payload: {
        ok: false,
        error: "unauthorized",
        message: "Token invalido ou ausente.",
      },
    };
  }

  try {
    const body = parseJsonBody(rawBody);
    const result = await createNote(config, body, dependencies);

    return {
      statusCode: 201,
      payload: {
        ok: true,
        message: "Nota criada com sucesso.",
        ...result,
      },
    };
  } catch (error) {
    return mapError(error);
  }
}

function toWebResponse(result) {
  return new Response(JSON.stringify(result.payload, null, 2), {
    status: result.statusCode,
    headers: jsonHeaders(),
  });
}

module.exports = {
  handleCreateNoteRequest,
  handleHealthRequest,
  isAuthorized,
  jsonHeaders,
  mapError,
  parseJsonBody,
  toWebResponse,
};
