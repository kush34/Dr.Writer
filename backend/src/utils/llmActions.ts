import { z } from "zod";

const text = z.string().max(12000);
const block = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text }),
  z.object({ type: z.literal("heading"), level: z.number().int().min(1).max(3), text: text.min(1) }),
  z.object({ type: z.enum(["bulletList", "orderedList"]), items: z.array(text.min(1)).min(1).max(30) }),
]);
const payload = { text: text.optional(), markdown: z.string().max(60000).optional(), blocks: z.array(block).min(1).max(50).optional() };
export const documentOperations = z.array(z.discriminatedUnion("type", [
  z.object({ type: z.literal("insert"), at: z.number().int().nonnegative(), ...payload }),
  z.object({ type: z.literal("replace"), from: z.number().int().nonnegative(), to: z.number().int().nonnegative(), ...payload }),
  z.object({ type: z.literal("delete"), from: z.number().int().nonnegative(), to: z.number().int().nonnegative() }),
])).min(1).max(60).superRefine((ops, ctx) => {
  for (const [i, op] of ops.entries()) {
    if (op.type !== "delete" && [op.text, op.markdown, op.blocks].filter(value => value !== undefined).length !== 1) ctx.addIssue({ code: "custom", path: [i], message: "Provide exactly one of markdown, text or blocks" });
    if (op.type !== "insert" && op.to < op.from) ctx.addIssue({ code: "custom", path: [i], message: "End index precedes start" });
  }
});
export type tOps = z.infer<typeof documentOperations>[number];
export function validateDocumentOperations(value: unknown, blockCount: number): tOps[] {
  const ops = documentOperations.parse(value);
  const occupied = new Set<number>();
  const positions = new Set<number>();
  for (const op of ops) {
    const start = op.type === "insert" ? op.at : op.from;
    const end = op.type === "insert" ? op.at : op.to;
    if (start > blockCount || (op.type !== "insert" && end >= blockCount)) throw new Error("Block index is out of range");
    if (positions.has(start)) throw new Error("Operations share a starting position");
    positions.add(start);
    if (op.type !== "insert") for (let i = start; i <= end; i++) {
      if (occupied.has(i)) throw new Error("Operations overlap");
      occupied.add(i);
    }
  }
  for (const op of ops) if (op.type === "insert" && occupied.has(op.at)) throw new Error("Insertion overlaps another edit");
  return ops;
}
