import { Book } from '../types';

const CACHE_VERSION = 'v1';

function cacheKey(label: string, year: number): string {
  return `book_analysis_${CACHE_VERSION}_${label}_${year}`;
}

export function getCachedBooks(label: string, year: number): Book[] | null {
  try {
    const key = cacheKey(label, year);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    // Cache expires after 24 hours
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(key);
      return null;
    }
    return data as Book[];
  } catch {
    return null;
  }
}

export function setCachedBooks(label: string, year: number, books: Book[]): void {
  try {
    const key = cacheKey(label, year);
    localStorage.setItem(key, JSON.stringify({ data: books, timestamp: Date.now() }));
  } catch {
    // localStorage might be full, ignore
  }
}

export function clearCache(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('book_analysis_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}
