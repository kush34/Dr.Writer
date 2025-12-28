import { isValidOp } from "./llmActions.js";

/**
 * Applies LLM edit operations to TipTap JSON
 * @param {Object} doc - TipTap document JSON
 * @param {Array} ops - edit operations
 */
export function applyEdits(doc, ops) {
  if (!doc || doc.type !== "doc" || !Array.isArray(doc.content)) {
    throw new Error("Invalid TipTap document");
  }

  if (!Array.isArray(ops)) {
    throw new Error("LLM ops must be an array");
  }

  if (!ops.every(isValidOp)) {
    throw new Error("Invalid edit operation from LLM");
  }

  const blocks = [...doc.content];

  // Apply from back → front to preserve indexes
  const sorted = [...ops].sort((a, b) => b.index - a.index);

  for (const op of sorted) {
    if (op.type === "insert") {
      const paragraphs = textToParagraphs(op.text);
      blocks.splice(op.index, 0, ...paragraphs);
    }

    if (op.type === "replace") {
      const paragraphs = textToParagraphs(op.text);
      blocks.splice(op.index, 1, ...paragraphs);
    }

    if (op.type === "delete") {
      blocks.splice(op.index, 1);
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
function textToParagraphs(text) {
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
