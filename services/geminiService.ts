import { RamenShop, ReviewSummaryData } from '../types.ts';
import { MOCK_RAMEN_SHOPS } from '../constants.ts'; // Keep for fallback

// In-memory cache
const tagsCache = new Map<string, string[]>();
const summaryCache = new Map<string, ReviewSummaryData>();

const MAX_RETRIES = 3; // 最大リトライ回数
const RETRY_DELAY_MS = 1000; // リトライ間の遅延（ミリ秒）

/**
 * ヘルパー関数：指定されたミリ秒数だけ待機します。
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 文字列からJSONオブジェクトを安全に抽出します。
 * モデルがJSONの前後に余分なテキストを含んでいる場合に対応します。
 * @param text モデルからの生テキストレスポンス
 * @returns パースされたJSONオブジェクト、またはnull
 */
function extractJsonFromString(text: string): any | null {
  try {
    // JSONの開始と終了を示す最も外側の波括弧を見つける
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1) {
      console.warn("No JSON object found in text:", text);
      return null;
    }

    const jsonString = text.substring(startIndex, endIndex + 1);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Failed to extract or parse JSON from text:", text, error);
    return null;
  }
}

/**
 * ヘルパー関数：バックエンドAPIルートと通信します。
 * リトライロジックを含みます。
 * @param prompt Gemini APIに送信するプロンプト。
 * @param systemInstruction モデルへのシステム指示。
 * @param schema レスポンスのスキーマ。
 * @returns APIからのパースされたJSONレスポンス。
 */
