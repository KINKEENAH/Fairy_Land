import { Router } from "express";
import requireAdmin from "../../middleware/requireAdmin.js";
import adminStoriesRouter from "./stories.js";
import adminImportRouter from "./import.js";
import adminCommentsRouter from "./comments.js";
import adminCoversRouter from "./covers.js";
import adminChaptersRouter from "./chapters.js";

const router = Router();

router.use(requireAdmin);
router.use("/chapters", adminChaptersRouter);
router.use("/import", adminImportRouter);
router.use("/comments", adminCommentsRouter);
router.use("/stories/:id/cover", adminCoversRouter);

// GET /api/admin/check — confirms the token works
router.get("/check", (req, res) => {
  res.json({ ok: true });
});

router.use("/stories", adminStoriesRouter);

export default router;