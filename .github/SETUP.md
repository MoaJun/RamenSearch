# GitHub Actions Setup Guide

## Required Secrets

このプロジェクトのGitHub Actionsを動作させるために、以下のSecretsをGitHubリポジトリに設定してください。

### Repository Settings > Secrets and variables > Actions で設定

#### 必須 Secrets:
1. **VITE_GOOGLE_MAPS_API_KEY**
   - Google Maps JavaScript API キー
   - 値: `your_google_maps_api_key_here`

2. **VITE_SUPABASE_URL**
   - Supabase プロジェクト URL
   - 値: `https://your-project.supabase.co`

3. **VITE_SUPABASE_ANON_KEY**
   - Supabase 匿名キー（public key）
   - 値: `your_supabase_anon_key_here`

#### デプロイプラットフォーム別の追加 Secrets:

**Vercel使用の場合（自動デプロイ有効）:**
- `VERCEL_TOKEN`: Vercel Dashboard > Settings > Tokens で作成
- `VERCEL_ORG_ID`: Vercel Dashboard > Settings > General から取得
- `VERCEL_PROJECT_ID`: Vercel Project Settings > General から取得

**Netlify使用の場合:**
- `NETLIFY_AUTH_TOKEN`: Netlify Personal Access Token
- `NETLIFY_SITE_ID`: Netlify Site ID

## Environment設定

### GitHub Pages使用の場合:
1. Repository Settings > Pages
2. Source: "Deploy from a branch"
3. Branch: "gh-pages" / "/ (root)"

### カスタムドメイン使用の場合:
1. `deploy.yml` の `cname:` にドメイン名を追加
2. DNS設定でCNAMEレコードを設定

## Workflow実行権限

Repository Settings > Actions > General で以下を確認:
- Actions permissions: "Allow all actions and reusable workflows"
- Workflow permissions: "Read and write permissions"
- Allow GitHub Actions to create and approve pull requests: ✅ (チェック必須)

## ブランチ保護ルール（推奨）

Repository Settings > Branches で `main` ブランチに以下を設定:
- Require a pull request before merging
- Require status checks to pass before merging
  - `lint-and-typecheck`
  - `test`
  - `build`
- Require up-to-date branches before merging

## 手動実行

Deployワークフローは以下の方法で手動実行可能:
1. Actions タブ
2. "Deploy to Production" を選択
3. "Run workflow" をクリック