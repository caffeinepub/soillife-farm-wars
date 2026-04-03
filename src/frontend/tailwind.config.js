import typography from "@tailwindcss/typography";
import containerQueries from "@tailwindcss/container-queries";
import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["index.html", "src/**/*.{js,ts,jsx,tsx,html,css}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', "monospace"],
        ui: ["system-ui", "sans-serif"],
      },
      colors: {
        border: "oklch(var(--border))",
        input: "oklch(var(--input))",
        ring: "oklch(var(--ring) / <alpha-value>)",
        background: "oklch(var(--background))",
        foreground: "oklch(var(--foreground))",
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
          foreground: "oklch(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "oklch(var(--popover))",
          foreground: "oklch(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "oklch(var(--card))",
          foreground: "oklch(var(--card-foreground))",
        },
        chart: {
          1: "oklch(var(--chart-1))",
          2: "oklch(var(--chart-2))",
          3: "oklch(var(--chart-3))",
          4: "oklch(var(--chart-4))",
          5: "oklch(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "oklch(var(--sidebar))",
          foreground: "oklch(var(--sidebar-foreground))",
          primary: "oklch(var(--sidebar-primary))",
          "primary-foreground": "oklch(var(--sidebar-primary-foreground))",
          accent: "oklch(var(--sidebar-accent))",
          "accent-foreground": "oklch(var(--sidebar-accent-foreground))",
          border: "oklch(var(--sidebar-border))",
          ring: "oklch(var(--sidebar-ring))",
        },
        /* Game-specific semantic colors */
        neon: {
          green: "oklch(var(--neon-green))",
          purple: "oklch(var(--neon-purple))",
          cyan: "oklch(var(--neon-cyan))",
          gold: "oklch(var(--neon-gold))",
        },
        game: {
          bg: "oklch(var(--game-bg))",
          card: "oklch(var(--game-card))",
          soil: "oklch(var(--game-soil))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0,0,0,0.05)",
        "neon-green": "0 0 12px oklch(0.85 0.3 141), 0 0 24px oklch(0.85 0.3 141 / 0.4)",
        "neon-purple": "0 0 12px oklch(0.6 0.3 295), 0 0 24px oklch(0.6 0.3 295 / 0.4)",
        "neon-cyan": "0 0 12px oklch(0.85 0.18 198), 0 0 24px oklch(0.85 0.18 198 / 0.4)",
        "neon-gold": "0 0 12px oklch(0.82 0.18 80), 0 0 24px oklch(0.82 0.18 80 / 0.4)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "glow-pulse-green": {
          "0%, 100%": { boxShadow: "0 0 8px oklch(0.85 0.3 141), 0 0 16px oklch(0.85 0.3 141 / 0.3)" },
          "50%": { boxShadow: "0 0 16px oklch(0.85 0.3 141), 0 0 32px oklch(0.85 0.3 141 / 0.6)" },
        },
        "glow-pulse-purple": {
          "0%, 100%": { boxShadow: "0 0 8px oklch(0.6 0.3 295), 0 0 16px oklch(0.6 0.3 295 / 0.3)" },
          "50%": { boxShadow: "0 0 16px oklch(0.6 0.3 295), 0 0 32px oklch(0.6 0.3 295 / 0.6)" },
        },
        "glow-pulse-cyan": {
          "0%, 100%": { boxShadow: "0 0 8px oklch(0.85 0.18 198), 0 0 16px oklch(0.85 0.18 198 / 0.3)" },
          "50%": { boxShadow: "0 0 16px oklch(0.85 0.18 198), 0 0 32px oklch(0.85 0.18 198 / 0.6)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "damage-float": {
          "0%": { transform: "translateY(0px)", opacity: "1" },
          "100%": { transform: "translateY(-40px)", opacity: "0" },
        },
        "particle-drift": {
          "0%": { transform: "translateY(0) translateX(0)", opacity: "0" },
          "20%": { opacity: "1" },
          "100%": { transform: "translateY(-80px) translateX(20px)", opacity: "0" },
        },
        "harvest-flash": {
          "0%, 100%": { filter: "brightness(1)" },
          "50%": { filter: "brightness(1.8) saturate(1.5)" },
        },
        "spin-slow": {
          "from": { transform: "rotate(0deg)" },
          "to": { transform: "rotate(360deg)" },
        },
        "shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-4px)" },
          "75%": { transform: "translateX(4px)" },
        },
        "jackpot-reveal": {
          "0%": { transform: "scale(0) rotate(-10deg)", opacity: "0" },
          "60%": { transform: "scale(1.1) rotate(3deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "glow-green": "glow-pulse-green 2s ease-in-out infinite",
        "glow-purple": "glow-pulse-purple 2s ease-in-out infinite",
        "glow-cyan": "glow-pulse-cyan 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "damage-float": "damage-float 1.2s ease-out forwards",
        "particle-drift": "particle-drift 2s ease-out forwards",
        "harvest-flash": "harvest-flash 0.4s ease-in-out",
        "spin-slow": "spin-slow 8s linear infinite",
        "shake": "shake 0.3s ease-in-out",
        "jackpot-reveal": "jackpot-reveal 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
      },
    },
  },
  plugins: [typography, containerQueries, animate],
};
