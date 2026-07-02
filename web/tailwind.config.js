/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // "Loot Rarity" HUD. Theme/accent tokens are CSS vars (space-separated RGB),
        // swapped at runtime via [data-theme]/[data-accent] on <html>. Alpha utilities
        // (bg-accent/30 etc.) still work through <alpha-value>. Loot tiers stay fixed.
        base: "rgb(var(--color-base) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        raised: "rgb(var(--color-raised) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)", // primary UI accent (switchable)
        "accent-dim": "rgb(var(--color-accent-dim) / <alpha-value>)",
        mythic: "#ec4899", // mythic tier (magenta, top drop)
        gold: "#f5a623", // legendary tier (gold-orange)
        epic: "#a855f7", // epic tier (bright purple, NOT the UI accent)
        rare: "#4c8dff", // rare tier (electric blue)
        uncommon: "#57c96b", // uncommon tier (green)
        common: "#9aa0a6", // common tier (grey)
        done: "#3fce7c", // claimed / success
        danger: "#ff5964", // error
      },
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        body: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        // Mythic loot glow (magenta) — the strongest aura in the HUD.
        mythic:
          "0 0 0 1px rgba(236,72,153,0.5), 0 0 22px -4px rgba(236,72,153,0.7)",
        // Legendary loot glow (gold-orange).
        gold: "0 0 0 1px rgba(245,166,35,0.4), 0 0 18px -4px rgba(245,166,35,0.6)",
        // Accent glow (buttons, active nav, emblems) — follows the chosen accent.
        glow: "0 0 0 1px rgb(var(--color-accent) / 0.45), 0 0 20px -4px rgb(var(--color-accent) / 0.6)",
        // Timeline / node ring on the base surface.
        node: "0 0 0 4px rgb(var(--color-base) / 1), 0 0 14px -3px rgb(var(--color-accent) / 0.7)",
        // Panel top sheen + grounding shadow.
        case: "inset 0 1px 0 rgba(232,234,237,0.04), 0 12px 30px -18px rgba(0,0,0,0.8)",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at 50% 0%, rgb(var(--color-accent) / 0.12), transparent 60%)",
      },
    },
  },
  plugins: [],
};
