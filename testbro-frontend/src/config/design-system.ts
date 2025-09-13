/**
 * TestBro Design System
 * Centralized design tokens and configuration
 */

// =============================================================================
// Color Palette
// =============================================================================

export const colors = {
  // Primary Colors (TestBro Brand)
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Main primary
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },

  // Secondary Colors
  secondary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9', // Main secondary
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },

  // Success Colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Main success
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },

  // Warning Colors
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b', // Main warning
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },

  // Error Colors
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444', // Main error
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },

  // Neutral Colors
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },

  // Special Colors
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

// =============================================================================
// Typography
// =============================================================================

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    serif: ['Merriweather', 'serif'],
    mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
  },

  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }],
    '6xl': ['3.75rem', { lineHeight: '1' }],
    '7xl': ['4.5rem', { lineHeight: '1' }],
    '8xl': ['6rem', { lineHeight: '1' }],
    '9xl': ['8rem', { lineHeight: '1' }],
  },

  fontWeight: {
    thin: 100,
    extralight: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },

  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
} as const;

// =============================================================================
// Spacing
// =============================================================================

export const spacing = {
  0: '0',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  11: '2.75rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  28: '7rem',
  32: '8rem',
  36: '9rem',
  40: '10rem',
  44: '11rem',
  48: '12rem',
  52: '13rem',
  56: '14rem',
  60: '15rem',
  64: '16rem',
  72: '18rem',
  80: '20rem',
  96: '24rem',
} as const;

// =============================================================================\n// Border Radius
// =============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.125rem',
  base: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
} as const;

// =============================================================================
// Shadows
// =============================================================================

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: '0 0 #0000',
} as const;

// =============================================================================
// Animation & Transitions
// =============================================================================

export const animation = {
  duration: {
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms',
  },

  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  keyframes: {
    spin: 'spin 1s linear infinite',
    ping: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
    pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    bounce: 'bounce 1s infinite',
  },
} as const;

// =============================================================================
// Breakpoints
// =============================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// =============================================================================
// Z-Index Scale
// =============================================================================

export const zIndex = {
  auto: 'auto',
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50', // Modals, overlays
  60: '60', // Tooltips
  70: '70', // Notifications
  80: '80', // Navigation
  90: '90', // Loading screens
  100: '100', // Critical alerts
} as const;

// =============================================================================
// Component Variants
// =============================================================================

