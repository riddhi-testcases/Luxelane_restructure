import { useAppDispatch, useAppSelector } from '../store/hooks';
import { userSignedIn, userSignedOut } from '../store/slices/authSlice';
import { User } from '../types';

interface DemoUser extends User {
  password: string;
}

const demoUsers: DemoUser[] = [{
  id: 'user1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  password: 'password123',
  wishlist: [],
}];

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const login = async (email: string, password: string): Promise<void> => {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 500));
    const foundUser = demoUsers.find((candidate) => candidate.email === email && candidate.password === password);
    if (!foundUser) throw new Error('Invalid email or password');
    const userWithoutPassword: User = {
      id: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      wishlist: foundUser.wishlist,
    };
    dispatch(userSignedIn(userWithoutPassword));
  };

  const register = async (name: string, email: string, password: string): Promise<void> => {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 500));
    if (demoUsers.some((candidate) => candidate.email === email)) {
      throw new Error('User with this email already exists');
    }

    const newUser: DemoUser = {
      id: `user${demoUsers.length + 1}`,
      name,
      email,
      password,
      wishlist: [],
    };
    demoUsers.push(newUser);
    const userWithoutPassword: User = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      wishlist: newUser.wishlist,
    };
    dispatch(userSignedIn(userWithoutPassword));
  };

  return {
    user,
    isAuthenticated: user !== null,
    login,
    register,
    logout: () => dispatch(userSignedOut()),
  };
};
