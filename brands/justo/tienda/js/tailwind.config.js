// Tailwind (CDN) theme for the Justo shop. Load right after https://cdn.tailwindcss.com.
// Casa Siego palette: white/beige page, wine ink, wine for actions, brass for ornaments (names kept from v1).
// Mirrors :root in ../css/tienda.css and the tokens of /css/site.css.
tailwind.config = {
    theme: {
        extend: {
            colors: {
                ink: { DEFAULT: '#3B1A1F', 700: '#4A1621', 500: '#6F5E57', 400: '#8E7F77', 300: '#C2B6AC' },
                parchment: { DEFAULT: '#F7F2EA', 100: '#EEE4D3', 200: '#E3D5BD' },
                rust: { DEFAULT: '#6B1E2C', 700: '#4A1621' },
                gold: { DEFAULT: '#B0905E', 300: '#D3BC93' },
                line: '#E3D5BD',
            },
            fontFamily: {
                display: ['Cinzel', '"Trajan Pro"', 'Georgia', 'serif'],
                section: ['"Bodoni Moda"', '"GFS Didot"', 'Didot', 'Georgia', 'serif'],
                serif: ['"EB Garamond"', 'Garamond', 'Georgia', 'serif'],
                meta: ['Spectral', '"EB Garamond"', 'Georgia', 'serif'],
            },
            letterSpacing: { label: '0.14em', display: '0.15em' },
        },
    },
};