export const variants = {
  button: {
    sizes: {
      xs: {
        padding: `${spacing[1]} ${spacing[2]}`,
        fontSize: typography.fontSize.xs[0],
        borderRadius: borderRadius.sm,
      },
      sm: {
        padding: `${spacing[1.5]} ${spacing[3]}`,
        fontSize: typography.fontSize.sm[0],
        borderRadius: borderRadius.base,
      },
      md: {
        padding: `${spacing[2]} ${spacing[4]}`,
        fontSize: typography.fontSize.base[0],
        borderRadius: borderRadius.md,
      },
      lg: {
        padding: `${spacing[2.5]} ${spacing[6]}`,
        fontSize: typography.fontSize.lg[0],
        borderRadius: borderRadius.lg,
      },
      xl: {
        padding: `${spacing[3]} ${spacing[8]}`,
        fontSize: typography.fontSize.xl[0],
        borderRadius: borderRadius.xl,
      },
    },

    variants: {
      primary: {
        backgroundColor: colors.primary[500],
        color: colors.white,
        border: `1px solid ${colors.primary[500]}`,
        '&:hover': {
          backgroundColor: colors.primary[600],
          borderColor: colors.primary[600],
        },
        '&:focus': {
          outline: `2px solid ${colors.primary[500]}`,
          outlineOffset: '2px',
        },
        '&:disabled': {
          backgroundColor: colors.gray[300],
          borderColor: colors.gray[300],
          color: colors.gray[500],
          cursor: 'not-allowed',
        },
      },

      secondary: {
        backgroundColor: colors.white,
        color: colors.gray[900],
        border: `1px solid ${colors.gray[300]}`,
        '&:hover': {
          backgroundColor: colors.gray[50],
          borderColor: colors.gray[400],
        },
        '&:focus': {
          outline: `2px solid ${colors.primary[500]}`,
          outlineOffset: '2px',
        },
        '&:disabled': {
          backgroundColor: colors.gray[100],
          borderColor: colors.gray[200],
          color: colors.gray[400],
          cursor: 'not-allowed',
        },
      },

      success: {
        backgroundColor: colors.success[500],
        color: colors.white,
        border: `1px solid ${colors.success[500]}`,
        '&:hover': {
          backgroundColor: colors.success[600],
          borderColor: colors.success[600],
        },
      },

      warning: {
        backgroundColor: colors.warning[500],
        color: colors.white,
        border: `1px solid ${colors.warning[500]}`,
        '&:hover': {
          backgroundColor: colors.warning[600],
          borderColor: colors.warning[600],
        },
      },

      error: {
        backgroundColor: colors.error[500],
        color: colors.white,
        border: `1px solid ${colors.error[500]}`,
        '&:hover': {
          backgroundColor: colors.error[600],
          borderColor: colors.error[600],
        },
      },

      ghost: {
        backgroundColor: colors.transparent,
        color: colors.primary[500],
        border: `1px solid ${colors.transparent}`,
        '&:hover': {
          backgroundColor: colors.primary[50],
          color: colors.primary[600],
        },
      },
    },
  },

  input: {
    sizes: {
      sm: {
        padding: `${spacing[1.5]} ${spacing[3]}`,
        fontSize: typography.fontSize.sm[0],
        borderRadius: borderRadius.base,
      },
      md: {
        padding: `${spacing[2]} ${spacing[3]}`,
        fontSize: typography.fontSize.base[0],
        borderRadius: borderRadius.md,
      },
      lg: {
        padding: `${spacing[2.5]} ${spacing[4]}`,
        fontSize: typography.fontSize.lg[0],
        borderRadius: borderRadius.lg,
      },
    },

    states: {
      default: {
        border: `1px solid ${colors.gray[300]}`,
        backgroundColor: colors.white,
        color: colors.gray[900],
        '&:focus': {
          outline: `2px solid ${colors.primary[500]}`,
          outlineOffset: '2px',
          borderColor: colors.primary[500],
        },
      },
      error: {
        border: `1px solid ${colors.error[500]}`,
        backgroundColor: colors.white,
        color: colors.gray[900],
        '&:focus': {
          outline: `2px solid ${colors.error[500]}`,
          outlineOffset: '2px',
          borderColor: colors.error[500],
        },
      },
      disabled: {
        backgroundColor: colors.gray[100],
        borderColor: colors.gray[200],
        color: colors.gray[400],
        cursor: 'not-allowed',
      },
    },
  },

  card: {
    padding: spacing[6],
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.gray[200]}`,
  },
} as const;

// =============================================================================
// Semantic Colors (Light/Dark Theme)
// =============================================================================

export const semanticColors = {
  light: {
    background: {
      primary: colors.white,
      secondary: colors.gray[50],
      tertiary: colors.gray[100],
    },
    text: {
      primary: colors.gray[900],
      secondary: colors.gray[600],
      tertiary: colors.gray[400],
      inverse: colors.white,
    },
    border: {
      primary: colors.gray[200],
      secondary: colors.gray[300],
      focus: colors.primary[500],
    },
  },
  dark: {
    background: {
      primary: colors.gray[900],
      secondary: colors.gray[800],
      tertiary: colors.gray[700],
    },
    text: {
      primary: colors.gray[100],
      secondary: colors.gray[300],
      tertiary: colors.gray[400],
      inverse: colors.gray[900],
    },
    border: {
      primary: colors.gray[700],
      secondary: colors.gray[600],
      focus: colors.primary[400],
    },
  },
} as const;

// =============================================================================
// Export Design System
// =============================================================================

export const designSystem = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
  breakpoints,
  zIndex,
  variants,
  semanticColors,
} as const;

export default designSystem;
