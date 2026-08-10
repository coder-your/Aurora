/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        serif: ['Spectral', 'serif'],
        sans: ['Work Sans', 'sans-serif'],
      },
      colors: {
        // Warm neutral palette
        cream: {
          50: "#FFFAF6",
          100: "#FFF5ED",
          200: "#F5F2EB",
          300: "#EBE8E1",
          400: "#E8E4DE",
          500: "#DDD9D3",
        },
        charcoal: {
          50: "#5A5853",
          100: "#4A4845",
          200: "#3C3937",
          300: "#2D2B2A",
          400: "#1F1E1D",
        },
        // Accent colors (warm, muted)
        clay: {
          light: "#E8CCBC",
          main: "#D4A574",
          dark: "#B88A5C",
        },
        sage: "#6B8E7F",
        gold: "#C9A875",
        terracotta: "#C9785C",
        burgundy: "#A87676",
        
        // Deprecated (kept for compatibility)
        lavender: "#f8edf6",
        purpleDark: "#2c2345",
        purpleLight: "#7d5ba6",
      },
      borderRadius: {
        "card": "16px",
        "input": "12px",
        "button": "8px",
      },
      boxShadow: {
        "soft": "0 2px 8px rgba(0, 0, 0, 0.04)",
        "medium": "0 4px 16px rgba(0, 0, 0, 0.08)",
        "card": "0 2px 12px rgba(0, 0, 0, 0.06)",
      },
      spacing: {
        "card-padding": "20px",
        "card-gap": "16px",
      },
    },
  },
  plugins: [],
};
