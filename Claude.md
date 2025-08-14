

0. 役割と姿勢（Start with Why / 10x / 負債管理 / 安定と革新 / 品質無妥協）

- Start with Why
    - 着手前に「なぜ必要か」「どんな価値か」を明示する（Planning報告に記載）
    - 技術選定は要件ドリブン。代替案と不採用理由も記載
- 10x Engineering
    - 再利用できる小さなユーティリティ/コンポーネント/ドキュメントを積極作成
    - 自動化は過剰にせず、効果が高い範囲で行う
- 技術的負債
    - 大改修は避け、小さな継続的リファクタを積み重ねる
    - あえて負債を残す場合は TODO と改善案をコードに残す（識別子付与）
- 革新と安定
    - 新技術は段階導入。実験はフィーチャーフラグで隔離
    - 本番を壊さない。破壊的変更はユーザ合意と段階的ロールアウト
- 品質無妥協
    - パフォーマンス/セキュリティ/アクセシビリティ/保守性を常に考慮
    - カバレッジ目標: 全体80%+、クリティカル（services, stores）は95%+

1. Claude Code の基本原則（Strict / Self-contained / Reporting）

- Strict Compliance
    - 本ドキュメントの手順・フォーマットに厳格準拠。独自解釈で省略しない
- Self-Contained
    - 変更はプロジェクトディレクトリ内で完結。秘密情報・外部環境への不要アクセス禁止
- Reporting（各フェーズで必須）
    - Planning → Problem Solving → Escalation（必要時）→ Completion Report
    - 形式は後述「9) レポート書式」

2. 編集安全策（Claude Code 版・重要）

- 原則
    - 変更は「統一diff（unified diff）」で小さく提案。1PR ≦ 300行目安
    - 曖昧さがある場合は着手前に最大3件の質問を行う
    - 既存スタイル（ESLint/Prettier/命名/フォーマット）を尊重
- ループ/誤編集防止
    - old_string に短すぎる断片を使わない。関数名・周辺3-5行を含める
    - 一意コメント/識別子を編集点に付与してから変更
        - 例: // TODO: [EDIT-POINT-001] Update radius
        - 例: const SEARCH_RADIUS_METERS = 500; // [SEARCHPAGE-RADIUS]
    - 競合や多重一致が起きたら、文脈を延ばす or 識別子を投入した上で再実施
- 代替手段（CLIやスクリプト利用時）
    - リスクが高い一括置換は scripts/utils/safe-replace.sh を使用（正規表現/バックアップ/件数確認付き）
    - 連続エラー時フロー
        - 1回目: 文脈延長
        - 2回目: safe-replace.sh（regex/行番号）に切替
        - 3回目以降: 手動編集推奨＋編集内容を明文化
- 出力制約対策
    - 大きなdiffは分割。1つのパッチをファイル/機能単位に分ける
    - 大量生成時は先に型定義・インターフェースから作る→最小骨格→テスト→本体実装

3. 技術スタックとバージョン

- Node: 20.11.x（最新パッチ）
- Vite: 5系、React: 18系、TypeScript: 5.3+
- Google Maps: @googlemaps/js-api-loader, @googlemaps/markerclusterer
- 状態管理: Zustand or TanStack Query（要件に応じて選択）
- Lint/Format: ESLint + Prettier + Stylelint（Tailwind使用時は対応設定）
- テスト: Vitest + @testing-library/react、E2E: Playwright
- パッケージマネージャ: pnpm 推奨（npm/yarnも可）

4. 環境変数・秘密情報（厳守）

- Google Maps
    - 変数: VITE_GOOGLE_MAPS_API_KEY（.env.local、コミット禁止）
    - GCP側でAPI制限（Maps JavaScript API + 必要なPlaces等）、HTTPリファラ制限、請求/クォータ監視
- 共通
    - .env.example を更新し、.env.local を参照。ログ・PR・Issueに秘密を貼らない
    - env変更時は ./scripts/utils/check-env.sh → pnpm dev → pnpm test の順で検証

5. プロジェクト構成（推奨）

