async function parseJsonResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function googleAuthError(message, details) {
  const error = new Error(message);
  error.code = "GOOGLE_AUTH_ERROR";
  error.statusCode = 502;
  error.details = details;
  return error;
}

async function fetchGoogleAccessToken(config) {
  const fetchImpl = config.fetchImpl || fetch;
  const body = new URLSearchParams({
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    refresh_token: config.googleRefreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await parseJsonResponse(response);

  if (!response.ok || !data.access_token) {
    throw googleAuthError("Falha ao obter access token do Google.", data);
  }

  return data.access_token;
}

module.exports = {
  fetchGoogleAccessToken,
  googleAuthError,
  parseJsonResponse,
};
