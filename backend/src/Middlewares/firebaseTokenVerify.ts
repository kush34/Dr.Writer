import { NextFunction, Request, Response } from "express";
import { verifyFirebaseTokenAndEnsureUser } from "../Services/userService";

const firebaseTokenVerify = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idToken = req.headers.authorization?.split(" ")[1];
    // console.log("MIDDLEWARE:idToken",idToken)
    if (!idToken) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const { decodedToken, user } = await verifyFirebaseTokenAndEnsureUser(idToken);

    req.user = decodedToken.email;
    req.user_id = user._id.toString();

    next();
  } catch (error) {
    console.error(error);

    if (error instanceof Error && "statusCode" in error) {
      const appError = error as Error & { statusCode: number };
      return res.status(appError.statusCode).send({ error: appError.message });
    }

    return res.status(500).send({ error: "Authentication failed" });
  }
};

export default firebaseTokenVerify;