- src/
    - app/（Appエントリ/ルータ）
    - components/map/（Map, Marker, InfoWindow, Controls）
    - features/（検索、詳細表示などユースケース単位）
    - hooks/（useMap, usePlaces, useDebounce 等）
    - lib/googleMaps.ts（Loaderシングルトン、型補助）
    - contexts/MapContext.tsx（google/mapsインスタンス共有）
    - services/（APIクライアント、型安全なフェッチ）
    - stores/（Zustand/Query）
    - styles/（Tailwind/グローバルCSS）
    - test-helpers/（Mapsモック, fixtures）
- public/（静的アセット）
- 設定: vite.config.ts, tsconfig.json, eslint, prettier, stylelint
- scripts/（安全置換/検証/監視など各種ユーティリティ）

6. Google Maps 実装ルール

- ロード
    - @googlemaps/js-api-loader を使い非同期ロード（Loaderはシングルトン）
    - libraries は明示（例: ['places']）、mapId は環境変数で任意
    - キー未設定時はユーザ向けエラーバナー表示、処理を停止
- React構成
    - Map/ServiceインスタンスはContext/Refで共有、再レンダ最小化
    - イベントは useEffect で登録し、クリーンアップを必ず実装
- マーカー/パフォーマンス
    - 100件超はクラスタリング前提（@googlemaps/markerclusterer）
    - バウンディングボックス/ズームに応じた取得制御、入力はdebounce（300-500ms）
    - Places Autocomplete はセッショントークンで課金最適化
- UI/アクセシビリティ
    - 地図コンテナには明示サイズ（例: height: 400px 以上）
    - コントロールはaria/ラベル付与、キーボード代替提供
- エラー処理
    - ロード失敗やReferer制限時のメッセージ、再試行導線
    - 位置情報拒否時は手入力/既定地点にフォールバック
- 規約
    - 帰属表示は改変しない。位置情報は同意取得し、保存時は目的/保持を明示

7. テスト戦略（Mapsのローカルテスト含む）

- 単体/結合（Vitest + RTL）
    - パッケージ: @googlemaps/jest-mocks, @types/google.maps
    - tests/setup で window.google.maps をモック、@googlemaps/js-api-loader は即時resolveモック
    - MarkerClusterer等は薄いモックで代替
- E2E（Playwright）
    - maps.googleapis.com/maps/api/js* を route.fulfill でスタブJSに差し替え
    - REST呼び出しがあれば route.fulfill / msw を併用
- カバレッジ
    - 全体80%+、services/storesは95%+。描画依存部は条件・データ整形ロジック中心に検証

8. パフォーマンス/セキュリティ/運用

- 予算（目安）
    - dist gzip合計 ≤ 200KB、FCP < 1.0s、TTI < 2.0s、CLS < 0.1、Lighthouse 90+（全カテゴリ）
- 最適化
    - 動的import・コード分割、@googlemaps 依存の遅延読み込み
    - 余計なリスナ/オブジェクトの確実な破棄、リーク防止
- セキュリティ
    - HTTPS前提、CSP/Referrer-Policy/Permissions-Policy設定
    - 環境変数と鍵の取り扱い徹底、OWASP Top10 の基本対策
- 運用（観測）
    - 本番 console.debug 抑制、重大エラーのみ通知。Sentry等は別PRで導入提案

9. レポート書式（Claude からの出力フォーマット）

- Planning
    - Why（目的/価値）
    - 要件と制約（機能/性能/セキュリティ/依存）
    - 技術選定（採用/代替/不採用理由）
    - 影響範囲（新規/変更ファイル）
    - テスト計画（Unit/Integration/E2E）
    - リスクと対策（Feature Flag/ロールバック）
- Problem Solving（実装中に発見した問題と対処）
    - 事象 → 原因仮説 → 施策 → 結果 → 次アクション
- Escalation（不明点・判断保留）
    - 最大3件の確認質問（Yes/Noまたは選択式を心掛ける）
- Completion Report
    - 変更理由（簡潔に）
    - パッチ（統一diff、最小差分）
    - テスト結果（実行コマンド/主要アサーション/カバレッジ）
    - 影響範囲/互換性/パフォーマンス評価
    - ロールバック手順

10. 変更提案のルール（Claude向け厳守）

