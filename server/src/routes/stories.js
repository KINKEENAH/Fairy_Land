import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET /api/stories — all published stories (the library page)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, slug, blurb, cover_url, created_at
       FROM stories
       WHERE status = 'published'
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load stories" });
  }
});

// GET /api/stories/:slug — one story with its chapter list
router.get("/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    const storyResult = await pool.query(
      `SELECT id, title, slug, blurb, cover_url, created_at
       FROM stories
       WHERE slug = $1 AND status = 'published'`,
      [slug]
    );

    if (storyResult.rows.length === 0) {
      return res.status(404).json({ message: "Story not found" });
    }

    const story = storyResult.rows[0];

    const chaptersResult = await pool.query(
      `SELECT id, number, title
       FROM chapters
       WHERE story_id = $1 AND published = true
       ORDER BY number`,
      [story.id]
    );

    res.json({ ...story, chapters: chaptersResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load story" });
  }
});

export default router;