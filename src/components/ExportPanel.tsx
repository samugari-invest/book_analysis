import React from 'react';
import Papa from 'papaparse';
import { useDataStore } from '../store/dataStore';

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ExportPanel() {
  const { books, wordFrequencies, coocNodes, coocEdges } = useDataStore();

  const exportBooksCSV = () => {
    const csv = Papa.unparse(
      books.map(b => ({
        タイトル: b.title,
        著者: b.author,
        出版年: b.year,
        出版社: b.publisher,
        NDC: b.ndc,
        レーベル: b.label,
      }))
    );
    downloadFile('﻿' + csv, 'books.csv', 'text/csv;charset=utf-8;');
  };

  const exportBooksJSON = () => {
    downloadFile(JSON.stringify(books, null, 2), 'books.json', 'application/json');
  };

  const exportWordFreqCSV = () => {
    const csv = Papa.unparse(
      wordFrequencies.slice(0, 100).map((w, i) => ({
        順位: i + 1,
        語: w.word,
        出現数: w.count,
        書籍数: w.books.length,
      }))
    );
    downloadFile('﻿' + csv, 'word_frequencies.csv', 'text/csv;charset=utf-8;');
  };

  const exportWordFreqJSON = () => {
    const data = wordFrequencies.slice(0, 100).map((w, i) => ({
      rank: i + 1,
      word: w.word,
      count: w.count,
      bookCount: w.books.length,
      books: w.books.map(b => b.title),
    }));
    downloadFile(JSON.stringify(data, null, 2), 'word_frequencies.json', 'application/json');
  };

  const exportCoocCSV = () => {
    const csv = Papa.unparse(
      coocEdges.map(e => ({ 語1: e.from, 語2: e.to, 共起数: e.weight }))
    );
    downloadFile('﻿' + csv, 'cooccurrence.csv', 'text/csv;charset=utf-8;');
  };

  const exportCoocJSON = () => {
    downloadFile(
      JSON.stringify({ nodes: coocNodes, edges: coocEdges }, null, 2),
      'cooccurrence.json',
      'application/json'
    );
  };

  const card: React.CSSProperties = {
    background: '#fff',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  };

  const btnGroup: React.CSSProperties = {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginTop: '14px',
  };

  const btn = (color: string): React.CSSProperties => ({
    padding: '9px 18px',
    background: color,
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    opacity: books.length === 0 ? 0.5 : 1,
  });

  const noData = !books.length;

  return (
    <div>
      {noData && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', color: '#856404', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
          データがありません。「データ取得・設定」タブでデータを取得してから使用してください。
        </div>
      )}

      <div style={card}>
        <h3 style={{ fontSize: '15px', marginBottom: '6px' }}>📚 書籍データ</h3>
        <p style={{ fontSize: '13px', color: '#888' }}>{books.length.toLocaleString()} 件の書籍データ</p>
        <div style={btnGroup}>
          <button style={btn('#4a90d9')} onClick={exportBooksCSV} disabled={noData}>
            📄 CSV ダウンロード
          </button>
          <button style={btn('#27ae60')} onClick={exportBooksJSON} disabled={noData}>
            📋 JSON ダウンロード
          </button>
        </div>
      </div>

      <div style={card}>
        <h3 style={{ fontSize: '15px', marginBottom: '6px' }}>🔤 頻出語データ</h3>
        <p style={{ fontSize: '13px', color: '#888' }}>上位100語のデータ</p>
        <div style={btnGroup}>
          <button style={btn('#4a90d9')} onClick={exportWordFreqCSV} disabled={noData}>
            📄 CSV ダウンロード
          </button>
          <button style={btn('#27ae60')} onClick={exportWordFreqJSON} disabled={noData}>
            📋 JSON ダウンロード
          </button>
        </div>
      </div>

      <div style={card}>
        <h3 style={{ fontSize: '15px', marginBottom: '6px' }}>🕸 共起ネットワークデータ</h3>
        <p style={{ fontSize: '13px', color: '#888' }}>
          {coocNodes.length} ノード / {coocEdges.length} エッジ
        </p>
        <div style={btnGroup}>
          <button style={btn('#4a90d9')} onClick={exportCoocCSV} disabled={noData}>
            📄 CSV ダウンロード (エッジ)
          </button>
          <button style={btn('#27ae60')} onClick={exportCoocJSON} disabled={noData}>
            📋 JSON ダウンロード (完全)
          </button>
        </div>
      </div>
    </div>
  );
}
