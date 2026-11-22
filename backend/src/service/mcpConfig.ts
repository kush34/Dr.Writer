import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { z } from "zod";
import User from "../Models/userModel";
import { AppError } from "../utils/appError";

export const mcpConfigSchema = z.object({
  mcpServers: z.record(z.string().min(1).max(80), z.object({
    url: z.string().url().max(2048).refine((value) => { try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; } }, "Use an HTTPS URL without embedded credentials"),
    headers: z.record(z.string().max(4096)).optional(),
  }).strict()).refine((servers) => Object.keys(servers).length <= 20, "At most 20 servers are allowed"),
}).strict();

export type McpConfig = z.infer<typeof mcpConfigSchema>;

function encryptionKey(): Buffer {
  const key = process.env.MCP_ENCRYPTION_KEY || "";
  if (!/^[a-fA-F0-9]{64}$/.test(key)) throw new AppError(503, "MCP encryption is not configured on the server.");
  return Buffer.from(key, "hex");
}

function encryptConfig(userId: string, config: McpConfig) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(userId));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(config), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64")).join(".");
}

async function readConfig(userId: string) {
  const user = await User.findById(userId).select("+mcp_config");
  if (!user) throw new AppError(404, "User not found.");
  if (!user.mcp_config) return { config: { mcpServers: {} } as McpConfig, ciphertext: user.mcp_config };
  const [iv, tag, data] = user.mcp_config.split(".").map((part) => Buffer.from(part, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAAD(Buffer.from(userId));
  decipher.setAuthTag(tag);
  return { config: mcpConfigSchema.parse(JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8"))), ciphertext: user.mcp_config };
}

export async function getMcpConfig(userId: string): Promise<McpConfig> {
  return (await readConfig(userId)).config;
}

export async function updateMcpConfig(userId: string, update: (config: McpConfig) => McpConfig, attempts = 10) {
  for (let i = 0; i < attempts; i++) {
    const { config, ciphertext } = await readConfig(userId);
    const next = mcpConfigSchema.parse(update(config));
    const result = await User.updateOne(
      { _id: userId, mcp_config: ciphertext === undefined ? { $exists: false } : ciphertext },
      { $set: { mcp_config: encryptConfig(userId, next) } }
    );
    if (result.matchedCount) return;
  }
  throw new AppError(409, "MCP settings changed concurrently. Please try again.");
}
