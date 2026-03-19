/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        'playfair': ['PlayfairDisplay-Regular'],
        'playfair-bold': ['PlayfairDisplay-Bold'],
        'dm': ['DMSans-Regular'],
        'dm-medium': ['DMSans-Medium'],
        'dm-bold': ['DMSans-Bold'],
        'mono': ['DMSans-Regular'],
      },
      colors: {
        navy: '#0B1F3A',
        gold: '#C9993A',
        cream: '#FAF7F2',
      },
    },
  },
  plugins: [],
};
