import { Book } from '../types';
import { getCachedBooks, setCachedBooks } from './cache';

// getElementsByTagNameNS-based helper to handle XML namespaces in DOMParser output
function getTextByLocalName(el: Element, localName: string): string {
  // Try direct querySelector first (works when namespace prefixes are resolved)
  const direct = el.querySelector(localName);
  if (direct) return direct.textContent?.trim() || '';
  // Fallback: iterate all elements matching localName regardless of namespace
  const all = el.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName === localName) return all[i].textContent?.trim() || '';
  }
  return '';
}

function parseXmlBooks(xmlText: string, label: string): { books: Book[]; total: number } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    console.error('XML parse error', parseError.textContent);
    return { books: [], total: 0 };
  }

  // numberOfRecords may have namespace prefix
  let total = 0;
  const allEls = doc.getElementsByTagName('*');
  for (let i = 0; i < allEls.length; i++) {
    if (allEls[i].localName === 'numberOfRecords') {
      total = parseInt(allEls[i].textContent || '0', 10);
      break;
    }
  }

  // recordData elements
  const records: Element[] = [];
  for (let i = 0; i < allEls.length; i++) {
    if (allEls[i].localName === 'recordData') records.push(allEls[i]);
  }

  const books: Book[] = [];

  records.forEach(record => {
    // NDC subject
    let ndc = '';
    const allInRecord = record.getElementsByTagName('*');
    for (let i = 0; i < allInRecord.length; i++) {
      const el = allInRecord[i];
      if (el.localName === 'subject') {
        const type = el.getAttribute('xsi:type') || el.getAttribute('type') || '';
        if (type.toLowerCase().includes('ndc') || type.toLowerCase().includes('ndl')) {
          ndc = el.textContent?.trim() || '';
          break;
        }
      }
    }
    if (!ndc) {
      for (let i = 0; i < allInRecord.length; i++) {
        if (allInRecord[i].localName === 'subject') {
          ndc = allInRecord[i].textContent?.trim() || '';
          break;
        }
      }
    }

    const title = getTextByLocalName(record, 'title');
    const author = getTextByLocalName(record, 'creator');
    const publisher = getTextByLocalName(record, 'publisher');
    // NDL uses dcterms:issued for publication date
    const dateStr = getTextByLocalName(record, 'issued') || getTextByLocalName(record, 'date');

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

  // NDL SRU CQL: 'anywhere' searches all fields including series title; 'issued' is the correct date index
  const baseQuery = `(anywhere="${label}") AND (issued="${year}") AND (mediatype=1)`;
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
    if (startRecord === 1) {
      // Log first response for debugging
      console.debug(`[NDL] ${label} ${year} response:`, xmlText.slice(0, 500));
    }
    const { books, total } = parseXmlBooks(xmlText, label);

    if (startRecord === 1) {
      totalRecords = total;
      console.debug(`[NDL] ${label} ${year}: total=${total}`);
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
