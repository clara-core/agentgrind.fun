/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // AgentGrind brand palette — dark cyber + electric green
        brand: {
          green: '#00E676',
          greenDark: '#00C65C',
          bg: '#0A0E17',
          card: '#111722',
          cardHover: '#161D2E',
          border: '#1E2736',
          text: '#E2E8F0',
          textMuted: '#94A3B8',
        },
      },
    },
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
  },
  plugins: [],
};
