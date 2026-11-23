import type { JSONContent } from "@tiptap/core";

/**
 * Small Markdown <-> TipTap bridge used for AI edits. Models read and write Markdown far more
 * reliably than TipTap JSON, and Markdown keeps bold, italic, code, links, quotes and nesting.
 */

type Mark = { type: string; attrs?: Record<string, unknown> };

// ---------- TipTap -> Markdown (what the model sees) ----------

const textOf = (node: JSONContent): string => node.text ?? (node.content ?? []).map(textOf).join("");

function escapePlain(text: string): string {
  return text.replace(/([\\`*_[\]~])/g, "\\$1");
}

function inlineToMarkdown(nodes: JSONContent[] | undefined): string | null {
  let out = "";
  for (const node of nodes ?? []) {
    if (node.type === "hardBreak") { out += "\n"; continue; }
    if (node.type !== "text" || typeof node.text !== "string") return null;
    const marks = (node.marks ?? []) as Mark[];
    const has = (type: string) => marks.some(mark => mark.type === type);
    let piece = has("code") ? `\`${node.text.replace(/`/g, "")}\`` : escapePlain(node.text);
    if (has("bold")) piece = `**${piece}**`;
    if (has("italic")) piece = `*${piece}*`;
    if (has("strike")) piece = `~~${piece}~~`;
    const link = marks.find(mark => mark.type === "link");
    if (link && typeof link.attrs?.href === "string") piece = `[${piece}](${link.attrs.href})`;
    out += piece;
  }
  // A line that would be read as block syntax is escaped so the model sees plain prose.
  return out.replace(/^(#{1,6}\s|[-+]\s|\d+[.)]\s|>)/gm, "\\$1");
}

function listToMarkdown(node: JSONContent, depth: number): string | null {
  const ordered = node.type === "orderedList";
  const lines: string[] = [];
  let index = 1;
  for (const item of node.content ?? []) {
    if (item.type !== "listItem") return null;
    const [first, ...rest] = item.content ?? [];
    if (first && first.type !== "paragraph") return null;
    const text = first ? inlineToMarkdown(first.content) : "";
    if (text === null) return null;
    lines.push(`${"  ".repeat(depth)}${ordered ? `${index++}.` : "-"} ${text.replace(/\n/g, " ")}`);
    for (const child of rest) {
      if (child.type !== "bulletList" && child.type !== "orderedList") return null;
      const nested = listToMarkdown(child, depth + 1);
      if (nested === null) return null;
      lines.push(nested);
    }
  }
  return lines.join("\n");
}

/** Returns the Markdown of one top-level block, or null when it holds content Markdown cannot represent. */
export function blockToMarkdown(node: JSONContent): string | null {
  switch (node.type) {
    case "paragraph": return inlineToMarkdown(node.content);
    case "heading": {
      const text = inlineToMarkdown(node.content);
      return text === null ? null : `${"#".repeat(Math.min(3, Math.max(1, Number(node.attrs?.level) || 1)))} ${text.replace(/\n/g, " ")}`;
    }
    case "bulletList": case "orderedList": return listToMarkdown(node, 0);
    case "blockquote": {
      const parts = (node.content ?? []).map(blockToMarkdown);
      return parts.some(part => part === null) ? null : parts.join("\n\n").split("\n").map(line => `> ${line}`).join("\n");
    }
    case "codeBlock": return `\`\`\`${node.attrs?.language ?? ""}\n${textOf(node)}\n\`\`\``;
    case "horizontalRule": return "---";
    default: return null;
  }
}

/** Numbered Markdown blocks for the prompt, plus the indexes the model must leave alone. */
export function documentToMarkdownBlocks(doc: { content?: unknown[] } | undefined | null): { text: string; locked: Set<number> } {
  const locked = new Set<number>();
  const blocks = (Array.isArray(doc?.content) ? doc.content : []) as JSONContent[];
  const text = blocks.map((block, index) => {
    const markdown = blockToMarkdown(block);
    if (markdown === null) {
      locked.add(index);
      return `[${index}] <${block.type ?? "unknown"} block: not editable, keep as is>`;
    }
    return `[${index}] ${markdown || "<empty paragraph>"}`;
  }).join("\n");
  return { text, locked };
}

// ---------- Markdown -> TipTap (what the model writes) ----------

const safeHref = (href: string) => /^(https?:\/\/|mailto:)/i.test(href);

function pushText(out: JSONContent[], text: string, marks: Mark[]) {
  if (!text) return;
  const last = out[out.length - 1];
  if (last?.type === "text" && JSON.stringify(last.marks ?? []) === JSON.stringify(marks)) last.text += text;
  else out.push({ type: "text", text, ...(marks.length ? { marks } : {}) });
}

function parseInline(source: string, marks: Mark[] = []): JSONContent[] {
  const out: JSONContent[] = [];
  let buffer = "";
  const flush = () => { pushText(out, buffer, marks); buffer = ""; };
  const wrap = (type: string, inner: string, attrs?: Record<string, unknown>) => {
    flush();
    for (const node of parseInline(inner, [...marks, { type, ...(attrs ? { attrs } : {}) }])) {
      if (node.type === "text") pushText(out, node.text as string, (node.marks ?? []) as Mark[]);
      else out.push(node);
    }
  };
  let i = 0;
  while (i < source.length) {
    const rest = source.slice(i);
    const ch = source[i];
    if (ch === "\\" && i + 1 < source.length) { buffer += source[i + 1]; i += 2; continue; }
    if (ch === "\n") { flush(); out.push({ type: "hardBreak" }); i++; continue; }
    if (ch === "`") {
      const end = source.indexOf("`", i + 1);
      if (end > i + 1) { flush(); pushText(out, source.slice(i + 1, end), [...marks, { type: "code" }]); i = end + 1; continue; }
    }
    if (rest.startsWith("**") || rest.startsWith("~~")) {
      const token = rest.slice(0, 2);
      const end = source.indexOf(token, i + 2);
      if (end > i + 2) { wrap(token === "**" ? "bold" : "strike", source.slice(i + 2, end)); i = end + 2; continue; }
    }
    if ((ch === "*" || ch === "_") && !rest.startsWith(ch + ch) && !/\s/.test(source[i + 1] ?? " ") && (ch === "*" || !/\w/.test(source[i - 1] ?? " "))) {
      let end = source.indexOf(ch, i + 1);
      while (end !== -1 && (source[end - 1] === "\\" || source[end + 1] === ch)) end = source.indexOf(ch, end + (source[end + 1] === ch ? 2 : 1));
      if (end > i + 1 && (ch === "*" || !/\w/.test(source[end + 1] ?? " "))) { wrap("italic", source.slice(i + 1, end)); i = end + 1; continue; }
    }
    if (ch === "[") {
      const match = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest);
      if (match && safeHref(match[2])) { wrap("link", match[1], { href: match[2] }); i += match[0].length; continue; }
    }
    buffer += ch;
    i++;
  }
  flush();
  return out;
}

const paragraph = (text: string): JSONContent => {
  const content = parseInline(text);
  return { type: "paragraph", ...(content.length ? { content } : {}) };
};

const BULLET = /^(\s*)[-*+]\s+(.*)$/;
const ORDERED = /^(\s*)\d+[.)]\s+(.*)$/;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const FENCE = /^```\s*([\w+-]*)\s*$/;
const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const isBlockStart = (line: string) => HEADING.test(line) || FENCE.test(line) || RULE.test(line) || BULLET.test(line) || ORDERED.test(line) || /^\s*>/.test(line);

function parseList(lines: string[], start: number): [JSONContent, number] {
  const first = (BULLET.exec(lines[start]) ?? ORDERED.exec(lines[start]))!;
  const baseIndent = first[1].replace(/\t/g, "  ").length;
  const ordered = ORDERED.test(lines[start]) && !BULLET.test(lines[start]);
  const items: JSONContent[] = [];
  let i = start;
  while (i < lines.length) {
    const match = BULLET.exec(lines[i]) ?? ORDERED.exec(lines[i]);
    if (!match) break;
    const indent = match[1].replace(/\t/g, "  ").length;
    if (indent < baseIndent) break;
    if (indent > baseIndent) {
      // Deeper item without a parent: attach to the previous item.
      const [nested, next] = parseList(lines, i);
      if (items.length) items[items.length - 1].content!.push(nested);
      else items.push({ type: "listItem", content: [paragraph(""), nested] });
      i = next;
      continue;
    }
    if (ORDERED.test(lines[i]) !== ordered || (BULLET.test(lines[i]) && ordered)) break;
    items.push({ type: "listItem", content: [paragraph(match[2])] });
    i++;
  }
  return [{ type: ordered ? "orderedList" : "bulletList", content: items }, i];
}

export function markdownToNodes(markdown: string): JSONContent[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const nodes: JSONContent[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const fence = FENCE.exec(line);
    if (fence) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i++]);
      i++;
      nodes.push({ type: "codeBlock", ...(fence[1] ? { attrs: { language: fence[1] } } : {}), ...(code.length ? { content: [{ type: "text", text: code.join("\n") }] } : {}) });
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      const content = parseInline(heading[2]);
      nodes.push({ type: "heading", attrs: { level: Math.min(3, heading[1].length) }, content: content.length ? content : [{ type: "text", text: " " }] });
      i++;
      continue;
    }
    if (RULE.test(line)) { nodes.push({ type: "horizontalRule" }); i++; continue; }
    if (/^\s*>/.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) quoted.push(lines[i++].replace(/^\s*>\s?/, ""));
      const inner = markdownToNodes(quoted.join("\n"));
      nodes.push({ type: "blockquote", content: inner.length ? inner : [paragraph("")] });
      continue;
    }
    if (BULLET.test(line) || ORDERED.test(line)) {
      const [list, next] = parseList(lines, i);
      nodes.push(list);
      i = next;
      continue;
    }
    const para = [line.trim()];
    i++;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) para.push(lines[i++].trim());
    nodes.push(paragraph(para.join("\n")));
  }
  return nodes;
}
