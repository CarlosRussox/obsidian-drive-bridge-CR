import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveConfig } = require("../src/config");
const { handleHealthRequest, jsonHeaders } = require("../src/http-api");

function sendResult(response, result) {
  for (const [key, value] of Object.entries(jsonHeaders())) {
    response.setHeader(key, value);
  }

  response.status(result.statusCode).send(JSON.stringify(result.payload, null, 2));
}

export default function handler(request, response) {
  if (request.method === "OPTIONS") {
    for (const [key, value] of Object.entries(jsonHeaders())) {
      response.setHeader(key, value);
    }

    response.status(204).end();
    return;
  }

  if (request.method !== "GET") {
    sendResult(response, {
      statusCode: 405,
      payload: {
        ok: false,
        error: "method_not_allowed",
        message: "Use GET neste endpoint.",
      },
    });
    return;
  }

  try {
    const config = resolveConfig(process.env);
    sendResult(response, handleHealthRequest(config));
  } catch (error) {
    sendResult(response, {
      statusCode: 500,
      payload: {
        ok: false,
        error: "misconfigured_environment",
        message: error.message,
      },
    });
  }
}
