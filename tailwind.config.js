/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        // ── Stitch / Material-3 design tokens ──────────────────────────────
        "rs-primary":              "#004527",
        "rs-primary-container":    "#1b5e3b",
        "rs-primary-fixed":        "#aef2c4",
        "rs-primary-fixed-dim":    "#92d5a9",
        "rs-on-primary":           "#ffffff",
        "rs-on-primary-fixed":     "#002110",
        "rs-on-primary-fixed-variant": "#085230",

        "rs-secondary":            "#625e58",
        "rs-secondary-container":  "#e5dfd7",
        "rs-secondary-fixed":      "#e8e1da",
        "rs-secondary-fixed-dim":  "#ccc6be",
        "rs-on-secondary":         "#ffffff",
        "rs-on-secondary-container": "#66625c",

        "rs-tertiary":             "#65282e",
        "rs-tertiary-container":   "#813e44",
        "rs-tertiary-fixed":       "#ffdadb",
        "rs-tertiary-fixed-dim":   "#ffb2b7",
        "rs-on-tertiary":          "#ffffff",
        "rs-on-tertiary-container": "#ffb2b6",

        "rs-surface":              "#f8faf5",
        "rs-surface-bright":       "#f8faf5",
        "rs-surface-dim":          "#d8dbd6",
        "rs-surface-variant":      "#e1e3de",
        "rs-surface-container-lowest": "#ffffff",
        "rs-surface-container-low":    "#f2f4ef",
        "rs-surface-container":        "#ecefe9",
        "rs-surface-container-high":   "#e6e9e4",
        "rs-surface-container-highest":"#e1e3de",

        "rs-on-surface":           "#191c19",
        "rs-on-surface-variant":   "#404942",
        "rs-on-background":        "#191c19",
        "rs-background":           "#f8faf5",
        "rs-outline":              "#707971",
        "rs-outline-variant":      "#bfc9bf",
        "rs-inverse-surface":      "#2e312e",
        "rs-inverse-on-surface":   "#eff2ec",
        "rs-inverse-primary":      "#92d5a9",
        "rs-error":                "#ba1a1a",
        "rs-error-container":      "#ffdad6",
        "rs-on-error":             "#ffffff",
        "rs-on-error-container":   "#93000a",

        // ── shadcn/ui tokens (kept for existing components) ─────────────────
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
