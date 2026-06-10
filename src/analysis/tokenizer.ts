// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tokenizer = any;

let tokenizerInstance: Tokenizer | null = null;
let initPromise: Promise<Tokenizer> | null = null;

export function initTokenizer(): Promise<Tokenizer> {
  if (tokenizerInstance) return Promise.resolve(tokenizerInstance);
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    // Dynamic import to let Vite pre-bundle kuromoji as CJS
    import('kuromoji').then((mod) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const kuromoji = (mod as any).default ?? mod;
      kuromoji
        .builder({ dicPath: 'https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/' })
        .build((err: Error | null, tokenizer: Tokenizer) => {
          if (err) {
            initPromise = null;
            reject(err);
          } else {
            tokenizerInstance = tokenizer;
            resolve(tokenizer);
          }
        });
    }).catch((err) => {
      initPromise = null;
      reject(err);
    });
  });

  return initPromise;
}

export function tokenizeTitle(
  tokenizer: Tokenizer,
  title: string,
  stopWords: string[]
): string[] {
  const stopSet = new Set(stopWords);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tokens: any[] = tokenizer.tokenize(title);
  const nouns: string[] = [];

  for (const token of tokens) {
    const pos: string = token.pos || '';
    const surface: string = token.surface_form || '';
    const baseForm: string = token.basic_form || surface;

    if (pos === '名詞') {
      const word = baseForm || surface;
      if (
        word.length > 1 &&
        !stopSet.has(word) &&
        !stopSet.has(surface) &&
        !/^[0-9０-９]+$/.test(word) &&
        !/^[a-zA-Z]+$/.test(word)
      ) {
        nouns.push(word);
      }
    }
  }

  return nouns;
}
