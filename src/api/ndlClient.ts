import { Book } from '../types';
import { getCachedBooks, setCachedBooks } from './cache';

function parseXmlBooks(xmlText: string, label: string): { books: Book[]; total: number } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    console.error('XML parse error', parseError.textContent);
    return { books: [], total: 0 };
  }

  const totalEl = doc.querySelector('numberOfRecords');
  const total = totalEl ? parseInt(totalEl.textContent || '0', 10) : 0;

  const records = doc.querySelectorAll('recordData');
  const books: Book[] = [];

  records.forEach(record => {
    const getEl = (tag: string): string => {
      const els = record.querySelectorAll(tag);
      if (els.length > 0) return els[0].textContent?.trim() || '';
      return '';
    };

    // NDC subject: look for dc:subject with xsi:type containing NDC
    let ndc = '';
    const subjects = record.querySelectorAll('subject');
    subjects.forEach(s => {
      const type = s.getAttribute('xsi:type') || s.getAttribute('type') || '';
      if (type.toLowerCase().includes('ndc') || type.toLowerCase().includes('ndl')) {
        ndc = s.textContent?.trim() || '';
      }
    });
    if (!ndc) {
      // fallback: first subject
      const firstSubject = record.querySelector('subject');
      ndc = firstSubject?.textContent?.trim() || '';
    }

    const title = getEl('title');
    const author = getEl('creator');
    const dateStr = getEl('date');
    const publisher = getEl('publisher');

    const yearMatch = dateStr.match(/(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;

    if (title && year > 0) {
      books.push({ title, author, year, publisher, ndc, label });
    }
  });

  return { books, total };
}

export async function fetchBooksForLabelYear(
  proxyUrl: string,
  label: string,
  year: number,
  onProgress?: (fetched: number, total: number) => void
): Promise<Book[]> {
  const cached = getCachedBooks(label, year);
  if (cached) {
    onProgress?.(cached.length, cached.length);
    return cached;
  }

  const baseQuery = `(nis.label="${label}") AND (dcterms.date >= "${year}") AND (dcterms.date <= "${year}")`;
  const pageSize = 200;
  let startRecord = 1;
  let totalRecords = 0;
  const allBooks: Book[] = [];

  do {
    const params = new URLSearchParams({
      operation: 'searchRetrieve',
      recordSchema: 'dcndl',
      recordPacking: 'xml',
      maximumRecords: String(pageSize),
      startRecord: String(startRecord),
      query: baseQuery,
    });

    const url = `${proxyUrl}?${params.toString()}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Proxy request failed: ${resp.status} ${resp.statusText}`);
    }
    const xmlText = await resp.text();
    const { books, total } = parseXmlBooks(xmlText, label);

    if (startRecord === 1) {
      totalRecords = total;
    }

    allBooks.push(...books);
    onProgress?.(allBooks.length, totalRecords);

    startRecord += pageSize;
  } while (startRecord <= totalRecords && totalRecords > 0);

  setCachedBooks(label, year, allBooks);
  return allBooks;
}

export async function fetchAllBooks(
  proxyUrl: string,
  labels: string[],
  yearStart: number,
  yearEnd: number,
  onProgress?: (message: string, percent: number) => void
): Promise<Book[]> {
  const allBooks: Book[] = [];
  const totalTasks = labels.length * (yearEnd - yearStart + 1);
  let completedTasks = 0;

  for (const label of labels) {
    for (let year = yearStart; year <= yearEnd; year++) {
      onProgress?.(
        `取得中: ${label} ${year}年`,
        Math.round((completedTasks / totalTasks) * 100)
      );
      try {
        const books = await fetchBooksForLabelYear(proxyUrl, label, year, (fetched, total) => {
          const subPercent = total > 0 ? fetched / total : 1;
          onProgress?.(
            `取得中: ${label} ${year}年 (${fetched}/${total})`,
            Math.round(((completedTasks + subPercent) / totalTasks) * 100)
          );
        });
        allBooks.push(...books);
      } catch (err) {
        console.error(`Failed to fetch ${label} ${year}:`, err);
      }
      completedTasks++;
    }
  }

  onProgress?.('完了', 100);
  return allBooks;
}
