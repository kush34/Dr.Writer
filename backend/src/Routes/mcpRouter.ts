import { Router } from "express";
import firebaseTokenVerify from "../Middlewares/firebaseTokenVerify";
import { getMcpConfig, mcpConfigSchema, updateMcpConfig } from "../service/mcpConfig";
import { handleControllerError } from "../utils/controllerErrorHandler";

const router = Router();
router.use(firebaseTokenVerify);

// Only server names are returned; credentials are never sent back.
router.get("/", async (req, res) => {
  try {
    const config = await getMcpConfig(req.user_id!);
    res.set("Cache-Control", "no-store").json({ servers: Object.keys(config.mcpServers) });
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
    await updateMcpConfig(req.user_id!, (config) => ({ mcpServers: { ...config.mcpServers, [req.params.name]: req.body } }));
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
