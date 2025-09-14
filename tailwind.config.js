/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/react-app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Official Brain Fog Recovery Source brand colors
        'bfrs': {
          // Electric Green variations
          'electric': '#C5F213',      // Main brand green
          'electric-light': '#D4F655', // Lighter electric green
          'electric-lighter': '#E2F899', // Even lighter
          'electric-dark': '#9FD60A',  // Darker electric green
          'electric-darker': '#7CB806', // Even darker
          
          // Black variations  
          'black': '#000000',         // Main brand black
          'black-light': '#1A1A1A',  // Slightly lighter black
          'black-lighter': '#333333', // Light black/dark gray
          'black-dark': '#000000',   // Pure black (same as main)
          
          // Grayscale using black as base
          'gray-50': '#F8F8F8',
          'gray-100': '#F0F0F0',
          'gray-200': '#E0E0E0',
          'gray-300': '#CCCCCC',
          'gray-400': '#999999',
          'gray-500': '#666666',
          'gray-600': '#4D4D4D',
          'gray-700': '#333333',
          'gray-800': '#1A1A1A',
          'gray-900': '#000000',
          
          // Legacy number mappings to brand colors
          50: '#E2F899',    // Electric green lighter
          100: '#D4F655',   // Electric green light
          200: '#C5F213',   // Electric green main
          300: '#9FD60A',   // Electric green dark
          400: '#7CB806',   // Electric green darker
          500: '#C5F213',   // Main electric green
          600: '#9FD60A',   // Electric green dark
          700: '#7CB806',   // Electric green darker
          800: '#333333',   // Black lighter
          900: '#000000',   // Black main
        }
      }
    },
  },
  plugins: [],
};
