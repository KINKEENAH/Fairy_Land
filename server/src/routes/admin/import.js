import { Router } from "express";
import multer from "multer";
import { docxToMarkdown, pdfToMarkdown } from "../../utils/documentText.js";
import { splitIntoChapters } from "../../utils/splitChapters.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function handleUpload(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "File is too large (maximum 10 MB)" });
    }
    if (err) {
      return res.status(400).json({ message: "Upload failed" });
    }
    next();
  });
}

function getFileType(file) {
  const name = file.originalname.toLowerCase();
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".pdf")) return "pdf";
  return null;
}

function findNumberingProblems(chapters) {
  const warnings = [];
  const seen = new Set();

  for (const chapter of chapters) {
    if (seen.has(chapter.number)) {
      warnings.push(`Chapter ${chapter.number} appears more than once.`);
    }
    seen.add(chapter.number);

    if (!chapter.content) {
      warnings.push(`Chapter ${chapter.number} has no text.`);
    }
  }

  const highest = Math.max(...seen);
  for (let n = 1; n <= highest; n++) {
    if (!seen.has(n)) warnings.push(`Chapter ${n} seems to be missing.`);
  }

  return warnings;
}

// POST /api/admin/import — reads a file and returns chapters for preview (saves nothing)
router.post("/", handleUpload, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Please choose a file" });
  }

  const fileType = getFileType(req.file);
  if (!fileType) {
    return res.status(400).json({
      message: "Only Word (.docx) and PDF files are supported. For an old .doc file, open it in Word and use Save As → .docx",
    });
  }

  const mode = req.body?.mode === "single" ? "single" : "full";

  let text;
  try {
    text =
      fileType === "docx"
        ? await docxToMarkdown(req.file.buffer)
        : await pdfToMarkdown(req.file.buffer);
  } catch (err) {
    console.error(err);
    return res.status(400).json({
      message: "Could not read this file. It may be damaged or password-protected.",
    });
  }

  if (!text.trim()) {
    return res.status(400).json({
      message: "No text was found. If this is a scanned PDF, its pages are images, not text.",
    });
  }

  const { chapters, skippedIntro } = splitIntoChapters(text);
  const warnings = [];

  if (mode === "full") {
    if (chapters.length === 0) {
      return res.status(400).json({
        message: 'No chapter headings found. Each chapter should start with a line like "Chapter One: The Elevator".',
      });
    }
    if (skippedIntro) {
      warnings.push("Text before the first chapter heading (such as a title page) was left out.");
    }
    warnings.push(...findNumberingProblems(chapters));
    return res.json({ mode, fileType, chapters, warnings });
  }

  // Single-chapter mode
  if (chapters.length === 0) {
    warnings.push("No chapter heading found. Please fill in the chapter number and title.");
    return res.json({
      mode,
      fileType,
      chapters: [{ number: null, title: "", content: text.trim() }],
      warnings,
    });
  }

  if (chapters.length > 1) {
    warnings.push(`Found ${chapters.length} chapter headings. Did you mean to use full novel mode?`);
  }
  if (skippedIntro) {
    warnings.push("Text before the chapter heading was left out.");
  }
  res.json({ mode, fileType, chapters, warnings });
});

export default router;