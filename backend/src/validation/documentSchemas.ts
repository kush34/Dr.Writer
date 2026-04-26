import { z } from "zod";

export const createDocumentSchema = z.object({
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

export const documentActionBodySchema = z.object({
  command: z.string().trim().min(1),
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
