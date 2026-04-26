import { Request, Response, Router } from "express";
import rateLimit from "express-rate-limit";
import firebaseTokenVerify from "../Middlewares/firebaseTokenVerify";
import upload from "../service/multer";
import { MAX_TOKENS_PER_REQUEST } from "../Config/llm";
import {
  addUserToDocument,
  createDocumentImageSignature,
  createDocument,
  getDocumentChats,
  getDocumentData,
  getDocumentList,
  getTestDocument,
  performDocumentAction,
  registerDocumentImage,
  streamUserPrompt,
  syncDocument,
  updateDocument,
  uploadDocumentFile,
} from "../Services/documentService";
import { AppError } from "../utils/appError";
import { handleControllerError } from "../utils/controllerErrorHandler";
import {
  addUserSchema,
  createDocumentImageSignatureSchema,
  createDocumentSchema,
  documentActionBodySchema,
  documentActionParamsSchema,
  documentIdBodySchema,
  getChatsParamsSchema,
  registerDocumentImageSchema,
  syncDocumentSchema,
  updateDocumentSchema,
  uploadDocumentImageParamsSchema,
  userPromptSchema,
} from "../validation/documentSchemas";

const geminiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: "reached your limit... pls try again later",
});

const requireAuthenticatedUser = (req: Request) => {
  if (!req.user_id) {
    throw new AppError(401, "Pls login to access this endpoint.");
  }

  return req.user_id;
};

const getDocHandler = async (_req: Request, res: Response) => {
  try {
    const document = await getTestDocument();
    res.status(200).send({ message: "success", document });
  } catch (error) {
    handleControllerError(res, error);
  }
};

const createDocumentHandler = async (req: Request, res: Response) => {
  try {
    const userId = requireAuthenticatedUser(req);
    const { title } = createDocumentSchema.parse(req.body);
    const document = await createDocument(userId, title);
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

const getDocumentDataHandler = async (req: Request, res: Response) => {
  try {
    const userId = requireAuthenticatedUser(req);
    const { file_id } = documentIdBodySchema.parse(req.body);
    const document = await getDocumentData(userId, file_id);
    res.status(200).send(document);
  } catch (error) {
    handleControllerError(res, error);
  }
};

const updateDocumentHandler = async (req: Request, res: Response) => {
  try {
    const userId = requireAuthenticatedUser(req);
    const { file_id, newContent, title } = updateDocumentSchema.parse(req.body);
    const document = await updateDocument(userId, file_id, title, newContent);
    res.status(200).send(document);
  } catch (error) {
    handleControllerError(res, error);
  }
};

const addUserHandler = async (req: Request, res: Response) => {
  try {
    const userId = requireAuthenticatedUser(req);
    const { file_id, userToAddMail } = addUserSchema.parse(req.body);
    await addUserToDocument(userId, file_id, userToAddMail);
    res.status(200).send("users added to view document...");
  } catch (error) {
    handleControllerError(res, error);
  }
};

const performDocumentActionHandler = async (req: Request, res: Response) => {
  try {
    const userId = requireAuthenticatedUser(req);
    const { documentId } = documentActionParamsSchema.parse(req.params);
    const { command } = documentActionBodySchema.parse(req.body);
    const result = await performDocumentAction(userId, documentId, command);
    res.status(200).json(result);
  } catch (error) {
    handleControllerError(res, error);
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
    const { file_id, title, newContent } = syncDocumentSchema.parse(req.body);
    await syncDocument(userId, file_id, title, newContent);
    res.status(200).send("document synced");
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

    const result = await uploadDocumentFile(userId, req.file);
    res.status(200).json(result);
  } catch (error) {
    handleControllerError(res, error);
  }
};

const getChatsHandler = async (req: Request, res: Response) => {
  try {
    const { documentId } = getChatsParamsSchema.parse(req.params);
    const documentChat = await getDocumentChats(documentId);
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

export const registerDocumentRoutes = (router: Router) => {
  router.get("/getDoc", getDocHandler);
  router.post("/createDocument", firebaseTokenVerify, createDocumentHandler);
  router.get("/documentList", firebaseTokenVerify, getDocumentListHandler);
  router.post("/documentData", firebaseTokenVerify, getDocumentDataHandler);
  router.post("/documentUpdate", firebaseTokenVerify, updateDocumentHandler);
  router.post("/adduser", firebaseTokenVerify, addUserHandler);
  router.post(
    "/actions/:documentId",
    firebaseTokenVerify,
    performDocumentActionHandler
  );
  router.post(
    "/userprompt",
    geminiLimiter,
    firebaseTokenVerify,
    userPromptHandler
  );
  router.post("/syncDocument", firebaseTokenVerify, syncDocumentHandler);
  router.post(
    "/fileUpload",
    firebaseTokenVerify,
    upload.single("file"),
    fileUploadHandler
  );
  router.post(
    "/:documentId/images/sign",
    firebaseTokenVerify,
    createDocumentImageSignatureHandler
  );
  router.post(
    "/:documentId/images/register",
    firebaseTokenVerify,
    registerDocumentImageHandler
  );
  router.get("/getChats/:documentId", firebaseTokenVerify, getChatsHandler);
};
