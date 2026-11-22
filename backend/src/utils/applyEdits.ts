import { tOps, validateDocumentOperations } from "./llmActions";
import type { JSONContent } from "@tiptap/core";

function paragraph(text: string): JSONContent {
  return { type: "paragraph", ...(text ? { content: [{ type: "text", text }] } : {}) };
}

export function applyEdits(doc: JSONContent, ops: tOps[]): JSONContent {
  if (!doc || doc.type !== "doc" || !Array.isArray(doc.content)) throw new Error("Invalid TipTap document");
  validateDocumentOperations(ops, doc.content.length);
  const blocks = [...doc.content];
  const sorted = [...ops].sort((a, b) => (b.type === "insert" ? b.at : b.from) - (a.type === "insert" ? a.at : a.from));
  for (const op of sorted) {
    if (op.type === "delete") { blocks.splice(op.from, op.to - op.from + 1); continue; }
    const nodes: JSONContent[] = op.blocks ? op.blocks.map(block => {
      if (block.type === "paragraph") return paragraph(block.text);
      if (block.type === "heading") return { type: "heading", attrs: { level: block.level }, content: [{ type: "text", text: block.text }] };
      return { type: block.type, content: block.items.map(item => ({ type: "listItem", content: [paragraph(item)] })) };
    }) : (op.text || "").split("\n").map(paragraph);
    if (op.type === "insert") blocks.splice(op.at, 0, ...nodes);
    else blocks.splice(op.from, op.to - op.from + 1, ...nodes);
  }
  return { ...doc, content: blocks.length ? blocks : [paragraph("")] };
}
