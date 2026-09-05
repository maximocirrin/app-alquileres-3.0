import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./*.html",
    "./js/**/*.js",
    "./components/**/*.{html,js}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "on-background": "#1a1c1c",
        "inverse-surface": "#2f3131",
        "tertiary-fixed-dim": "#ffb3b1",
        "secondary-fixed-dim": "#c7c6c6",
        "error": "#ba1a1a",
        "surface": "#f9f9f9",
        "secondary-container": "#e1dfdf",
        "error-container": "#ffdad6",
        "inverse-on-surface": "#f1f1f1",
        "on-tertiary-container": "#ffc3c1",
        "on-primary": "#ffffff",
        "on-error-container": "#93000a",
        "surface-container-lowest": "#ffffff",
        "surface-container-highest": "#e2e2e2",
        "surface-variant": "#e2e2e2",
        "tertiary": "#7b2327",
        "on-tertiary": "#ffffff",
        "on-primary-container": "#ffc3bf",
        "primary-fixed-dim": "#ffb3ae",
        "on-primary-fixed": "#410005",
        "tertiary-fixed": "#ffdad8",
        "on-surface": "#1a1c1c",
        "surface-bright": "#f9f9f9",
        "primary": "#811b1e",
        "primary-hover": "#9e2226",
        "primary-light": "rgba(129, 27, 30, 0.08)",
        "surface-tint": "#a73737",
        "on-secondary": "#ffffff",
        "on-primary-fixed-variant": "#871f22",
        "surface-container-low": "#f3f3f3",
        "secondary": "#5e5e5e",
        "outline": "#8b716f",
        "on-error": "#ffffff",
        "background": "#f9f9f9",
        "primary-fixed": "#ffdad7",
        "on-secondary-fixed-variant": "#464747",
        "surface-container": "#eeeeee",
        "on-tertiary-fixed": "#410007",
        "on-surface-variant": "#574140",
        "tertiary-container": "#9a3a3c",
        "secondary-fixed": "#e4e2e2",
        "on-secondary-fixed": "#1b1c1c",
        "on-tertiary-fixed-variant": "#80272b",
        "surface-dim": "#dadada",
        "surface-container-high": "#e8e8e8",
        "outline-variant": "#debfbd",
        "inverse-primary": "#ffb3ae",
        "primary-container": "#a13333",
        "on-secondary-container": "#636262"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
        "full": "9999px"
      },
      fontFamily: {
        headline: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Inter", "sans-serif"]
      }
    }
  },
  plugins: [forms, containerQueries]
};
