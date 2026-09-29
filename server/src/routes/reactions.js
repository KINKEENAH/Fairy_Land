import { Router } from "express";
import pool from "../db.js";
import { parseId, findPublishedChapter } from "../utils/chapterHelpers.js";

const router = Router({ mergeParams: true });

// Must match the CHECK list in schema.sql
const REACTION_TYPES = ["love", "dua", "shocked", "sad", "laugh", "touched"];

function isValidReaderId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(value);
}

async function getReactionSummary(chapterId, readerId) {
  const countsResult = await pool.query(
    `SELECT type, COUNT(*)::int AS count
     FROM reactions
     WHERE chapter_id = $1
     GROUP BY type`,
    [chapterId],
  );

  const counts = Object.fromEntries(REACTION_TYPES.map((type) => [type, 0]));
  for (const row of countsResult.rows) {
    counts[row.type] = row.count;
  }

  let mine = [];
  if (readerId) {
    const mineResult = await pool.query(
      `SELECT type FROM reactions WHERE chapter_id = $1 AND reader_id = $2`,
      [chapterId, readerId],
    );
    mine = mineResult.rows.map((row) => row.type);
  }

  return { counts, mine };
}

// Runs before every route below: checks the chapter once
router.use(async (req, res, next) => {
  const chapterId = parseId(req.params.chapterId);
  if (!chapterId) {
    return res.status(400).json({ message: "Invalid chapter id" });
  }

  try {
    const chapter = await findPublishedChapter(chapterId);
    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }
    req.chapterId = chapterId;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load chapter" });
  }
});

// GET — counts + this reader's reactions
router.get("/", async (req, res) => {
  const readerId = isValidReaderId(req.query.reader_id)
    ? req.query.reader_id
    : null;

  try {
    res.json(await getReactionSummary(req.chapterId, readerId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load reactions" });
  }
});

// POST — add a reaction
router.post("/", async (req, res) => {
  const { reader_id, type } = req.body;

  if (!isValidReaderId(reader_id)) {
    return res.status(400).json({ message: "Invalid reader id" });
  }
  if (!REACTION_TYPES.includes(type)) {
    return res.status(400).json({ message: "Invalid reaction type" });
  }

  try {
    await pool.query(
      `INSERT INTO reactions (chapter_id, reader_id, type)
       VALUES ($1, $2, $3)
       ON CONFLICT (chapter_id, reader_id, type) DO NOTHING`,
      [req.chapterId, reader_id, type],
    );
    res.json(await getReactionSummary(req.chapterId, reader_id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not add reaction" });
  }
});

// DELETE — remove a reaction
router.delete("/:type", async (req, res) => {
  const { type } = req.params;
  const readerId = req.query.reader_id;

  if (!isValidReaderId(readerId)) {
    return res.status(400).json({ message: "Invalid reader id" });
  }
  if (!REACTION_TYPES.includes(type)) {
    return res.status(400).json({ message: "Invalid reaction type" });
  }

  try {
    await pool.query(
      `DELETE FROM reactions
       WHERE chapter_id = $1 AND reader_id = $2 AND type = $3`,
      [req.chapterId, readerId, type],
    );
    res.json(await getReactionSummary(req.chapterId, readerId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not remove reaction" });
  }
});

export default router;
