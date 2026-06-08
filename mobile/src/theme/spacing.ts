// Spacing & Typography tokens

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  massive: 64,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
  circle: 9999,
};

export const typography = {
  // Display
  displayLarge: {
    fontSize: 34,
    fontWeight: '800' as const,
    letterSpacing: -0.8,
    lineHeight: 42,
  },
  displayMedium: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.6,
    lineHeight: 36,
  },

  // Headlines
  h1: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  h2: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  h3: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 24,
  },

  // Body
  bodyLarge: {
    fontSize: 17,
    fontWeight: '400' as const,
    letterSpacing: -0.1,
    lineHeight: 24,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 18,
  },

  // Labels
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
    lineHeight: 18,
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
    lineHeight: 14,
  },

  // Caption
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0,
    lineHeight: 16,
  },

  // Button
  button: {
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: -0.1,
    lineHeight: 20,
  },
  buttonSmall: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 18,
  },
};

export const shadows = {
  sm: {
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  md: {
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
  },
  lg: {
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
  },
  xl: {
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 32,
  },
};
