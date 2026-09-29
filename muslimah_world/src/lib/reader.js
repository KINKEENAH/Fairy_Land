const READER_ID_KEY = "reader-id";
const NAME_KEY = "comment-name";

let fallbackId = null;

export function getReaderId() {
  try {
    let id = localStorage.getItem(READER_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(READER_ID_KEY, id);
    }
    return id;
  } catch {
    fallbackId ??= crypto.randomUUID();
    return fallbackId;
  }
}

export function getSavedName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveName(name) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // Storage unavailable: the reader just types their name again next time
  }
}