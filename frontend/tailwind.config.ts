import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: "#0A1628",
          navy: "#10213A",
          cyan: "#06B6D4",
          cyanSoft: "#67E8F9",
          orange: "#F59E0B",
          orangeSoft: "#FDBA74",
          line: "rgba(255,255,255,0.12)",
          text: "#E2ECFF",
          muted: "#8CA0BF"
        },
        category: {
          sports: "#3B82F6",
          politics: "#EF4444",
          culture: "#8B5CF6",
          epita: "#06B6D4"
        }
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"]
      },
      boxShadow: {
        glow: "0 18px 40px rgba(6, 182, 212, 0.18)",
        "glow-orange": "0 18px 40px rgba(245, 158, 11, 0.18)"
      },
      backgroundImage: {
        "hero-radial":
          "radial-gradient(circle at top left, rgba(6,182,212,0.28), transparent 42%), radial-gradient(circle at bottom right, rgba(245,158,11,0.22), transparent 38%)",
        "cta-gradient": "linear-gradient(135deg, #06B6D4 0%, #F59E0B 100%)"
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
