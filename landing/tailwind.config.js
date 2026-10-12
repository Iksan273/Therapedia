/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Poppins"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        sky: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7cc5fb",
          400: "#38bdf8",
          500: "#007AFF", // Official Therapedia Royal Blue
          600: "#007AFF",
          700: "#0066d6",
          800: "#0052ad",
          900: "#003e85",
          950: "#002554",
        },
        brand: {
          blue: "#007AFF",
          dark: "#005bb5",
          light: "#f0f7ff",
          cyan: "#00C7BE",
          navy: "#040e1e",
        },
      },
    },
  },
};
