import React, { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useDataStore } from '../store/dataStore';

const COLORS = [
  '#4a90d9', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#34495e', '#e91e63', '#00bcd4',
  '#ff5722', '#607d8b', '#8bc34a', '#ff9800', '#795548',
];

// NDC top-level categories
const NDC_NAMES: Record<string, string> = {
  '0': '総記',
  '1': '哲学・宗教',
  '2': '歴史・地理',
  '3': '社会科学',
  '4': '自然科学',
  '5': '技術・工学',
  '6': '産業',
  '7': '芸術・体育',
  '8': '言語',
  '9': '文学',
};

type ViewMode = 'label' | 'ndc';

export default function CategoryTrend() {
  const { books } = useDataStore();
  const [viewMode, setViewMode] = useState<ViewMode>('label');
  const [topN, setTopN] = useState(8);

  const { chartData, categories } = useMemo(() => {
    if (!books.length) return { chartData: [], categories: [] };

    const years = new Set<number>();
    const catYearMap = new Map<string, Map<number, number>>();
    const catTotal = new Map<string, number>();

    for (const book of books) {
      years.add(book.year);
      let cat: string;
      if (viewMode === 'label') {
        cat = book.label;
      } else {
        const ndcFirst = (book.ndc || '').replace(/\D/g, '')[0];
        cat = ndcFirst ? NDC_NAMES[ndcFirst] || `NDC${ndcFirst}` : '不明';
      }

      if (!catYearMap.has(cat)) catYearMap.set(cat, new Map());
      const ym = catYearMap.get(cat)!;
      ym.set(book.year, (ym.get(book.year) || 0) + 1);
      catTotal.set(cat, (catTotal.get(cat) || 0) + 1);
    }

    // Get top N categories
    const sortedCats = [...catTotal.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([c]) => c);

    const sortedYears = [...years].sort((a, b) => a - b);
    const data = sortedYears.map(year => {
      const entry: Record<string, number | string> = { year: String(year) };
      for (const cat of sortedCats) {
        entry[cat] = catYearMap.get(cat)?.get(year) || 0;
      }
      return entry;
    });

    return { chartData: data, categories: sortedCats };
  }, [books, viewMode, topN]);

  if (!books.length) {
    return (
      <div style={{ background: '#fff', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#999' }}>
        データがありません。「データ取得・設定」タブでデータを取得してください。
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '16px' }}>カテゴリ別推移</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            表示モード:
            <select
              value={viewMode}
              onChange={e => setViewMode(e.target.value as ViewMode)}
              style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }}
            >
              <option value="label">レーベル別</option>
              <option value="ndc">NDC分類別</option>
            </select>
          </label>
          <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            上位:
            <select
              value={topN}
              onChange={e => setTopN(Number(e.target.value))}
              style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }}
            >
              {[5, 8, 10, 15].map(n => <option key={n} value={n}>{n}件</option>)}
            </select>
          </label>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={420}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {categories.map((cat, i) => (
            <Line
              key={cat}
              type="monotone"
              dataKey={cat}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
