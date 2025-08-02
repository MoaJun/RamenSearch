
import { GoogleGenAI, Type } from "@google/genai";
import { ReviewSummaryData } from '../types.ts';

// Ensure you have your API_KEY in environment variables
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
    console.warn("API_KEY is not set. Feature tag generation will not work.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

// In-memory cache
const tagsCache = new Map<string, string[]>();
const summaryCache = new Map<string, ReviewSummaryData>();


export async function generateFeatureTags(placeId: string, reviewText: string): Promise<string[]> {
  if (tagsCache.has(placeId)) {
    return tagsCache.get(placeId)!;
  }
  
  if (!apiKey) {
    // Return mock data if API key is not available
    const mockTags = ["濃厚スープ", "チャーシューが絶品", "行列必至"];
    tagsCache.set(placeId, mockTags);
    return mockTags;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `以下のラーメン店のレビューを分析し、店の特徴を表す短いタグを5つ生成してください。:\n\n${reviewText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tags: {
              type: Type.ARRAY,
              description: "ラーメン店やそのメニューの特徴を簡潔に表現したタグのリスト。例: 「濃厚豚骨スープ」「とろけるチャーシュー」",
              items: {
                type: Type.STRING
              }
            }
          }
        },
        systemInstruction: "あなたはラーメン評論家です。レビューテキストから、スープの種類、麺の特徴、トッピング、店の雰囲気など、鍵となる特徴を抽出し、2〜5単語の簡潔な日本語のタグとして出力してください。"
      }
    });
    
    const jsonText = response.text;
    const parsed = JSON.parse(jsonText);
    
    if (parsed && parsed.tags && Array.isArray(parsed.tags)) {
        tagsCache.set(placeId, parsed.tags); // Store in cache
        return parsed.tags;
    }

    return [];

  } catch (error) {
    console.error("Error generating feature tags with Gemini API:", error);
    throw new Error("Failed to communicate with Gemini API.");
  }
}

export async function generateReviewSummary(placeId: string, reviewText: string): Promise<ReviewSummaryData> {
  if (summaryCache.has(placeId)) {
    return summaryCache.get(placeId)!;
  }
  
  if (!apiKey) {
    // Return mock data for demonstration
    const mockSummary = {
      goodPoints: ["濃厚でクリーミーな豚骨スープ", "とろけるチャーシューが高評価"],
      badPoints: ["週末は行列が長くなることがある", "店内はカウンター席のみで狭め"],
      tips: ["「替え玉」を「バリカタ」で頼むのが人気", "卓上の無料トッピング（高菜、紅生姜）を活用すべし"]
    };
    summaryCache.set(placeId, mockSummary);
    return mockSummary;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `以下のラーメン店のレビュー群を総合的に分析し、内容を要約してください。:\n\n${reviewText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            goodPoints: {
              type: Type.ARRAY,
              description: "この店の特に評価されている良い点や長所を箇条書きでまとめたリスト。",
              items: { type: Type.STRING }
            },
            badPoints: {
              type: Type.ARRAY,
              description: "この店の改善点や注意すべき点、人によっては短所と感じる可能性のある点を箇条書きでまとめたリスト。",
              items: { type: Type.STRING }
            },
            tips: {
              type: Type.ARRAY,
              description: "この店を訪れる際の裏技、おすすめの食べ方、注意点などのヒントを箇条書きでまとめたリスト。",
              items: { type: Type.STRING }
            }
          }
        },
        systemInstruction: "あなたは経験豊富なフードジャーナリストです。提供された複数のカスタマーレビューを注意深く読み込み、店の評判を「良い点」「惜しい点（改善点）」「ヒント」の3つのカテゴリに分けて、それぞれ簡潔な日本語の箇条書きで要約してください。客観的な事実に基づき、具体的な表現を心がけてください。"
      }
    });

    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText) as ReviewSummaryData;

    if (parsed && parsed.goodPoints && parsed.badPoints && parsed.tips) {
      summaryCache.set(placeId, parsed); // Store in cache
      return parsed;
    }

    return { goodPoints: [], badPoints: [], tips: [] };

  } catch (error) {
    console.error("Error generating review summary with Gemini API:", error);
    throw new Error("Failed to communicate with Gemini API for summary.");
  }
}
