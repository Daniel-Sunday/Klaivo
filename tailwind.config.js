module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "surface-dim": "var(--bg-primary)",
        "surface": "var(--surface)",
        "surface-container-lowest": "var(--bg-primary)",
        "surface-container-low": "var(--surface-low)",
        "surface-container": "var(--surface-mid)",
        "surface-container-high": "var(--surface-high)",
        "surface-container-highest": "var(--surface-high)",
        "on-surface": "var(--text-body)",
        "on-surface-variant": "var(--text-secondary)",
        "primary-container": "var(--accent-subtle)",
        "on-primary": "var(--text-primary)",
        "outline": "var(--text-secondary)",
        "outline-variant": "var(--ghost-border)",
        "bg-primary": "var(--bg-primary)",
        "bg-secondary": "var(--bg-secondary)",
        "surface-low": "var(--surface-low)",
        "text-primary": "var(--text-primary)",
        "text-body": "var(--text-body)",
        "text-secondary": "var(--text-secondary)",
        "accent": "var(--accent)",
      },
      fontFamily: {
        headline: ["Manrope", "sans-serif"],
        display: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      padding: {
        'safe-top': 'env(safe-area-inset-top, 0px)',
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
      }
    },
  },
  plugins: [],
}

