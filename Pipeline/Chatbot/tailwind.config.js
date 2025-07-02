/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'theme': {
          'primary': 'var(--color-primary)',
          'secondary': 'var(--color-secondary)',
          'tertiary': 'var(--color-tertiary)',
          'text-primary': 'var(--color-textPrimary)',
          'text-secondary': 'var(--color-textSecondary)',
          'text-muted': 'var(--color-textMuted)',
          'accent': 'var(--color-accent)',
          'accent-hover': 'var(--color-accentHover)',
          'border': 'var(--color-border)',
          'border-light': 'var(--color-borderLight)',
          'success': 'var(--color-success)',
          'warning': 'var(--color-warning)',
          'error': 'var(--color-error)',
          'info': 'var(--color-info)',
        }
      }
    },
  },
  plugins: [],
} 