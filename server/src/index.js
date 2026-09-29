import "dotenv/config";
import express from "express";
import cors from "cors";
import pool from "./db.js";
import storiesRouter from "./routes/stories.js";
import chaptersRouter from "./routes/chapters.js";
import commentsRouter from "./routes/comments.js";
import reactionsRouter from "./routes/reactions.js";
import authRouter from "./routes/auth.js";
import adminRouter from "./routes/admin/index.js";

const app = express();
app.set("trust proxy", 1);

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : [];

app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : true }));
app.use(express.json({ limit: "5mb" }));

app.use("/api/stories", storiesRouter);
app.use("/api/stories/:slug/chapters", chaptersRouter);
app.use("/api/chapters/:chapterId/comments", commentsRouter);
app.use("/api/chapters/:chapterId/reactions", reactionsRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "ok", databaseTime: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ status: "error", message: "Database connection failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
