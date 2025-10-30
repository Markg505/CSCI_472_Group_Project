/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', "serif"],   // headings
        sans: ["Inter", "system-ui", "sans-serif"], // body
      },
      colors: {
        bg: "#0f0f10",         // rich near-black
        card: "#161617",
        gold: "#bfa26a",
        text: "#e7e7e7",
        mute: "#b3b3b3",
      },
    },
  },
  plugins: [],
};
