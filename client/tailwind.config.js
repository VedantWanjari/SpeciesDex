/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#10251b',
        moss: '#1e4d38',
        fern: '#78a76a',
        parchment: '#f4edd9',
        gold: '#d8a83c'
      },
      fontFamily: { display: ['Bree Serif', 'Georgia', 'serif'], body: ['DM Sans', 'sans-serif'] }
    }
  },
  plugins: []
};