async function fetchFromGeminiApi(prompt: string, systemInstruction: string, schema: object) {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, systemInstruction, responseSchema: schema }),
      });

      if (!response.ok) {
        console.warn(`Gemini API call failed (attempt ${i + 1}/${MAX_RETRIES}): Status ${response.status} - ${response.statusText}`);
        if (i < MAX_RETRIES - 1) {
          await sleep(RETRY_DELAY_MS * (i + 1));
          continue;
        } else {
          throw new Error(`Gemini API call failed after ${MAX_RETRIES} attempts: ${response.status} - ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      const parsedJson = extractJsonFromString(data.text);

      if (parsedJson === null) {
        throw new Error("Failed to extract valid JSON from Gemini API response.");
      }
      return parsedJson;

    } catch (error) {
      console.error(`Error fetching from Gemini API route (attempt ${i + 1}/${MAX_RETRIES}):`, error);
      if (i < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * (i + 1));
        continue;
      } else {
        throw new Error(`Failed to communicate with the Gemini API after ${MAX_RETRIES} attempts.`);
      }
    }
  }
  throw new Error("Unexpected error: fetchFromGeminiApi did not return or throw after retries.");
}

export async function generateInitialRamenShops(city: string): Promise<RamenShop[]> {
  // Use Google Places API for initial shop data
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = await fetch(`/api/places?query=${encodeURIComponent(city + ' ラーメン')}`);
      if (!response.ok) {
        console.warn(`Places API call failed (attempt ${i + 1}/${MAX_RETRIES}): Status ${response.status} - ${response.statusText}`);
        if (i < MAX_RETRIES - 1) {
          await sleep(RETRY_DELAY_MS * (i + 1));
          continue;
        } else {
          throw new Error(`Places API call failed after ${MAX_RETRIES} attempts: ${response.status} - ${response.statusText}`);
        }
      }
      const data = await response.json();
      if (data && data.shops && Array.isArray(data.shops)) {
        // Map the data from Places API to RamenShop type
        return data.shops.map((shop: any) => ({
          placeId: shop.placeId,
          name: shop.name,
          address: shop.address,
          rating: shop.rating,
          photos: shop.photos,
          hours: shop.hours || '営業時間不明',
          website: shop.website || '#',
          twitterUrl: shop.twitterUrl || '',
          reviews: shop.reviews || [],
          distance: Math.floor(Math.random() * 1000) + 50, // Dummy distance for now
          keywords: shop.keywords || [], // Places API might not provide keywords directly
          isOpenNow: shop.isOpenNow || false,
          congestion: shop.congestion || '不明',
          accessInfo: shop.accessInfo || shop.address,
          menu: shop.menu || [],
          parkingInfo: shop.parkingInfo || '',
        }));
      }
      throw new Error("Invalid response from Places API.");
    } catch (error) {
      console.error(`Error fetching from Places API (attempt ${i + 1}/${MAX_RETRIES}):`, error);
      if (i < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * (i + 1));
        continue;
      } else {
        console.warn("Initial shop generation failed, using mock data.", error);
        return MOCK_RAMEN_SHOPS; // Fallback to mock
      }
    }
  }
  console.warn("Initial shop generation failed, using mock data.");
  return MOCK_RAMEN_SHOPS;
}


export async function generateFeatureTags(placeId: string, reviewText: string): Promise<string[]> {
  if (tagsCache.has(placeId)) return tagsCache.get(placeId)!;
  
  const prompt = `以下のラーメン店のレビューを分析し、店の特徴を表す短いタグを5つ生成してください。:\n\n${reviewText}`;
  const systemInstruction = "あなたはラーメン評論家です。レビューテキストから、スープの種類、麺の特徴、トッピングの店雰囲気など、鍵となる特徴を抽出し、2〜5単語の簡潔な日本語のタグとして出力してください。";
  const schema = {
    type: "OBJECT",
    properties: {
      tags: {
        type: "ARRAY",
        description: "ラーメン店やそのメニューの特徴を簡潔に表現したタグのリスト。例: 「濃厚豚骨スープ」「とろけるチャーシュー」",
        items: { type: "STRING" }
      }
    }
  };

  try {
    const parsed = await fetchFromGeminiApi(prompt, systemInstruction, schema);
    if (parsed && parsed.tags && Array.isArray(parsed.tags)) {
      tagsCache.set(placeId, parsed.tags);
      return parsed.tags;
    }
    return [];
  } catch (error) {
    console.warn("Gemini API failed, returning mock tags for", placeId, error);
    const mockTags = ["濃厚スープ", "チャーシューが絶品", "行列必至"];
    tagsCache.set(placeId, mockTags);
    return mockTags;
  }
}

export async function generateReviewSummary(placeId: string, reviewText: string): Promise<ReviewSummaryData> {
  if (summaryCache.has(placeId)) return summaryCache.get(placeId)!;
  
  const prompt = `以下のラーメン店のレビュー群を総合的に分析し、内容を要約してください。:\n\n${reviewText}`;
  const systemInstruction = "あなたは経験豊富なフードジャーナリストです。提供された複数のカスタマーレビューを注意深く読み込み、店の評判を「良い点」「惜しい点（改善点）」「ヒント」の3つのカテゴリに分けて、それぞれ簡潔な日本語の箇条書きで要約してください。客観的な事実に基づき、具体的な表現を心がけてください。";
  const schema = {
    type: "OBJECT",
    properties: {
      goodPoints: {
        type: "ARRAY",
        description: "この店の特に評価されている良い点や長所を箇条書きでまとめたリスト。",
        items: { type: "STRING" }
      },
      badPoints: {
        type: "ARRAY",
        description: "この店の改善点や注意すべき点、人によっては短所と感じる可能性のある点を箇条書きでまとめたリスト。",
        items: { type: "STRING" }
      },
      tips: {
        type: "ARRAY",
        description: "この店を訪れる際の裏技、おすすめの食べ方、注意点などのヒントを箇条書きでまとめたリスト。",
        items: { type: "STRING" }
      }
    }
  };

  try {
    const parsed = await fetchFromGeminiApi(prompt, systemInstruction, schema) as ReviewSummaryData;
    if (parsed && parsed.goodPoints && parsed.badPoints && parsed.tips) {
      summaryCache.set(placeId, parsed);
      return parsed;
    }
    return { goodPoints: [], badPoints: [], tips: [] };
  } catch (error) {
    console.warn("Gemini API failed, returning mock summary for", placeId, error);
    const mockSummary = {
      goodPoints: ["濃厚でクリーミーな豚骨スープ", "とろけるチャーシューが高評価"],
      badPoints: ["週末は行列が長くなることがある", "店内はカウンター席のみで狭め"],
      tips: ["「替え玉」を「バリカタ」で頼むのが人気", "卓上の無料トッピング（高菜、紅生姜）を活用すべし"]
    };
    summaryCache.set(placeId, mockSummary);
    return mockSummary;
  }
}