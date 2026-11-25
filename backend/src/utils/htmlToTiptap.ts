import type { JSONContent } from "@tiptap/core";

/**
 * Converts the HTML that `mammoth.convertToHtml` produces into TipTap JSON, without a DOM library.
 * It only has to understand mammoth's small, well-formed output: paragraphs, headings, lists,
 * block quotes, tables, links, line breaks and a handful of inline marks. Anything else is unwrapped
 * so its text survives. The editor has no table extension, so each table row becomes one paragraph
 * with the cells separated by " | ". Images are dropped.
 */

type HtmlNode = HtmlElement | string;
type HtmlElement = { tag: string; attrs: Record<string, string>; children: HtmlNode[] };
type Mark = NonNullable<JSONContent["marks"]>[number];

const VOID_TAGS = new Set(["br", "img", "hr", "meta", "link", "input", "col"]);
const INLINE_MARKS: Record<string, string> = {
  strong: "bold", b: "bold", em: "italic", i: "italic", u: "underline",
  s: "strike", strike: "strike", del: "strike", sup: "superscript", sub: "subscript",
  code: "code",
};
const BLOCK_TAGS = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "table", "tr", "div", "section", "pre"]);
const SAFE_LINK = /^(https?:|mailto:|tel:)/i;
// Refuse pathological nesting instead of overflowing the stack on a hostile file.
const MAX_DEPTH = 100;

const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decodeEntities = (text: string) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });

