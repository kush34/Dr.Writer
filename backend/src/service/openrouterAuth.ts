import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import User from "../Models/userModel";
import { AppError } from "../utils/appError";

function encryptionKey() {
  const value = process.env.MCP_ENCRYPTION_KEY || "";
  if (!/^[a-f\d]{64}$/i.test(value)) throw new AppError(503, "Credential encryption is not configured on the server.");
  return Buffer.from(value, "hex");
}

export async function saveOpenRouterKey(userId: string, key: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(`openrouter:${userId}`));
  const encrypted = Buffer.concat([cipher.update(key, "utf8"), cipher.final()]);
  await User.updateOne({ _id: userId }, { $set: { openrouter_key: [iv, cipher.getAuthTag(), encrypted].map(v => v.toString("base64")).join(".") } });
}

export async function getOpenRouterKey(userId: string): Promise<string | undefined> {
  const user = await User.findById(userId).select("+openrouter_key");
  if (!user) throw new AppError(404, "User not found.");
  if (!user.openrouter_key) return undefined;
  const [iv, tag, data] = user.openrouter_key.split(".").map(v => Buffer.from(v, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAAD(Buffer.from(`openrouter:${userId}`));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
