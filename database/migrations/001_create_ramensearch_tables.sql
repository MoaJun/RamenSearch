-- RamenSearch Database Schema
-- Migration: 001_create_ramensearch_tables
-- Created: 2025-08-15

-- 1. favoritesテーブル（お気に入りラーメン店）
CREATE TABLE IF NOT EXISTS favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  place_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  rating REAL,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  visit_count INTEGER DEFAULT 0,
  last_visit TIMESTAMP WITH TIME ZONE,
  personal_notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  CONSTRAINT favorites_user_place_unique UNIQUE (user_id, place_id),
  CONSTRAINT favorites_rating_check CHECK (rating >= 0 AND rating <= 5),
  CONSTRAINT favorites_visit_count_check CHECK (visit_count >= 0)
);

-- 2. visit_historyテーブル（訪問履歴）
CREATE TABLE IF NOT EXISTS visit_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  place_id TEXT NOT NULL,
  shop_name TEXT NOT NULL,
  visit_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rating INTEGER,
  notes TEXT,
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  CONSTRAINT visit_history_rating_check CHECK (rating >= 1 AND rating <= 5)
);

-- 3. パフォーマンス最適化インデックス
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_place_id ON favorites (place_id);
CREATE INDEX IF NOT EXISTS idx_favorites_saved_at ON favorites (saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_last_visit ON favorites (last_visit DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_favorites_tags ON favorites USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_visit_history_user_id ON visit_history (user_id);
CREATE INDEX IF NOT EXISTS idx_visit_history_place_id ON visit_history (place_id);
CREATE INDEX IF NOT EXISTS idx_visit_history_visit_date ON visit_history (visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visit_history_user_place ON visit_history (user_id, place_id);

-- 4. updated_atの自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_favorites_updated_at 
    BEFORE UPDATE ON favorites 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 5. RLS (Row Level Security) ポリシー設定
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_history ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のデータのみアクセス可能
CREATE POLICY "Users can view own favorites" 
    ON favorites FOR SELECT 
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

CREATE POLICY "Users can insert own favorites" 
    ON favorites FOR INSERT 
    WITH CHECK (user_id = current_setting('request.jwt.claims')::json->>'sub');

CREATE POLICY "Users can update own favorites" 
    ON favorites FOR UPDATE 
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

CREATE POLICY "Users can delete own favorites" 
    ON favorites FOR DELETE 
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- visit_historyにも同様のポリシー
CREATE POLICY "Users can view own visits" 
    ON visit_history FOR SELECT 
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

CREATE POLICY "Users can insert own visits" 
    ON visit_history FOR INSERT 
    WITH CHECK (user_id = current_setting('request.jwt.claims')::json->>'sub');

CREATE POLICY "Users can update own visits" 
    ON visit_history FOR UPDATE 
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

CREATE POLICY "Users can delete own visits" 
    ON visit_history FOR DELETE 
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- 6. サンプルユーザー用の簡易ポリシー（開発時のみ）
-- 注意: 本番環境では削除すること
CREATE POLICY "Allow ramensearch_user access to favorites" 
    ON favorites FOR ALL 
    USING (user_id = 'ramensearch_user');

CREATE POLICY "Allow ramensearch_user access to visits" 
    ON visit_history FOR ALL 
    USING (user_id = 'ramensearch_user');

-- 実行後の確認コマンド
-- SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('favorites', 'visit_history') ORDER BY table_name, ordinal_position;