// Premium Healthcare Design System — Color Tokens
// Inspired by Apple Health, Samsung Health, Ada Health

export const colors = {
  light: {
    // Core
    background: '#F7F8FC',
    surface: '#FFFFFF',
    surfaceSecondary: '#F0F2F8',
    surfaceTertiary: '#E8EBF3',

    // Text
    textPrimary: '#0D1B2A',
    textSecondary: '#5A6B7F',
    textTertiary: '#8E99A8',
    textInverse: '#FFFFFF',

    // Brand
    primary: '#0A84FF',
    primaryLight: 'rgba(10, 132, 255, 0.08)',
    primaryMedium: 'rgba(10, 132, 255, 0.15)',
    secondary: '#5E5CE6',
    secondaryLight: 'rgba(94, 92, 230, 0.08)',
    accent: '#30D158',
    accentLight: 'rgba(48, 209, 88, 0.08)',

    // Medical
    heartRed: '#FF3B30',
    heartRedLight: 'rgba(255, 59, 48, 0.08)',
    healthGreen: '#30D158',
    healthGreenLight: 'rgba(48, 209, 88, 0.08)',
    warningOrange: '#FF9F0A',
    warningOrangeLight: 'rgba(255, 159, 10, 0.08)',
    infoBlue: '#0A84FF',
    infoBlueLight: 'rgba(10, 132, 255, 0.08)',

    // Status
    success: '#30D158',
    warning: '#FF9F0A',
    error: '#FF3B30',
    errorLight: 'rgba(255, 59, 48, 0.06)',

    // Borders & Shadows
    border: 'rgba(0, 0, 0, 0.06)',
    borderStrong: 'rgba(0, 0, 0, 0.1)',
    shadow: '#0D1B2A',
    shadowOpacity: 0.04,

    // Gradient
    gradientStart: '#0A84FF',
    gradientEnd: '#5E5CE6',
    gradientHealthStart: '#30D158',
    gradientHealthEnd: '#0A84FF',

    // Glass
    glass: 'rgba(255, 255, 255, 0.72)',
    glassBorder: 'rgba(255, 255, 255, 0.3)',

    // Tab Bar
    tabBarBg: 'rgba(255, 255, 255, 0.94)',
    tabInactive: '#8E99A8',
    tabActive: '#0A84FF',
  },
  dark: {
    // Core
    background: '#0D1117',
    surface: '#161B22',
    surfaceSecondary: '#1C2128',
    surfaceTertiary: '#252C35',

    // Text
    textPrimary: '#F0F3F6',
    textSecondary: '#8B949E',
    textTertiary: '#6E7681',
    textInverse: '#0D1117',

    // Brand
    primary: '#58A6FF',
    primaryLight: 'rgba(88, 166, 255, 0.12)',
    primaryMedium: 'rgba(88, 166, 255, 0.2)',
    secondary: '#8B8BF5',
    secondaryLight: 'rgba(139, 139, 245, 0.12)',
    accent: '#3FB950',
    accentLight: 'rgba(63, 185, 80, 0.12)',

    // Medical
    heartRed: '#FF453A',
    heartRedLight: 'rgba(255, 69, 58, 0.12)',
    healthGreen: '#3FB950',
    healthGreenLight: 'rgba(63, 185, 80, 0.12)',
    warningOrange: '#FF9F0A',
    warningOrangeLight: 'rgba(255, 159, 10, 0.12)',
    infoBlue: '#58A6FF',
    infoBlueLight: 'rgba(88, 166, 255, 0.12)',

    // Status
    success: '#3FB950',
    warning: '#FF9F0A',
    error: '#FF453A',
    errorLight: 'rgba(255, 69, 58, 0.1)',

    // Borders & Shadows
    border: 'rgba(255, 255, 255, 0.06)',
    borderStrong: 'rgba(255, 255, 255, 0.12)',
    shadow: '#000000',
    shadowOpacity: 0.3,

    // Gradient
    gradientStart: '#58A6FF',
    gradientEnd: '#8B8BF5',
    gradientHealthStart: '#3FB950',
    gradientHealthEnd: '#58A6FF',

    // Glass
    glass: 'rgba(22, 27, 34, 0.82)',
    glassBorder: 'rgba(255, 255, 255, 0.06)',

    // Tab Bar
    tabBarBg: 'rgba(13, 17, 23, 0.94)',
    tabInactive: '#6E7681',
    tabActive: '#58A6FF',
  },
};

export type ThemeColors = typeof colors.light;
