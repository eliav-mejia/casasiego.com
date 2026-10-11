// Tailwind (CDN) theme for the Justo shop. Load right after https://cdn.tailwindcss.com.
// Synodé palette ("Hellenic Manuscript"): parchment page, Aegean ink, rust for actions, gold for ornaments.
// Mirrors :root in ../css/tienda.css and the tokens of /css/site.css.
tailwind.config = {
    theme: {
        extend: {
            colors: {
                ink: { DEFAULT: '#0C1821', 700: '#2a3640', 500: '#516053', 400: '#7c857d', 300: '#b3b6ad' },
                parchment: { DEFAULT: '#F7F4EE', 100: '#efeae0', 200: '#e6dfd1' },
                rust: { DEFAULT: '#A34828', 700: '#86391f' },
                gold: { DEFAULT: '#C29B38', 300: '#dcc488' },
                line: '#ddd5c5',
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
