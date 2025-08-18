/**
 * 新しいSupabaseテーブル構造のテスト
 */

import { supabaseFavoritesServiceNew } from '../services/supabaseFavoritesServiceNew';

// テスト用のサンプルデータ
const testShop = {
  placeId: 'test_place_001',
  name: 'テストラーメン店',
  address: '東京都渋谷区テスト1-1-1',
  rating: 4.5,
  photos: [],
  lat: 35.6586,
  lng: 139.7454,
  hours: '11:00-22:00',
  website: 'https://test-ramen.com',
  reviews: [],
  distance: 0,
  keywords: ['ラーメン', 'テスト'],
  isOpenNow: true,
  congestion: '普通' as const,
  accessInfo: 'JR渋谷駅より徒歩5分',
  menu: [],
  parkingInfo: '近隣にコインパーキングあり'
};

export async function runSupabaseNewTest() {
  console.log('=== 新しいSupabaseテーブル構造テスト ===');
  
  try {
    // 1. 接続テスト
    console.log('1. 接続テスト...');
    const connectionOk = await supabaseFavoritesServiceNew.testConnection();
    
    if (!connectionOk) {
      console.error('❌ Supabase接続失敗');
      return;
    }
    console.log('✅ Supabase接続成功');

    // 2. 既存データ確認
    console.log('2. 既存データ確認...');
    const existingFavorites = await supabaseFavoritesServiceNew.getFavorites();
    const existingVisits = await supabaseFavoritesServiceNew.getVisitHistory();
    
    console.log(`   現在のお気に入り: ${existingFavorites.length}件`);
    console.log(`   現在の訪問履歴: ${existingVisits.length}件`);

    // 3. お気に入り追加テスト
    console.log('3. お気に入り追加テスト...');
    const isFavBefore = await supabaseFavoritesServiceNew.isFavorite(testShop.placeId);
    console.log(`   追加前の状態: ${isFavBefore ? 'お気に入り済み' : 'お気に入りなし'}`);
    
    if (!isFavBefore) {
      await supabaseFavoritesServiceNew.addToFavorites(testShop);
      console.log('✅ お気に入り追加成功');
    } else {
      console.log('ℹ️ 既にお気に入り登録済み');
    }

    // 4. お気に入り確認
    console.log('4. お気に入り確認...');
    const isFavAfter = await supabaseFavoritesServiceNew.isFavorite(testShop.placeId);
    console.log(`   確認結果: ${isFavAfter ? '✅ お気に入り登録済み' : '❌ お気に入り未登録'}`);

    // 5. お気に入り一覧取得
    console.log('5. お気に入り一覧取得...');
    const favorites = await supabaseFavoritesServiceNew.getFavorites();
    console.log(`   取得件数: ${favorites.length}件`);
    
    if (favorites.length > 0) {
      console.log('   最新のお気に入り:');
      const latest = favorites[0];
      console.log(`     - ${latest.name} (${latest.address})`);
      console.log(`     - 評価: ${latest.rating}`);
      console.log(`     - 訪問回数: ${latest.visitCount}`);
    }

    // 6. 訪問履歴追加テスト
    console.log('6. 訪問履歴追加テスト...');
    await supabaseFavoritesServiceNew.addVisit({
      placeId: testShop.placeId,
      shop_name: testShop.name,
      rating: 5,
      notes: 'とても美味しかった！',
      photos: []
    });
    console.log('✅ 訪問履歴追加成功');

    // 7. 訪問履歴確認
    console.log('7. 訪問履歴確認...');
    const visits = await supabaseFavoritesServiceNew.getVisitHistory();
    console.log(`   訪問履歴件数: ${visits.length}件`);
    
    if (visits.length > 0) {
      console.log('   最新の訪問:');
      const latestVisit = visits[0];
      console.log(`     - ${latestVisit.shop_name}`);
      console.log(`     - 評価: ${latestVisit.rating}`);
      console.log(`     - メモ: ${latestVisit.notes}`);
      console.log(`     - 訪問日: ${latestVisit.visitDate.toLocaleDateString()}`);
    }

    // 8. データエクスポートテスト
    console.log('8. データエクスポートテスト...');
    const exportData = await supabaseFavoritesServiceNew.exportUserData();
    console.log(`   エクスポート - お気に入り: ${exportData.favorites.length}件`);
    console.log(`   エクスポート - 訪問履歴: ${exportData.visits.length}件`);

    console.log('\n🎉 すべてのテストが完了しました！');
    
    return {
      connectionOk,
      favorites: favorites.length,
      visits: visits.length,
      testShopAdded: isFavAfter
    };

  } catch (error) {
    console.error('❌ テスト中にエラーが発生:', error);
    throw error;
  }
}

// ブラウザコンソール用にエクスポート
(window as any).runSupabaseNewTest = runSupabaseNewTest;