import User from "../Models/userModel";
import { saveOpenRouterKey } from "../service/openrouterAuth";
import { z } from "zod";
import { Request, Response, Router } from "express";
import { authenticatedRead, authenticatedSave } from "../Middlewares/rateLimits";
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
  router.get("/user", authenticatedRead, getUserHandler);
  router.get("/openrouter", authenticatedRead, async (req, res) => {
    try {
      const user = await User.findById(requireAuthenticatedUser(req)).select("+openrouter_key");
      if (!user) throw new AppError(404, "User not found.");
      res.set("Cache-Control", "no-store").json({ connected: !!user.openrouter_key });
    } catch (error) { handleControllerError(res, error); }
  });
  router.post("/openrouter", authenticatedSave, async (req, res) => {
    try {
      const { code, verifier } = z.object({ code: z.string().min(1).max(2048), verifier: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/) }).strict().parse(req.body);
      const response = await fetch("https://openrouter.ai/api/v1/auth/keys", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: "S256" }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new AppError(502, "OpenRouter authorization failed. Please try connecting again.");
      const data = await response.json();
      if (typeof data.key !== "string" || !data.key.startsWith("sk-or-")) throw new AppError(502, "OpenRouter returned an invalid credential.");
      await saveOpenRouterKey(requireAuthenticatedUser(req), data.key);
      res.set("Cache-Control", "no-store").json({ connected: true });
    } catch (error) { handleControllerError(res, error); }
  });
  router.delete("/openrouter", authenticatedSave, async (req, res) => {
    try {
      await User.updateOne({ _id: requireAuthenticatedUser(req) }, { $unset: { openrouter_key: 1 } });
      res.set("Cache-Control", "no-store").json({ connected: false });
    } catch (error) { handleControllerError(res, error); }
  });
};
