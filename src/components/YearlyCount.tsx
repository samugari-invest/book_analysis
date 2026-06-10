import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useDataStore } from '../store/dataStore';

const COLORS = [
  '#4a90d9', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#34495e', '#e91e63', '#00bcd4'
];

export default function YearlyCount() {
  const { books, config } = useDataStore();

  const chartData = useMemo(() => {
    if (!books.length) return [];

    const years = new Set<number>();
    const labelYearMap = new Map<string, Map<number, number>>();

    for (const book of books) {
      years.add(book.year);
      if (!labelYearMap.has(book.label)) labelYearMap.set(book.label, new Map());
      const ym = labelYearMap.get(book.label)!;
      ym.set(book.year, (ym.get(book.year) || 0) + 1);
    }

    const sortedYears = [...years].sort((a, b) => a - b);

    return sortedYears.map(year => {
      const entry: Record<string, number | string> = { year: String(year) };
      for (const [lbl, ym] of labelYearMap.entries()) {
        entry[lbl] = ym.get(year) || 0;
      }
      return entry;
    });
  }, [books]);

  const labels = useMemo(() => {
    return [...new Set(books.map(b => b.label))];
  }, [books]);

  if (!books.length) {
    return (
      <div style={{ background: '#fff', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#999' }}>
        データがありません。「データ取得・設定」タブでデータを取得してください。
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
      <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>年別出版数推移</h2>
      <p style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>
        {config.yearStart}〜{config.yearEnd}年 / 合計 {books.length.toLocaleString()} 件
      </p>
      <ResponsiveContainer width="100%" height={420}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {labels.map((lbl, i) => (
            <Line
              key={lbl}
              type="monotone"
              dataKey={lbl}
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
