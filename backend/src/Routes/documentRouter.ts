import { Router } from "express";
import { registerDocumentRoutes } from "../Controllers/documentController";

const documentRouter = Router();

registerDocumentRoutes(documentRouter);

export default documentRouter;