const parseAttrs = (source: string) => {
  const attrs: Record<string, string> = {};
  for (const match of source.matchAll(/([^\s=/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    attrs[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attrs;
};

const parseHtml = (html: string): HtmlElement => {
  const root: HtmlElement = { tag: "#root", attrs: {}, children: [] };
  const stack: HtmlElement[] = [root];
  for (const token of html.matchAll(/<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>|[^<]+|</g)) {
    const text = token[0];
    const top = stack[stack.length - 1];
    if (text.startsWith("<!--")) continue;
    if (text[0] !== "<" || text.length === 1 || !/^<\/?[a-zA-Z]/.test(text)) {
      top.children.push(text[0] === "<" ? text : decodeEntities(text));
      continue;
    }
    const closing = text[1] === "/";
    const name = /^<\/?([a-zA-Z][a-zA-Z0-9]*)/.exec(text)![1].toLowerCase();
    if (closing) {
      // Pop up to the matching open tag; a stray closing tag with no match is ignored.
      const index = stack.map(element => element.tag).lastIndexOf(name);
      if (index > 0) stack.length = index;
      continue;
    }
    const element: HtmlElement = { tag: name, attrs: parseAttrs(text.slice(name.length + 1)), children: [] };
    top.children.push(element);
    if (!VOID_TAGS.has(name) && !text.endsWith("/>")) {
      if (stack.length >= MAX_DEPTH) throw new Error("Document nesting is too deep to import");
      stack.push(element);
    }
  }
  return root;
};

const sameMarks = (a: Mark[] = [], b: Mark[] = []) => JSON.stringify(a) === JSON.stringify(b);

/** Merges neighbouring text nodes that carry identical marks. */
const mergeText = (nodes: JSONContent[]) => {
  const merged: JSONContent[] = [];
  for (const node of nodes) {
    const last = merged[merged.length - 1];
    if (last && last.type === "text" && node.type === "text" && sameMarks(last.marks, node.marks)) last.text = (last.text ?? "") + (node.text ?? "");
    else merged.push(node);
  }
  return merged;
};

const inlineNodes = (nodes: HtmlNode[], marks: Mark[]): JSONContent[] => {
  const out: JSONContent[] = [];
  for (const node of nodes) {
    if (typeof node === "string") {
      if (node) out.push(marks.length ? { type: "text", text: node, marks } : { type: "text", text: node });
      continue;
    }
    if (node.tag === "br") { out.push({ type: "hardBreak" }); continue; }
    if (node.tag === "img") continue;
    const markType = INLINE_MARKS[node.tag];
    if (markType) { out.push(...inlineNodes(node.children, [...marks, { type: markType }])); continue; }
    if (node.tag === "a" && SAFE_LINK.test(node.attrs.href ?? "")) {
      out.push(...inlineNodes(node.children, [...marks, { type: "link", attrs: { href: node.attrs.href } }]));
      continue;
    }
    // Unknown or unsafe inline element (bookmark anchors, spans, internal links): keep the text.
    out.push(...inlineNodes(node.children, marks));
  }
  return mergeText(out);
};

const isBlock = (node: HtmlNode): node is HtmlElement => typeof node !== "string" && BLOCK_TAGS.has(node.tag);

/** Inline content of a node that may contain block children, flattened to one line (used for table cells). */
const flatInline = (nodes: HtmlNode[]): JSONContent[] => {
  const out: JSONContent[] = [];
  for (const node of nodes) {
    if (isBlock(node)) {
      const inner = flatInline(node.children);
      if (inner.length && out.length) out.push({ type: "text", text: " " });
      out.push(...inner);
    } else out.push(...inlineNodes([node], []));
  }
  return mergeText(out);
};

const paragraph = (content: JSONContent[]): JSONContent => (content.length ? { type: "paragraph", content } : { type: "paragraph" });

/** Converts a run of children into block nodes; loose inline content is grouped into paragraphs. */
const blockNodes = (nodes: HtmlNode[], depth: number): JSONContent[] => {
  if (depth > MAX_DEPTH) throw new Error("Document nesting is too deep to import");
  const out: JSONContent[] = [];
  let loose: HtmlNode[] = [];
  const flush = () => {
    const content = inlineNodes(loose, []);
    loose = [];
    // Whitespace between blocks is not a paragraph.
    if (content.some(node => node.type !== "text" || node.text!.trim())) out.push(paragraph(content));
  };
  for (const node of nodes) {
    if (!isBlock(node)) { loose.push(node); continue; }
    flush();
    const { tag } = node;
    if (tag === "p" || tag === "pre") out.push(paragraph(inlineNodes(node.children, [])));
    else if (/^h[1-6]$/.test(tag)) {
      const content = inlineNodes(node.children, []);
      out.push(content.length ? { type: "heading", attrs: { level: Number(tag[1]) }, content } : { type: "heading", attrs: { level: Number(tag[1]) } });
    } else if (tag === "ul" || tag === "ol") {
      const items = node.children.filter((child): child is HtmlElement => typeof child !== "string" && child.tag === "li");
      if (items.length) {
        out.push({
          type: tag === "ul" ? "bulletList" : "orderedList",
          content: items.map(item => {
            const content = blockNodes(item.children, depth + 1);
            return { type: "listItem", content: content.length ? content : [paragraph([])] };
          }),
        });
      }
    } else if (tag === "blockquote") {
      const content = blockNodes(node.children, depth + 1);
      out.push({ type: "blockquote", content: content.length ? content : [paragraph([])] });
    } else if (tag === "table") {
      const rows: HtmlElement[] = [];
      const collect = (element: HtmlElement) => element.children.forEach(child => {
        if (typeof child === "string") return;
        if (child.tag === "tr") rows.push(child);
        else collect(child);
      });
      collect(node);
      for (const row of rows) {
        const cells = row.children.filter((child): child is HtmlElement => typeof child !== "string" && (child.tag === "td" || child.tag === "th"));
        const content: JSONContent[] = [];
        cells.forEach((cell, index) => {
          if (index > 0) content.push({ type: "text", text: " | " });
          content.push(...flatInline(cell.children));
        });
        out.push(paragraph(mergeText(content)));
      }
    } else out.push(...blockNodes(node.children, depth + 1)); // div, section, stray li/tr: unwrap
  }
  flush();
  return out;
};

export const htmlToTiptap = (html: string): JSONContent => {
  const content = blockNodes(parseHtml(html).children, 0);
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
};
