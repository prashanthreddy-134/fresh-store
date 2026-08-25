/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        leaf: { DEFAULT: "#1B7A43", dark: "#125C31", light: "#E3F3E8" },
        mango: { DEFAULT: "#FF7A1A", dark: "#E0630A" },
        ink: "#182419",
        cream: "#F7F8F3",
        panel: "#101913",
      },
      fontFamily: {
        display: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: { xl2: "1.25rem" },
    },
  },
  plugins: [],
};
