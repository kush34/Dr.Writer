import { DecodedIdToken } from "firebase-admin/auth";
import admin from "../Config/firebaseConfig";
import User from "../Models/userModel";
import { AppError } from "../utils/appError";
import { USER_TOKEN_ALLOWANCE } from "../Config/llm";

const ensureUserRecord = async (decodedToken: DecodedIdToken) => {
  const email = decodedToken.email;
  if (!email) {
    throw new AppError(400, "Token is missing the user email");
  }

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name: decodedToken.name,
      email,
    });
  } else {
    // Increase old allowances once while preserving each account's usage.
    await User.updateOne(
      { _id: user._id, $or: [{ token_allowance_version: { $exists: false } }, { token_allowance_version: { $lt: 3 } }] },
      [{ $set: {
        token_balance: { $min: [USER_TOKEN_ALLOWANCE, { $add: [{ $ifNull: ["$token_balance", 0] }, { $subtract: [USER_TOKEN_ALLOWANCE, { $cond: [{ $eq: [{ $ifNull: ["$token_allowance_version", 1] }, 1] }, 10_000, 50_000] }] }] }] },
        token_allowance_version: 3,
      } }]
    );
  }

  return user;
};

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isTransientFirebaseError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("EAI_AGAIN") ||
    error.message.includes("ENOTFOUND") ||
    error.message.includes("ECONNRESET") ||
    error.message.includes("ETIMEDOUT")
  );
};

const verifyFirebaseToken = async (token: string, retries = 1) => {
  try {
    return await admin.auth().verifyIdToken(token);
  } catch (error) {
    if (retries > 0 && isTransientFirebaseError(error)) {
      await delay(300);
      return verifyFirebaseToken(token, retries - 1);
    }

    throw error;
  }
};

export const verifyFirebaseTokenAndEnsureUser = async (token: string) => {
  try {
    const decodedToken = await verifyFirebaseToken(token);
    const user = await ensureUserRecord(decodedToken);

    return { decodedToken, user };
  } catch (error) {
    console.error(error);

    if (isTransientFirebaseError(error)) {
      throw new AppError(
        503,
        "Firebase auth is temporarily unavailable. Please try again."
      );
    }

    throw new AppError(401, "Invalid token");
  }
};

export const getUserProfile = async (userId: string) => {
  const user = await User.findById(userId).select("email name token_balance");

  if (!user) {
    throw new AppError(404, "Could not get user");
  }

  return user;
};