- 小さく速く。フォーマット: 変更理由 → diff → テスト計画/結果 → 影響/リスク → ロールバック
- 大規模変更は分割PR。フォーマッタ一括変更や依存大更新は行わない
- old_string を使う編集系は「関数名＋周辺3-5行＋識別子」を必ず含める
- 連続編集エラー時は「編集安全策（2）」フローに従う

11. 実行・主要コマンド（pnpm例）

- セットアップ: pnpm i
- 開発: pnpm dev
- ビルド/プレビュー: pnpm build / pnpm preview
- Lint/Format/型: pnpm lint / pnpm format / pnpm typecheck
- テスト: pnpm test（ユニット）/ pnpm test:coverage / pnpm exec playwright test（E2E）

12. コーディング規約（抜粋）

- TypeScript: strict、noImplicitAny禁止、型は具体化
- React: 関数コンポーネント＋Hooks、default export避け、Propsは明示型
- 命名: PascalCase（コンポーネント）/ camelCase（変数関数）/ UPPER_SNAKE_CASE（定数）
- インポート順: 外部→エイリアス→相対、@/ を使う
- コメントは「意図/制約/参照」を重視。教育的説明（Why）をコードに残す

13. フィーチャーフラグ運用

- 新実装/実験は VITE_* フラグ or 局所的featureFlagで分岐
- デフォルトはOFF。テストやE2EでON/OFF両系を点検

14. 既知の落とし穴

- 地図非表示: コンテナheight未指定
- Referer制限エラー: devホスト（http://localhost:5173）を許可に追加
- 二重ロード: script直書きとLoader併用の混在
- Places課金増: セッショントークン未使用
- 大量差分: フォーマッタ一括適用でPRが膨らむ→分割対応

15. 典型タスクのスニペット方針（要約）

- maps Loader（lib/googleMaps.ts）
    - Loaderシングルトン、load(apiKey, libraries)でgoogleを返す
- Mapコンポーネント
    - refでDOM取得→new google.maps.Map→イベント登録→cleanup
- テストセットアップ
    - @googlemaps/jest-mocks で initialize()
    - js-api-loader をモックして即resolve
    - E2Eは page.route で JS をスタブ

16. 変更禁止/要注意エリア

- .env*, 秘密鍵、CI/CDの破壊的変更
- lockfileに大規模差分を入れる変更
- 公開APIの破壊的互換性変更

17. コミット/PR規約

- Conventional Commits（feat/fix/refactor/docs/test/chore）
- 自己レビューでdiff/命名/コメント/型/テスト確認
- PRに「Why/変更内容/テスト結果/リスク/ロールバック」記載

18. 日次チェック/自動化（任意）

- ./scripts/utils/daily-check.sh を毎朝実行（環境/依存/テスト/ビルド/監査/カバレッジ）
- 変更後は pnpm typecheck → pnpm test → pnpm build の順にバリデーション

19. エラー時の代替アプローチ（編集/依存/テスト/パフォーマンス）

- 編集多重一致: 文脈拡張→識別子投入→safe-replace.sh（regex/行番号）
- 依存/環境: ./setup.sh or ./scripts/utils/check-env.sh → 再インストール
- テスト失敗:
    - 1回目: 単純修正
    - 2回目: フラグで隔離・小分け
    - 3回目: ロールバック→小さく分割
- 性能劣化: バンドル分析（visualizer）、遅延ロード、フラグで切り戻し

20. 用語/参照

- Google Maps JS API / Places / MarkerClusterer
- Vite / Vitest / Playwright / ESLint / Prettier / Tailwind
- OWASP Top 10 / CSP
- 参考: @googlemaps/jest-mocks, @googlemaps/js-api-loader ドキュメント

付録A) Claude の出力テンプレ（コピペして使う）

- Planning
    - Why:
    - 要件/制約:
    - 技術選定（採用/代替/不採用理由）:
    - 影響範囲（新規/変更ファイル）:
    - テスト計画（Unit/Integration/E2E）:
    - リスク/対策/ロールバック:
- 確認質問（最大3件） 1) 2) 3)
- パッチ（unified diff、小分け）
- テスト結果
    - 実行コマンド:
    - 主なアサーション/カバレッジ:
- 影響/互換性/性能
- ロールバック手順

付録B) 編集安全サンプル（good/bad）

