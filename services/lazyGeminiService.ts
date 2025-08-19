import { ReviewSummaryData } from '../types.ts';

// Lazy-loaded Gemini service to reduce initial bundle size
// @google/genai (225KB) is only loaded when AI features are actually needed

let geminiService: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

/**
 * Dynamically import and initialize @google/genai only when needed
 * This reduces the initial bundle size by ~225KB
 */
async function loadGeminiService() {
  if (geminiService) {
    return geminiService;
  }

  if (isLoading && loadPromise) {
    return loadPromise;
  }

  isLoading = true;
  loadPromise = (async () => {
    try {
      // Dynamic import of @google/genai - this is where the 225KB savings occur
      const { GoogleGenAI } = await import('@google/genai');
      const { geminiCache } = await import('../utils/persistentCache.ts');

      // Initialize with API key
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

      // Create service object with all methods
      geminiService = {
        async generateFeatureTags(placeId: string, reviewText: string): Promise<string[]> {
          // Check persistent cache first
          const cachedTags = await geminiCache.get<string[]>(`tags_${placeId}`);
          if (cachedTags) {
            return cachedTags;
          }

          if (!apiKey) {
            console.warn("No API key available, returning mock feature tags");
            return ['美味しい', '雰囲気が良い', 'おすすめ'];
          }

          // Rate limiting check
          if (!rateLimiter.canMakeRequest()) {
            const waitTime = rateLimiter.getWaitTime();
            console.warn(`Rate limit reached. Waiting ${waitTime}ms before next request.`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }

          try {
            rateLimiter.recordRequest();
            
            const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `以下のラーメン店のレビューから、この店の特徴を表すタグを3-5個抽出してください。
タグは短い日本語の単語や短いフレーズで、お客様がこの店を理解するのに役立つものを選んでください。

レビュー内容:
${reviewText.substring(0, 1000)}

出力形式: ["タグ1", "タグ2", "タグ3"] のようなJSON配列で出力してください。`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            try {
              const tags = JSON.parse(text);
              if (Array.isArray(tags)) {
                // Cache the results
                await geminiCache.set(`tags_${placeId}`, tags, TAGS_CACHE_TTL);
                return tags;
              }
            } catch (parseError) {
              console.warn("Failed to parse tags JSON, using fallback");
            }
            
            return ['美味しい', '雰囲気が良い'];
          } catch (error) {
            console.error("Feature tags generation failed:", error);
            return ['美味しい', '雰囲気が良い', 'おすすめ'];
          }
        },

        async generateReviewSummary(placeId: string, reviewsText: string): Promise<ReviewSummaryData> {
          // Check persistent cache first
          const cachedSummary = await geminiCache.get<ReviewSummaryData>(`summary_${placeId}`);
          if (cachedSummary) {
            return cachedSummary;
          }

          if (!apiKey) {
            console.warn("No API key available, returning mock review summary");
            return {
              goodPoints: ['美味しいラーメン', '良い雰囲気'],
              badPoints: ['混雑することがある'],
              tips: ['早めの来店がおすすめ']
            };
          }

          // Rate limiting check
          if (!rateLimiter.canMakeRequest()) {
            const waitTime = rateLimiter.getWaitTime();
            console.warn(`Rate limit reached. Waiting ${waitTime}ms before next request.`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }

          try {
            rateLimiter.recordRequest();
            
            const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `以下のラーメン店のレビューを分析して、要約を作成してください。

レビュー内容:
${reviewsText.substring(0, 2000)}

以下のJSON形式で出力してください:
{
  "goodPoints": ["良い点1", "良い点2", "良い点3"],
  "badPoints": ["改善点1", "改善点2"],
  "tips": ["おすすめ情報1", "おすすめ情報2"]
}

各項目は簡潔で分かりやすい日本語で、実際の顧客に役立つ情報を含めてください。`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            try {
              const summary = JSON.parse(text);
              if (summary.goodPoints && summary.badPoints && summary.tips) {
                // Cache the results
                await geminiCache.set(`summary_${placeId}`, summary, SUMMARY_CACHE_TTL);
                return summary;
              }
            } catch (parseError) {
              console.warn("Failed to parse summary JSON, using fallback");
            }
            
            return {
              goodPoints: ['美味しいラーメン', '良い雰囲気'],
              badPoints: ['混雑することがある'],
              tips: ['早めの来店がおすすめ']
            };
          } catch (error) {
            console.error("Review summary generation failed:", error);
            return {
              goodPoints: ['美味しいラーメン'],
              badPoints: ['情報が不足しています'],
              tips: ['詳細は店舗にお問い合わせください']
            };
          }
        }
      };

      return geminiService;
    } catch (error) {
      console.error('Failed to load Gemini service:', error);
      // Return mock service as fallback
      return {
        async generateFeatureTags(): Promise<string[]> {
          return ['美味しい', '雰囲気が良い', 'おすすめ'];
        },
        async generateReviewSummary(): Promise<ReviewSummaryData> {
          return {
            goodPoints: ['美味しいラーメン'],
            badPoints: ['情報が不足しています'],
            tips: ['詳細は店舗にお問い合わせください']
          };
        }
      };
    } finally {
      isLoading = false;
    }
  })();

  return loadPromise;
}

/**
 * Generate feature tags for a ramen shop based on reviews
 * @param placeId - Unique identifier for the place
 * @param reviewText - Combined review text
 * @returns Promise<string[]> - Array of feature tags
 */
export async function generateFeatureTags(placeId: string, reviewText: string): Promise<string[]> {
  const service = await loadGeminiService();
  return service.generateFeatureTags(placeId, reviewText);
}

/**
 * Generate AI-powered review summary
 * @param placeId - Unique identifier for the place
 * @param reviewsText - Combined reviews text
 * @returns Promise<ReviewSummaryData> - Structured summary data
 */
export async function generateReviewSummary(placeId: string, reviewsText: string): Promise<ReviewSummaryData> {
  const service = await loadGeminiService();
  return service.generateReviewSummary(placeId, reviewsText);
}