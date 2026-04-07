import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          ink: "#09090B",
          navy: "#18181B",
          cyan: "#10B981",
          cyanSoft: "#6EE7B7",
          orange: "#F59E0B",
          orangeSoft: "#FCD34D",
          line: "rgba(63,63,70,0.95)",
          text: "#FAFAFA",
          muted: "#A1A1AA"
        },
        category: {
          sports: "#38BDF8",
          politics: "#FB7185",
          culture: "#C084FC",
          epita: "#10B981"
        }
      },
      fontFamily: {
        sans: ["Manrope", "Inter", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"]
      },
      boxShadow: {
        glow: "0 18px 40px rgba(16, 185, 129, 0.14)",
        "glow-orange": "0 18px 40px rgba(245, 158, 11, 0.12)"
      },
      backgroundImage: {
        "hero-radial":
          "radial-gradient(circle at top left, rgba(16,185,129,0.18), transparent 42%), radial-gradient(circle at bottom right, rgba(245,158,11,0.12), transparent 38%)",
        "cta-gradient": "linear-gradient(135deg, #10B981 0%, #34D399 100%)"
      },
      backdropBlur: {
        glass: "12px"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" }
        }
      },
      animation: {
        float: "float 6s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
