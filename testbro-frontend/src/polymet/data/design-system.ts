// Design System Configuration for TestBro.ai
// Comprehensive design tokens for consistent UI/UX

export const designSystem = {
  // Color System - Semantic colors for different contexts
  colors: {
    // Primary brand colors
    primary: {
      50: "hsl(217, 91%, 95%)",
      100: "hsl(217, 91%, 90%)",
      200: "hsl(217, 91%, 80%)",
      300: "hsl(217, 91%, 70%)",
      400: "hsl(217, 91%, 60%)",
      500: "hsl(217, 91%, 50%)", // Main brand color
      600: "hsl(217, 91%, 45%)",
      700: "hsl(217, 91%, 40%)",
      800: "hsl(217, 91%, 35%)",
      900: "hsl(217, 91%, 30%)",
    },

    // Secondary colors
    secondary: {
      50: "hsl(270, 50%, 95%)",
      100: "hsl(270, 50%, 90%)",
      200: "hsl(270, 50%, 80%)",
      300: "hsl(270, 50%, 70%)",
      400: "hsl(270, 50%, 60%)",
      500: "hsl(270, 50%, 50%)",
      600: "hsl(270, 50%, 45%)",
      700: "hsl(270, 50%, 40%)",
      800: "hsl(270, 50%, 35%)",
      900: "hsl(270, 50%, 30%)",
    },

    // Semantic colors
    success: {
      50: "hsl(142, 76%, 95%)",
      100: "hsl(142, 76%, 90%)",
      200: "hsl(142, 76%, 80%)",
      300: "hsl(142, 76%, 70%)",
      400: "hsl(142, 76%, 60%)",
      500: "hsl(142, 76%, 50%)",
      600: "hsl(142, 76%, 45%)",
      700: "hsl(142, 76%, 40%)",
      800: "hsl(142, 76%, 35%)",
      900: "hsl(142, 76%, 30%)",
    },

    warning: {
      50: "hsl(38, 92%, 95%)",
      100: "hsl(38, 92%, 90%)",
      200: "hsl(38, 92%, 80%)",
      300: "hsl(38, 92%, 70%)",
      400: "hsl(38, 92%, 60%)",
      500: "hsl(38, 92%, 50%)",
      600: "hsl(38, 92%, 45%)",
      700: "hsl(38, 92%, 40%)",
      800: "hsl(38, 92%, 35%)",
      900: "hsl(38, 92%, 30%)",
    },

    error: {
      50: "hsl(0, 84%, 95%)",
      100: "hsl(0, 84%, 90%)",
      200: "hsl(0, 84%, 80%)",
      300: "hsl(0, 84%, 70%)",
      400: "hsl(0, 84%, 60%)",
      500: "hsl(0, 84%, 50%)",
      600: "hsl(0, 84%, 45%)",
      700: "hsl(0, 84%, 40%)",
      800: "hsl(0, 84%, 35%)",
      900: "hsl(0, 84%, 30%)",
    },

    info: {
      50: "hsl(199, 89%, 95%)",
      100: "hsl(199, 89%, 90%)",
      200: "hsl(199, 89%, 80%)",
      300: "hsl(199, 89%, 70%)",
      400: "hsl(199, 89%, 60%)",
      500: "hsl(199, 89%, 50%)",
      600: "hsl(199, 89%, 45%)",
      700: "hsl(199, 89%, 40%)",
      800: "hsl(199, 89%, 35%)",
      900: "hsl(199, 89%, 30%)",
    },

    // Neutral grays
    neutral: {
      0: "hsl(0, 0%, 100%)",
      50: "hsl(210, 40%, 98%)",
      100: "hsl(210, 40%, 96%)",
      200: "hsl(214, 32%, 91%)",
      300: "hsl(213, 27%, 84%)",
      400: "hsl(215, 20%, 65%)",
      500: "hsl(215, 16%, 47%)",
      600: "hsl(215, 19%, 35%)",
      700: "hsl(215, 25%, 27%)",
      800: "hsl(217, 33%, 17%)",
      900: "hsl(222, 84%, 5%)",
    },
  },

  // Typography Scale
  typography: {
    fontFamily: {
      sans: ["Inter", "system-ui", "sans-serif"],
      mono: ["JetBrains Mono", "Consolas", "monospace"],
    },

    fontSize: {
      xs: ["0.75rem", { lineHeight: "1rem" }], // 12px
      sm: ["0.875rem", { lineHeight: "1.25rem" }], // 14px
      base: ["1rem", { lineHeight: "1.5rem" }], // 16px
      lg: ["1.125rem", { lineHeight: "1.75rem" }], // 18px
      xl: ["1.25rem", { lineHeight: "1.75rem" }], // 20px
      "2xl": ["1.5rem", { lineHeight: "2rem" }], // 24px
      "3xl": ["1.875rem", { lineHeight: "2.25rem" }], // 30px
      "4xl": ["2.25rem", { lineHeight: "2.5rem" }], // 36px
      "5xl": ["3rem", { lineHeight: "1" }], // 48px
      "6xl": ["3.75rem", { lineHeight: "1" }], // 60px
      "7xl": ["4.5rem", { lineHeight: "1" }], // 72px
    },

    fontWeight: {
      thin: "100",
      extralight: "200",
      light: "300",
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      extrabold: "800",
      black: "900",
    },
  },

  // Spacing System - Consistent spacing scale
  spacing: {
    px: "1px",
    0: "0",
    0.5: "0.125rem", // 2px
    1: "0.25rem", // 4px
    1.5: "0.375rem", // 6px
    2: "0.5rem", // 8px
    2.5: "0.625rem", // 10px
    3: "0.75rem", // 12px
    3.5: "0.875rem", // 14px
    4: "1rem", // 16px
    5: "1.25rem", // 20px
    6: "1.5rem", // 24px
    7: "1.75rem", // 28px
    8: "2rem", // 32px
    9: "2.25rem", // 36px
    10: "2.5rem", // 40px
    11: "2.75rem", // 44px
    12: "3rem", // 48px
    14: "3.5rem", // 56px
    16: "4rem", // 64px
    20: "5rem", // 80px
    24: "6rem", // 96px
    28: "7rem", // 112px
    32: "8rem", // 128px
    36: "9rem", // 144px
    40: "10rem", // 160px
    44: "11rem", // 176px
    48: "12rem", // 192px
    52: "13rem", // 208px
    56: "14rem", // 224px
    60: "15rem", // 240px
    64: "16rem", // 256px
    72: "18rem", // 288px
    80: "20rem", // 320px
    96: "24rem", // 384px
  },

  // Border Radius
  borderRadius: {
    none: "0",
    sm: "0.125rem", // 2px
    base: "0.25rem", // 4px
    md: "0.375rem", // 6px
    lg: "0.5rem", // 8px
    xl: "0.75rem", // 12px
    "2xl": "1rem", // 16px
    "3xl": "1.5rem", // 24px
    full: "9999px",
  },

  // Shadows
  boxShadow: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    base: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
    inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
  },

  // Animation & Transitions
  animation: {
    duration: {
      75: "75ms",
      100: "100ms",
      150: "150ms",
      200: "200ms",
      300: "300ms",
      500: "500ms",
      700: "700ms",
      1000: "1000ms",
    },

    easing: {
      linear: "linear",
      in: "cubic-bezier(0.4, 0, 1, 1)",
      out: "cubic-bezier(0, 0, 0.2, 1)",
      inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
  },

  // Breakpoints for responsive design
  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },

  // Component-specific tokens
  components: {
    button: {
      height: {
        sm: "2rem", // 32px
        base: "2.5rem", // 40px
        lg: "3rem", // 48px
        xl: "3.5rem", // 56px
      },
      padding: {
        sm: "0.5rem 0.75rem",
        base: "0.625rem 1rem",
        lg: "0.75rem 1.5rem",
        xl: "1rem 2rem",
      },
    },

    input: {
      height: {
        sm: "2rem",
        base: "2.5rem",
        lg: "3rem",
      },
      padding: "0.625rem 0.75rem",
    },

    card: {
      padding: {
        sm: "1rem",
        base: "1.5rem",
        lg: "2rem",
      },
      borderRadius: "0.5rem",
      shadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    },
  },

  // Touch-friendly sizes for mobile
  touch: {
    minTarget: "44px", // Minimum touch target size
    spacing: "12px", // Minimum spacing between touch targets
  },
};

