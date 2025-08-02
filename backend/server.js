
// 必要なツールを読み込む
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// 秘密の鍵を読み込む
const serviceAccount = require('./serviceAccountKey.json');

// Firebaseの初期化（秘密の鍵で認証）
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// データベース（冷蔵庫）を使えるようにする
const db = admin.firestore();

// Expressアプリ（厨房）の準備
const app = express();

// CORSを有効にする（これでフロントエンドと会話できる）
app.use(cors());
// フロントエンドから送られてくるJSON形式のデータを理解できるようにする
app.use(express.json({ limit: '5mb' })); // Allow larger payloads for screenshots

// --- ここからAPI（注文の受付口）の作成 ---

// フィードバックを受け取るためのAPIエンドポイント（受付口）
// POST /api/feedback という住所に注文が来たら、以下の処理をする
app.post('/api/feedback', async (req, res) => {
  try {
    // ウェイターが持ってきた伝票（req.body）からデータを取り出す
    const { type, details, screenshot } = req.body;

    // データが空じゃないかチェック
    if (!type || !details) {
      return res.status(400).send({ message: 'Type and details are required.' });
    }

    // 新しいフィードバックデータを作成
    const newFeedback = {
      type,
      details,
      screenshot: screenshot || null, // スクリーンショットがなければnull
      createdAt: new Date(), // 作成日時を記録
    };

    // データベースの 'feedbacks' という棚に新しいデータを追加（保存）
    const docRef = await db.collection('feedbacks').add(newFeedback);
    
    console.log('Feedback saved with ID:', docRef.id);

    // フロントエンドに「成功したよ！」と伝える
    res.status(201).send({ message: 'Feedback received successfully!', id: docRef.id });

  } catch (error) {
    console.error('Error saving feedback:', error);
    // フロントエンドに「エラーが起きた！」と伝える
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

// --- APIの作成はここまで ---


// サーバーを起動するポート番号を指定
const PORT = process.env.PORT || 8080;

// サーバーを指定したポートで起動し、待機状態にする
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
