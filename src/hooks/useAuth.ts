import { useAppDispatch, useAppSelector } from '../store/hooks';
import { userSignedIn, userSignedOut } from '../store/slices/authSlice';
import { apiRequest } from '../api/client';
import { User } from '../types';

interface AuthResponse {
  user: User;
}

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const login = async (username: string, password: string): Promise<void> => {
    const result = await apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    dispatch(userSignedIn(result.user));
  };

  const register = async (username: string, password: string): Promise<void> => {
    const result = await apiRequest<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: { username, password },
    });
    dispatch(userSignedIn(result.user));
  };

  const logout = async (): Promise<void> => {
    if (user) await apiRequest<void>('/api/auth/logout', { method: 'POST' });
    dispatch(userSignedOut());
  };

  return {
    user,
    isAuthenticated: user !== null,
    login,
    register,
    logout,
  };
};
