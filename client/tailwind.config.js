/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg)',
        surface: 'var(--surface)',
        surfaceLight: 'var(--surface-light)',
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        accent: 'var(--accent)',
        neonGreen: 'var(--neon-green)',
        glass: 'var(--glass)',
        textMain: 'var(--text-main)',
        textMuted: 'var(--text-muted)',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, var(--glass) 0%, rgba(0,0,0,0) 100%)',
      },
      boxShadow: {
        'glass': 'var(--shadow-glass)',
        'neon-primary': 'var(--shadow-neon-primary)',
        'neon-accent': 'var(--shadow-neon-accent)',
      },
      borderColor: {
        'glass': 'var(--glass-border)',
      }
    },
  },
  plugins: [],
}
