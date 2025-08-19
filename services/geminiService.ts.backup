
import { GoogleGenAI, Type } from "@google/genai";
import { ReviewSummaryData } from '../types.ts';
import { geminiCache } from '../utils/persistentCache.ts';

// Ensure you have your API_KEY in environment variables
const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("API_KEY is not set. Using mock data for AI features.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

// Cache TTL settings
const TAGS_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const SUMMARY_CACHE_TTL = 3 * 24 * 60 * 60 * 1000; // 3 days

// Rate limiting for Gemini 1.5 Flash free tier (15 RPM, 250,000 TPM)
const rateLimiter = {
  requests: [] as number[],
  maxRequests: 15, // 15 requests per minute for Gemini 1.5 Flash
  windowMs: 60000, // 1 minute
  
  canMakeRequest(): boolean {
    const now = Date.now();
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    return this.requests.length < this.maxRequests;
  },
  
  recordRequest(): void {
    this.requests.push(Date.now());
  },
  
  getWaitTime(): number {
    if (this.requests.length === 0) return 0;
    const oldestRequest = Math.min(...this.requests);
    return Math.max(0, this.windowMs - (Date.now() - oldestRequest));
  }
};


export async function generateFeatureTags(placeId: string, reviewText: string): Promise<string[]> {
  // Check persistent cache first
  const cachedTags = await geminiCache.get<string[]>(`tags_${placeId}`);
  if (cachedTags) {
    return cachedTags;
  }
  
  if (!apiKey) {
    // Return mock data if API key is not available
    const mockTags = ["濃厚スープ", "チャーシューが絶品", "行列必至"];
    await geminiCache.set(`tags_${placeId}`, mockTags, TAGS_CACHE_TTL);
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
    if (typeof jsonText !== 'string') {
      throw new Error('Invalid response format: response.text is not a string.');
    }
    const parsed = JSON.parse(jsonText);
    
    if (parsed && parsed.tags && Array.isArray(parsed.tags)) {
        await geminiCache.set(`tags_${placeId}`, parsed.tags, TAGS_CACHE_TTL);
        return parsed.tags;
    }

    return [];

  } catch (error) {
    console.error("Error generating feature tags with Gemini API:", error);
    throw new Error("Failed to communicate with Gemini API.");
  }
}

export async function generateReviewSummary(placeId: string, reviewText: string): Promise<ReviewSummaryData> {
  // Check persistent cache first
  const cachedSummary = await geminiCache.get<ReviewSummaryData>(`summary_${placeId}`);
  if (cachedSummary) {
    return cachedSummary;
  }
  
  if (!apiKey) {
    // Return mock data for demonstration
    const mockSummary = {
      goodPoints: ["濃厚でクリーミーな豚骨スープ", "とろけるチャーシューが高評価"],
      badPoints: ["週末は行列が長くなることがある", "店内はカウンター席のみで狭め"],
      tips: ["「替え玉」を「バリカタ」で頼むのが人気", "卓上の無料トッピング（高菜、紅生姜）を活用すべし"]
    };
    await geminiCache.set(`summary_${placeId}`, mockSummary, SUMMARY_CACHE_TTL);
    return mockSummary;
  }

  // Check rate limit
  if (!rateLimiter.canMakeRequest()) {
    const waitTime = rateLimiter.getWaitTime();
    console.warn(`Rate limit reached. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    
    // Return fallback data instead of throwing error
    const fallbackSummary = {
      goodPoints: ["API制限により一時的に要約を生成できません"],
      badPoints: [`${Math.ceil(waitTime / 1000)}秒後に再度お試しください`],
      tips: ["詳細なレビューは下記の個別レビューをご確認ください"]
    };
    return fallbackSummary;
  }

  try {
    // Record the request
    rateLimiter.recordRequest();

    // レビューテキストを適度に制限（品質とコストのバランス）
    const limitedReviewText = reviewText.length > 4000 ? 
      reviewText.substring(0, 4000) + "..." : reviewText;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash", // 無料枠でより多く使えるモデル
      contents: `以下のラーメン店のレビュー群を分析し、JSON形式で要約してください:\n\n${limitedReviewText}\n\n必ず以下のJSON形式で回答してください:\n{"goodPoints":["良い点1","良い点2"],"badPoints":["改善点1","改善点2"],"tips":["ヒント1","ヒント2"]}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            goodPoints: {
              type: Type.ARRAY,
              description: "この店の特に評価されている良い点や長所を箇条書きでまとめたリスト。最大4つ。",
              items: { type: Type.STRING }
            },
            badPoints: {
              type: Type.ARRAY,
              description: "この店の改善点や注意すべき点、人によっては短所と感じる可能性のある点を箇条書きでまとめたリスト。最大4つ。",
              items: { type: Type.STRING }
            },
            tips: {
              type: Type.ARRAY,
              description: "この店を訪れる際の裏技、おすすめの食べ方、注意点などのヒントを箇条書きでまとめたリスト。最大4つ。",
              items: { type: Type.STRING }
            }
          }
        },
        systemInstruction: "あなたは経験豊富なフードジャーナリストです。レビューを分析して、必ず有効なJSON形式で回答してください。文字列には改行や特殊文字を含めず、短い箇条書きで要約してください。",
        maxOutputTokens: 512, // より短い出力に制限してJSONの安定性を向上
        temperature: 0.2 // より一貫した出力のため温度を下げる
      }
    });

    const jsonText = response.text?.trim() || '';
    if (typeof jsonText !== 'string') {
      throw new Error('Invalid response format: response.text is not a string.');
    }
    
    // Debug logging (only in development)
    if (import.meta.env.DEV) {
      console.log('Raw Gemini response:', jsonText);
    }
    
    let parsed: ReviewSummaryData;
    try {
      // Try to clean up the JSON string if it has issues
      const cleanedJsonText = jsonText
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
        .replace(/\n/g, '\\n') // Escape newlines
        .replace(/\r/g, '\\r') // Escape carriage returns
        .replace(/\t/g, '\\t'); // Escape tabs
      
      if (import.meta.env.DEV) {
        console.log('Cleaned JSON:', cleanedJsonText);
      }
      parsed = JSON.parse(cleanedJsonText) as ReviewSummaryData;
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Problematic JSON text:', jsonText);
      
      // Try to extract JSON manually as a fallback
      const jsonMatch = jsonText.match(/\{.*\}/s);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]) as ReviewSummaryData;
        } catch (secondParseError) {
          console.error('Second parse attempt failed:', secondParseError);
          throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }
      } else {
        throw new Error('No valid JSON found in response');
      }
    }

    // Validate the parsed response structure
    if (parsed && typeof parsed === 'object') {
      const validatedSummary: ReviewSummaryData = {
        goodPoints: Array.isArray(parsed.goodPoints) ? parsed.goodPoints : [],
        badPoints: Array.isArray(parsed.badPoints) ? parsed.badPoints : [],
        tips: Array.isArray(parsed.tips) ? parsed.tips : []
      };
      
      // Only cache if we have at least some content
      if (validatedSummary.goodPoints.length > 0 || 
          validatedSummary.badPoints.length > 0 || 
          validatedSummary.tips.length > 0) {
        await geminiCache.set(`summary_${placeId}`, validatedSummary, SUMMARY_CACHE_TTL);
        return validatedSummary;
      }
    }

    // Return empty structure if parsing failed or no content
    return { goodPoints: [], badPoints: [], tips: [] };

  } catch (error) {
    console.error("Error generating review summary with Gemini API:", error);
    
    // API制限やエラーの場合はフォールバック用のモックデータを返す
    const fallbackSummary = {
      goodPoints: ["API制限により一時的に要約を生成できません"],
      badPoints: ["しばらく時間をおいて再度お試しください"],
      tips: ["詳細なレビューは下記の個別レビューをご確認ください"]
    };
    return fallbackSummary;
  }
}
