import type { ParsedInputs } from './types';

const STORAGE_KEY = 'rate-compare-inputs';

let memoryCache: ParsedInputs | null = null;

export function saveInputs(inputs: ParsedInputs) {
  memoryCache = inputs;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
  } catch {
    // Large payloads may exceed quota; in-memory cache still works for this session.
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function loadInputs(): ParsedInputs | null {
  if (memoryCache) return memoryCache;

  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ParsedInputs;
    memoryCache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function clearInputs() {
  memoryCache = null;
  sessionStorage.removeItem(STORAGE_KEY);
}
