import { create } from 'zustand';
import { Book, AppConfig, WordFreq, CoocNode, CoocEdge, DEFAULT_LABELS, DEFAULT_STOP_WORDS } from '../types';

interface FetchStatus {
  isLoading: boolean;
  message: string;
  percent: number;
  error: string | null;
}

interface DataStore {
  books: Book[];
  tokenizedMap: Map<string, string[]>;
  wordFrequencies: WordFreq[];
  coocNodes: CoocNode[];
  coocEdges: CoocEdge[];
  fetchStatus: FetchStatus;
  config: AppConfig;

  setBooks: (books: Book[]) => void;
  setTokenizedMap: (map: Map<string, string[]>) => void;
  setWordFrequencies: (wf: WordFreq[]) => void;
  setCoocData: (nodes: CoocNode[], edges: CoocEdge[]) => void;
  setFetchStatus: (status: Partial<FetchStatus>) => void;
  setConfig: (config: Partial<AppConfig>) => void;
}

export const useDataStore = create<DataStore>((set) => ({
  books: [],
  tokenizedMap: new Map(),
  wordFrequencies: [],
  coocNodes: [],
  coocEdges: [],
  fetchStatus: {
    isLoading: false,
    message: '',
    percent: 0,
    error: null,
  },
  config: {
    proxyUrl: 'http://localhost:8787',
    activeLabels: [...DEFAULT_LABELS],
    yearStart: 2005,
    yearEnd: 2025,
    stopWords: [...DEFAULT_STOP_WORDS],
    coocMinThreshold: 3,
  },

  setBooks: (books) => set({ books }),
  setTokenizedMap: (tokenizedMap) => set({ tokenizedMap }),
  setWordFrequencies: (wordFrequencies) => set({ wordFrequencies }),
  setCoocData: (coocNodes, coocEdges) => set({ coocNodes, coocEdges }),
  setFetchStatus: (status) =>
    set((state) => ({ fetchStatus: { ...state.fetchStatus, ...status } })),
  setConfig: (config) =>
    set((state) => ({ config: { ...state.config, ...config } })),
}));
