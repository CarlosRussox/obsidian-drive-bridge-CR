import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveConfig } = require("../src/config");
const { handleCreateNoteRequest, jsonHeaders } = require("../src/http-api");

function sendResult(response, result) {
  for (const [key, value] of Object.entries(jsonHeaders())) {
    response.setHeader(key, value);
  }

  response.status(result.statusCode).send(JSON.stringify(result.payload, null, 2));
}

async function readRawBody(request) {
  if (typeof request.body === "string") {
    return request.body;
  }

  if (Buffer.isBuffer(request.body)) {
    return request.body.toString("utf8");
  }

  if (request.body && typeof request.body === "object") {
    return JSON.stringify(request.body);
  }

  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    for (const [key, value] of Object.entries(jsonHeaders())) {
      response.setHeader(key, value);
    }

    response.status(204).end();
    return;
  }

  if (request.method !== "POST") {
    sendResult(response, {
      statusCode: 405,
      payload: {
        ok: false,
        error: "method_not_allowed",
        message: "Use POST neste endpoint.",
      },
    });
    return;
  }

  try {
    const config = resolveConfig(process.env);
    const rawBody = await readRawBody(request);
    const result = await handleCreateNoteRequest({
      headers: request.headers,
      rawBody,
      config,
    });

    sendResult(response, result);
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