// Utility functions for design system
export const getColor = (color: string, shade: number = 500) => {
  const [colorName] = color.split("-");
  return (
    designSystem.colors[colorName as keyof typeof designSystem.colors]?.[
      shade as keyof typeof designSystem.colors.primary
    ] || color
  );
};

export const getSpacing = (size: keyof typeof designSystem.spacing) => {
  return designSystem.spacing[size];
};

export const getFontSize = (
  size: keyof typeof designSystem.typography.fontSize
) => {
  return designSystem.typography.fontSize[size];
};

// CSS Custom Properties for runtime theming
export const cssVariables = `
  :root {
    /* Primary Colors */
    --color-primary-50: ${designSystem.colors.primary[50]};
    --color-primary-100: ${designSystem.colors.primary[100]};
    --color-primary-500: ${designSystem.colors.primary[500]};
    --color-primary-600: ${designSystem.colors.primary[600]};
    --color-primary-700: ${designSystem.colors.primary[700]};
    
    /* Semantic Colors */
    --color-success-500: ${designSystem.colors.success[500]};
    --color-warning-500: ${designSystem.colors.warning[500]};
    --color-error-500: ${designSystem.colors.error[500]};
    --color-info-500: ${designSystem.colors.info[500]};
    
    /* Neutral Colors */
    --color-neutral-0: ${designSystem.colors.neutral[0]};
    --color-neutral-50: ${designSystem.colors.neutral[50]};
    --color-neutral-100: ${designSystem.colors.neutral[100]};
    --color-neutral-200: ${designSystem.colors.neutral[200]};
    --color-neutral-300: ${designSystem.colors.neutral[300]};
    --color-neutral-400: ${designSystem.colors.neutral[400]};
    --color-neutral-500: ${designSystem.colors.neutral[500]};
    --color-neutral-600: ${designSystem.colors.neutral[600]};
    --color-neutral-700: ${designSystem.colors.neutral[700]};
    --color-neutral-800: ${designSystem.colors.neutral[800]};
    --color-neutral-900: ${designSystem.colors.neutral[900]};
    
    /* Spacing */
    --spacing-1: ${designSystem.spacing[1]};
    --spacing-2: ${designSystem.spacing[2]};
    --spacing-3: ${designSystem.spacing[3]};
    --spacing-4: ${designSystem.spacing[4]};
    --spacing-6: ${designSystem.spacing[6]};
    --spacing-8: ${designSystem.spacing[8]};
    --spacing-12: ${designSystem.spacing[12]};
    --spacing-16: ${designSystem.spacing[16]};
    --spacing-20: ${designSystem.spacing[20]};
    --spacing-24: ${designSystem.spacing[24]};
    
    /* Typography */
    --font-size-sm: ${designSystem.typography.fontSize.sm[0]};
    --font-size-base: ${designSystem.typography.fontSize.base[0]};
    --font-size-lg: ${designSystem.typography.fontSize.lg[0]};
    --font-size-xl: ${designSystem.typography.fontSize.xl[0]};
    --font-size-2xl: ${designSystem.typography.fontSize["2xl"][0]};
    --font-size-3xl: ${designSystem.typography.fontSize["3xl"][0]};
    
    /* Border Radius */
    --border-radius-sm: ${designSystem.borderRadius.sm};
    --border-radius-base: ${designSystem.borderRadius.base};
    --border-radius-lg: ${designSystem.borderRadius.lg};
    --border-radius-xl: ${designSystem.borderRadius.xl};
    
    /* Shadows */
    --shadow-sm: ${designSystem.boxShadow.sm};
    --shadow-base: ${designSystem.boxShadow.base};
    --shadow-md: ${designSystem.boxShadow.md};
    --shadow-lg: ${designSystem.boxShadow.lg};
    
    /* Animation */
    --duration-150: ${designSystem.animation.duration[150]};
    --duration-200: ${designSystem.animation.duration[200]};
    --duration-300: ${designSystem.animation.duration[300]};
    --easing-out: ${designSystem.animation.easing.out};
  }
`;

export default designSystem;
