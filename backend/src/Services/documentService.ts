import { ZodError, type z } from "zod";
import { getOpenRouterKey } from "../service/openrouterAuth";
import { assertClean, cleanSlides, lintDocumentOps, lintSlides, planSlideOrder } from "../utils/lintEdits";
import { presentationPlan, presentationDeck } from "../validation/documentSchemas";
import { Response } from "express";
import mongoose from "mongoose";
import { documentText, searchExcerpt } from "../utils/documentSearch";
import cloudinary from "../Config/cloudinary";
import User from "../Models/userModel";
import Document from "../Models/documentModel";
import Chat from "../Models/chatModel";
import { MAX_TOKENS_PER_REQUEST } from "../Config/llm";
// import { getEditOperations, useGeminiStream } from "../service/gemini";
import { applyEdits } from "../utils/applyEdits";
import { documentToMarkdownBlocks } from "../utils/markdown";
import { validateDocumentOperations } from "../utils/llmActions";
import { AppError, isAppError } from "../utils/appError";
import { openRouterStream, openRouterComplete, openRouterWithTools } from "../service/openrouter";
import { getMcpConfig } from "../service/mcpConfig";
import { connectMcpServers } from "../service/mcpClient";

const EDIT_SYSTEM_PROMPT = `You are an expert writing and presentation editor inside a document app. You write the finished content itself, never instructions for a person to write it. Be specific and concrete: no filler, no placeholders such as "Lorem ipsum" or "[Your name]", no repeated points. Match the language and tone of any existing content, and preserve content the user did not ask you to change. Respond with a single valid JSON object only: no markdown fences and no commentary.`;

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

export const createDocument = async (userId: string, title: string, kind: "document" | "presentation" = "document", pptx?: string) => {
  return Document.create({
    title, kind, pptx,
    user_id: userId,
  });
};

export const getDocumentList = async (userId: string) => {
  const documents = await Document.find({ user_id: userId }).select(
    "kind title content createdAt editedAt uploadStatus uploadError sourceFileName"
  ).lean();
  const previewText = (content: unknown): string => {
    if (typeof content === "string") return content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
    const words: string[] = [];
    const visit = (node: any) => {
      if (!node || words.join(" ").length >= 300) return;
      if (typeof node.text === "string") words.push(node.text);
      if (Array.isArray(node.content)) node.content.forEach(visit);
    };
    visit(content);
    return words.join(" ").slice(0, 300);
  };
  return documents.map(({ content, ...document }) => ({ ...document, preview: previewText(content) }));
};

export const searchDocuments = async (userId: string, query: string) => {
  const results: { _id: string; title: string; excerpt: string }[] = [];
  const cursor = Document.find({ $or: [{ user_id: userId }, { users: userId }] }).select("title content").lean().cursor();
  for await (const document of cursor) {
    const excerpt = searchExcerpt(documentText(document.content), query);
    if (excerpt !== null || document.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())) {
      results.push({ _id: document._id.toString(), title: document.title, excerpt: excerpt ?? "Title match" });
      if (results.length === 30) break;
    }
  }
  return results;
};

export const getDocumentData = async (userId: string, fileId: string) => {
  const document = await findDocumentOrThrow(fileId);

  if (!hasDocumentAccess(userId, document)) {
    throw new AppError(403, "You are not authorized to access this document");
  }

  return document;
};

/**
 * Saves a text document only if `revision` is still the stored one, so a stale client can never
 * overwrite newer edits. Returns the new revision; a mismatch is a 409 and nothing is written.
 */
const saveTextDocument = async (userId: string, fileId: string, title: string, content: unknown, revision: number) => {
  const document = await getDocumentData(userId, fileId);
  if (document.kind === "presentation") throw new AppError(400, "Use presentation save");
  const saved = await Document.updateOne(
    {
      $and: [
        { _id: fileId },
        // Documents created before `revision` existed have no such field, which counts as 0.
        revision === 0 ? { $or: [{ revision: 0 }, { revision: { $exists: false } }] } : { revision },
        { $or: [{ user_id: userId }, { users: userId }] },
      ],
    },
    { $set: { content, title, editedAt: new Date() }, $inc: { revision: 1 } }
  );
  if (!saved.modifiedCount) throw new AppError(409, "This document changed since you opened it. Your edits were not saved over the newer version.");
  return revision + 1;
};

export const updateDocument = (userId: string, fileId: string, title: string, newContent: unknown, revision: number) =>
  saveTextDocument(userId, fileId, title, newContent, revision);

