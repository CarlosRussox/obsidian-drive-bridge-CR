function hasFrontmatter(markdown) {
  return /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(markdown);
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

function buildFrontmatter({ title, source, tags, savedAt }) {
  const lines = [
    "---",
    `title: ${yamlString(title)}`,
    `saved_via: ${yamlString("chatgpt-action")}`,
    `saved_at: ${yamlString(savedAt)}`,
  ];

  if (source) {
    lines.push(`source: ${yamlString(source)}`);
  }

  if (tags.length > 0) {
    lines.push("tags:");
    for (const tag of tags) {
      lines.push(`  - ${yamlString(tag)}`);
    }
  }

  lines.push("---", "");
  return lines.join("\n");
}

function buildNoteContent({ title, markdown, source, tags, savedAt }) {
  const body = String(markdown || "").trim();

  if (!body) {
    throw new Error("markdown nao pode ficar vazio.");
  }

  if (hasFrontmatter(body)) {
    return `${body}\n`;
  }

  const frontmatter = buildFrontmatter({ title, source, tags, savedAt });
  return `${frontmatter}${body}\n`;
}

module.exports = {
  buildFrontmatter,
  buildNoteContent,
  hasFrontmatter,
};
