import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CartProvider, useCart } from '@/context/CartContext';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false }),
  AuthProvider: ({ children }: any) => children,
}));

vi.mock('@/context/SettingsContext', () => ({
  useSettings: () => ({ settings: {}, currency: 'BDT' }),
  SettingsProvider: ({ children }: any) => children,
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <CartProvider>{ui}</CartProvider>
    </BrowserRouter>
  );
};

describe('Cart Validation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('calculates total correctly', async () => {
    function TestComponent() {
      const { addToCart, total } = useCart();
      return (
        <div>
          <button onClick={() => addToCart({
            id: '1', name: 'Test', description: '', price: 100, category: '', stock: 1, images: [], quantity: 1, itemType: 'domain', domain: 'test.com', domainTld: '.com',
          })}>Add</button>
          <span data-testid="total">{total}</span>
        </div>
      );
    }
    renderWithProviders(<TestComponent />);
    await act(async () => {
      screen.getByText('Add').click();
    });
    expect(screen.getByTestId('total').textContent).toBe('100');
  });

  it('prevents duplicate domain items', async () => {
    function TestComponent() {
      const { addToCart, items } = useCart();
      return (
        <div>
          <button onClick={() => addToCart({
            id: '1', name: 'test.com', description: '', price: 100, category: '', stock: 1, images: [], quantity: 1, itemType: 'domain', domain: 'test.com', domainTld: '.com',
          })}>Add</button>
          <span data-testid="count">{items.length}</span>
        </div>
      );
    }
    renderWithProviders(<TestComponent />);
    await act(async () => {
      screen.getByText('Add').click();
      screen.getByText('Add').click();
    });
    expect(screen.getByTestId('count').textContent).toBe('1');
  });
});
