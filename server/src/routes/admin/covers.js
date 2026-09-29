import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import pool from "../../db.js";
import { parseId } from "../../utils/chapterHelpers.js";

cloudinary.config({ secure: true });

const router = Router({ mergeParams: true });

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => callback(null, ALLOWED_TYPES.includes(file.mimetype)),
});

function handleUpload(req, res, next) {
  upload.single("image")(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "Image is too large (maximum 5 MB)" });
    }
    if (err) {
      return res.status(400).json({ message: "Upload failed" });
    }
    next();
  });
}

function uploadToCloudinary(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        overwrite: true,
        invalidate: true,
        format: "jpg",
        transformation: [
          { width: 900, height: 1200, crop: "fill", gravity: "auto", quality: "auto" },
        ],
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });
}

// POST /api/admin/stories/:id/cover — upload a new cover
router.post("/", handleUpload, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid story id" });
  }
  if (!req.file) {
    return res.status(400).json({ message: "Please choose a JPG, PNG, WebP or iPhone (HEIC) image" });
  }

  try {
    const exists = await pool.query(`SELECT id FROM stories WHERE id = $1`, [id]);
    if (exists.rows.length === 0) {
      return res.status(404).json({ message: "Story not found" });
    }

    const result = await uploadToCloudinary(req.file.buffer, `story-covers/story-${id}`);

    const updated = await pool.query(
      `UPDATE stories SET cover_url = $1 WHERE id = $2 RETURNING *`,
      [result.secure_url, id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not upload the cover" });
  }
});

// DELETE /api/admin/stories/:id/cover — remove the cover
router.delete("/", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid story id" });
  }

  try {
    const updated = await pool.query(
      `UPDATE stories SET cover_url = NULL WHERE id = $1 RETURNING *`,
      [id]
    );
    if (updated.rows.length === 0) {
      return res.status(404).json({ message: "Story not found" });
    }

    try {
      await cloudinary.uploader.destroy(`story-covers/story-${id}`, { invalidate: true });
    } catch (err) {
      console.error("Could not delete the image from Cloudinary:", err.message);
    }

    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not remove the cover" });
  }
});

export default router;