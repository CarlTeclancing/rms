export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        brand: {
          50: '#eef8f3',
          100: '#d8f0e3',
          500: '#20966d',
          600: '#187b5a',
          700: '#146348'
        },
        ink: '#17211f'
      },
      boxShadow: {
        soft: '0 18px 60px rgba(23, 33, 31, 0.08)'
      }
    }
  },
  plugins: []
};
