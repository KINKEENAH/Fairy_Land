import { useState } from "react";
import Markdown from "react-markdown";
import { Link, useNavigate, useParams } from "react-router";
import { countWords } from "../lib/text.js";
import { useAdminData, useAdminRequest } from "./useAdmin.js";
import { fieldClass, primaryButton, secondaryButton } from "./ui.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

/* ---------- Step 1: choose a file ---------- */

function UploadForm({ onParsed }) {
  const request = useAdminRequest();
  const [mode, setMode] = useState("full");
  const [file, setFile] = useState(null);
  const [state, setState] = useState({ status: "idle", message: "" });

  async function handleSubmit(event) {
    event.preventDefault();

    if (!file) {
      setState({ status: "error", message: "Please choose a file." });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setState({ status: "error", message: "That file is larger than 10 MB." });
      return;
    }

    const formData = new FormData();
    formData.append("mode", mode);
    formData.append("file", file);

    setState({ status: "reading", message: "" });
    try {
      const result = await request("/api/admin/import", { method: "POST", body: formData });
      onParsed(result);
    } catch (err) {
      setState({ status: "error", message: err.message });
    }
  }

  const option = (value, title, description) => (
    <label
      className={`flex cursor-pointer gap-3 rounded-md border p-4 ${
        mode === value ? "border-accent bg-accent/5" : "border-ink/15"
      }`}
    >
      <input
        type="radio"
        name="mode"
        value={value}
        checked={mode === value}
        onChange={() => setMode(value)}
        className="mt-1 accent-accent"
      />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-sm text-ink/60">{description}</span>
      </span>
    </label>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-ink/10 bg-white/60 p-5">
      <fieldset className="space-y-3">
        <legend className="mb-2 font-medium">What's in the file?</legend>
        {option(
          "full",
          "Several chapters (full novel)",
          'Each chapter starts with a heading like "Chapter One: The Elevator" or "chapter 1: the elevator".'
        )}
        {option("single", "One chapter", "The whole file is a single chapter.")}
      </fieldset>

      <div>
        <label htmlFor="import-file" className="mb-1 block text-sm font-medium">
          File
        </label>
        <input
          id="import-file"
          type="file"
          accept=".docx,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-accent/10 file:px-4 file:py-2 file:font-medium file:text-accent hover:file:bg-accent/20"
        />
        <p className="mt-1 text-xs text-ink/60">
          Word (.docx) works best and keeps your italics. PDF works, but check the paragraphs in the preview.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={state.status === "reading"} className={primaryButton}>
          {state.status === "reading" ? "Reading file…" : "Read file"}
        </button>
        {state.status === "error" && (
          <p role="alert" className="text-sm text-red-700">{state.message}</p>
        )}
      </div>
    </form>
  );
}

/* ---------- Step 2: check and save ---------- */

