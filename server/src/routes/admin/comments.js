import { Router } from "express";
import pool from "../../db.js";
import { parseId } from "../../utils/chapterHelpers.js";

const router = Router();

const PAGE_SIZE = 50;
const MAX_BULK_IDS = 100;

const STATUS_FILTERS = {
  pending: "WHERE cm.approved = false",
  approved: "WHERE cm.approved = true",
  all: "",
};

// GET /api/admin/comments?status=pending&page=1
router.get("/", async (req, res) => {
  const status = req.query.status ?? "pending";
  if (!Object.hasOwn(STATUS_FILTERS, status)) {
    return res.status(400).json({ message: "Status must be pending, approved or all" });
  }

  const page = parseId(req.query.page ?? 1);
  if (!page) {
    return res.status(400).json({ message: "Invalid page number" });
  }

  try {
    const result = await pool.query(
      `SELECT cm.id, cm.display_name, cm.body, cm.approved, cm.created_at,
              c.id AS chapter_id, c.number AS chapter_number, c.title AS chapter_title,
              s.id AS story_id, s.title AS story_title
       FROM comments cm
       JOIN chapters c ON c.id = cm.chapter_id
       JOIN stories s ON s.id = c.story_id
       ${STATUS_FILTERS[status]}
       ORDER BY cm.created_at DESC
       LIMIT $1 OFFSET $2`,
      [PAGE_SIZE + 1, (page - 1) * PAGE_SIZE]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS count FROM comments WHERE approved = false`
    );

    const hasMore = result.rows.length > PAGE_SIZE;

    res.json({
      comments: result.rows.slice(0, PAGE_SIZE),
      page,
      hasMore,
      pendingCount: countResult.rows[0].count,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load comments" });
  }
});

// POST /api/admin/comments/approve — approve several at once: { "ids": [1, 2, 3] }
router.post("/approve", async (req, res) => {
  const ids = req.body?.ids;

  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_BULK_IDS) {
    return res.status(400).json({ message: `ids must be a list of 1 to ${MAX_BULK_IDS} comment ids` });
  }

  const cleanIds = [...new Set(ids.map(parseId))];
  if (cleanIds.includes(null)) {
    return res.status(400).json({ message: "Every id must be a positive whole number" });
  }

  try {
    const result = await pool.query(
      `UPDATE comments SET approved = true WHERE id = ANY($1::int[]) RETURNING id`,
      [cleanIds]
    );
    res.json({ message: `Approved ${result.rows.length} comments` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not approve comments" });
  }
});

// PATCH /api/admin/comments/:id — approve or hide one: { "approved": true }
router.patch("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid comment id" });
  }

  const approved = req.body?.approved;
  if (typeof approved !== "boolean") {
    return res.status(400).json({ message: "approved must be true or false" });
  }

  try {
    const result = await pool.query(
      `UPDATE comments SET approved = $1 WHERE id = $2 RETURNING id, approved`,
      [approved, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Comment not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update comment" });
  }
});

// DELETE /api/admin/comments/:id
router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid comment id" });
  }

  try {
    const result = await pool.query(`DELETE FROM comments WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Comment not found" });
    }
    res.json({ message: "Comment deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not delete comment" });
  }
});

export default router;