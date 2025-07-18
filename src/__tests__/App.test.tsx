import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '@/App';
import { generateInitialRamenShops } from '@/services/geminiService';
import { MOCK_RAMEN_SHOPS } from '@/constants';

// Mock the generateInitialRamenShops function
jest.mock('@/services/geminiService', () => ({
  generateInitialRamenShops: jest.fn(),
}));

// Mock SearchPage component
jest.mock('@/components/SearchPage', () => {
  return ({ shops, onShopSelect }: any) => (
    <div data-testid="mock-search-page">
      <input placeholder="駅名・住所・郵便番号" />
      {/* Render some content that would be present in SearchPage */}
    </div>
  );
});

// Mock Toast component
jest.mock('@/components/Toast', () => {
  return ({ message, show }: { message: string; show: boolean }) => {
    if (!show) return null;
    return <div data-testid="toast-message">{message}</div>;
  };
});

describe('App Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (generateInitialRamenShops as jest.Mock).mockClear();
    // Mock localStorage methods
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => null),
        setItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });

    // Mock fetch for user-data API
    global.fetch = jest.fn((url) => {
      if (url === '/api/user-data') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ bookmarks: [], visited: [], favorites: [], userPosts: [] }),
        });
      }
      return Promise.reject(new Error(`Unhandled fetch for ${url}`));
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders loading spinner initially', async () => {
    (generateInitialRamenShops as jest.Mock).mockReturnValueOnce(new Promise(() => {})); // Never resolve to keep loading
    
    await act(async () => {
      render(<App />);
    });
    
    // Check for the LoaderCircle by its test ID or class name if role is not working
    expect(screen.getByRole('img', { name: /loading/i })).toBeInTheDocument();
  });

  test('renders SearchPage after loading shops', async () => {
    (generateInitialRamenShops as jest.Mock).mockResolvedValueOnce(MOCK_RAMEN_SHOPS);
    
    await act(async () => {
      render(<App />);
    });
    
    // Wait for the loading spinner to disappear and SearchPage content to appear
    await waitFor(() => expect(screen.queryByRole('img', { name: /loading/i })).not.toBeInTheDocument());
    
    // Check if SearchPage content is rendered (e.g., search input)
    expect(screen.getByPlaceholderText(/駅名・住所・郵便番号/i)).toBeInTheDocument();
  });

  test('shows toast message on failed shop fetch', async () => {
    (generateInitialRamenShops as jest.Mock).mockRejectedValueOnce(new Error("Network error"));
    
    await act(async () => {
      render(<App />);
    });

    await waitFor(() => expect(screen.getByTestId('toast-message')).toBeInTheDocument());
    expect(screen.getByText(/ラーメン店の情報の取得に失敗しました。/i)).toBeInTheDocument();
  });
});
