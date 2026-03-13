const { fetchGoogleAccessToken, parseJsonResponse } = require("./google-auth");
const {
  buildMarkdownFileName,
  buildRelativeNotePath,
} = require("./path-utils");

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const DRIVE_FIELDS = "id,name,parents,webViewLink,modifiedTime";

function driveApiError(message, details, statusCode = 502) {
  const error = new Error(message);
  error.code = "GOOGLE_DRIVE_ERROR";
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function duplicateNoteError(message, details) {
  const error = new Error(message);
  error.code = "DUPLICATE_NOTE";
  error.statusCode = 409;
  error.details = details;
  return error;
}

function escapeDriveQueryValue(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function googleJsonRequest(config, accessToken, url, options = {}) {
  const fetchImpl = config.fetchImpl || fetch;
  const response = await fetchImpl(url, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
    body: options.body,
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw driveApiError("Falha na chamada para o Google Drive.", data);
  }

  return data;
}

async function findFolderByName(config, accessToken, parentId, folderName) {
  const query =
    `mimeType='${FOLDER_MIME_TYPE}' and ` +
    `name='${escapeDriveQueryValue(folderName)}' and ` +
    `'${escapeDriveQueryValue(parentId)}' in parents and trashed=false`;
  const url =
    `${DRIVE_API_BASE}?fields=files(id,name)&pageSize=1&supportsAllDrives=true&includeItemsFromAllDrives=true&q=` +
    encodeURIComponent(query);
  const data = await googleJsonRequest(config, accessToken, url);

  return data.files && data.files.length > 0 ? data.files[0] : null;
}

async function createFolder(config, accessToken, parentId, folderName) {
  const url = `${DRIVE_API_BASE}?fields=id,name&supportsAllDrives=true`;

  return googleJsonRequest(config, accessToken, url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: FOLDER_MIME_TYPE,
      parents: [parentId],
    }),
  });
}

async function resolveDriveFolder(config, accessToken, folderPath) {
  let currentFolderId = config.googleVaultRootFolderId;

  for (const segment of folderPath.split("/").filter(Boolean)) {
    const existing = await findFolderByName(config, accessToken, currentFolderId, segment);

    if (existing) {
      currentFolderId = existing.id;
      continue;
    }

    const created = await createFolder(config, accessToken, currentFolderId, segment);
    currentFolderId = created.id;
  }

  return {
    folderId: currentFolderId,
    folderPath,
  };
}

async function findFileByName(config, accessToken, folderId, fileName) {
  const query =
    `mimeType!='${FOLDER_MIME_TYPE}' and ` +
    `name='${escapeDriveQueryValue(fileName)}' and ` +
    `'${escapeDriveQueryValue(folderId)}' in parents and trashed=false`;
  const url =
    `${DRIVE_API_BASE}?fields=files(id,name,webViewLink,modifiedTime)&pageSize=1&supportsAllDrives=true&includeItemsFromAllDrives=true&q=` +
    encodeURIComponent(query);
  const data = await googleJsonRequest(config, accessToken, url);

  return data.files && data.files.length > 0 ? data.files[0] : null;
}

async function resolveFileTargetWithLookup(title, duplicateStrategy, lookupByName) {
  if (duplicateStrategy === "suffix") {
    let counter = 1;

    while (true) {
      const fileName = buildMarkdownFileName(title, counter);
      const existing = await lookupByName(fileName);

      if (!existing) {
        return {
          mode: "create",
          fileName,
        };
      }

      counter += 1;
    }
  }

  const fileName = buildMarkdownFileName(title);
  const existing = await lookupByName(fileName);

  if (!existing) {
    return {
      mode: "create",
      fileName,
    };
  }

  if (duplicateStrategy === "overwrite") {
    return {
      mode: "update",
      fileName,
      fileId: existing.id,
      existing,
    };
  }

  throw duplicateNoteError("Ja existe uma nota com esse titulo.", {
    fileName,
    fileId: existing.id,
    webViewLink: existing.webViewLink,
  });
}

async function resolveDriveFileTarget(config, accessToken, folderId, title, duplicateStrategy) {
  return resolveFileTargetWithLookup(title, duplicateStrategy, (fileName) =>
    findFileByName(config, accessToken, folderId, fileName)
  );
}

function buildMultipartPayload(metadata, content) {
  const boundary = `obsidian-gpt-bridge-${Date.now().toString(16)}`;
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: text/markdown; charset=UTF-8",
    "",
    content,
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return {
    body,
    contentType: `multipart/related; boundary=${boundary}`,
  };
}

async function uploadDriveFile(config, accessToken, target, folderId, fileName, content) {
  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: "text/markdown",
  };
  const { body, contentType } = buildMultipartPayload(metadata, content);
  const url =
    target.mode === "update"
      ? `${DRIVE_UPLOAD_BASE}/${target.fileId}?uploadType=multipart&fields=${encodeURIComponent(
          DRIVE_FIELDS
        )}&supportsAllDrives=true`
      : `${DRIVE_UPLOAD_BASE}?uploadType=multipart&fields=${encodeURIComponent(
          DRIVE_FIELDS
        )}&supportsAllDrives=true`;

  return googleJsonRequest(config, accessToken, url, {
    method: target.mode === "update" ? "PATCH" : "POST",
    headers: {
      "Content-Type": contentType,
    },
    body,
  });
}

async function saveNoteToDrive(config, payload, content) {
  const accessToken = await fetchGoogleAccessToken(config);
  const folderInfo = await resolveDriveFolder(config, accessToken, payload.folderPath);
  const target = await resolveDriveFileTarget(
    config,
    accessToken,
    folderInfo.folderId,
    payload.title,
    payload.duplicateStrategy
  );
  const file = await uploadDriveFile(
    config,
    accessToken,
    target,
    folderInfo.folderId,
    target.fileName,
    content
  );

  if (!file.id) {
    throw driveApiError("O Google Drive nao retornou o id do arquivo criado.", file);
  }

  return {
    created: true,
    title: payload.title,
    folder: folderInfo.folderPath,
    relativePath: buildRelativeNotePath(folderInfo.folderPath, target.fileName),
    driveFileId: file.id,
    webViewLink: file.webViewLink || null,
    savedAt: file.modifiedTime || new Date().toISOString(),
  };
}

module.exports = {
  buildMultipartPayload,
  driveApiError,
  escapeDriveQueryValue,
  resolveDriveFileTarget,
  resolveFileTargetWithLookup,
  saveNoteToDrive,
};
