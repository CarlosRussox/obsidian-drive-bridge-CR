const test = require("node:test");
const assert = require("node:assert/strict");

const { buildNoteContent } = require("../src/note-format");
const { normalizePayload, createNote } = require("../src/note-store");
const {
  buildMarkdownFileName,
  normalizeFolderPath,
  sanitizeFileStem,
} = require("../src/path-utils");
const { resolveFileTargetWithLookup } = require("../src/google-drive");

test("sanitizeFileStem removes invalid Windows characters", () => {
  assert.equal(sanitizeFileStem('Plano: Podcast/Video?*"'), "Plano Podcast Video");
});

test("normalizeFolderPath keeps a relative nested folder", () => {
  assert.equal(normalizeFolderPath("Inbox\\Leituras/Podcast"), "Inbox/Leituras/Podcast");
});

test("normalizeFolderPath rejects traversal", () => {
  assert.throws(() => normalizeFolderPath("../fora"), /nao pode usar \. ou \.\./i);
});

test("buildMarkdownFileName adds suffix only when needed", () => {
  assert.equal(buildMarkdownFileName("Resumo semanal"), "Resumo semanal.md");
  assert.equal(buildMarkdownFileName("Resumo semanal", 3), "Resumo semanal-3.md");
});

test("buildNoteContent adds frontmatter when markdown has no frontmatter", () => {
  const note = buildNoteContent({
    title: "Minha nota",
    markdown: "# Resumo\n\nConteudo",
    source: "Podcast X",
    tags: ["podcast", "estudo"],
    savedAt: "2026-03-13T00:00:00.000Z",
  });

  assert.match(note, /^---\n/);
  assert.match(note, /title: "Minha nota"/);
  assert.match(note, /source: "Podcast X"/);
  assert.match(note, /tags:\n  - "podcast"\n  - "estudo"/);
});

test("normalizePayload uses the default folder", () => {
  const payload = normalizePayload(
    {
      title: "Aula de Estrategia",
      markdown: "Resumo da aula.",
    },
    { defaultFolder: "Inbox" }
  );

  assert.equal(payload.folderPath, "Inbox");
  assert.equal(payload.duplicateStrategy, "reject");
});

test("createNote delegates the final save step", async () => {
  let capturedContent = "";

  const result = await createNote(
    { defaultFolder: "Inbox" },
    {
      title: "Aula de Estrategia",
      folder: "Inbox/Estudos",
      markdown: "Resumo da aula.",
      tags: ["aula"],
      source: "Video interno",
    },
    {
      async saveNote(_config, payload, content) {
        capturedContent = content;

        return {
          created: true,
          title: payload.title,
          folder: payload.folderPath,
          relativePath: `${payload.folderPath}/Aula de Estrategia.md`,
          driveFileId: "file-123",
          webViewLink: "https://drive.google.com/file/d/file-123/view",
          savedAt: "2026-03-13T00:00:00.000Z",
        };
      },
    }
  );

  assert.equal(result.relativePath, "Inbox/Estudos/Aula de Estrategia.md");
  assert.match(capturedContent, /saved_via: "chatgpt-action"/);
  assert.match(capturedContent, /Resumo da aula\./);
});

test("resolveFileTargetWithLookup uses suffix strategy", async () => {
  const existingNames = new Set(["Resumo semanal.md", "Resumo semanal-2.md"]);
  const target = await resolveFileTargetWithLookup("Resumo semanal", "suffix", async (fileName) =>
    existingNames.has(fileName) ? { id: fileName } : null
  );

  assert.equal(target.mode, "create");
  assert.equal(target.fileName, "Resumo semanal-3.md");
});
