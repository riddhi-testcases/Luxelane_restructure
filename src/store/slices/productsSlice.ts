import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiRequest } from '../../api/client';
import { Product } from '../../types';

export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async () => apiRequest<Product[]>('/api/products'),
  {
    condition: (_, { getState }) => {
      const state = getState() as { products: { status: string } };
      return state.products.status !== 'loading';
    },
  },
);

interface ProductsState {
  items: Product[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const productsSlice = createSlice({
  name: 'products',
  initialState: { items: [], status: 'idle', error: null } as ProductsState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Unable to load products';
      });
  },
});

export const productsReducer = productsSlice.reducer;
