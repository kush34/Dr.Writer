import { isValidOp, tOps } from "./llmActions";
import type { JSONContent } from "@tiptap/core";
// type TipTapNode = {

//   type: string;
//   content?: TipTapNode[];
//   text?: string;
// };

// type TipTapDoc = {
//   type: "doc";
//   content: TipTapNode[];
// };

/**
 * Applies LLM edit operations to TipTap JSON
 * @param {Object} doc - TipTap document JSON
 * @param {Array} ops - edit operations
 */
export function applyEdits(doc: JSONContent, ops: tOps[]): JSONContent {
  if (!doc || doc.type !== "doc" || !Array.isArray(doc.content)) {
    throw new Error("Invalid TipTap document");
  }

  if (!Array.isArray(ops) || !ops.every(isValidOp)) {
    throw new Error("Invalid edit operations");
  }

  const blocks = [...doc.content];

  // Apply from back → front so indexes don’t shift
  const sorted = [...ops].sort((a, b) => {
    const aPos = a.type === "insert" ? a.at : a.from;
    const bPos = b.type === "insert" ? b.at : b.from;
    return bPos - aPos;
  });

  for (const op of sorted) {
    switch (op.type) {
      case "insert": {
        const paragraphs = textToParagraphs(op.text);
        blocks.splice(op.at, 0, ...paragraphs);
        break;
      }

      case "replace": {
        const paragraphs = textToParagraphs(op.text);
        const count = op.to - op.from + 1;
        blocks.splice(op.from, count, ...paragraphs);
        break;
      }

      case "delete": {
        const count = op.to - op.from + 1;
        blocks.splice(op.from, count);
        break;
      }
    }
  }

  return {
    ...doc,
    content: blocks
  };
}

/**
 * Converts plain text into TipTap paragraph nodes
 */
function textToParagraphs(text: string) {
  return text
    .split("\n")
    .filter(Boolean)
    .map(line => ({
      type: "paragraph",
      content: [
        {
          type: "text",
          text: line
        }
      ]
    }));
}
