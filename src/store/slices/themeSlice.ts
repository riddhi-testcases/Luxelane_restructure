import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ThemeMode } from '../../types';

const getInitialTheme = (): ThemeMode => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const themeSlice = createSlice({
  name: 'theme',
  initialState: { mode: getInitialTheme() },
  reducers: {
    themeChanged: (state, action: PayloadAction<ThemeMode>) => {
      state.mode = action.payload;
    },
    themeToggled: (state) => {
      state.mode = state.mode === 'light' ? 'dark' : 'light';
    },
  },
});

export const { themeChanged, themeToggled } = themeSlice.actions;
export const themeReducer = themeSlice.reducer;
