import { describe, it, expect, beforeEach, vi } from 'vitest';
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

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty cart', () => {
    function TestComponent() {
      const { items } = useCart();
      return <div data-testid="count">{items.length}</div>;
    }
    renderWithProviders(<TestComponent />);
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('adds domain item', async () => {
    function TestComponent() {
      const { addToCart, items } = useCart();
      return (
        <div>
          <button onClick={() => addToCart({
            id: 'domain_com_example',
            name: 'example.com',
            description: 'Domain registration',
            price: 1392,
            category: 'Hosting & Domains',
            stock: 1,
            images: [],
            quantity: 1,
            itemType: 'domain',
            domain: 'example.com',
            domainTld: '.com',
          })}>Add</button>
          <div data-testid="count">{items.length}</div>
          <div data-testid="name">{items[0]?.name}</div>
        </div>
      );
    }
    renderWithProviders(<TestComponent />);
    await act(async () => {
      screen.getByText('Add').click();
    });
    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(screen.getByTestId('name').textContent).toBe('example.com');
  });

  it('adds hosting item', async () => {
    function TestComponent() {
      const { addToCart, items } = useCart();
      return (
        <div>
          <button onClick={() => addToCart({
            id: 'hosting_1',
            name: 'Basic Hosting',
            description: 'Basic hosting plan',
            price: 500,
            category: 'Hosting & Domains',
            stock: 1,
            images: [],
            quantity: 1,
            itemType: 'hosting',
            planCode: 'basic',
            billingCycle: 'monthly',
          })}>Add</button>
          <div data-testid="count">{items.length}</div>
        </div>
      );
    }
    renderWithProviders(<TestComponent />);
    await act(async () => {
      screen.getByText('Add').click();
    });
    expect(screen.getByTestId('count').textContent).toBe('1');
  });

  it('combines domain + hosting', async () => {
    function TestComponent() {
      const { addToCart, items } = useCart();
      return (
        <div>
          <button onClick={() => addToCart({
            id: 'domain_com_example',
            name: 'example.com',
            description: 'Domain registration',
            price: 1392,
            category: 'Hosting & Domains',
            stock: 1,
            images: [],
            quantity: 1,
            itemType: 'domain',
            domain: 'example.com',
            domainTld: '.com',
          })}>Add Domain</button>
          <button onClick={() => addToCart({
            id: 'hosting_1',
            name: 'Basic Hosting',
            description: 'Basic hosting plan',
            price: 500,
            category: 'Hosting & Domains',
            stock: 1,
            images: [],
            quantity: 1,
            itemType: 'hosting',
            planCode: 'basic',
            billingCycle: 'monthly',
          })}>Add Hosting</button>
          <div data-testid="count">{items.length}</div>
        </div>
      );
    }
    renderWithProviders(<TestComponent />);
    await act(async () => {
      screen.getByText('Add Domain').click();
      screen.getByText('Add Hosting').click();
    });
    expect(screen.getByTestId('count').textContent).toBe('2');
  });

  it('removes item', async () => {
    function TestComponent() {
      const { addToCart, removeFromCart, items } = useCart();
      return (
        <div>
          <button onClick={() => addToCart({
            id: 'domain_com_example',
            name: 'example.com',
            description: 'Domain registration',
            price: 1392,
            category: 'Hosting & Domains',
            stock: 1,
            images: [],
            quantity: 1,
            itemType: 'domain',
            domain: 'example.com',
            domainTld: '.com',
          })}>Add</button>
          <button onClick={() => removeFromCart('domain_com_example')}>Remove</button>
          <div data-testid="count">{items.length}</div>
        </div>
      );
    }
    renderWithProviders(<TestComponent />);
    await act(async () => {
      screen.getByText('Add').click();
    });
    expect(screen.getByTestId('count').textContent).toBe('1');
    await act(async () => {
      screen.getByText('Remove').click();
    });
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('updates quantity', async () => {
    function TestComponent() {
      const { addToCart, updateQuantity, items } = useCart();
      return (
        <div>
          <button onClick={() => addToCart({
            id: 'hosting_1',
            name: 'Basic Hosting',
            description: 'Basic hosting plan',
            price: 500,
            category: 'Hosting & Domains',
            stock: 1,
            images: [],
            quantity: 1,
            itemType: 'hosting',
            planCode: 'basic',
            billingCycle: 'monthly',
          })}>Add</button>
          <button onClick={() => updateQuantity('hosting_1', 3)}>Set Qty 3</button>
          <div data-testid="qty">{items[0]?.quantity}</div>
        </div>
      );
    }
    renderWithProviders(<TestComponent />);
    await act(async () => {
      screen.getByText('Add').click();
      screen.getByText('Set Qty 3').click();
    });
    expect(screen.getByTestId('qty').textContent).toBe('3');
  });
});