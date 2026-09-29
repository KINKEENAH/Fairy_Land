const KEY_PREFIX = "reading-progress:";

export function getProgress(slug) {
  try {
    const value = Number(localStorage.getItem(KEY_PREFIX + slug));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function saveProgress(slug, chapterNumber) {
  try {
    localStorage.setItem(KEY_PREFIX + slug, String(chapterNumber));
  } catch {
    // Storage unavailable (e.g. blocked by the browser): reading still works
  }
}