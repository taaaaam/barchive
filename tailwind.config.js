/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        white: "var(--white)",
        green: "var(--green)",
        "green-light": "var(--green-light)",
        "green-dark": "var(--green-dark)",
        "gray-light": "var(--gray-light)",
        "gray-medium": "var(--gray-medium)",
        "gray-dark": "var(--gray-dark)",
      },
      fontFamily: {
        serif: ["Tagesschrift", "serif"],
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
