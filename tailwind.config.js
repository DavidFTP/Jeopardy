/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        jeopardy: {
          blue: "#060CE9",
          darkBlue: "#03114b",
          gold: "#FFD700",
          lightGold: "#fff176",
        },
      },
      fontFamily: {
        display: ["'Segoe UI'", "Roboto", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}

