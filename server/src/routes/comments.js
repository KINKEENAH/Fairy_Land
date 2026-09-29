import { Router } from "express";
import pool from "../db.js";
import { parseId, findPublishedChapter } from "../utils/chapterHelpers.js";

const router = Router({ mergeParams: true });

// GET /api/chapters/:chapterId/comments — approved comments only
router.get("/", async (req, res) => {
  const chapterId = parseId(req.params.chapterId);
  if (!chapterId) {
    return res.status(400).json({ message: "Invalid chapter id" });
  }

  try {
    const chapter = await findPublishedChapter(chapterId);
    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    const result = await pool.query(
      `SELECT id, display_name, body, created_at
       FROM comments
       WHERE chapter_id = $1 AND approved = true
       ORDER BY created_at ASC`,
      [chapterId],
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load comments" });
  }
});

// POST /api/chapters/:chapterId/comments — submit a comment for approval
router.post("/", async (req, res) => {
  const chapterId = parseId(req.params.chapterId);
  if (!chapterId) {
    return res.status(400).json({ message: "Invalid chapter id" });
  }

  const displayName =
    typeof req.body.display_name === "string"
      ? req.body.display_name.trim()
      : "";
  const body = typeof req.body.body === "string" ? req.body.body.trim() : "";

  if (displayName.length < 1 || displayName.length > 50) {
    return res
      .status(400)
      .json({ message: "Name must be between 1 and 50 characters" });
  }
  if (body.length < 1 || body.length > 2000) {
    return res
      .status(400)
      .json({ message: "Comment must be between 1 and 2000 characters" });
  }

  try {
    const chapter = await findPublishedChapter(chapterId);
    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    await pool.query(
      `INSERT INTO comments (chapter_id, display_name, body)
       VALUES ($1, $2, $3)`,
      [chapterId, displayName, body],
    );

    res.status(201).json({
      message: "Thank you! Your comment will appear once it has been approved.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not submit comment" });
  }
});

export default router;
