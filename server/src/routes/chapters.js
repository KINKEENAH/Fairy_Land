import { Router } from "express";
import pool from "../db.js";

const router = Router({ mergeParams: true });

// GET /api/stories/:slug/chapters/:number — one chapter with prev/next
router.get("/:number", async (req, res) => {
  const { slug } = req.params;
  const number = Number(req.params.number);

  if (!Number.isInteger(number) || number < 1) {
    return res.status(400).json({ message: "Invalid chapter number" });
  }

  try {
    const chapterResult = await pool.query(
      `SELECT c.id, c.story_id, c.number, c.title, c.content, c.created_at,
              s.title AS story_title, s.slug AS story_slug
       FROM chapters c
       JOIN stories s ON s.id = c.story_id
       WHERE s.slug = $1 AND s.status = 'published'
         AND c.number = $2 AND c.published = true`,
      [slug, number]
    );

    if (chapterResult.rows.length === 0) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    const chapter = chapterResult.rows[0];

    const navResult = await pool.query(
      `SELECT
         (SELECT MAX(number) FROM chapters
          WHERE story_id = $1 AND published = true AND number < $2) AS prev,
         (SELECT MIN(number) FROM chapters
          WHERE story_id = $1 AND published = true AND number > $2) AS next`,
      [chapter.story_id, chapter.number]
    );

    res.json({
      ...chapter,
      prev: navResult.rows[0].prev,
      next: navResult.rows[0].next,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load chapter" });
  }
});

export default router;