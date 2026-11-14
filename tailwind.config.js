module.exports = {
  darkMode: ["selector", '[zaui-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EEF8EB",
          100: "#D8F0D2",
          200: "#B4E2A8",
          500: "#5DBE46",
          600: "#3FA32B",
          700: "#2E7D32",
          800: "#236B27",
          900: "#14532D",
        },
        surface: {
          muted: "#F6F8F5",
        },
      },
      fontFamily: {
        mono: ["Roboto Mono", "monospace"],
      },
    },
  },
};
