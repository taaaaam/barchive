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
        // Brand colors as rgb channels (same values as the CSS variables in
        // globals.css) so opacity modifiers like bg-white/10 or text-white/75 work;
        // with plain var() colors Tailwind silently skips those classes.
        white: "rgb(255 255 255 / <alpha-value>)",
        green: "rgb(4 117 40 / <alpha-value>)",
        "green-light": "rgb(5 150 105 / <alpha-value>)",
        "green-dark": "rgb(3 90 31 / <alpha-value>)",
        "gray-light": "rgb(249 250 251 / <alpha-value>)",
        "gray-medium": "rgb(107 114 128 / <alpha-value>)",
        "gray-dark": "rgb(55 65 81 / <alpha-value>)",
      },
      fontFamily: {
        serif: ["Tagesschrift", "serif"],
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