- Bad: old_string: "radius: 500,"
- Good（関数名＋文脈3-5行＋識別子） old_string: "function handleCurrentLocationSearch() { const request: google.maps.places.PlaceSearchRequest = { location: currentLocation, radius: SEARCH_RADIUS_METERS, // [SEARCHPAGE-RADIUS] type: 'restaurant' }" new_string（抜粋差し替え or 定数変更）: "const SEARCH_RADIUS_METERS = 2000; // [SEARCHPAGE-RADIUS] was 500"

付録C) Google Maps テストセットアップ（要点）

- devDependencies: @googlemaps/jest-mocks @types/google.maps @googlemaps/js-api-loader
- vitest.config.ts: environment: 'jsdom' or 'happy-dom', setupFiles: ['tests/setup/google-maps.ts']
- tests/setup/google-maps.ts:
    - initialize() で window.google.maps をモック
    - js-api-loader の Loader.load を即resolveにモック
    - markerclusterer は薄いダミーでOK
- Playwright: maps JSルートを route.fulfill でスタブJS差し替え

付録D) 受け入れ基準（DoR/DoD）

- DoR: 価値/要件/鍵/mapId/クォータ/検証方法が明記
- DoD: Lint/型/テスト/ビルド通過、.env.example更新、手動チェックリスト完了
    - キー未設定時のUIエラー
    - 初期表示で地図描画
    - 検索→候補→選択→カメラ移動→マーカー表示
    - クラスタリング/ズーム連動
    - リスナリークなし

## Phase1実装完了記録（2025-08-12）

### 完了した実装
- **キャッシュ永続化**: `utils/persistentCache.ts` - localStorage + TTL
- **お気に入り機能**: `services/favoritesService.ts` + `components/FavoriteButton.tsx`
- **バンドル最適化**: vite.config.ts - 462KB総サイズ、113KB gzipped
- **GitHub Actions**: `.github/workflows/test.yml` - pnpm対応済み

### 修正したTypeScriptエラー
- App.tsx: MyPageProps interface mismatch
- 未使用import削除: BusinessHours.tsx, RamenShopDetail.tsx
- vite-env.d.ts: 環境変数型定義追加

### 現在の課題
- Serena Language Server: LanguageServerTerminatedException (プロセスID21108)
- Cipher記憶制限: "Maximum iterations exceeded" エラー

### 次のステップ
- Claude Code再起動でSerena Language Server問題解決
- Phase2実装: マップクラスタリング、仮想化、訪問履歴

## 追加トラブルシューティング記録（2025-08-12）

### Serena Language Server継続問題
- **状況**: Claude Code再起動後もLanguageServerTerminatedException継続
- **プロセスID**: 50368（新プロセス、依然として異常終了）
- **エラー詳細**: Language server stdout read process terminated unexpectedly
- **実施した対策**:
  - 依存関係再インストール（pnpm install --no-frozen-lockfile）
  - TypeScript型チェック確認（エラーなし）
  - Node.js環境確認（v22.17.0、推奨20.11.xと差異あり）

### 環境状態
- **Node.js**: v22.17.0 
- **pnpm**: 10.13.1
- **TypeScript**: 5.7.3
- **プロジェクト**: 正常（型エラーなし、ビルド可能）

### Cipher.yml設定と記憶機能テスト
- **設定完了**: LM Studio qwen3-4b + qwen3-embedding-0.6b（1024次元）
- **記憶テスト結果**: ❌ 会話履歴保存されていない
- **問題**: "外部の会話履歴や以前のセッションにはアクセスできない"との応答
- **要因候補**: 
  - LM Studio接続問題（ポート1234）
  - SQLite書き込み権限
  - sessions.persistHistory設定不具合

### 代替作業方針
- Serena Language Serverなしで標準ツール（Read/Edit/Glob/Grep）使用
- Phase2実装準備完了（依存関係正常化済み）

付録E: 雛形（Vite + React + TS + Google Maps）

ファイル: src/lib/googleMaps.ts import { Loader } from '@googlemaps/js-api-loader';

let loader: Loader | null = null;

export async function loadGoogleMaps(apiKey: string, libraries: string[] = ['places']) { if (!apiKey) throw new Error('Missing VITE_GOOGLE_MAPS_API_KEY'); if (!loader) { loader = new Loader({ apiKey, version: 'weekly', libraries }); } return loader.load(); }

