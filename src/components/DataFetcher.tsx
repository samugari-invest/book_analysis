import React, { useState } from 'react';
import { useDataStore } from '../store/dataStore';
import { fetchAllBooks } from '../api/ndlClient';
import { clearCache } from '../api/cache';
import { initTokenizer, tokenizeTitle } from '../analysis/tokenizer';
import { computeWordFrequencies, computeCooccurrence } from '../analysis/cooccurrence';
import { DEFAULT_LABELS, DEFAULT_STOP_WORDS } from '../types';

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '16px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
};

const label: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  marginBottom: '6px',
  color: '#444',
};

const input: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontSize: '14px',
};

const btn = (color: string, textColor = '#fff'): React.CSSProperties => ({
  padding: '10px 20px',
  background: color,
  color: textColor,
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 600,
});

export default function DataFetcher() {
  const { config, setConfig, fetchStatus, setFetchStatus, setBooks, setTokenizedMap, setWordFrequencies, setCoocData, debugLogs, addLog, clearLogs } = useDataStore();
  const [localProxy, setLocalProxy] = useState(config.proxyUrl);
  const [localYearStart, setLocalYearStart] = useState(String(config.yearStart));
  const [localYearEnd, setLocalYearEnd] = useState(String(config.yearEnd));
  const [localStopWords, setLocalStopWords] = useState(config.stopWords.join('\n'));
  const [localCoocThreshold, setLocalCoocThreshold] = useState(String(config.coocMinThreshold));

  const applyConfig = () => {
    setConfig({
      proxyUrl: localProxy.trim(),
      yearStart: parseInt(localYearStart) || 2005,
      yearEnd: parseInt(localYearEnd) || 2025,
      stopWords: localStopWords.split(/[\n,、]/).map(s => s.trim()).filter(Boolean),
      coocMinThreshold: parseInt(localCoocThreshold) || 3,
    });
  };

  const toggleLabel = (lbl: string) => {
    const next = config.activeLabels.includes(lbl)
      ? config.activeLabels.filter(l => l !== lbl)
      : [...config.activeLabels, lbl];
    setConfig({ activeLabels: next });
  };

  const handleFetch = async () => {
    applyConfig();
    clearLogs();
    setFetchStatus({ isLoading: true, error: null, message: '初期化中...', percent: 0 });
    try {
      if (config.activeLabels.length === 0) {
        throw new Error('レーベルが1つも選択されていません');
      }
      const books = await fetchAllBooks(
        localProxy.trim(),
        config.activeLabels,
        parseInt(localYearStart) || 2005,
        parseInt(localYearEnd) || 2025,
        (message, percent) => setFetchStatus({ message, percent }),
        addLog
      );
      setBooks(books);

      if (books.length === 0) {
        addLog('⚠️ 取得件数が0件でした。上のログでnumberOfRecordsとレスポンス内容を確認してください。');
        setFetchStatus({ isLoading: false, error: '取得件数が0件でした', message: '0件', percent: 0 });
        return;
      }

      setFetchStatus({ message: '形態素解析中...', percent: 100 });
      addLog(`形態素解析を開始 (${books.length}件)...`);
      const stopWords = localStopWords.split(/[\n,、]/).map(s => s.trim()).filter(Boolean);
      const tokenizer = await initTokenizer();
      const map = new Map<string, string[]>();
      for (const book of books) {
        map.set(book.title, tokenizeTitle(tokenizer, book.title, stopWords));
      }
      setTokenizedMap(map);

      const wf = computeWordFrequencies(books, map);
      setWordFrequencies(wf);

      const threshold = parseInt(localCoocThreshold) || 3;
      const { nodes, edges } = computeCooccurrence(books, map, threshold);
      setCoocData(nodes, edges);

      addLog(`✅ 完了: ${books.length}件 / 語彙${wf.length}語 / 共起ノード${nodes.length}`);
      setFetchStatus({ isLoading: false, message: `完了: ${books.length}件取得`, percent: 100 });
    } catch (err) {
      addLog(`❌ エラー: ${err instanceof Error ? err.message : String(err)}`);
      setFetchStatus({ isLoading: false, error: String(err), message: 'エラーが発生しました', percent: 0 });
    }
  };

  const handleClearCache = () => {
    clearCache();
    alert('キャッシュをクリアしました');
  };

  return (
    <div>
      <div style={card}>
        <h2 style={{ fontSize: '16px', marginBottom: '16px' }}>⚙️ 設定</h2>

        <div style={{ marginBottom: '14px' }}>
          <span style={label}>プロキシURL</span>
          <input
            style={input}
            value={localProxy}
            onChange={e => setLocalProxy(e.target.value)}
            placeholder="https://ndl-proxy.xxx.workers.dev"
          />
          <small style={{ color: '#999' }}>デプロイ済みCloudflare WorkerのURL（末尾に / は付けない）</small>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div>
            <span style={label}>開始年</span>
            <input style={input} type="number" value={localYearStart} onChange={e => setLocalYearStart(e.target.value)} min="1990" max="2025" />
          </div>
          <div>
            <span style={label}>終了年</span>
            <input style={input} type="number" value={localYearEnd} onChange={e => setLocalYearEnd(e.target.value)} min="1990" max="2025" />
          </div>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <span style={label}>共起最小閾値</span>
          <input style={{ ...input, width: '120px' }} type="number" value={localCoocThreshold} onChange={e => setLocalCoocThreshold(e.target.value)} min="1" />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <span style={label}>ストップワード（1行1語または読点区切り）</span>
          <textarea
            style={{ ...input, height: '100px', resize: 'vertical' }}
            value={localStopWords}
            onChange={e => setLocalStopWords(e.target.value)}
          />
        </div>
      </div>

      <div style={card}>
        <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>📚 取得対象レーベル</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {DEFAULT_LABELS.map(lbl => (
            <label key={lbl} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '6px 10px', border: '1px solid #ccc', borderRadius: '20px', background: config.activeLabels.includes(lbl) ? '#1a1a2e' : '#fff', color: config.activeLabels.includes(lbl) ? '#fff' : '#333', fontSize: '13px' }}>
              <input type="checkbox" style={{ display: 'none' }} checked={config.activeLabels.includes(lbl)} onChange={() => toggleLabel(lbl)} />
              {lbl}
            </label>
          ))}
        </div>
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#888' }}>
          選択中: {config.activeLabels.length} / {DEFAULT_LABELS.length} レーベル
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            style={btn(fetchStatus.isLoading ? '#999' : '#4a90d9')}
            onClick={handleFetch}
            disabled={fetchStatus.isLoading}
          >
            {fetchStatus.isLoading ? '取得中...' : '🔍 データ取得・分析'}
          </button>
          <button style={btn('#e74c3c')} onClick={handleClearCache}>
            🗑 キャッシュクリア
          </button>
        </div>

        {fetchStatus.isLoading && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ background: '#e0e0e0', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
              <div style={{ background: '#4a90d9', height: '100%', width: `${fetchStatus.percent}%`, transition: 'width 0.3s' }} />
            </div>
            <div style={{ marginTop: '6px', fontSize: '13px', color: '#555' }}>{fetchStatus.message} ({fetchStatus.percent}%)</div>
          </div>
        )}

        {!fetchStatus.isLoading && fetchStatus.message && (
          <div style={{ marginTop: '12px', fontSize: '14px', color: fetchStatus.error ? '#e74c3c' : '#27ae60' }}>
            {fetchStatus.error ? `❌ ${fetchStatus.error}` : `✅ ${fetchStatus.message}`}
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '16px' }}>🪵 実行ログ</h2>
          <button style={{ ...btn('#888'), padding: '4px 12px', fontSize: '12px' }} onClick={clearLogs}>
            クリア
          </button>
        </div>
        <div
          style={{
            background: '#1e1e1e',
            color: '#d4d4d4',
            fontFamily: 'Consolas, Menlo, monospace',
            fontSize: '12px',
            padding: '12px',
            borderRadius: '4px',
            height: '260px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {debugLogs.length === 0 ? (
            <span style={{ color: '#777' }}>ここに取得状況が表示されます。「データ取得・分析」を押してください。</span>
          ) : (
            debugLogs.map((line, i) => (
              <div key={i} style={{ color: line.includes('❌') ? '#f48771' : line.includes('✅') ? '#89d185' : '#d4d4d4' }}>
                {line}
              </div>
            ))
          )}
        </div>
        <small style={{ color: '#999' }}>
          ※ このログはブラウザのF12を開かなくても確認できます
        </small>
      </div>
    </div>
  );
}
