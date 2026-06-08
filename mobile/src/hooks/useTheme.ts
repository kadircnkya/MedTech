import { useMemo } from 'react';
import { colors } from '../theme/colors';
import { useAppStore } from '../store/AppContext';

export function useTheme() {
  const { isDarkMode } = useAppStore();
  const c = useMemo(() => isDarkMode ? colors.dark : colors.light, [isDarkMode]);
  return { isDarkMode, colors: c };
}
