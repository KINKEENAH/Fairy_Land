const ONES = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

// "twenty-four" or "twenty four" → 24, "one" → 1, anything else → null
function wordsToNumber(text) {
  const words = text.toLowerCase().split(/[\s-]+/).filter(Boolean);

  if (words.length === 1) {
    return ONES[words[0]] ?? TENS[words[0]] ?? null;
  }
  if (words.length === 2 && TENS[words[0]] && ONES[words[1]] && ONES[words[1]] < 10) {
    return TENS[words[0]] + ONES[words[1]];
  }
  return null;
}

// Removes Markdown symbols Word formatting may have added:
// "# Chapter One: The Elevator" or "**Chapter One: The Elevator**"
function cleanLine(line) {
  return line
    .trim()
    .replace(/^#+\s*/, "")
    .replace(/[*_\\]/g, "")
    .trim();
}

const HEADING_PATTERN =
  /^chapter\s+(\d+|[a-z]+(?:[\s-][a-z]+)?)\s*(?:[:.\-–—]\s*(.*))?$/i;

// Returns { number, title } if the line is a chapter heading, otherwise null
export function parseChapterHeading(line) {
  const cleaned = cleanLine(line);
  if (cleaned.length > 150) return null;

  const match = cleaned.match(HEADING_PATTERN);
  if (!match) return null;

  const [, rawNumber, rawTitle] = match;
  const number = /^\d+$/.test(rawNumber) ? Number(rawNumber) : wordsToNumber(rawNumber);
  if (!number) return null;

  const title = rawTitle?.trim() || `Chapter ${number}`;
  return { number, title };
}

// Splits a whole document into chapters wherever a heading appears
export function splitIntoChapters(text) {
  const chapters = [];
  let current = null;
  let skippedIntro = false;

  for (const line of text.split(/\r?\n/)) {
    const heading = parseChapterHeading(line);

    if (heading) {
      if (current) chapters.push(current);
      current = { ...heading, lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else if (line.trim()) {
      skippedIntro = true;
    }
  }
  if (current) chapters.push(current);

  return {
    chapters: chapters.map(({ number, title, lines }) => ({
      number,
      title,
      content: lines.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
    })),
    skippedIntro,
  };
}