import fs from "fs";
import mammoth from "mammoth";
import { Response } from "express";
import User from "../Models/userModel";
import Document from "../Models/documentModel";
import Chat from "../Models/chatModel";
import { MAX_TOKENS_PER_REQUEST } from "../Config/llm";
import { getEditOperations, useGeminiStream } from "../service/gemini";
import { applyEdits } from "../utils/applyEdits";
import { sanitizeOperations } from "../utils/llmActions";
import { AppError } from "../utils/appError";

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

  const llmResponse = await getEditOperations(document.content, command);
  const safeOperations = sanitizeOperations(llmResponse.operations);

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
  const reservedUser = await User.findOneAndUpdate(
    {
      _id: userId,
      token_balance: { $gte: MAX_TOKENS_PER_REQUEST },
    },
    {
      $inc: { token_balance: -MAX_TOKENS_PER_REQUEST },
    },
    { new: true }
  );

  if (!reservedUser) {
    throw new AppError(402, "Insufficient token balance");
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  let fullResponse = "";

  try {
    const result = await useGeminiStream(userPrompt, "", "", modelName);

    for await (const chunk of result.stream) {
      const text =
        chunk.candidates?.[0]?.content?.parts
          ?.map((part) => part.text)
          .join("") || "";

      if (!text) {
        continue;
      }

      fullResponse += text;
      res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
    }

    const usageToken = (await result.response).usageMetadata?.totalTokenCount;

    if (!usageToken || typeof usageToken !== "number") {
      throw new Error("Invalid usage metadata");
    }

    const refund = MAX_TOKENS_PER_REQUEST - usageToken;
    if (refund > 0) {
      await User.updateOne({ _id: userId }, { $inc: { token_balance: refund } });
    }

    await Chat.create({
      documentId,
      prompt: userPrompt,
      response: fullResponse,
      tokensUsed: usageToken,
    });

    res.write(
      `data: ${JSON.stringify({
        type: "done",
        usageToken,
      })}\n\n`
    );
    res.end();
  } catch (error) {
    console.error("Gemini stream error:", error);

    await User.updateOne(
      { _id: userId },
      { $inc: { token_balance: MAX_TOKENS_PER_REQUEST } }
    );

    res.write(`data: ${JSON.stringify({ error: "LLM stream failed" })}\n\n`);
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
