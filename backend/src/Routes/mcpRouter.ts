import { Router } from "express";
import { z } from "zod";
import { AppError } from "../utils/appError";
import firebaseTokenVerify from "../Middlewares/firebaseTokenVerify";
import { limitByMethod } from "../Middlewares/rateLimits";
import { getMcpConfig, mcpConfigSchema, updateMcpConfig } from "../service/mcpConfig";
import { handleControllerError } from "../utils/controllerErrorHandler";

const router = Router();
router.use(firebaseTokenVerify, limitByMethod);

// Only server names are returned; credentials are never sent back.
router.get("/", async (req, res) => {
  try {
    const config = await getMcpConfig(req.user_id!);
    res.set("Cache-Control", "no-store").json({ servers: Object.keys(config.mcpServers), serverDetails: Object.fromEntries(Object.entries(config.mcpServers).map(([name, server]) => [name, { displayName: server.displayName, icon: server.icon }])) });
  } catch (error) { handleControllerError(res, error); }
});

router.put("/", async (req, res) => {
  try {
    const config = mcpConfigSchema.parse(req.body);
    await updateMcpConfig(req.user_id!, () => config, 1);
    res.set("Cache-Control", "no-store").json({ saved: true });
  } catch (error) { handleControllerError(res, error); }
});

router.put("/:name", async (req, res) => {
  try {
    await updateMcpConfig(req.user_id!, (config) => ({ mcpServers: { ...config.mcpServers, [req.params.name]: { displayName: config.mcpServers[req.params.name]?.displayName, icon: config.mcpServers[req.params.name]?.icon, ...req.body } } }));
    res.set("Cache-Control", "no-store").json({ saved: true });
  } catch (error) { handleControllerError(res, error); }
});

router.patch("/:name/appearance", async (req, res) => {
  try {
    const appearance = z.object({ displayName: z.string().trim().max(80).optional(), icon: z.enum(["github", "googledrive", "linear", "notion"]).optional() }).strict().parse(req.body);
    await updateMcpConfig(req.user_id!, (config) => {
      const server = config.mcpServers[req.params.name];
      if (!server) throw new AppError(404, "MCP server not found");
      config.mcpServers[req.params.name] = { ...server, displayName: appearance.displayName || undefined, icon: appearance.icon };
      return config;
    });
    res.set("Cache-Control", "no-store").json({ saved: true });
  } catch (error) { handleControllerError(res, error); }
});

router.delete("/:name", async (req, res) => {
  try {
    await updateMcpConfig(req.user_id!, (config) => {
      delete config.mcpServers[req.params.name];
      return config;
    });
    res.set("Cache-Control", "no-store").json({ deleted: true });
  } catch (error) { handleControllerError(res, error); }
});

export default router;
