import { Request, Response, Router } from "express";
import multer from "multer";
import { authenticatedAi, authenticatedRead, authenticatedSave } from "../Middlewares/rateLimits";
import upload, { INVALID_FILE_TYPE_MESSAGE } from "../service/multer";
import { enqueueDocumentUpload } from "../service/documentUploadQueue";
import {
  addUserToDocument,
  createDocumentImageSignature,
  createDocument,
  getDocumentChats,
  getDocumentData,
  getDocumentRole,
  listDocumentMembers,
  removeUserFromDocument,
  deleteDocument,
  setDocumentTags,
  getDocumentList,
  searchDocuments,
  performDocumentAction,
  registerDocumentImage,
  streamUserPrompt,
  syncDocument,
  savePresentation,
  saveActionHistory,
  updateDocument,
} from "../Services/documentService";
import { AppError, isAppError } from "../utils/appError";
import { handleControllerError } from "../utils/controllerErrorHandler";
import {
  addUserSchema,
  actionHistorySchema,
  createDocumentImageSignatureSchema,
  createDocumentSchema,
  documentActionBodySchema,
  documentActionParamsSchema,
  documentIdBodySchema,
  removeUserParamsSchema,
  setTagsSchema,
  getChatsParamsSchema,
  registerDocumentImageSchema,
  syncDocumentSchema,
  savePresentationSchema,
  updateDocumentSchema,
  uploadDocumentImageParamsSchema,
  userPromptSchema,
} from "../validation/documentSchemas";

const requireAuthenticatedUser = (req: Request) => {
  if (!req.user_id) {
    throw new AppError(401, "Pls login to access this endpoint.");
  }

  return req.user_id;
};

const createDocumentHandler = async (req: Request, res: Response) => {
  try {
    const userId = requireAuthenticatedUser(req);
    const { title, kind } = createDocumentSchema.parse(req.body);
    const document = await createDocument(userId, title, kind);
    res.status(200).send({ message: "new document created", document });
  } catch (error) {
    handleControllerError(res, error);
  }
};

const getDocumentListHandler = async (req: Request, res: Response) => {
  try {
    const userId = requireAuthenticatedUser(req);
    const documents = await getDocumentList(userId);
    res.status(200).send({ documents });
  } catch (error) {
    handleControllerError(res, error);
  }
};

const searchDocumentsHandler = async (req: Request, res: Response) => {
  try {
    const userId = requireAuthenticatedUser(req);
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (query.length < 2 || query.length > 200) throw new AppError(400, "Search must be between 2 and 200 characters");
    res.json({ documents: await searchDocuments(userId, query) });
  } catch (error) { handleControllerError(res, error); }
};

const getDocumentDataHandler = async (req: Request, res: Response) => {
  try {
    const userId = requireAuthenticatedUser(req);
    const { file_id } = documentIdBodySchema.parse(req.body);
    const document = await getDocumentData(userId, file_id);
    res.status(200).send({ ...document.toJSON(), role: getDocumentRole(userId, document) });
  } catch (error) {
    handleControllerError(res, error);
  }
};

const updateDocumentHandler = async (req: Request, res: Response) => {
  try {
    const userId = requireAuthenticatedUser(req);
    const { file_id, newContent, title, revision } = updateDocumentSchema.parse(req.body);
    const nextRevision = await updateDocument(userId, file_id, title, newContent, revision);
    res.status(200).json({ revision: nextRevision });
  } catch (error) {
    handleControllerError(res, error);
  }
};

const addUserHandler = async (req: Request, res: Response) => {
  try {
    const userId = requireAuthenticatedUser(req);
    const { file_id, userToAddMail, role } = addUserSchema.parse(req.body);
    await addUserToDocument(userId, file_id, userToAddMail, role);
    res.status(200).send(`user added as ${role}`);
  } catch (error) {
    handleControllerError(res, error);
  }
};

