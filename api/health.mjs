import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveConfig } = require("../src/config");
const { handleHealthRequest, jsonHeaders, toWebResponse } = require("../src/http-api");

export function GET() {
  try {
    const config = resolveConfig(process.env);
    return toWebResponse(handleHealthRequest(config));
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
