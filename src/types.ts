export interface Book {
  title: string;
  author: string;
  year: number;
  publisher: string;
  ndc: string;
  label: string;
}

export interface WordFreq {
  word: string;
  count: number;
  books: Book[];
}

export interface CoocEdge {
  from: string;
  to: string;
  weight: number;
}

export interface CoocNode {
  id: string;
  label: string;
  value: number;
}

export interface AppConfig {
  proxyUrl: string;
  activeLabels: string[];
  yearStart: number;
  yearEnd: number;
  stopWords: string[];
  coocMinThreshold: number;
}

export const DEFAULT_LABELS = [
  '岩波新書',
  '中公新書',
  'ちくま新書',
  '講談社現代新書',
  '新潮新書',
  '集英社新書',
  '光文社新書',
  'PHP新書',
  '文春新書',
  '幻冬舎新書',
];

export const DEFAULT_STOP_WORDS = [
  '新書', '入門', 'シリーズ', 'の', 'を', 'に', 'は', 'が', 'も', 'で',
  'と', 'な', 'する', 'ある', 'いる', 'この', 'その', 'よる', 'ため',
  '中', '日本', '時代', '問題',
];
