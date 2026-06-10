import { Book, CoocEdge, CoocNode, WordFreq } from '../types';

export function computeWordFrequencies(
  books: Book[],
  tokenizedMap: Map<string, string[]>
): WordFreq[] {
  const wordBookMap = new Map<string, Set<string>>();
  const wordCountMap = new Map<string, number>();
  const titleToBook = new Map<string, Book>();

  for (const book of books) {
    titleToBook.set(book.title, book);
    const tokens = tokenizedMap.get(book.title) || [];
    const seen = new Set<string>();
    for (const token of tokens) {
      wordCountMap.set(token, (wordCountMap.get(token) || 0) + 1);
      if (!seen.has(token)) {
        if (!wordBookMap.has(token)) wordBookMap.set(token, new Set());
        wordBookMap.get(token)!.add(book.title);
        seen.add(token);
      }
    }
  }

  const result: WordFreq[] = [];
  for (const [word, count] of wordCountMap.entries()) {
    const bookTitles = wordBookMap.get(word) || new Set();
    const booksForWord = [...bookTitles]
      .map(t => titleToBook.get(t))
      .filter((b): b is Book => b !== undefined);
    result.push({ word, count, books: booksForWord });
  }

  result.sort((a, b) => b.count - a.count);
  return result;
}

export function computeCooccurrence(
  books: Book[],
  tokenizedMap: Map<string, string[]>,
  minThreshold: number
): { nodes: CoocNode[]; edges: CoocEdge[] } {
  const pairCount = new Map<string, number>();
  const wordCount = new Map<string, number>();

  for (const book of books) {
    const tokens = tokenizedMap.get(book.title) || [];
    const uniqueTokens = [...new Set(tokens)];

    for (const token of uniqueTokens) {
      wordCount.set(token, (wordCount.get(token) || 0) + 1);
    }

    for (let i = 0; i < uniqueTokens.length; i++) {
      for (let j = i + 1; j < uniqueTokens.length; j++) {
        const a = uniqueTokens[i] < uniqueTokens[j] ? uniqueTokens[i] : uniqueTokens[j];
        const b = uniqueTokens[i] < uniqueTokens[j] ? uniqueTokens[j] : uniqueTokens[i];
        const key = `${a}|||${b}`;
        pairCount.set(key, (pairCount.get(key) || 0) + 1);
      }
    }
  }

  const edges: CoocEdge[] = [];
  const nodeSet = new Set<string>();

  for (const [key, count] of pairCount.entries()) {
    if (count >= minThreshold) {
      const [from, to] = key.split('|||');
      edges.push({ from, to, weight: count });
      nodeSet.add(from);
      nodeSet.add(to);
    }
  }

  const nodes: CoocNode[] = [...nodeSet].map(id => ({
    id,
    label: id,
    value: wordCount.get(id) || 1,
  }));

  return { nodes, edges };
}
