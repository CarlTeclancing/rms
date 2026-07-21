export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        brand: {
          50: '#fff8e3',
          100: '#fff1ca',
          200: '#ffd071',
          500: '#d71920',
          600: '#bd151c',
          700: '#971116'
        },
        app: '#eef8fa',
        ink: '#17211f'
      },
      boxShadow: {
        soft: '0 18px 60px rgba(40, 50, 60, 0.08)',
        brand: '0 14px 28px rgba(215, 25, 32, 0.16)'
      }
    }
  },
  plugins: []
};
