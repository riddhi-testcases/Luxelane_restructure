import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../types';

const readSavedUser = (): User | null => {
  try {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) as User : null;
  } catch {
    return null;
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: readSavedUser() },
  reducers: {
    userSignedIn: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    userSignedOut: (state) => {
      state.user = null;
    },
  },
});

export const { userSignedIn, userSignedOut } = authSlice.actions;
export const authReducer = authSlice.reducer;