const performDocumentActionHandler = async (req: Request, res: Response) => {
  try {
    const userId = requireAuthenticatedUser(req);
    const { documentId } = documentActionParamsSchema.parse(req.params);
    const { command, content, modelName, outline, deck } = documentActionBodySchema.parse(req.body);
    const stream = req.get("accept")?.includes("text/event-stream") === true;
    if (stream) {
      res.set({ "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" });
      res.flushHeaders();
    }
    const result = await performDocumentAction(userId, documentId, command, content, modelName, outline,
      stream ? status => res.write(`data: ${JSON.stringify({ type: "progress", status })}\n\n`) : undefined,
      stream ? text => res.write(`data: ${JSON.stringify({ type: "preview", text })}\n\n`) : undefined,
      deck);
    if (stream) { res.write(`data: ${JSON.stringify({ type: "result", result })}\n\n`); res.end(); }
    else res.status(200).json(result);
  } catch (error) {
    if (res.headersSent) {
      if (!isAppError(error)) console.error("Unexpected document edit error:", error);
      const message = isAppError(error) ? error.message : "Could not prepare edits. Please try again.";
      res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`); res.end();
    } else handleControllerError(res, error);
  }
};

const userPromptHandler = async (req: Request, res: Response) => {
  try {
    const userId = requireAuthenticatedUser(req);
    const { userPrompt, documentId, modelName } = userPromptSchema.parse(req.body);
    await streamUserPrompt(userId, userPrompt, documentId, modelName, res);
  } catch (error) {
    handleControllerError(res, error);
  }
};

const syncDocumentHandler = async (req: Request, res: Response) => {
  try {
    const userId = requireAuthenticatedUser(req);
    const { file_id, title, newContent, revision } = syncDocumentSchema.parse(req.body);
    const nextRevision = await syncDocument(userId, file_id, title, newContent, revision);
    res.status(200).json({ revision: nextRevision });
  } catch (error) {
    handleControllerError(res, error);
  }
};

const fileUploadHandler = async (req: Request, res: Response) => {
  try {
    const userId = requireAuthenticatedUser(req);
    if (!req.file) {
      throw new AppError(400, "No file uploaded");
    }

    const result = await enqueueDocumentUpload(userId, req.file);
    res.status(202).json(result);
  } catch (error) {
    handleControllerError(res, error);
  }
};

const getChatsHandler = async (req: Request, res: Response) => {
  try {
    const { documentId } = getChatsParamsSchema.parse(req.params);
    const documentChat = await getDocumentChats(requireAuthenticatedUser(req), documentId);
    res.status(200).send({ documentChat });
  } catch (error) {
    handleControllerError(res, error);
  }
};

const createDocumentImageSignatureHandler = async (req: Request, res: Response) => {
  try {
    const userId = requireAuthenticatedUser(req);
    const { documentId } = uploadDocumentImageParamsSchema.parse(req.params);
    const { originalName } = createDocumentImageSignatureSchema.parse(req.body);
    const result = await createDocumentImageSignature(userId, documentId, originalName);
    res.status(200).json(result);
  } catch (error) {
    handleControllerError(res, error);
  }
};

const registerDocumentImageHandler = async (req: Request, res: Response) => {
  try {
    const userId = requireAuthenticatedUser(req);
    const { documentId } = uploadDocumentImageParamsSchema.parse(req.params);
    const image = registerDocumentImageSchema.parse(req.body);
    const result = await registerDocumentImage(userId, documentId, image);
    res.status(200).json(result);
  } catch (error) {
    handleControllerError(res, error);
  }
};

const removeUserHandler = async (req: Request, res: Response) => {
  try {
    const { documentId, userId: targetUserId } = removeUserParamsSchema.parse(req.params);
    await removeUserFromDocument(requireAuthenticatedUser(req), documentId, targetUserId);
    res.status(200).json({ message: "user removed" });
  } catch (error) {
    handleControllerError(res, error);
  }
};

const listMembersHandler = async (req: Request, res: Response) => {
  try {
    const { documentId } = documentActionParamsSchema.parse(req.params);
    res.status(200).json({ members: await listDocumentMembers(requireAuthenticatedUser(req), documentId) });
  } catch (error) {
    handleControllerError(res, error);
  }
};

const deleteDocumentHandler = async (req: Request, res: Response) => {
  try {
    const { documentId } = documentActionParamsSchema.parse(req.params);
    await deleteDocument(requireAuthenticatedUser(req), documentId);
    res.status(200).json({ message: "document deleted" });
  } catch (error) {
    handleControllerError(res, error);
  }
};

const setTagsHandler = async (req: Request, res: Response) => {
  try {
    const { documentId } = documentActionParamsSchema.parse(req.params);
    const { tags } = setTagsSchema.parse(req.body);
    res.status(200).json({ tags: await setDocumentTags(requireAuthenticatedUser(req), documentId, tags) });
  } catch (error) {
    handleControllerError(res, error);
  }
};

export const registerDocumentRoutes = (router: Router) => {
  const presentationUpload = multer({ limits: { fileSize: 6 * 1024 * 1024, files: 1, fields: 0 } }).single("file");
  router.post("/presentationUpload", authenticatedSave, (req, res) => {
    presentationUpload(req, res, async error => {
      try {
        if (error) throw new AppError(error.code === "LIMIT_FILE_SIZE" ? 413 : 400, "Upload one .pptx file up to 6 MiB");
        const file = req.file;
        if (!file || !/\.pptx$/i.test(file.originalname) || file.size < 4 || file.buffer.readUInt32LE(0) !== 0x04034b50) {
          throw new AppError(400, "Expected a PowerPoint .pptx file");
        }
        const { title } = createDocumentSchema.parse({ title: file.originalname.slice(0, -5) || "Presentation" });
        const document = await createDocument(requireAuthenticatedUser(req), title, "presentation", file.buffer.toString("base64"));
        res.status(201).json({ document: { _id: document._id, title, kind: document.kind } });
      } catch (error) { handleControllerError(res, error); }
    });
  });
  router.post("/:documentId/presentation", authenticatedSave, async (req, res) => {
    try {
      const { pptx, revision, title } = savePresentationSchema.parse(req.body);
      const { documentId } = documentActionParamsSchema.parse(req.params);
      const nextRevision = await savePresentation(requireAuthenticatedUser(req), documentId, revision, pptx, title);
      res.json({ revision: nextRevision });
    } catch (error) { handleControllerError(res, error); }
  });
  router.post("/createDocument", authenticatedSave, createDocumentHandler);
  router.get("/documentList", authenticatedRead, getDocumentListHandler);
  router.get("/search", authenticatedRead, searchDocumentsHandler);
  router.post("/documentData", authenticatedRead, getDocumentDataHandler);
  router.post("/documentUpdate", authenticatedSave, updateDocumentHandler);
  router.post("/adduser", authenticatedSave, addUserHandler);
  router.get("/:documentId/members", authenticatedRead, listMembersHandler);
  router.delete("/:documentId/users/:userId", authenticatedSave, removeUserHandler);
  router.put("/:documentId/tags", authenticatedSave, setTagsHandler);
  router.delete("/:documentId", authenticatedSave, deleteDocumentHandler);
  router.post(
    "/actions/:documentId",
    authenticatedAi,
    performDocumentActionHandler
  );
  router.post("/actions/:documentId/history", authenticatedSave, async (req, res) => {
    try {
      const { documentId } = documentActionParamsSchema.parse(req.params);
      const { prompt, response } = actionHistorySchema.parse(req.body);
      const chat = await saveActionHistory(requireAuthenticatedUser(req), documentId, prompt, response);
      res.status(201).json({ chat });
    } catch (error) { handleControllerError(res, error); }
  });
  router.post(
    "/userprompt",
    authenticatedAi,
    userPromptHandler
  );
  router.post("/syncDocument", authenticatedSave, syncDocumentHandler);
  router.post(
    "/fileUpload",
    authenticatedSave,
    (req, res, next) =>
      upload.single("file")(req, res, error => {
        if (!error) return next();
        // Multer errors are not AppErrors. Only known codes get a message; anything else (disk full,
        // bad permissions) can carry server paths, so it is logged and the client gets a fixed message.
        if (error.code === "LIMIT_FILE_SIZE") return handleControllerError(res, new AppError(413, "File is too large. Upload a .docx up to 10 MiB."));
        if (error.code === "INVALID_FILE_TYPE") return handleControllerError(res, new AppError(400, INVALID_FILE_TYPE_MESSAGE));
        console.error("Document upload failed before queueing:", error);
        handleControllerError(res, new AppError(error instanceof multer.MulterError ? 400 : 500, "Upload failed. Please try again."));
      }),
    fileUploadHandler
  );
  router.post(
    "/:documentId/images/sign",
    authenticatedSave,
    createDocumentImageSignatureHandler
  );
  router.post(
    "/:documentId/images/register",
    authenticatedSave,
    registerDocumentImageHandler
  );
  router.get("/getChats/:documentId", authenticatedRead, getChatsHandler);
};
