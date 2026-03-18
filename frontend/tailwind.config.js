/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            animation: {
                'fadeIn': 'fadeIn 0.5s ease-out',
                'shake': 'shake 0.4s ease-in-out',
                'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
                'scaleIn': 'scaleIn 0.3s ease-out',
                'slideIn': 'slideIn 0.4s ease-out',
                'gradient': 'gradientShift 3s ease infinite',
            },
        },
    },
    plugins: [],
}