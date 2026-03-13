import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveConfig } = require("../src/config");
const { handleCreateNoteRequest, jsonHeaders, toWebResponse } = require("../src/http-api");

export async function POST(request) {
  try {
    const config = resolveConfig(process.env);
    const rawBody = await request.text();
    const result = await handleCreateNoteRequest({
      headers: request.headers,
      rawBody,
      config,
    });

    return toWebResponse(result);
  } catch (error) {
    return new Response(
      JSON.stringify(
        {
          ok: false,
          error: "misconfigured_environment",
          message: error.message,
        },
        null,
        2
      ),
      {
        status: 500,
        headers: jsonHeaders(),
      }
    );
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: jsonHeaders(),
  });
}
