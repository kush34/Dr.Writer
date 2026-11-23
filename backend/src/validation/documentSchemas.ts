import { z } from "zod";

export const savePresentationSchema = z.object({
  pptx: z.string().max(8 * 1024 * 1024).base64().startsWith("UEsDB"),
  revision: z.number().int().nonnegative(),
  title: z.string().trim().min(1).max(255).optional(),
});
export const presentationOutline = z.array(z.array(z.string().max(2000).nullable()).max(300)).max(300);
export const presentationDeck = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  layouts: z.array(z.object({ name: z.string().max(100), type: z.string().max(20) })).max(100),
  slides: z.array(z.object({ layout: z.string().max(100).nullable(), shapes: z.array(z.string().max(40)).max(300) })).max(300),
});
export const presentationPlan = z.array(z.discriminatedUnion("type", [
  z.object({
    type: z.literal("append"),
    title: z.string().min(1).max(200),
    body: z.string().max(4000).optional(),
    bullets: z.array(z.string().min(1).max(300)).max(8).optional(),
    layout: z.enum(["title", "content", "section"]).optional(),
    table: z.object({
      header: z.array(z.string().max(100)).min(1).max(8),
      rows: z.array(z.array(z.string().max(200)).max(8)).min(1).max(12),
    }).refine(table => table.rows.every(row => row.length === table.header.length), "Every table row needs one cell per header").optional(),
  }),
  z.object({ type: z.literal("replace"), slide: z.number().int().nonnegative(), shape: z.number().int().nonnegative(), text: z.string().max(4000) }),
  z.object({ type: z.literal("addText"), slide: z.number().int().nonnegative(), text: z.string().min(1).max(4000) }),
  z.object({ type: z.literal("deleteSlide"), slide: z.number().int().nonnegative() }),
  z.object({ type: z.literal("moveSlide"), slide: z.number().int().nonnegative(), to: z.number().int().nonnegative() }),
])).min(1).max(60).superRefine((ops, ctx) => {
  ops.forEach((op, index) => {
    if (op.type === "append" && !(op.body?.trim() || op.bullets?.length || op.table || op.layout === "title" || op.layout === "section"))
      ctx.addIssue({ code: "custom", path: [index], message: "A content slide needs bullets, a body or a table" });
  });
});

export const createDocumentSchema = z.object({
  kind: z.enum(["document", "presentation"]).default("document"),
  title: z.string().trim().min(1).max(255).optional().default("document"),
});

export const documentIdBodySchema = z.object({
  file_id: z.string().trim().min(1),
});

export const updateDocumentSchema = z.object({
  file_id: z.string().trim().min(1),
  newContent: z.unknown(),
  title: z.string().trim().min(1).max(255),
  // The revision the client last loaded or saved. A stale value is rejected with 409.
  revision: z.number().int().nonnegative(),
});

export const shareRoleSchema = z.enum(["editor", "commenter", "viewer"]);

export const addUserSchema = z.object({
  file_id: z.string().trim().min(1),
  userToAddMail: z.string().trim().email(),
  // Defaults to editor so clients that predate roles keep their old behavior.
  role: shareRoleSchema.default("editor"),
});

export const removeUserParamsSchema = z.object({
  documentId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
});

export const documentActionParamsSchema = z.object({
  documentId: z.string().trim().min(1),
});

export const uploadDocumentImageParamsSchema = z.object({
  documentId: z.string().trim().min(1),
});

export const createDocumentImageSignatureSchema = z.object({
  originalName: z.string().trim().min(1),
});

export const registerDocumentImageSchema = z.object({
  publicId: z.string().trim().min(1),
  url: z.string().trim().url(),
  originalName: z.string().trim().min(1),
  bytes: z.number().int().nonnegative(),
  format: z.string().trim().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const documentActionBodySchema = z.object({
  outline: presentationOutline.optional(),
  deck: presentationDeck.optional(),
  command: z.string().trim().min(1),
  content: z.object({ type: z.literal("doc"), content: z.array(z.unknown()) }).passthrough().optional(),
  modelName: z.string().optional(),
});

export const actionHistorySchema = z.object({
  prompt: z.string().trim().min(1).max(20000),
  response: z.string().trim().min(1).max(20000),
}).strict();

export const userPromptSchema = z.object({
  userPrompt: z.string().trim().min(1),
  documentId: z.string().trim().min(1),
  modelName: z.string().trim().min(1),
});

export const syncDocumentSchema = z.object({
  file_id: z.string().trim().min(1),
  title: z.string().trim().min(1).max(255),
  newContent: z.unknown(),
  // The server revision the offline edits were based on.
  revision: z.number().int().nonnegative(),
});

export const getChatsParamsSchema = z.object({
  documentId: z.string().trim().min(1),
});