ファイル: src/components/map/Map.tsx import { useEffect, useRef } from 'react'; import { loadGoogleMaps } from '@/lib/googleMaps';

type Props = { apiKey: string; center?: google.maps.LatLngLiteral; zoom?: number; className?: string; };

export function Map({ apiKey, center = { lat: 35.6812, lng: 139.7671 }, zoom = 12, className }: Props) { const ref = useRef<HTMLDivElement | null>(null); const mapRef = useRef<google.maps.Map | null>(null);

useEffect(() => { let cleanup: (() => void) | undefined;

```
(async () => {
  const g = await loadGoogleMaps(apiKey);
  if (!ref.current) return;
  const map = new g.maps.Map(ref.current, { center, zoom, mapTypeControl: false });
  mapRef.current = map;

  const listener = g.maps.event.addListener(map, 'idle', () => {});
  cleanup = () => {
    if (listener && typeof (listener as any).remove === 'function') (listener as any).remove();
  };
})();

return () => {
  cleanup?.();
  mapRef.current = null;
};
```

}, [apiKey, center.lat, center.lng, zoom]);

return <div ref={ref} data-testid="map" className={className} style={{ width: '100%', height: '400px' }} />; }

export default Map;

ファイル: tests/setup/google-maps.ts import { initialize } from '@googlemaps/jest-mocks'; import { vi } from 'vitest';

initialize();

vi.mock('@googlemaps/js-api-loader', () => { class Loader { constructor(_: any) {} async load() { return (globalThis as any).google; } } return { Loader }; });

vi.mock('@googlemaps/markerclusterer', () => { return { MarkerClusterer: vi.fn().mockImplementation(() => ({ addMarkers: vi.fn(), clearMarkers: vi.fn(), })), }; });

ファイル: tests/Map.test.tsx import { describe, it, expect } from 'vitest'; import { render, screen } from '@testing-library/react'; import Map from '@/components/map/Map';

describe('Map', () => { it('renders and initializes google.maps.Map', async () => { render(); expect(await screen.findByTestId('map')).toBeInTheDocument(); const g: any = globalThis as any; expect(g.google.maps.Map).toHaveBeenCalled(); expect(g.google.maps.event.addListener).toHaveBeenCalled(); });

it('cleans up listeners on unmount', async () => { const g: any = globalThis as any; const remove = vi.fn(); (g.google.maps.event.addListener as any).mockReturnValue({ remove }); const { unmount } = render(); unmount(); expect(remove).toHaveBeenCalled(); }); });

ファイル: vitest.config.ts（新規 or 既存に追記） import { defineConfig } from 'vitest/config'; import path from 'node:path';

export default defineConfig({ test: { environment: 'jsdom', setupFiles: ['./tests/setup/google-maps.ts'], coverage: { provider: 'v8', reporter: ['text', 'html', 'lcov'], lines: 80, functions: 80, branches: 80, statements: 80, }, }, resolve: { alias: { '@': path.resolve(__dirname, './src') } }, });

任意: E2Eの最小スタブ（Playwright） ファイル: tests/e2e/map.spec.ts import { test, expect } from '@playwright/test';

test('renders without loading real Google Maps', async ({ page }) => { await page.route('https://maps.googleapis.com/maps/api/js*', async (route) => { const stub = `window.google = { maps: { Map: function(){}, Marker: function(){}, event: { addListener: function(){ return { remove(){} } } }, places: { AutocompleteService: function(){}, PlacesServiceStatus: { OK: 'OK' } } }};` ; await route.fulfill({ status: 200, contentType: 'application/javascript', body: stub }); });

await page.goto('http://localhost:5173/'); await expect(page.getByTestId('map')).toBeVisible(); });

インストール（dev依存） pnpm add -D vitest jsdom @testing-library/react @testing-library/user-event @googlemaps/jest-mocks @types/google.maps @googlemaps/js-api-loader @playwright/test

package.json 推奨スクリプト "scripts": { "dev": "vite", "build": "vite build", "preview": "vite preview", "typecheck": "tsc -p tsconfig.json", "test": "vitest", "test:coverage": "vitest run --coverage", "test:e2e": "playwright test" }