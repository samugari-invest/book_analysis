import React, { useMemo, useState } from 'react';
import { useDataStore } from '../store/dataStore';
import { Book } from '../types';

export default function FreqWordTable() {
  const { wordFrequencies } = useDataStore();
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  const top30 = useMemo(() => wordFrequencies.slice(0, 30), [wordFrequencies]);
  const selectedBooks = useMemo(() => {
    if (!selectedWord) return [];
    const entry = wordFrequencies.find(w => w.word === selectedWord);
    return entry?.books || [];
  }, [selectedWord, wordFrequencies]);

  const pagedBooks = selectedBooks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (!wordFrequencies.length) {
    return (
      <div style={{ background: '#fff', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#999' }}>
        データがありません。「データ取得・設定」タブでデータを取得してください。
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedWord ? '1fr 1fr' : '1fr', gap: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '16px', marginBottom: '16px' }}>頻出語 Top 30</h2>
        <p style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>クリックで書籍一覧を表示</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
              <th style={{ padding: '8px', textAlign: 'center', width: '40px', color: '#666' }}>順位</th>
              <th style={{ padding: '8px', textAlign: 'left', color: '#666' }}>語</th>
              <th style={{ padding: '8px', textAlign: 'right', color: '#666' }}>出現数</th>
              <th style={{ padding: '8px', textAlign: 'right', color: '#666' }}>書籍数</th>
            </tr>
          </thead>
          <tbody>
            {top30.map((item, idx) => (
              <tr
                key={item.word}
                onClick={() => {
                  setSelectedWord(item.word === selectedWord ? null : item.word);
                  setPage(0);
                }}
                style={{
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                  background: item.word === selectedWord ? '#e8f0fe' : idx % 2 === 0 ? '#fafafa' : '#fff',
                  transition: 'background 0.15s',
                }}
              >
                <td style={{ padding: '8px', textAlign: 'center', color: '#888' }}>{idx + 1}</td>
                <td style={{ padding: '8px', fontWeight: item.word === selectedWord ? 700 : 400 }}>{item.word}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#4a90d9', fontWeight: 600 }}>{item.count}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#888' }}>{item.books.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedWord && (
        <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', maxHeight: '600px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px' }}>「{selectedWord}」を含む書籍 ({selectedBooks.length}件)</h2>
            <button
              onClick={() => setSelectedWord(null)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', color: '#999' }}
            >✕</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '6px', textAlign: 'left', color: '#666' }}>タイトル</th>
                <th style={{ padding: '6px', textAlign: 'left', color: '#666' }}>著者</th>
                <th style={{ padding: '6px', textAlign: 'center', color: '#666' }}>年</th>
                <th style={{ padding: '6px', textAlign: 'left', color: '#666' }}>レーベル</th>
              </tr>
            </thead>
            <tbody>
              {pagedBooks.map((book: Book, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0', background: idx % 2 === 0 ? '#fafafa' : '#fff' }}>
                  <td style={{ padding: '6px' }}>{book.title}</td>
                  <td style={{ padding: '6px', color: '#666' }}>{book.author}</td>
                  <td style={{ padding: '6px', textAlign: 'center', color: '#888' }}>{book.year}</td>
                  <td style={{ padding: '6px', color: '#4a90d9' }}>{book.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {selectedBooks.length > PAGE_SIZE && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                style={{ padding: '4px 12px', border: '1px solid #ccc', borderRadius: '4px', cursor: page === 0 ? 'not-allowed' : 'pointer', background: '#fff' }}
              >前へ</button>
              <span style={{ fontSize: '13px', color: '#666', alignSelf: 'center' }}>
                {page + 1} / {Math.ceil(selectedBooks.length / PAGE_SIZE)}
              </span>
              <button
                onClick={() => setPage(p => Math.min(Math.ceil(selectedBooks.length / PAGE_SIZE) - 1, p + 1))}
                disabled={page >= Math.ceil(selectedBooks.length / PAGE_SIZE) - 1}
                style={{ padding: '4px 12px', border: '1px solid #ccc', borderRadius: '4px', cursor: page >= Math.ceil(selectedBooks.length / PAGE_SIZE) - 1 ? 'not-allowed' : 'pointer', background: '#fff' }}
              >次へ</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
