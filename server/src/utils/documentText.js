import mammoth from "mammoth";
import TurndownService from "turndown";
import { PDFParse } from "pdf-parse";
import { parseChapterHeading } from "./splitChapters.js";

const turndown = new TurndownService({
  headingStyle: "atx",
  emDelimiter: "*",
  strongDelimiter: "**",
  hr: "***",
});

export async function docxToMarkdown(buffer) {
  const { value: html } = await mammoth.convertToHtml({ buffer });
  return turndown.turndown(html);
}

export async function pdfToMarkdown(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return cleanPdfText(result.text);
  } finally {
    await parser.destroy();
  }
}

// PDFs break text into printed lines. Rebuild paragraphs as best we can.
function cleanPdfText(text) {
  const paragraphs = [];
  let current = [];

  const finishParagraph = () => {
    if (current.length > 0) {
      paragraphs.push(current.join(" "));
      current = [];
    }
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      finishParagraph();
      continue;
    }
    // Skip page numbers like "12" or "-- 3 of 40 --"
    if (/^\d+$/.test(line) || /^--\s*\d+\s+of\s+\d+\s*--$/.test(line)) {
      continue;
    }
    // Keep chapter headings on their own line so splitting still works
    if (parseChapterHeading(line)) {
      finishParagraph();
      paragraphs.push(line);
      continue;
    }
    current.push(line);
  }
  finishParagraph();

  return paragraphs.join("\n\n");
}