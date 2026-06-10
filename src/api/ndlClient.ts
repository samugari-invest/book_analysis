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

function parseXmlBooks(xmlText: string, label: string, fallbackYear = 0): { books: Book[]; total: number; diagnostic: string } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    console.error('XML parse error', parseError.textContent);
    return { books: [], total: 0, diagnostic: 'XMLパースエラー' };
  }

  const allEls = doc.getElementsByTagName('*');

  // Extract SRU diagnostic message if present (query errors etc.)
  let diagnostic = '';
  for (let i = 0; i < allEls.length; i++) {
    const ln = allEls[i].localName;
    if (ln === 'message' || ln === 'details') {
      const txt = allEls[i].textContent?.trim();
      if (txt) diagnostic += (diagnostic ? ' / ' : '') + `${ln}: ${txt}`;
    }
  }

  // numberOfRecords may have namespace prefix
  let total = 0;
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
    // dcndl record uses dcterms:issued (or dc:date) for publication date
    const dateStr = getTextByLocalName(record, 'issued') || getTextByLocalName(record, 'date');

    const yearMatch = dateStr.match(/(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : fallbackYear;

    if (title) {
      books.push({ title, author, year, publisher, ndc, label });
    }
  });

  return { books, total, diagnostic };
}

export async function fetchBooksForLabelYear(
  proxyUrl: string,
  label: string,
  year: number,
  onProgress?: (fetched: number, total: number) => void,
  onLog?: (line: string) => void
): Promise<Book[]> {
  const cached = getCachedBooks(label, year);
  if (cached) {
    onProgress?.(cached.length, cached.length);
    onLog?.(`${label} ${year}: キャッシュから ${cached.length}件`);
    return cached;
  }

  // NDL SRU CQL: 'anywhere' = full-text keyword; 'from'/'until' = publication date range (year ok)
  const baseQuery = `anywhere="${label}" AND from="${year}" AND until="${year}"`;
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
    const { books, total, diagnostic } = parseXmlBooks(xmlText, label, year);

    if (startRecord === 1) {
      totalRecords = total;
      console.log(`[NDL] ${label} ${year}: ${total}件`, xmlText.slice(0, 400));
      onLog?.(`${label} ${year}: numberOfRecords=${total} / 抽出=${books.length}件`);
      if (diagnostic) {
        onLog?.(`  ↳ NDL診断: ${diagnostic}`);
      }
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
  onProgress?: (message: string, percent: number) => void,
  onLog?: (line: string) => void
): Promise<Book[]> {
  const allBooks: Book[] = [];
  const totalTasks = labels.length * (yearEnd - yearStart + 1);
  let completedTasks = 0;

  onLog?.(`取得開始: ${labels.length}レーベル × ${yearEnd - yearStart + 1}年 = ${totalTasks}リクエスト`);
  onLog?.(`プロキシURL: ${proxyUrl}`);

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
        }, onLog);
        allBooks.push(...books);
      } catch (err) {
        console.error(`Failed to fetch ${label} ${year}:`, err);
        onLog?.(`❌ ${label} ${year}: ${err instanceof Error ? err.message : String(err)}`);
      }
      completedTasks++;
    }
  }

  onLog?.(`取得完了: 合計 ${allBooks.length}件`);
  onProgress?.('完了', 100);
  return allBooks;
}
