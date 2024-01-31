import type { Config } from "tailwindcss";
import { nextui } from "@nextui-org/react";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [nextui({
    themes: {
      light: {
        colors: {
          background: "#FFF", // or DEFAULT
          foreground: "#1A1D23", // or 50 to 900 DEFAULT
          primary: {
            //... 50 to 900
            foreground: "#FFF",
            DEFAULT: "#427AA1",
          },
          secondary: {
            //... 50 to 900
            foreground: "#FFF",
            DEFAULT: "#F28F3B",
          },
          // ... rest of the colors
        },
      }
    },
  })],
};
export default config;
