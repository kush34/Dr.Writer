import { z } from "zod";

export const savePresentationSchema = z.object({
  pptx: z.string().max(8 * 1024 * 1024).base64().startsWith("UEsDB"),
  revision: z.number().int().nonnegative(),
  title: z.string().trim().min(1).max(255).optional(),
});
export const presentationOutline = z.array(z.array(z.string().max(2000).nullable()).max(300)).max(300);
export const presentationPlan = z.array(z.discriminatedUnion("type", [
  z.object({ type: z.literal("append"), title: z.string().min(1).max(200), body: z.string().min(1).max(4000) }),
  z.object({ type: z.literal("replace"), slide: z.number().int().nonnegative(), shape: z.number().int().nonnegative(), text: z.string().max(4000) }),
  z.object({ type: z.literal("addText"), slide: z.number().int().nonnegative(), text: z.string().min(1).max(4000) }),
])).min(1).max(60);

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
});

export const addUserSchema = z.object({
  file_id: z.string().trim().min(1),
  userToAddMail: z.string().trim().email(),
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
  command: z.string().trim().min(1),
  content: z.object({ type: z.literal("doc"), content: z.array(z.unknown()) }).passthrough().optional(),
  modelName: z.string().optional(),
});

export const userPromptSchema = z.object({
  userPrompt: z.string().trim().min(1),
  documentId: z.string().trim().min(1),
  modelName: z.string().trim().min(1),
});

export const syncDocumentSchema = z.object({
  file_id: z.string().trim().min(1),
  title: z.string().trim().min(1).max(255),
  newContent: z.unknown(),
});

export const getChatsParamsSchema = z.object({
  documentId: z.string().trim().min(1),
});
