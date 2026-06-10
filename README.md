# 新書トレンド分析ツール

過去20年分（2005〜2025）の新書タイトル・書誌データをNDL Search APIから取得し、出版冊数・カテゴリ推移・頻出語・共起ネットワークを可視化するツールです。

## 機能

- **年別出版冊数グラフ** — 全体冊数の折れ線グラフ
- **カテゴリ別割合推移** — レーベル別 / NDC大分類別の割合推移
- **頻出語TOP30** — 年別タイトル頻出語の表形式表示（ドリルダウン対応）
- **共起ネットワーク** — タイトル内で同時出現する語のネットワーク可視化
- **データエクスポート** — CSV / JSON形式でダウンロード

## 対象レーベル

岩波新書、中公新書、ちくま新書、講談社現代新書、新潮新書、集英社新書、光文社新書、PHP新書、文春新書、幻冬舎新書

## セットアップ

### 1. Cloudflare Workerプロキシのデプロイ

```bash
cd worker
npm install
npx wrangler deploy
```

### 2. フロントエンド起動

```bash
npm install
npm run dev
```

### 3. アプリ設定

ブラウザで開いたアプリの **Config** タブでWorkerのURLを設定してください。

## 技術スタック

- React 18 + Vite 5 + TypeScript
- kuromoji.js（ブラウザ内形態素解析）
- recharts（グラフ）
- vis-network（共起ネットワーク）
- Zustand（状態管理）

## データソース

[国立国会図書館サーチ SRU API](https://ndlsearch.ndl.go.jp/api/sru)（非営利利用）
