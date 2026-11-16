import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CartItem, Product } from '../../types';

const readSavedCart = (): CartItem[] => {
  try {
    const savedCart = localStorage.getItem('cart');
    const parsed: unknown = savedCart ? JSON.parse(savedCart) : [];
    return Array.isArray(parsed) ? parsed as CartItem[] : [];
  } catch {
    return [];
  }
};

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: readSavedCart() },
  reducers: {
    cartItemAdded: (state, action: PayloadAction<{ product: Product; quantity: number }>) => {
      const { product, quantity } = action.payload;
      const existing = state.items.find((item) => item.product.id === product.id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        state.items.push({ product, quantity });
      }
    },
    cartItemRemoved: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.product.id !== action.payload);
    },
    cartQuantityUpdated: (state, action: PayloadAction<{ productId: string; quantity: number }>) => {
      const { productId, quantity } = action.payload;
      if (quantity <= 0) {
        state.items = state.items.filter((item) => item.product.id !== productId);
        return;
      }
      const item = state.items.find((entry) => entry.product.id === productId);
      if (item) item.quantity = quantity;
    },
    cartCleared: (state) => {
      state.items = [];
    },
  },
});

export const { cartItemAdded, cartItemRemoved, cartQuantityUpdated, cartCleared } = cartSlice.actions;
export const cartReducer = cartSlice.reducer;
