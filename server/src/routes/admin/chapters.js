import { Router } from "express";
import pool from "../../db.js";
import { parseId } from "../../utils/chapterHelpers.js";

const router = Router();

const MAX_CONTENT_LENGTH = 200000;
const MAX_BULK_CHAPTERS = 200;

// Checks only the fields that were sent. Returns { values } or { error }.
function checkChapterFields(input) {
  const values = {};

  if (input.number !== undefined) {
    if (!Number.isInteger(input.number) || input.number < 1 || input.number > 10000) {
      return { error: "Chapter number must be a whole number from 1 to 10000" };
    }
    values.number = input.number;
  }

  if (input.title !== undefined) {
    if (
      typeof input.title !== "string" ||
      input.title.trim().length < 1 ||
      input.title.trim().length > 200
    ) {
      return { error: "Title must be between 1 and 200 characters" };
    }
    values.title = input.title.trim();
  }

  if (input.content !== undefined) {
    if (
      typeof input.content !== "string" ||
      input.content.trim().length < 1 ||
      input.content.length > MAX_CONTENT_LENGTH
    ) {
      return { error: `Content must be between 1 and ${MAX_CONTENT_LENGTH} characters` };
    }
    values.content = input.content.trim();
  }

  if (input.published !== undefined) {
    if (typeof input.published !== "boolean") {
      return { error: "Published must be true or false" };
    }
    values.published = input.published;
  }

  return { values };
}

function checkRequired(input) {
  for (const field of ["number", "title", "content"]) {
    if (input[field] === undefined) {
      return `${field} is required`;
    }
  }
  return null;
}

// GET /api/admin/chapters/:id — full chapter, drafts included
router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid chapter id" });
  }

  try {
    const result = await pool.query(`SELECT * FROM chapters WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Chapter not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load chapter" });
  }
});

// POST /api/admin/chapters — create one chapter (starts unpublished)
router.post("/", async (req, res) => {
  const input = req.body ?? {};

  const storyId = parseId(input.story_id);
  if (!storyId) {
    return res.status(400).json({ message: "A valid story_id is required" });
  }

  const missing = checkRequired(input);
  if (missing) {
    return res.status(400).json({ message: missing });
  }

  const { values, error } = checkChapterFields(input);
  if (error) {
    return res.status(400).json({ message: error });
  }

  try {
    const result = await pool.query(
      `INSERT INTO chapters (story_id, number, title, content, published)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [storyId, values.number, values.title, values.content, values.published ?? false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: `Chapter ${values.number} already exists in this story` });
    }
    if (err.code === "23503") {
      return res.status(404).json({ message: "Story not found" });
    }
    console.error(err);
    res.status(500).json({ message: "Could not create chapter" });
  }
});

// POST /api/admin/chapters/bulk — create or update many chapters at once
router.post("/bulk", async (req, res) => {
  const input = req.body ?? {};

  const storyId = parseId(input.story_id);
  if (!storyId) {
    return res.status(400).json({ message: "A valid story_id is required" });
  }

  if (input.published !== undefined && typeof input.published !== "boolean") {
    return res.status(400).json({ message: "Published must be true or false" });
  }

  const chapters = input.chapters;
  if (!Array.isArray(chapters) || chapters.length === 0 || chapters.length > MAX_BULK_CHAPTERS) {
    return res.status(400).json({
      message: `chapters must be a list of 1 to ${MAX_BULK_CHAPTERS} chapters`,
    });
  }

  const cleaned = [];
  const seenNumbers = new Set();

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i] ?? {};
    const position = `Chapter at position ${i + 1}`;

    const missing = checkRequired(chapter);
    if (missing) {
      return res.status(400).json({ message: `${position}: ${missing}` });
    }

    const { values, error } = checkChapterFields({
      number: chapter.number,
      title: chapter.title,
      content: chapter.content,
    });
    if (error) {
      return res.status(400).json({ message: `${position}: ${error}` });
    }

    if (seenNumbers.has(values.number)) {
      return res.status(400).json({ message: `Chapter ${values.number} appears twice in this upload` });
    }
    seenNumbers.add(values.number);
    cleaned.push(values);
  }

  const publishedParam = input.published ?? null;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const storyResult = await client.query(`SELECT id FROM stories WHERE id = $1`, [storyId]);
    if (storyResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Story not found" });
    }

    for (const chapter of cleaned) {
      await client.query(
        `INSERT INTO chapters (story_id, number, title, content, published)
         VALUES ($1, $2, $3, $4, COALESCE($5::boolean, false))
         ON CONFLICT (story_id, number)
         DO UPDATE SET
           title = EXCLUDED.title,
           content = EXCLUDED.content,
           published = COALESCE($5::boolean, chapters.published)`,
        [storyId, chapter.number, chapter.title, chapter.content, publishedParam]
      );
    }

    await client.query("COMMIT");
    res.json({ message: `Saved ${cleaned.length} chapters` });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Could not save chapters. Nothing was changed." });
  } finally {
    client.release();
  }
});

// PATCH /api/admin/chapters/:id — edit number, title, content or published
router.patch("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid chapter id" });
  }

  const { values, error } = checkChapterFields(req.body ?? {});
  if (error) {
    return res.status(400).json({ message: error });
  }

  const fields = Object.keys(values);
  if (fields.length === 0) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(", ");
  const params = fields.map((field) => values[field]);
  params.push(id);

  try {
    const result = await pool.query(
      `UPDATE chapters SET ${setClause} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Chapter not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Another chapter in this story already has that number" });
    }
    console.error(err);
    res.status(500).json({ message: "Could not update chapter" });
  }
});

// DELETE /api/admin/chapters/:id — also deletes its comments and reactions
router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid chapter id" });
  }

  try {
    const result = await pool.query(`DELETE FROM chapters WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Chapter not found" });
    }
    res.json({ message: "Chapter deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not delete chapter" });
  }
});

export default router;