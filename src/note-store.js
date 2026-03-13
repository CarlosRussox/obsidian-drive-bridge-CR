const { saveNoteToDrive } = require("./google-drive");
const { buildNoteContent } = require("./note-format");
const { normalizeFolderPath } = require("./path-utils");

const DUPLICATE_STRATEGIES = new Set(["reject", "suffix", "overwrite"]);

function validationError(message) {
  const error = new Error(message);
  error.code = "VALIDATION_ERROR";
  return error;
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePayload(rawPayload, config) {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    throw validationError("O corpo precisa ser um objeto JSON.");
  }

  const title = normalizeString(rawPayload.title);
  const markdown = normalizeString(rawPayload.markdown);
  const source = normalizeString(rawPayload.source);
  const duplicateStrategy = normalizeString(rawPayload.duplicateStrategy || "reject").toLowerCase();
  const rawTags = Array.isArray(rawPayload.tags) ? rawPayload.tags : [];
  const tags = rawTags
    .filter((value) => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 20);

  if (!title) {
    throw validationError("title e obrigatorio.");
  }

  if (title.length > 160) {
    throw validationError("title pode ter no maximo 160 caracteres.");
  }

  if (!markdown) {
    throw validationError("markdown e obrigatorio.");
  }

  if (!DUPLICATE_STRATEGIES.has(duplicateStrategy)) {
    throw validationError('duplicateStrategy precisa ser "reject", "suffix" ou "overwrite".');
  }

  let folderPath = "";

  try {
    folderPath = normalizeFolderPath(rawPayload.folder, config.defaultFolder);
  } catch (error) {
    throw validationError(error.message);
  }

  return {
    title,
    markdown,
    source,
    folderPath,
    tags,
    duplicateStrategy,
  };
}

async function createNote(config, rawPayload, dependencies = {}) {
  const payload = normalizePayload(rawPayload, config);
  const saveNote = dependencies.saveNote || saveNoteToDrive;
  const generatedAt = new Date().toISOString();
  const content = buildNoteContent({
    title: payload.title,
    markdown: payload.markdown,
    source: payload.source,
    tags: payload.tags,
    savedAt: generatedAt,
  });
  const result = await saveNote(config, payload, content);

  return {
    ...result,
    generatedAt,
  };
}

module.exports = {
  createNote,
  normalizePayload,
};