export const savePresentation = async (userId: string, id: string, revision: number, pptx: string, title?: string) => {
  const document = await getDocumentData(userId, id);
  if (document.kind !== "presentation") throw new AppError(400, "Expected a presentation");
  const saved = await Document.updateOne({ _id: id, revision, $or: [{ user_id: userId }, { users: userId }] },
    { $set: { pptx, ...(title ? { title } : {}), editedAt: new Date() }, $inc: { revision: 1 } });
  if (!saved.modifiedCount) throw new AppError(409, "A newer presentation was saved. Download your edits before reloading.");
  return revision + 1;
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

/** Earlier edit requests on this document, so "make it shorter" or "now the next section" keep their meaning. Optional context: any failure just means none. */
const recentRequests = async (documentId: string) => {
  if (mongoose.connection.readyState !== 1) return "";
  try {
    const chats = await Chat.find({ documentId }).sort({ createdAt: -1, _id: -1 }).limit(4).lean();
    return chats.reverse().map(chat => `- User: ${String(chat.prompt).slice(0, 300)}\n  Result: ${String(chat.response).slice(0, 200)}`).join("\n");
  } catch { return ""; }
};

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

/**
 * Runs one model call for a user without their own OpenRouter key, charging their token balance.
 * The worst case (prompt plus the maximum reply) is reserved first, so a user without enough balance
 * is refused with 402 before anything reaches the server's key. Afterwards the reservation is settled
 * to the estimated real usage (length/4, as in streamUserPrompt), or refunded if the call failed.
 */
const meteredCall = async (userId: string, prompt: string, system: string, call: () => Promise<string>) => {
  const promptTokens = estimateTokens(prompt) + estimateTokens(system);
  const hold = promptTokens + MAX_TOKENS_PER_REQUEST;
  const reservedUser = await User.findOneAndUpdate(
    { _id: userId, token_balance: { $gte: hold } },
    { $inc: { token_balance: -hold } },
    { new: true }
  );
  if (!reservedUser) throw new AppError(402, "Insufficient token balance. Add your own OpenRouter key in settings or try again later.");
  let used = 0;
  try {
    const raw = await call();
    used = promptTokens + estimateTokens(raw);
    return raw;
  } finally {
    await User.updateOne({ _id: userId }, { $inc: { token_balance: hold - used } });
  }
};

export const performDocumentAction = async (
  userId: string,
  documentId: string,
  command: string,
  currentContent?: { type: "doc"; content: unknown[] },
  modelName?: string,
  outline?: (string | null)[][],
  onProgress: (status: string) => void = () => {},
  onPreview: (text: string) => void = () => {},
  deck?: z.infer<typeof presentationDeck>
) => {
  const document = await findDocumentOrThrow(documentId);

  if (!isDocumentOwner(userId, document.user_id)) {
    throw new AppError(403, "Document not found");
  }

  const apiKey = await getOpenRouterKey(userId);
  const model = modelName || "openai/gpt-4o-mini";
  const history = await recentRequests(documentId);
  const background = `Document title: ${JSON.stringify(String(document.title ?? "").slice(0, 200))}${history ? `\nEarlier requests on this document, oldest first (for context only; do not redo them):\n${history}` : ""}\n`;
  const completeValidated = async <T>(prompt: string, validate: (value: any) => T): Promise<T> => {
    let feedback = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt) onProgress("Retrying the model response");
      const fullPrompt = prompt + feedback;
      const call = () => openRouterComplete(fullPrompt, model, apiKey, { system: EDIT_SYSTEM_PROMPT, json: true, temperature: 0.3 });
      // Users with their own key pay OpenRouter directly; everyone else is metered on every attempt.
      const raw = apiKey ? await call() : await meteredCall(userId, fullPrompt, EDIT_SYSTEM_PROMPT, call);
      onProgress("Checking the response");
      try {
        if (!raw.trim()) throw new Error("The response was empty; provide the requested JSON object.");
        return validate(extractJsonPayload(raw));
      } catch (error) {
        const reason = error instanceof ZodError ? error.issues.map(issue => `${issue.path.join(".")}: ${issue.code}`).join(", ") : error instanceof SyntaxError ? "invalid JSON" : "response failed validation";
        console.warn("AI edit validation failed:", { model, attempt: attempt + 1, reason });
        feedback = `\nYour previous response was invalid: ${error instanceof Error ? error.message.slice(0, 1000) : "invalid format"}.\nPrevious response (possibly truncated):\n${raw.slice(0, 24000)}\nReturn a corrected complete JSON response.`;
      }
    }
    throw new AppError(502, "The model could not prepare valid edits after three attempts. Try a different model or simplify your request.");
  };
  if (document.kind === "presentation") {
    if (!outline) throw new AppError(400, "Open the presentation before requesting edits");
    const empty = outline.every(slide => slide.every(shape => !shape?.trim()));
    let plan = "";
    if (empty) {
      onProgress("Planning the presentation");
      try {
      const outlinePlan = await completeValidated(
        `Plan a presentation for this request: ${command}. Return JSON {"audience":"...","goal":"...","slides":[{"title":"...","points":["..."],"visual":"..."}]}. Keep slides concise, use 1 to 12 slides and at most 5 points per slide.`,
        value => {
          if (!value || typeof value.audience !== "string" || typeof value.goal !== "string" || !Array.isArray(value.slides) || !value.slides.length || value.slides.length > 12 || value.slides.some((slide: any) => typeof slide.title !== "string" || !slide.title.trim() || !Array.isArray(slide.points) || slide.points.length > 5 || slide.points.some((point: unknown) => typeof point !== "string") || typeof slide.visual !== "string")) throw new Error("Expected audience, goal and 1-12 slides with title, points and visual");
          return value;
        });
      plan = `\nUse this planned outline: ${JSON.stringify(outlinePlan)}`;
      onPreview(`Presentation outline\n${outlinePlan.slides.map((slide: { title: string; points: string[] }, index: number) => `${index + 1}. ${slide.title}\n${slide.points.map(point => `  • ${point}`).join("\n")}`).join("\n")}`);
      } catch (error) {
        if (!isAppError(error) || !error.message.startsWith("The model could not prepare valid edits after three attempts.")) throw error;
        onProgress("Preparing slides without an outline");
      }
    }
    onProgress("Preparing slide edits");
    const operations = await completeValidated(
      `Edit a PowerPoint presentation. Return JSON {"operations":[...]}.
Allowed operations:
- {"type":"append","layout":"title|content|section","title":"...","bullets":["..."],"table":{"header":["..."],"rows":[["..."]]}} adds a new slide at the end. layout defaults to "content". Use "title" for an opening slide (title plus an optional one-line "body" subtitle, no bullets) and "section" for a divider. For "content" slides give 3 to 5 "bullets", each a short phrase of at most 12 words with no bullet characters. Use "table" instead of bullets only for comparisons or figures, at most 6 rows. Titles stay under 8 words.
- {"type":"addText","slide":N,"text":"..."} adds a text box to an existing slide N.
- {"type":"replace","slide":N,"shape":M,"text":"..."} rewrites existing shape M on existing slide N.
- {"type":"deleteSlide","slide":N} deletes existing slide N. Use it only when the user asks to remove or condense slides, and never on a slide you also edit.
- {"type":"moveSlide","slide":N,"to":P} moves existing slide N so it ends at zero-based position P, counted after all deletions and after earlier moves in your list. Use it only when the user asks to reorder.
The presentation has ${outline.length} existing slide(s), valid indexes 0..${outline.length - 1}. Every slide number N always refers to the ORIGINAL numbering, even after other operations. addText, replace, deleteSlide and moveSlide may only use those indexes; use append for new slides. Preserve unrelated content. Outline lists the text of each shape in zero-based order; null means non-text. Never target a null shape.
${deck ? `Slide size is ${deck.width}x${deck.height} points. Available layouts: ${deck.layouts.map(layout => `${layout.name} (${layout.type})`).join(", ")}. Slides and their shapes: ${JSON.stringify(deck.slides)}\n` : ""}Example: {"operations":[{"type":"append","layout":"title","title":"Q3 Plan","body":"Priorities and budget"},{"type":"append","title":"Priorities","bullets":["Ship the editor","Cut load time in half","Hire two engineers"]}]}
Outline: ${JSON.stringify(outline)}
${background}Request: ${command}${plan}`, value => {
        const ops = cleanSlides(presentationPlan.parse(value?.operations));
        assertClean(lintSlides(ops));
        assertClean(planSlideOrder(ops, outline.length).problems);
        if (ops.some(op => op.type === "replace" && (op.shape >= outline[op.slide].length || outline[op.slide][op.shape] === null))) throw new Error("Slide or shape index is invalid");
        return ops;
      });
    onPreview(`Proposed slide edits\n${operations.map(op => op.type === "append" ? `Add slide: ${op.title}\n${[op.body, ...(op.bullets ?? []).map(point => `  • ${point}`), op.table ? [op.table.header, ...op.table.rows].map(row => row.join(" | ")).join("\n") : ""].filter(Boolean).join("\n")}` : op.type === "deleteSlide" ? `Delete slide ${op.slide + 1}` : op.type === "moveSlide" ? `Move slide ${op.slide + 1} to position ${op.to + 1}` : `Slide ${op.slide + 1}: ${op.text}`).join("\n\n")}`);
    return { operations };
  }

  const content = currentContent ?? document.content;
  const blockCount = Array.isArray(content?.content) ? content.content.length : 0;
  let documentPlan = "";
  if (!documentText(content).trim()) {
    onProgress("Planning the document");
    try {
    const planned = await completeValidated(
      `Plan a document for this request: ${command}. Return JSON {"audience":"...","goal":"...","sections":[{"heading":"...","purpose":"..."}]}. Use 1 to 12 sections.`, value => {
        if (typeof value?.audience !== "string" || typeof value?.goal !== "string" || !Array.isArray(value?.sections) || !value.sections.length || value.sections.length > 12 || value.sections.some((section: any) => typeof section.heading !== "string" || typeof section.purpose !== "string")) throw new Error("Expected audience, goal and 1-12 sections with heading and purpose");
        return value;
      });
    documentPlan = `\nUse this document outline: ${JSON.stringify(planned)}`;
    onPreview(`Document outline\n${planned.sections.map((section: { heading: string; purpose: string }, index: number) => `${index + 1}. ${section.heading} — ${section.purpose}`).join("\n")}`);
    } catch (error) {
      if (!isAppError(error) || !error.message.startsWith("The model could not prepare valid edits after three attempts.")) throw error;
      onProgress("Preparing document without an outline");
    }
  }
  onProgress("Preparing document edits");
  const { text: documentMarkdown, locked } = documentToMarkdownBlocks(content);
  const llmResponse = await completeValidated(
    `Edit a document. Return only JSON {"question":"...","operations":[...]}.
The document is listed as top-level blocks, each starting with its zero-based index in brackets, e.g. "[2] ## Heading". Block text is Markdown; a whole list is one block. There are currently ${blockCount} block(s).
Follow the user's request and write the actual content, not instructions for a person to write it. Return exactly one JSON object with no markdown fences. Escape line breaks inside JSON strings as \\n.
Use a question and no operations only if clarification is essential. Otherwise return operations, with indexes referring to the ORIGINAL blocks:
{"type":"insert","at":N,"markdown":"..."} inserts before block N (N=${blockCount} appends at the end).
{"type":"replace","from":N,"to":N,"markdown":"..."} replaces blocks N..to inclusive.
{"type":"delete","from":N,"to":N} deletes blocks N..to inclusive.
Markdown may use: # ## ### headings, paragraphs separated by a blank line, "- " bullets, "1. " numbered lists (indent nested items by two spaces), "> " quotes, fenced code blocks, "---" rules, **bold**, *italic*, ~~strike~~, \`code\` and [text](https://url). Do not use tables, HTML or images.
Never replace or delete blocks shown as <... not editable>. Keep unrelated blocks unchanged and do not repeat text that already exists. For a new document, use a clear structure with headings, short paragraphs and lists where they help. Do not overlap edits or reuse a start index.
Example, filling an empty document: {"operations":[{"type":"replace","from":0,"to":0,"markdown":"# Title\\n\\nA useful opening paragraph.\\n\\n- First point\\n- Second point"}]}
Example, appending: {"operations":[{"type":"insert","at":${blockCount},"markdown":"## New section\\n\\nNew paragraph."}]}
${background}Document:
${documentMarkdown || "(empty)"}
Command: ${command}${documentPlan}`, value => {
      if (typeof value?.question === "string" && value.question.trim() && (!value.operations || (Array.isArray(value.operations) && !value.operations.length))) return { question: value.question.trim(), operations: [] };
      const ops = validateDocumentOperations(value?.operations, blockCount);
      assertClean(lintDocumentOps(ops));
      for (const op of ops) if (op.type !== "insert") for (let i = op.from; i <= op.to; i++) if (locked.has(i)) throw new Error(`Block ${i} is not editable and cannot be replaced or deleted`);
      return { operations: ops };
    });
  if (llmResponse.question) return { question: llmResponse.question };
  const updatedContent = applyEdits(content as Parameters<typeof applyEdits>[0], llmResponse.operations);
  onPreview(`Proposed document edits\n${llmResponse.operations.map(op => op.type === "delete" ? `Delete blocks ${op.from + 1}–${op.to + 1}` : (op.markdown ?? (op.blocks ? op.blocks.map(block => block.type === "heading" || block.type === "paragraph" ? block.text : block.items.join("\n")).join("\n") : op.text))).join("\n\n")}`);

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
  let reserved = false;
  let reservedTokens = 0;
  let closeMcp: (() => Promise<void>) | undefined;
  let toolAttempts = 0;
  let toolMode = false;
  let modelTokens = 0;
  const settle = async (tokens: number) => {
    if (!reserved) return;
    await User.updateOne({ _id: userId }, { $inc: { token_balance: reservedTokens - tokens } });
    reserved = false;
  };
  try {
    await getDocumentData(userId, documentId);
    let tokenCount = 0;
    const apiKey = await getOpenRouterKey(userId);
    if (!apiKey) {
    const reservedUser = await User.findOneAndUpdate(
      { _id: userId, token_balance: { $gte: MAX_TOKENS_PER_REQUEST } },
      { $inc: { token_balance: -MAX_TOKENS_PER_REQUEST } },
      { new: true }
    );

    if (!reservedUser) {
      throw new AppError(402, "Insufficient token balance");
    }
    reserved = true;
    reservedTokens = MAX_TOKENS_PER_REQUEST;
    }
    const userConfig = await getMcpConfig(userId);
    const config = { mcpServers: { ...userConfig.mcpServers, drwriter_exa: { url: "https://mcp.exa.ai/mcp", displayName: "Exa web search" } } };
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    const finish = async (fullResponse: string, toolCount = 0) => {
      tokenCount = toolMode ? modelTokens : Math.ceil(fullResponse.length / 4);
      await Chat.create({ documentId, prompt: userPrompt, response: fullResponse, toolCount });
      await settle(tokenCount);
      res.write(`data: ${JSON.stringify({ type: "done", usageToken: tokenCount, toolCount })}\n\n`);
      res.end();
    };
    if (Object.keys(config.mcpServers).length) {
      const connection = await connectMcpServers(config);
      closeMcp = connection.close;
      if (connection.unavailable.length) {
        res.write(`data: ${JSON.stringify({ type: "mcp_warning", servers: connection.unavailable })}\n\n`);
      }
      if (connection.tools.length) {
        toolMode = true;
        const result = await openRouterWithTools(userPrompt, modelName, connection.tools, (server, tool, phase) => {
          if (phase === "start") toolAttempts++;
          const settings = config.mcpServers[server as keyof typeof config.mcpServers];
          res.write(`data: ${JSON.stringify({ type: "tool", server, tool, phase, displayName: settings?.displayName, icon: "icon" in (settings || {}) ? (settings as { icon?: string }).icon : undefined })}\n\n`);
        }, (tokens) => {
          modelTokens += tokens;
        }, async (tokens) => {
          if (apiKey) return;
          const additional = modelTokens + tokens - reservedTokens;
          if (additional <= 0) return;
          const user = await User.findOneAndUpdate(
            { _id: userId, token_balance: { $gte: additional } },
            { $inc: { token_balance: -additional } },
            { new: true }
          );
          if (!user) throw new AppError(402, "Insufficient token balance for the next model request.");
          reservedTokens += additional;
        }, (chunk) => res.write(`data: ${JSON.stringify({ chunk })}\n\n`),
        () => res.write(`data: ${JSON.stringify({ type: "reset" })}\n\n`), apiKey);
        // Providers that return JSON despite stream=true have not emitted chunks.
        if (!result.streamed) res.write(`data: ${JSON.stringify({ chunk: result.text })}\n\n`);
        await finish(result.text, result.count);
        return;
      }
    }
    await openRouterStream(
      userPrompt,
      modelName,
      res,
      (text) => {
        res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
      },
      finish,
      apiKey
    );
  } catch (error) {
    console.error("OpenRouter stream error:", error);
    await settle(toolMode ? modelTokens : 0);

    const statusCode = isAppError(error) ? error.statusCode : 500;
    const message = isAppError(error) ? error.message : "LLM stream failed";
    const payload = { error: message, statusCode, retryable: toolAttempts === 0 };

    if (!res.headersSent) {
      res.removeHeader("Content-Type");
      return res.status(statusCode).json(payload);
    }

    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    res.end();
  } finally {
    await closeMcp?.();
  }
};

export const syncDocument = (userId: string, fileId: string, title: string, newContent: unknown, revision: number) =>
  saveTextDocument(userId, fileId, title, newContent, revision);

export const getDocumentChats = async (userId: string, documentId: string) => {
  await getDocumentData(userId, documentId);
  return Chat.find({ documentId }).sort({ createdAt: 1, _id: 1 });
};

export const saveActionHistory = async (userId: string, documentId: string, prompt: string, response: string) => {
  const document = await findDocumentOrThrow(documentId);
  if (!isDocumentOwner(userId, document.user_id)) throw new AppError(403, "Document not found");
  return Chat.create({ documentId, prompt, response });
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
