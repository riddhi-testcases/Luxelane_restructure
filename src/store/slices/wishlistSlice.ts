import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const readSavedWishlist = (): string[] => {
  try {
    const savedWishlist = localStorage.getItem('wishlist');
    const parsed: unknown = savedWishlist ? JSON.parse(savedWishlist) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: { ids: readSavedWishlist() },
  reducers: {
    wishlistItemAdded: (state, action: PayloadAction<string>) => {
      if (!state.ids.includes(action.payload)) state.ids.push(action.payload);
    },
    wishlistItemRemoved: (state, action: PayloadAction<string>) => {
      state.ids = state.ids.filter((id) => id !== action.payload);
    },
  },
});

export const { wishlistItemAdded, wishlistItemRemoved } = wishlistSlice.actions;
export const wishlistReducer = wishlistSlice.reducer;
