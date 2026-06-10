import React, { useState, Suspense, lazy } from 'react';
import DataFetcher from './components/DataFetcher';
import YearlyCount from './components/YearlyCount';
import CategoryTrend from './components/CategoryTrend';
import FreqWordTable from './components/FreqWordTable';
import ExportPanel from './components/ExportPanel';

const CoocNetwork = lazy(() => import('./components/CoocNetwork'));

type Tab = 'fetch' | 'yearly' | 'category' | 'words' | 'network' | 'export';

const TABS: { id: Tab; label: string }[] = [
  { id: 'fetch', label: '📥 データ取得・設定' },
  { id: 'yearly', label: '📈 年別出版数' },
  { id: 'category', label: '📊 カテゴリ推移' },
  { id: 'words', label: '🔤 頻出語ランキング' },
  { id: 'network', label: '🕸 共起ネットワーク' },
  { id: 'export', label: '💾 エクスポート' },
];

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    background: '#f0f2f5',
  },
  header: {
    background: '#1a1a2e',
    color: '#fff',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: 700,
    margin: 0,
  },
  notice: {
    background: '#fff3cd',
    border: '1px solid #ffc107',
    color: '#856404',
    padding: '8px 24px',
    fontSize: '13px',
    textAlign: 'center',
  },
  tabBar: {
    display: 'flex',
    background: '#fff',
    borderBottom: '2px solid #e0e0e0',
    overflowX: 'auto',
    padding: '0 16px',
  },
  tab: {
    padding: '12px 18px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#666',
    borderBottom: '3px solid transparent',
    marginBottom: '-2px',
    whiteSpace: 'nowrap',
    transition: 'color 0.2s',
  },
  activeTab: {
    color: '#1a1a2e',
    borderBottomColor: '#4a90d9',
    fontWeight: 600,
  },
  content: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('fetch');

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>📚 新書タイトル分析ツール</h1>
        <span style={{ fontSize: '13px', color: '#aaa' }}>NDL SRU API + kuromoji.js</span>
      </header>

      <div style={styles.notice}>
        ⚠️ 最新年のデータは反映に時間差がある場合があります
      </div>

      <nav style={styles.tabBar}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.activeTab : {}),
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main style={styles.content}>
        {activeTab === 'fetch' && <DataFetcher />}
        {activeTab === 'yearly' && <YearlyCount />}
        {activeTab === 'category' && <CategoryTrend />}
        {activeTab === 'words' && <FreqWordTable />}
        {activeTab === 'network' && (
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>読み込み中...</div>}>
            <CoocNetwork />
          </Suspense>
        )}
        {activeTab === 'export' && <ExportPanel />}
      </main>
    </div>
  );
}
