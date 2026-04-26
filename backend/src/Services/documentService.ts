import fs from "fs";
import mammoth from "mammoth";
import { Response } from "express";
import cloudinary from "../Config/cloudinary";
import User from "../Models/userModel";
import Document from "../Models/documentModel";
import Chat from "../Models/chatModel";
import { MAX_TOKENS_PER_REQUEST } from "../Config/llm";
// import { getEditOperations, useGeminiStream } from "../service/gemini";
import { applyEdits } from "../utils/applyEdits";
import { sanitizeOperations } from "../utils/llmActions";
import { AppError, isAppError } from "../utils/appError";
// Add:
import { openRouterStream, openRouterComplete } from "../service/openrouter";
import { getEditOperations } from "../service/gemini";

const extractJsonPayload = (rawResponse: string) => {
  const trimmed = rawResponse.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fencedMatch?.[1]) {
      return JSON.parse(fencedMatch[1].trim());
    }

    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }

    throw new AppError(
      502,
      "The model returned an invalid edit format. Please try again."
    );
  }
};

const findDocumentOrThrow = async (documentId: string) => {
  const document = await Document.findById(documentId);

  if (!document || !document.user_id) {
    throw new AppError(404, "Document not found");
  }

  return document;
};

const isDocumentOwner = (userId: string, ownerId: unknown) =>
  ownerId?.toString() === userId.toString();

const hasDocumentAccess = (
  userId: string,
  document: { user_id?: unknown; users: string[] }
) =>
  isDocumentOwner(userId, document.user_id) ||
  document.users.includes(userId.toString());

export const getTestDocument = async () => {
  const testFileId = process.env.testFile;

  if (!testFileId) {
    throw new AppError(500, "Test document is not configured");
  }

  const document = await Document.findById(testFileId);
  if (!document) {
    throw new AppError(404, "Document not found!");
  }

  return document;
};

export const createDocument = async (userId: string, title: string) => {
  return Document.create({
    title,
    user_id: userId,
  });
};

export const getDocumentList = async (userId: string) => {
  return Document.find({ user_id: userId }).select("title createdAt");
};

export const getDocumentData = async (userId: string, fileId: string) => {
  const document = await findDocumentOrThrow(fileId);

  if (!hasDocumentAccess(userId, document)) {
    throw new AppError(403, "You are not authorized to access this document");
  }

  return document;
};

export const updateDocument = async (
  userId: string,
  fileId: string,
  title: string,
  newContent: unknown
) => {
  await getDocumentData(userId, fileId);

  const updatedDocument = await Document.findByIdAndUpdate(
    fileId,
    { content: newContent, title },
    { new: true }
  );

  if (!updatedDocument) {
    throw new AppError(404, "Document not found");
  }

  return updatedDocument;
};

export const addUserToDocument = async (
  ownerUserId: string,
  fileId: string,
  userToAddMail: string
) => {
  const userToAdd = await User.findOne({ email: userToAddMail });
  if (!userToAdd) {
    throw new AppError(404, "user cannot be added...");
  }

  const document = await findDocumentOrThrow(fileId);
  if (!isDocumentOwner(ownerUserId, document.user_id)) {
    throw new AppError(403, "You are not authorized to update this document");
  }

  await Document.findByIdAndUpdate(fileId, {
    $addToSet: { users: userToAdd._id.toString() },
  });
};

export const performDocumentAction = async (
  userId: string,
  documentId: string,
  command: string
) => {
  const document = await findDocumentOrThrow(documentId);

  if (!isDocumentOwner(userId, document.user_id)) {
    throw new AppError(403, "Document not found");
  }

  const blockCount = Array.isArray(document.content?.content)
    ? document.content.content.length
    : 0;

  const rawResponse = await openRouterComplete(
    `You are a TipTap document editor.

Return ONLY valid JSON. No markdown. No prose. No explanation.

The document is TipTap JSON. Edit operations use top-level block indexes, not character offsets.

Allowed response shape:
{
  "operations": [
    { "type": "insert", "at": number, "text": string },
    { "type": "replace", "from": number, "to": number, "text": string },
    { "type": "delete", "from": number, "to": number }
  ]
}

Rules:
- "at", "from", and "to" refer to indexes in the top-level "content" array.
- Current top-level block count is ${blockCount}.
- Keep indexes within the existing block range.
- Use "insert" to add new paragraph text.
- Use "replace" or "delete" only for whole top-level blocks.

Document:
${JSON.stringify(document.content)}

Command:
${command}`,
    "openai/gpt-4o-mini" // or pass model as param
  );

  let llmResponse: { operations?: unknown[] };
  try {
    llmResponse = extractJsonPayload(rawResponse);
  } catch (error) {
    console.error("Invalid OpenRouter edit response:", rawResponse);
    throw error;
  }

  const safeOperations = sanitizeOperations(
    Array.isArray(llmResponse.operations) ? llmResponse.operations as never[] : []
  );

  if (safeOperations.length === 0) {
    throw new AppError(400, "LLM returned no valid operations");
  }

  const updatedContent = applyEdits(document.content, safeOperations);

  return {
    updatedContent,
    operations: llmResponse.operations,
  };
};

