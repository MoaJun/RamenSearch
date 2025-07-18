import { VercelRequest, VercelResponse } from '@vercel/node';

// Helper to create mock request and response objects for Vercel serverless functions
export const createMockRequest = (options: Partial<VercelRequest> = {}): VercelRequest => ({
  query: {},
  cookies: {},
  body: {},
  env: {},
  headers: {},
  method: 'GET',
  ...options,
});

export const createMockResponse = (): VercelResponse => {
  const res: Partial<VercelResponse> = {
    statusCode: 200,
    json: jest.fn(function (this: VercelResponse, data: any) {
      this.body = data;
      return this;
    }),
    status: jest.fn(function (this: VercelResponse, code: number) {
      this.statusCode = code;
      return this;
    }),
    send: jest.fn(function (this: VercelResponse, data: any) {
      this.body = data;
      return this;
    }),
    end: jest.fn(function (this: VercelResponse, data?: any) {
      if (data) this.body = data;
      return this;
    }),
    setHeader: jest.fn(function (this: VercelResponse, name: string, value: string | string[]) {
      // Mock setHeader if needed
      return this;
    }),
  };
  return res as VercelResponse;
};
