import { Router } from "express";
import pool from "../../db.js";
import { parseId } from "../../utils/chapterHelpers.js";

const router = Router();

const STORY_STATUSES = ["draft", "published"];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Checks only the fields that were sent, so it works for both create and edit.
// Returns { values } if everything is valid, or { error } with a message.
function checkStoryFields(input) {
  const values = {};

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

  if (input.slug !== undefined) {
    if (
      typeof input.slug !== "string" ||
      input.slug.length > 100 ||
      !SLUG_PATTERN.test(input.slug)
    ) {
      return { error: "Slug may only contain lowercase letters, numbers and single hyphens" };
    }
    values.slug = input.slug;
  }

  if (input.blurb !== undefined) {
    if (input.blurb !== null && (typeof input.blurb !== "string" )) {
      return { error: "Blurb must be a text" };
    }
    values.blurb = input.blurb === null ? null : input.blurb.trim() || null;
  }

  if (input.cover_url !== undefined) {
    if (
      input.cover_url !== null &&
      (typeof input.cover_url !== "string" || !/^https?:\/\/\S+$/.test(input.cover_url))
    ) {
      return { error: "Cover URL must start with http:// or https://" };
    }
    values.cover_url = input.cover_url;
  }

  if (input.status !== undefined) {
    if (!STORY_STATUSES.includes(input.status)) {
      return { error: "Status must be draft or published" };
    }
    values.status = input.status;
  }

  return { values };
}

// GET /api/admin/stories — every story, drafts included, with chapter counts
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.title, s.slug, s.status, s.created_at,
              COUNT(c.id)::int AS chapter_count,
              COUNT(c.id) FILTER (WHERE c.published)::int AS published_count
       FROM stories s
       LEFT JOIN chapters c ON c.story_id = s.id
       GROUP BY s.id
       ORDER BY s.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load stories" });
  }
});

// GET /api/admin/stories/:id — one story with ALL its chapters
router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid story id" });
  }

  try {
    const storyResult = await pool.query(`SELECT * FROM stories WHERE id = $1`, [id]);
    if (storyResult.rows.length === 0) {
      return res.status(404).json({ message: "Story not found" });
    }

    const chaptersResult = await pool.query(
      `SELECT id, number, title, published, created_at
       FROM chapters
       WHERE story_id = $1
       ORDER BY number`,
      [id]
    );

    res.json({ ...storyResult.rows[0], chapters: chaptersResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load story" });
  }
});

// POST /api/admin/stories — create a story (starts as a draft)
router.post("/", async (req, res) => {
  const input = req.body ?? {};

  if (input.title === undefined) {
    return res.status(400).json({ message: "Title is required" });
  }

  const slug =
    input.slug ?? (typeof input.title === "string" ? slugify(input.title) : "");

  const { values, error } = checkStoryFields({ ...input, slug });
  if (error) {
    return res.status(400).json({ message: error });
  }

  try {
    const result = await pool.query(
      `INSERT INTO stories (title, slug, blurb, cover_url, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        values.title,
        values.slug,
        values.blurb ?? null,
        values.cover_url ?? null,
        values.status ?? "draft",
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "A story with this slug already exists" });
    }
    console.error(err);
    res.status(500).json({ message: "Could not create story" });
  }
});

// PATCH /api/admin/stories/:id — edit any of the fields (including status)
router.patch("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid story id" });
  }

  const { values, error } = checkStoryFields(req.body ?? {});
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
      `UPDATE stories SET ${setClause} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Story not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "A story with this slug already exists" });
    }
    console.error(err);
    res.status(500).json({ message: "Could not update story" });
  }
});

// DELETE /api/admin/stories/:id — deletes the story AND its chapters, comments, reactions
router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid story id" });
  }

  try {
    const result = await pool.query(`DELETE FROM stories WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Story not found" });
    }
    res.json({ message: "Story deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not delete story" });
  }
});

export default router;