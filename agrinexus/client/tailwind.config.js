/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#effef4",
          100: "#d8fce5",
          200: "#b4f7cc",
          300: "#78eca1",
          400: "#3fd872",
          500: "#1fbe57",
          600: "#149845",
          700: "#14783a",
          800: "#155f33",
          900: "#134e2c"
        }
      }
    }
  },
  plugins: []
};
