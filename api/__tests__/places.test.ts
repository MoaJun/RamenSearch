import handler from '../places';
import { createMockRequest, createMockResponse } from './utils';

describe('Places API Route', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    process.env.GOOGLE_MAPS_API_KEY = 'test-google-api-key';
  });

  afterEach(() => {
    delete process.env.GOOGLE_MAPS_API_KEY;
  });

  test('should return 405 for non-GET requests', async () => {
    const req = createMockRequest({ method: 'POST' });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' });
  });

  test('should return 400 if query is missing', async () => {
    const req = createMockRequest({ method: 'GET', query: {} });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Query parameter is required' });
  });

  test('should return 500 if GOOGLE_MAPS_API_KEY is not set', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    const req = createMockRequest({ method: 'GET', query: { query: 'Tokyo Ramen' } });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Google Maps API Key is not set.' });
  });

  test('should return ramen shops from Places API', async () => {
    fetchMock.mockResponses(
      // Mock response for Text Search
      JSON.stringify({
        status: 'OK',
        results: [
          { place_id: 'place1', name: 'Ramen Shop 1' },
          { place_id: 'place2', name: 'Ramen Shop 2' },
        ],
      }),
      // Mock response for Place Details for place1
      JSON.stringify({
        status: 'OK',
        result: {
          place_id: 'place1',
          name: 'Ramen Shop 1',
          formatted_address: 'Address 1',
          rating: 4.5,
          photos: [{ photo_reference: 'photo1' }],
          opening_hours: { weekday_text: ['Mon-Fri: 9 AM - 5 PM'], open_now: true },
          website: 'http://shop1.com',
          reviews: [{ author_name: 'User A', text: 'Great ramen!', rating: 5 }],
        },
      }),
      // Mock response for Place Details for place2
      JSON.stringify({
        status: 'OK',
        result: {
          place_id: 'place2',
          name: 'Ramen Shop 2',
          formatted_address: 'Address 2',
          rating: 3.8,
          photos: [],
          opening_hours: { weekday_text: ['Mon-Fri: 10 AM - 6 PM'], open_now: false },
          website: 'http://shop2.com',
          reviews: [],
        },
      }),
    );

    const req = createMockRequest({ method: 'GET', query: { query: 'Tokyo Ramen' } });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith({
      shops: expect.arrayContaining([
        expect.objectContaining({
          placeId: 'place1',
          name: 'Ramen Shop 1',
          address: 'Address 1',
          rating: 4.5,
          photos: expect.any(Array),
          hours: 'Mon-Fri: 9 AM - 5 PM',
          website: 'http://shop1.com',
          reviews: expect.any(Array),
          isOpenNow: true,
        }),
        expect.objectContaining({
          placeId: 'place2',
          name: 'Ramen Shop 2',
          address: 'Address 2',
          rating: 3.8,
          photos: expect.any(Array),
          hours: 'Mon-Fri: 10 AM - 6 PM',
          website: 'http://shop2.com',
          reviews: expect.any(Array),
          isOpenNow: false,
        }),
      ]),
    });
    expect(fetchMock).toHaveBeenCalledTimes(3); // One for text search, two for details
  });

  test('should handle ZERO_RESULTS from Text Search', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ status: 'ZERO_RESULTS', results: [] }));

    const req = createMockRequest({ method: 'GET', query: { query: 'NonExistentRamen' } });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith({ shops: [] });
  });

  test('should handle error from Text Search', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ status: 'REQUEST_DENIED', error_message: 'API key invalid' }), { status: 403 });

    const req = createMockRequest({ method: 'GET', query: { query: 'Tokyo Ramen' } });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Google Places Text Search API Error: REQUEST_DENIED' });
  });

  test('should handle error from Place Details', async () => {
    fetchMock.mockResponses(
      JSON.stringify({
        status: 'OK',
        results: [{ place_id: 'place1', name: 'Ramen Shop 1' }],
      }),
      JSON.stringify({ status: 'NOT_FOUND', error_message: 'Place not found' }),
    );

    const req = createMockRequest({ method: 'GET', query: { query: 'Tokyo Ramen' } });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Place Details API Error: NOT_FOUND' });
  });
});