export const streamUserPrompt = async (
  userId: string,
  userPrompt: string,
  documentId: string,
  modelName: string,
  res: Response
) => {
  try {
    let tokenCount = 0;
    const reservedUser = await User.findOneAndUpdate(
      { _id: userId, token_balance: { $gte: MAX_TOKENS_PER_REQUEST } },
      { $inc: { token_balance: -MAX_TOKENS_PER_REQUEST } },
      { new: true }
    );

    if (!reservedUser) {
      throw new AppError(402, "Insufficient token balance");
    }
    await openRouterStream(
      userPrompt,
      modelName,
      res,
      (text) => {
        res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
      },
      async (fullResponse) => {
        // Rough token estimate — OpenRouter doesn't always return usage in stream
        tokenCount = Math.ceil(fullResponse.length / 4);
        const refund = MAX_TOKENS_PER_REQUEST - tokenCount;

        if (refund > 0) {
          await User.updateOne({ _id: userId }, { $inc: { token_balance: refund } });
        }

        await Chat.create({
          documentId,
          prompt: userPrompt,
          response: fullResponse,
          tokensUsed: tokenCount,
        });

        res.write(`data: ${JSON.stringify({ type: "done", usageToken: tokenCount })}\n\n`);
        res.end();
      }
    );
  } catch (error) {
    console.error("OpenRouter stream error:", error);
    await User.updateOne({ _id: userId }, { $inc: { token_balance: MAX_TOKENS_PER_REQUEST } });

    const statusCode = isAppError(error) ? error.statusCode : 500;
    const message = isAppError(error) ? error.message : "LLM stream failed";
    const payload = { error: message, statusCode };

    if (!res.headersSent) {
      return res.status(statusCode).json(payload);
    }

    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    res.end();
  }
};

export const syncDocument = async (
  userId: string,
  fileId: string,
  title: string,
  newContent: unknown
) => {
  const document = await findDocumentOrThrow(fileId);

  if (!hasDocumentAccess(userId, document)) {
    throw new AppError(403, "You are not authorized to access this document");
  }

  if (title !== document.title || newContent !== document.content) {
    await Document.findByIdAndUpdate(
      fileId,
      { title, content: JSON.stringify(newContent) },
      { new: true }
    );
  }
};

export const uploadDocumentFile = async (
  userId: string,
  file: { path: string; originalname: string }
) => {
  const filePath = file.path;

  try {
    const fileContent = fs.readFileSync(filePath);
    const { value: text } = await mammoth.extractRawText({ buffer: fileContent });

    const newDocument = new Document({
      user_id: userId,
      title: file.originalname,
      content: text,
    });

    await newDocument.save();

    return {
      success: true,
      content: text,
    };
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};

export const getDocumentChats = async (documentId: string) => {
  return Chat.find({ documentId });
};

const assertCloudinaryConfigured = () => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new AppError(500, "Cloudinary is not configured");
  }
};

const sanitizeBaseName = (originalName: string) =>
  originalName
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "image";

export const createDocumentImageSignature = async (
  userId: string,
  documentId: string,
  originalName: string
) => {
  await getDocumentData(userId, documentId);
  assertCloudinaryConfigured();

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `documents/${documentId}`;
  const publicId = `${folder}/${Date.now()}-${sanitizeBaseName(originalName)}`;

  const signature = cloudinary.utils.api_sign_request(
    {
      folder,
      public_id: publicId,
      timestamp,
    },
    process.env.CLOUDINARY_API_SECRET as string
  );

  return {
    timestamp,
    folder,
    publicId,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY as string,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME as string,
  };
};

export const registerDocumentImage = async (
  userId: string,
  documentId: string,
  image: {
    publicId: string;
    url: string;
    originalName: string;
    bytes: number;
    format?: string;
    width?: number;
    height?: number;
  }
) => {
  const document = await getDocumentData(userId, documentId);
  const expectedPrefix = `documents/${documentId}/`;

  if (!image.publicId.startsWith(expectedPrefix)) {
    throw new AppError(400, "Invalid Cloudinary public id for this document");
  }

  const relatedImage = {
    publicId: image.publicId,
    url: image.url,
    originalName: image.originalName,
    bytes: image.bytes,
    format: image.format,
    width: image.width,
    height: image.height,
    uploadedAt: new Date(),
  };

  document.relatedImages.push(relatedImage);
  await document.save();

  return {
    image: relatedImage,
  };
};