function PreviewEditor({ result, story, onStartOver }) {
  const request = useAdminRequest();
  const navigate = useNavigate();
  const existingNumbers = new Set(story.chapters.map((chapter) => chapter.number));

  const [rows, setRows] = useState(() =>
    result.chapters.map((chapter, index) => ({
      key: index,
      include: true,
      number: chapter.number == null ? "" : String(chapter.number),
      title: chapter.title ?? "",
      content: chapter.content ?? "",
    }))
  );
  const [publishNow, setPublishNow] = useState(false);
  const [state, setState] = useState({ status: "idle", message: "" });

  const included = rows.filter((row) => row.include);

  function updateRow(key, field, value) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row))
    );
  }

  function findProblem() {
    if (included.length === 0) return "Tick at least one chapter to save.";

    const seen = new Set();
    for (const row of included) {
      const number = Number(row.number);
      const name = row.title.trim() || `the chapter in row ${row.key + 1}`;

      if (!Number.isInteger(number) || number < 1) return `Please give ${name} a chapter number.`;
      if (seen.has(number)) return `Chapter ${number} appears more than once. Fix a number or untick one.`;
      seen.add(number);
      if (!row.title.trim()) return `Chapter ${number} needs a title.`;
      if (!row.content.trim()) return `Chapter ${number} has no text. Untick it, or fix it in your file.`;
    }
    return null;
  }

  async function handleSave() {
    const problem = findProblem();
    if (problem) {
      setState({ status: "error", message: problem });
      return;
    }

    const replacing = included.filter((row) => existingNumbers.has(Number(row.number))).length;
    if (
      replacing > 0 &&
      !window.confirm(
        `${replacing} chapter(s) already exist and will be replaced with the text from this file. Continue?`
      )
    ) {
      return;
    }

    const body = {
      story_id: story.id,
      chapters: included.map((row) => ({
        number: Number(row.number),
        title: row.title.trim(),
        content: row.content.trim(),
      })),
    };
    if (publishNow) body.published = true;

    setState({ status: "saving", message: "" });
    try {
      await request("/api/admin/chapters/bulk", { method: "POST", body });
      navigate(`/admin/stories/${story.id}`, {
        state: { message: `Saved ${included.length} chapter(s) from your file.` },
      });
    } catch (err) {
      setState({ status: "error", message: err.message });
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-ink/10 bg-white/60 p-5">
        <p className="font-medium">
          Found {result.chapters.length} chapter(s) in your {result.fileType === "docx" ? "Word file" : "PDF"}.
        </p>
        <p className="mt-1 text-sm text-ink/60">
          Check each one below. You can fix numbers and titles here. Nothing is saved until you click Save.
        </p>

        {result.warnings.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 rounded-md bg-amber-50 py-3 pl-8 pr-4 text-sm text-amber-800">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
      </div>

      <ul className="divide-y divide-ink/10 rounded-lg border border-ink/10 bg-white/60">
        {rows.map((row) => {
          const number = Number(row.number);
          const validNumber = Number.isInteger(number) && number > 0;

          return (
            <li key={row.key} className={`px-4 py-4 ${row.include ? "" : "opacity-50"}`}>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="checkbox"
                  checked={row.include}
                  onChange={(e) => updateRow(row.key, "include", e.target.checked)}
                  aria-label={`Include ${row.title || "this chapter"}`}
                  className="size-4 accent-accent"
                />
                <input
                  type="number"
                  min={1}
                  value={row.number}
                  onChange={(e) => updateRow(row.key, "number", e.target.value)}
                  aria-label="Chapter number"
                  className={`${fieldClass} w-20`}
                />
                <input
                  value={row.title}
                  onChange={(e) => updateRow(row.key, "title", e.target.value)}
                  maxLength={200}
                  aria-label="Chapter title"
                  className={`${fieldClass} min-w-40 flex-1`}
                />
                {validNumber &&
                  (existingNumbers.has(number) ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Replaces existing
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      New
                    </span>
                  ))}
              </div>

              <details className="ml-7 mt-2">
                <summary className="cursor-pointer text-sm text-ink/60">
                  {countWords(row.content).toLocaleString()} words · show text
                </summary>
                <div className="chapter-text mt-2 max-h-96 overflow-y-auto rounded-md border border-ink/10 bg-white/70 px-5">
                  <Markdown>{row.content}</Markdown>
                </div>
              </details>
            </li>
          );
        })}
      </ul>

      <div className="space-y-4 rounded-lg border border-ink/10 bg-white/60 p-5">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={publishNow}
            onChange={(e) => setPublishNow(e.target.checked)}
            className="mt-1 size-4 accent-accent"
          />
          <span>
            <span className="block font-medium">Publish these chapters now</span>
            <span className="block text-sm text-ink/60">
              If unticked, new chapters are saved as drafts, and replaced chapters keep their
              current published or draft setting.
            </span>
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={state.status === "saving"}
            className={primaryButton}
          >
            {state.status === "saving" ? "Saving…" : `Save ${included.length} chapter(s)`}
          </button>
          <button type="button" onClick={onStartOver} disabled={state.status === "saving"} className={secondaryButton}>
            Choose a different file
          </button>
          {state.status === "error" && (
            <p role="alert" className="text-sm text-red-700">{state.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- The page ---------- */

export default function ImportPage() {
  const { storyId } = useParams();
  const { status, data: story, error } = useAdminData(
    `/api/admin/stories/${encodeURIComponent(storyId)}`
  );
  const [result, setResult] = useState(null);

  if (status === "loading") return <p className="text-ink/60">Loading…</p>;
  if (status === "error") return <p className="text-red-700">{error}</p>;

  return (
    <div className="space-y-6">
      <title>{`Import · ${story.title} · Admin`}</title>

      <div>
        <Link to={`/admin/stories/${story.id}`} className="text-sm text-accent hover:underline">
          ← Back to story
        </Link>
        <h1 className="mt-2 font-serif text-3xl font-semibold">Import chapters</h1>
        <p className="mt-1 text-ink/60">into {story.title}</p>
      </div>

      {result ? (
        <PreviewEditor result={result} story={story} onStartOver={() => setResult(null)} />
      ) : (
        <UploadForm onParsed={setResult} />
      )}
    </div>
  );
}