/** Shared Tailwind design tokens. Swap these values for final branding. */
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf4ff",
          100: "#fae8ff",
          200: "#f3caff",
          300: "#e79bff",
          400: "#d566fb",
          500: "#bb3af0",
          600: "#9f22cd",
          700: "#821aa8",
          800: "#6b1988",
          900: "#59196f"
        },
        room: {
          bg: "#fff7f0",
          card: "#ffffff"
        }
      },
      borderRadius: {
        bubble: "9999px",
        card: "1.25rem"
      }
    }
  }
};
