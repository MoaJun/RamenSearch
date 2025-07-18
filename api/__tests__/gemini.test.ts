import handler from '../gemini';
import { createMockRequest, createMockResponse } from './utils';

// Mock the @google/genai module
jest.mock('@google/genai', () => ({
  GoogleGenerativeAI: jest.fn((apiKey: string) => {
    if (!apiKey) {
      throw new Error("API key is missing");
    }
    return {
      getGenerativeModel: jest.fn(() => ({
        generateContent: jest.fn((prompt: string) => {
          if (prompt.includes("error")) {
            throw new Error("Mock Gemini API error");
          }
          return {
            response: Promise.resolve({
              text: () => Promise.resolve(JSON.stringify({ mockResponse: `Response for: ${prompt}` })),
            }),
          };
        }),
      })),
    };
  }),
}));

describe('Gemini API Route', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Set a dummy API key for testing
    process.env.GEMINI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    // Clean up the dummy API key
    delete process.env.GEMINI_API_KEY;
  });

  test('should return 405 for non-POST requests', async () => {
    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' });
  });

  test('should return 400 if prompt is missing', async () => {
    const req = createMockRequest({ method: 'POST', body: {} });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Prompt is required' });
  });

  test('should return 200 and Gemini response for valid POST request', async () => {
    const req = createMockRequest({ method: 'POST', body: { prompt: 'Hello Gemini' } });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith({ text: JSON.stringify({ mockResponse: 'Response for: Hello Gemini' }) });
  });

  test('should return 500 if Gemini API call fails', async () => {
    const req = createMockRequest({ method: 'POST', body: { prompt: 'trigger error' } });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });

  test('should return 500 if GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY; // Unset the API key
    const req = createMockRequest({ method: 'POST', body: { prompt: 'Hello Gemini' } });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Google Gemini API Key is not set.' }); // Modified expectation
  });
});
