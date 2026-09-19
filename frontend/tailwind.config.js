/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        canvas: "#09090f",
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          400: "#818cf8",
          500: "#4f46e5",
          600: "#4338ca",
          700: "#3730a3",
        },
      },
      boxShadow: {
        glow: "0 0 40px -12px rgb(79 70 229 / 0.45)",
      },
    },
  },
  plugins: [],
};
