/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0b0f14",
        surface: "#141b24",
        raised: "#1b2530",
        line: "#263445",
        ink: "#e6edf3",
        muted: "#8b9bb0",
        accent: "#4ea3d6",
        "accent-dim": "#2a6a8f",
        gold: "#e8b84b",
        rare: "#4ea3d6",
        common: "#8b9bb0",
        done: "#52c77e",
        danger: "#e5484d",
      },
      fontFamily: {
        display: ['"Chakra Petch"', "sans-serif"],
        body: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        gold: "0 0 0 1px rgba(232,184,75,0.35), 0 0 18px -4px rgba(232,184,75,0.55)",
        node: "0 0 0 4px rgba(11,15,20,1), 0 0 14px -2px rgba(78,163,214,0.6)",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at 50% 0%, rgba(78,163,214,0.08), transparent 60%)",
      },
    },
  },
  plugins: [],
};
