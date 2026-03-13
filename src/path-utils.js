const WINDOWS_RESERVED_RE = /[<>:"/\\|?*\u0000-\u001F]/g;

function sanitizeFileStem(input) {
  const normalized = String(input || "")
    .normalize("NFKC")
    .replace(WINDOWS_RESERVED_RE, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[. ]+/, "")
    .replace(/[. ]+$/, "");

  if (!normalized) {
    return "sem-titulo";
  }

  return normalized.slice(0, 120);
}

function sanitizeFolderSegment(input) {
  const normalized = String(input || "")
    .normalize("NFKC")
    .replace(WINDOWS_RESERVED_RE, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[. ]+/, "")
    .replace(/[. ]+$/, "");

  if (!normalized) {
    return "sem-pasta";
  }

  return normalized.slice(0, 80);
}

function normalizeFolderPath(folder, defaultFolder = "Inbox") {
  const rawFolder = String(folder || "").trim() || String(defaultFolder || "Inbox").trim();
  const normalized = rawFolder.replace(/[\\/]+/g, "/");

  if (normalized.startsWith("/")) {
    throw new Error("A pasta da nota precisa ser relativa ao vault.");
  }

  const parts = normalized.split("/").map((part) => part.trim()).filter(Boolean);

  if (parts.length === 0) {
    throw new Error("A pasta da nota nao pode ficar vazia.");
  }

  return parts
    .map((part) => {
      if (part === "." || part === "..") {
        throw new Error("A pasta da nota nao pode usar . ou ..");
      }

      return sanitizeFolderSegment(part);
    })
    .join("/");
}

function buildMarkdownFileName(title, counter = 1) {
  const stem = sanitizeFileStem(title);

  if (counter <= 1) {
    return `${stem}.md`;
  }

  return `${stem}-${counter}.md`;
}

function buildRelativeNotePath(folderPath, fileName) {
  return `${folderPath}/${fileName}`;
}

module.exports = {
  buildMarkdownFileName,
  buildRelativeNotePath,
  normalizeFolderPath,
  sanitizeFileStem,
  sanitizeFolderSegment,
};
