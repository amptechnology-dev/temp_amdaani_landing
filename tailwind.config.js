/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // Enables toggling dark mode via a CSS class
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
