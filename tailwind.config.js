/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./views/**/*.ejs'], // Corrected the syntax here
  theme: {
    extend: {},
    container: {
      center: true,
    },
  },
  plugins: [
    require('daisyui'),
    require('@tailwindcss/typography'),
  ],
  daisyui: {
    themes: ['lemonade'], 
  },
};

 
