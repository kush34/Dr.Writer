type ProposedEdit = { type: string; slide?: number; shape?: number; at?: number; from?: number; to?: number; title?: string; body?: string; bullets?: string[]; table?: { header: string[]; rows: string[][] }; text?: string; markdown?: string; blocks?: { type: string; text?: string; items?: string[] }[] };

export function summarizeEdits(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) throw new Error("No edits to review.");
  const summary = (value as ProposedEdit[]).map(edit => {
    if (edit.type === "deleteSlide") return `Delete slide ${(edit.slide ?? 0) + 1}`;
    if (edit.type === "moveSlide") return `Move slide ${(edit.slide ?? 0) + 1} to position ${(edit.to ?? 0) + 1}`;
    const target = edit.type === "append" ? "Add slide" : edit.slide !== undefined ? `Slide ${edit.slide + 1}${edit.shape !== undefined ? `, text ${edit.shape + 1}` : ""}` : edit.type === "insert" ? `Insert at block ${(edit.at ?? 0) + 1}` : `Blocks ${(edit.from ?? 0) + 1}–${(edit.to ?? 0) + 1}`;
    const content = [edit.title, edit.body, ...(edit.bullets?.map(item => `• ${item}`) ?? []), ...(edit.table ? [[edit.table.header, ...edit.table.rows].map(row => row.join(" | ")).join("\n")] : []), edit.text, edit.markdown, ...(edit.blocks?.map(block => block.text ?? block.items?.map(item => `• ${item}`).join("\n")) ?? [])].filter(Boolean).join("\n");
    return `${target}${edit.type === "delete" ? " — delete" : ""}${content ? `\n${content}` : ""}`;
  }).join("\n\n---\n\n");
  return summary;
}
