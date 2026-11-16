import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../types';

interface AuthState {
  user: User | null;
}

const readInitialAuth = (): AuthState => {
  try {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) return { user: null };
    const user: unknown = JSON.parse(savedUser);
    if (
      typeof user !== 'object' ||
      user === null ||
      !('id' in user) ||
      !('username' in user) ||
      typeof user.id !== 'string' ||
      typeof user.username !== 'string'
    ) {
      return { user: null };
    }
    return { user: { id: user.id, username: user.username } };
  } catch {
    return { user: null };
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState: readInitialAuth(),
  reducers: {
    userSignedIn: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    userUpdated: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    userSignedOut: (state) => {
      state.user = null;
    },
  },
});

export const { userSignedIn, userUpdated, userSignedOut } = authSlice.actions;
export const authReducer = authSlice.reducer;
