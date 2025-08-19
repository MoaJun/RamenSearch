# Ramensearch Project Overview

## Purpose
Ramen Compassは、ユーザーが周辺のラーメン店を検索・発見できるWebアプリケーションです。現在地での検索、住所による検索、Google Maps統合、店舗詳細表示などの機能を提供します。

## Tech Stack
- **Frontend**: React 18.3.1 + TypeScript 5.7.2
- **Build Tool**: Vite 6.2.0
- **Package Manager**: pnpm (推奨)
- **Google Maps**: @googlemaps/js-api-loader 1.16.10, @googlemaps/markerclusterer 2.6.2
- **UI Icons**: lucide-react 0.525.0
- **Backend**: Supabase (@supabase/supabase-js 2.55.0)
- **AI**: Google Gemini (@google/genai 1.9.0)
- **Styling**: Tailwind CSS (CDN)

## Key Features
- 現在地周辺のラーメン店検索
- 住所・駅名による検索
- Google Maps統合（地図表示、マーカー、クラスタリング）
- 店舗詳細ページ（営業時間、レビュー、写真）
- お気に入り機能
- 永続キャッシュ

## Environment Variables
- `VITE_GOOGLE_MAPS_API_KEY`: Google Maps API key (required)
- `GEMINI_API_KEY`: Google Gemini API key
- Supabase関連の環境変数も使用

## Main Commands
- `pnpm dev`: 開発サーバー起動
- `pnpm build`: プロダクションビルド
- `pnpm preview`: ビルド結果のプレビュー
- `pnpm analyze`: バンドル分析