import { useAppDispatch, useAppSelector } from '../store/hooks';
import { themeToggled } from '../store/slices/themeSlice';
import { ThemeMode } from '../types';

export const useTheme = (): { theme: ThemeMode; toggleTheme: () => void } => {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.theme.mode);
  return { theme, toggleTheme: () => dispatch(themeToggled()) };
};
