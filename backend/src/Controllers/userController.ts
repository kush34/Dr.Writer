import { Request, Response, Router } from "express";
import firebaseTokenVerify from "../Middlewares/firebaseTokenVerify";
import { getUserProfile, verifyFirebaseTokenAndEnsureUser } from "../Services/userService";
import { handleControllerError } from "../utils/controllerErrorHandler";
import { AppError } from "../utils/appError";
import { firebaseTokenSchema } from "../validation/userSchemas";

const requireAuthenticatedUser = (req: Request) => {
  if (!req.user_id) {
    throw new AppError(401, "Unauthorized");
  }

  return req.user_id;
};

const healthCheck = (_req: Request, res: Response) => {
  res.send("hello from backend ....");
};

const firebaseTokenVerifyHandler = async (req: Request, res: Response) => {
  try {
    const { token } = firebaseTokenSchema.parse(req.body);
    const { decodedToken } = await verifyFirebaseTokenAndEnsureUser(token);
    res.status(200).send(decodedToken);
  } catch (error) {
    handleControllerError(res, error);
  }
};

const getUserHandler = async (req: Request, res: Response) => {
  try {
    const userId = requireAuthenticatedUser(req);
    const user = await getUserProfile(userId);
    res.status(200).send(user);
  } catch (error) {
    handleControllerError(res, error);
  }
};

export const registerUserRoutes = (router: Router) => {
  router.get("/", healthCheck);
  router.post("/firebaseTokenVerify", firebaseTokenVerifyHandler);
  router.get("/user", firebaseTokenVerify, getUserHandler);
};
