import pool from "../db.js";

export function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function findPublishedChapter(chapterId) {
  const result = await pool.query(
    `SELECT c.id
     FROM chapters c
     JOIN stories s ON s.id = c.story_id
     WHERE c.id = $1 AND c.published = true AND s.status = 'published'`,
    [chapterId]
  );
  return result.rows[0] || null;
}