/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0F1417',
          panel: '#171D21',
          border: '#232B30'
        },
        flow: {
          DEFAULT: '#3ECF7E',
          dim: '#1B5E3A'
        },
        paper: '#E8E6E1',
        mute: '#7C868C'
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['Inter', 'sans-serif']
      }
    }
  },
  plugins: []
}
