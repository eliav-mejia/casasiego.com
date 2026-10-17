// Justo by Synodé · tienda de sacos (variante C/D: React + Tailwind por CDN, sin build, datos simulados en ../db).
// Every shop page loads this file. Each page sets <body data-root="…"> = relative path to the site root (synode.space/),
// so the shop works on GitHub Pages and from any local server without absolute paths (same rule as the rest of Synodé).
//
// Contents: BRAND · store/bag (localStorage) · data layer (db) · useCatalog · priceBag · Photo · Header/Footer ·
// ProductCard · SizeChips · SizeSpecs · SpecTable · ProductPage · BagDrawer · SizeFinder · renderPage()

const { useState, useEffect, useMemo, useRef } = React;

const ROOT = document.body.dataset.root || './';
const SHOP = `${ROOT}brands/justo/tienda`;
const asset = (path) => `${ROOT}${path}`;

// Contact details: [verificar] with the client before announcing the shop.
const BRAND = {
    name: 'Justo',
    full: 'Justo by Synodé',
    email: 'studio@synode.space',
    address: 'Casa Synodé · Roma Norte, Ciudad de México [verificar dirección]',
    hours: 'Martes a sábado, 10:00–19:00 [verificar]',
};

// Prices are stored in MXN. With the España flag (js/region.js) the catalogue is converted to EUR on load,
// so every amount below is already in the visitor's currency; formatPrice only formats it.
const region = () => window.SynodeRegion || null;
const currency = () => region()?.currency || 'MXN';
const formatPrice = (n) => region() ? region().format(n)
    : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
const cm = (n) => `${String(n).replace('.', ',')} cm`;
const range = ([a, b], unit) => `${a}–${b} ${unit}`;

// --- LOCAL STORAGE ---
// Private windows or blocked storage throw: the shop still works, the bag just doesn't survive a reload.
const store = {
    read: (key, fallback) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
    write: (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ } },
};

// --- BAG ---
// One line per product × size × monogram. Only ids are stored; prices are always re-read from the catalogue.
const BAG_KEY = 'sy-justo-bolsa';
const ORDERS_KEY = 'sy-justo-pedidos';
const lineKey = (l) => `${l.productId}|${l.size}|${l.monogram || ''}`;
const bag = {
    read: () => store.read(BAG_KEY, []),
    save: (lines) => { store.write(BAG_KEY, lines); window.dispatchEvent(new CustomEvent('sy-bolsa-cambio')); },
    add: (line) => {
        const key = lineKey(line);
        const lines = bag.read();
        const hit = lines.find(l => l.key === key);
        if (hit) hit.qty += line.qty; else lines.push({ ...line, key });
        bag.save(lines);
        window.dispatchEvent(new CustomEvent('sy-bolsa-abrir', { detail: key }));
    },
    set: (key, qty) => bag.save(qty <= 0 ? bag.read().filter(l => l.key !== key) : bag.read().map(l => l.key === key ? { ...l, qty } : l)),
    clear: () => bag.save([]),
};
const useBag = () => {
    const [lines, setLines] = useState(bag.read);
    useEffect(() => {
        const sync = () => setLines(bag.read());
        window.addEventListener('sy-bolsa-cambio', sync);
        window.addEventListener('storage', sync);
        return () => { window.removeEventListener('sy-bolsa-cambio', sync); window.removeEventListener('storage', sync); };
    }, []);
    return lines;
};

// --- DATA LAYER ---
// The ONLY place that knows where data comes from. Today: static JSON in ../db (Etapa 1).
// Etapa 2: replace the bodies of db.* with Supabase queries (supabase/0001_esquema_tienda.sql) and keep the same shapes.
const jsonCache = {};
const loadJson = (name) => jsonCache[name] || (jsonCache[name] =
    fetch(`${SHOP}/db/${name}.json`, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(`${name}: ${r.status}`); return r.json(); }));

// Converts every *_mxn amount to the visitor's currency (unchanged in México). Fields keep their names.
const localPrices = (products, rules) => {
    const price = region() ? region().price : (n) => n;
    return {
        products: products.map(x => ({ ...x, price_mxn: price(x.price_mxn) })),
        rules: {
            ...rules,
            monogram_mxn: price(rules.monogram_mxn),
            shipping: rules.shipping.map(s => ({ ...s, cost_mxn: price(s.cost_mxn), free_from_mxn: price(s.free_from_mxn) })),
        },
    };
};

const db = {
    catalog: () => Promise.all([loadJson('productos'), loadJson('tallas'), loadJson('tienda')]).then(([p, t, rules]) => ({
        ...localPrices(p.products.filter(x => x.active !== false), rules),
        sizes: t.sizes, howToMeasure: t.how_to_measure, tolerances: t.tolerances,
    })),

    // Etapa 1: saved in this browser and sent by email; Justo replies with the payment link or the SPEI details.
    // Etapa 2: POST ids + qty to an Edge Function that re-prices from the database. Never trust browser prices.
    createOrder: ({ customer, shippingId, paymentId, priced }) => {
        const order = {
            id: `JU-${Date.now().toString(36).toUpperCase()}`,
            created_at: new Date().toISOString(),
            currency: currency(),
            status: 'por-pagar',
            customer, shipping_id: shippingId, payment_id: paymentId,
            lines: priced.lines.map(l => ({ sku: l.product.sku, name: l.product.name, size: l.size, monogram: l.monogram || null, qty: l.qty, unit_mxn: l.product.price_mxn, made_to_order: l.madeToOrder })),
            pieces: priced.pieces, subtotal: priced.subtotal, discount: priced.discount, monogram: priced.monogram, shipping: priced.shipping, total: priced.total,
        };
        store.write(ORDERS_KEY, [order, ...store.read(ORDERS_KEY, [])]);
        return order;
    },
};

// Re-renders when the flag changes currency (js/region.js fires "synode:region").
const useCurrency = () => {
    const [code, setCode] = useState(currency);
    useEffect(() => {
        const sync = () => setCode(currency());
        window.addEventListener('synode:region', sync);
        return () => window.removeEventListener('synode:region', sync);
    }, []);
    return code;
};

const useCatalog = () => {
    const [state, setState] = useState({ status: 'loading', products: [], sizes: [], howToMeasure: [], tolerances: null, rules: null });
    const regionKey = useCurrency();
    useEffect(() => {
        let alive = true;
        db.catalog()
            .then(d => alive && setState({ status: 'ready', ...d }))
            .catch(err => { console.error('[tienda] No se pudo cargar el catálogo:', err); alive && setState(s => ({ ...s, status: 'error' })); });
        return () => { alive = false; };
    }, [regionKey]);
    return useMemo(() => ({
        ...state,
        byId: Object.fromEntries(state.products.map(p => [p.id, p])),
        bySlug: Object.fromEntries(state.products.map(p => [p.slug, p])),
        size: Object.fromEntries(state.sizes.map(s => [s.id, s])),
    }), [state]);
};

// --- STOCK ---
// stock[size] > 0 → ships from the workshop; 0 → made to order (rules.made_to_order_days). Never blocks the sale.
const inStock = (product, size) => (product.stock?.[size] ?? 0) > 0;
const stockText = (product, size, rules) => inStock(product, size)
    ? `${product.stock[size]} en existencia · listo en 48 h hábiles`
    : `Sobre pedido · confección en ${rules.made_to_order_days} días`;

// --- PRICING ---
// Same rules the server will apply in Etapa 2 (tienda.json). Prices include IVA.
//   volume: % off the jackets (not the monogram) from N pieces · monogram: per piece · shipping: free above threshold
const priceBag = (lines, rules, shippingId) => {
    const pieces = lines.reduce((a, l) => a + l.qty, 0);
    const subtotal = lines.reduce((a, l) => a + l.qty * l.product.price_mxn, 0);
    const tier = [...rules.volume].sort((a, b) => b.min_qty - a.min_qty).find(v => pieces >= v.min_qty) || null;
    const discount = tier ? Math.round(subtotal * tier.pct / 100) : 0;
    const monoPieces = lines.filter(l => l.monogram).reduce((a, l) => a + l.qty, 0);
    const monogram = monoPieces * rules.monogram_mxn;
    const method = rules.shipping.find(s => s.id === shippingId) || rules.shipping[0];
    const net = subtotal - discount;
    const shipping = pieces === 0 || !method.cost_mxn || (method.free_from_mxn && net >= method.free_from_mxn) ? 0 : method.cost_mxn;
    return { lines, pieces, subtotal, tier, discount, monogram, monoPieces, method, shipping, total: net + monogram + shipping };
};

// Bag lines resolved against the catalogue (unknown or inactive products are dropped).
const useBagLines = (catalog) => useBag()
    .map(l => ({ ...l, product: catalog.byId[l.productId] }))
    .filter(l => l.product)
    .map(l => ({ ...l, madeToOrder: !inStock(l.product, l.size) }));

// --- REVEAL ON SCROLL ---
const useReveal = (deps = []) => useEffect(() => {
    const els = document.querySelectorAll('.reveal:not(.is-in)');
    if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
}, deps);

// --- PHOTO ---
const Photo = ({ product, src, className = '', eager = false, alt }) => (
    <div className={`crop ${className}`} style={src ? undefined : { '--focus': product.focus, '--zoom': product.zoom }}>
        <img src={asset(src || product.image)} alt={alt ?? `${product.name}, ${BRAND.full}`} loading={eager ? 'eager' : 'lazy'} decoding="async" draggable="false" />
    </div>
);

const Icon = {
    bag: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>,
    close: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><path d="M5 5l14 14M19 5L5 19" /></svg>,
};

// --- HEADER / FOOTER ---
const Header = ({ current }) => {
    const count = useBag().reduce((a, l) => a + l.qty, 0);
    const nav = [['sacos', 'Sacos', `${SHOP}/`], ['tallas', 'Guía de tallas', `${SHOP}/guia-de-tallas/`]];
    return (
        <header className="sticky top-0 z-50 bg-parchment/95 backdrop-blur border-b border-line">
            <div className="max-w-[1400px] mx-auto px-4 md:px-10 h-16 md:h-20 flex items-center justify-between gap-4">
                <a href={`${ROOT}brands/justo/`} className="label link hidden sm:inline text-ink-500">&larr; Justo</a>
                <a href={`${SHOP}/`} className="text-center leading-none">
                    <span className="font-display font-bold text-2xl md:text-3xl tracking-display">JUSTO</span>
                    <span className="block label text-gold mt-1">Tienda &middot; Synodé</span>
                </a>
                <nav aria-label="Tienda">
                    <ul className="flex items-center gap-4 md:gap-7">
                        {nav.map(([id, label, href]) => <li key={id} className="hidden md:block"><a href={href} className={`label link ${current === id ? 'text-rust' : ''}`} aria-current={current === id ? 'page' : undefined}>{label}</a></li>)}
                        <li>
                            <a href={`${SHOP}/bolsa/`} className="label flex items-center gap-1.5" aria-label={`Bolsa, ${count} ${count === 1 ? 'saco' : 'sacos'}`}>
                                <Icon.bag className="w-5 h-5" /><span>({count})</span>
                            </a>
                        </li>
                    </ul>
                </nav>
            </div>
            <nav className="md:hidden pb-3 -mt-1" aria-label="Tienda (móvil)">
                <ul className="flex justify-center gap-6">
                    {nav.map(([id, label, href]) => <li key={id}><a href={href} className={`label ${current === id ? 'text-rust' : ''}`} aria-current={current === id ? 'page' : undefined}>{label}</a></li>)}
                    <li className="sm:hidden"><a href={`${ROOT}brands/justo/`} className="label text-ink-500">Justo</a></li>
                </ul>
            </nav>
        </header>
    );
};

const Footer = () => {
    const code = useCurrency();
    return (
        <footer className="bg-ink text-parchment mt-24">
            <div className="max-w-[1400px] mx-auto px-4 md:px-10 py-16 grid gap-10 md:grid-cols-3">
                <div>
                    <p className="font-display font-bold text-2xl tracking-display">JUSTO</p>
                    <p className="label text-gold mt-2">Sastrería &middot; Marca nº 2 de Synodé</p>
                    <p className="note text-parchment/70 mt-4 max-w-xs">«La compostura empieza en los hombros.»</p>
                </div>
                <div className="space-y-2">
                    <p className="label text-gold">La Casa</p>
                    <p>{BRAND.address}</p>
                    <p>{BRAND.hours}</p>
                    <a className="link" href={`mailto:${BRAND.email}?subject=Justo%20%C2%B7%20Tienda`}>{BRAND.email}</a>
                </div>
                <div className="space-y-2">
                    <p className="label text-gold">Tienda</p>
                    <p><a className="link" href={`${SHOP}/`}>Sacos</a></p>
                    <p><a className="link" href={`${SHOP}/guia-de-tallas/`}>Guía de tallas</a></p>
                    <p><a className="link" href={`${SHOP}/bolsa/`}>Bolsa</a></p>
                    <p><a className="link" href={`${ROOT}terms.html`}>Términos de uso</a></p>
                </div>
            </div>
            <p className="label text-parchment/50 text-center pb-8 px-4">&copy; 2026 Synodé. Precios en {code} con IVA incluido. Fotografías protegidas: prohibido su uso para entrenar IA.</p>
        </footer>
    );
};

const PageHero = ({ kicker, title, intro, children }) => (
    <section className="max-w-[1400px] mx-auto px-4 md:px-10 pt-16 md:pt-24 pb-10 animate-fade-in">
        <p className="label text-gold">{kicker}</p>
        <h1 className="text-4xl md:text-6xl mt-4 max-w-3xl">{title}</h1>
        {intro && <p className="text-lg text-ink-700 mt-6 max-w-2xl">{intro}</p>}
        {children}
    </section>
);

const LoadError = () => <p className="text-center note text-ink-500 py-24">No pudimos cargar el catálogo. Recarga la página en un momento.</p>;
const Skeleton = ({ n = 3 }) => (
    <div className="grid md:grid-cols-3 gap-6">{Array.from({ length: n }, (_, i) => <div key={i} className="aspect-[3/4] bg-parchment-200 animate-pulse" />)}</div>
);

// --- CARD ---
const ProductCard = ({ product, catalog }) => (
    <article className="reveal group">
        <a href={`${SHOP}/${product.slug}/`} className="block">
            <Photo product={product} className="aspect-[3/4]" />
            <div className="pt-4 pb-8">
                <div className="flex justify-between items-baseline gap-3">
                    <h3 className="text-xl">{product.name}</h3>
                    <p className="label whitespace-nowrap">{formatPrice(product.price_mxn)}</p>
                </div>
                <p className="text-ink-700 mt-1">{product.short}</p>
                <p className="label text-ink-500 mt-3">
                    Corte {product.cut.toLowerCase()} &middot; {product.sizes.map(s => (
                        <span key={s} className={inStock(product, s) ? '' : 'text-ink-300'} title={inStock(product, s) ? `${catalog.size[s]?.label}: en existencia` : `${catalog.size[s]?.label}: sobre pedido`}>{s} </span>
                    ))}
                </p>
            </div>
        </a>
    </article>
);

// --- SIZE UI ---
const SizeChips = ({ product, catalog, value, onChange }) => (
    <div className="grid grid-cols-4 gap-1 max-w-md" role="radiogroup" aria-label="Talla">
        {product.sizes.map(s => (
            <button key={s} type="button" role="radio" aria-checked={value === s} data-out={!inStock(product, s)} className="chip" onClick={() => onChange(s)}>
                <span className="label-strong">{s}</span>
                <span className="text-[13px] leading-tight">{catalog.size[s]?.label}</span>
            </button>
        ))}
    </div>
);

// Garment measurements: the rows of every spec table, in display order.
const GARMENT_ROWS = [
    ['chest', 'Pecho de la prenda'], ['waist', 'Cintura de la prenda'], ['shoulder', 'Hombro a hombro'],
    ['sleeve', 'Largo de manga'], ['length', 'Largo de espalda'], ['hem', 'Contorno del bajo'], ['lapel', 'Ancho de solapa'],
];

// Everything about one size of one jacket, side by side: who it fits (body) and what it measures (garment).
const SizeSpecs = ({ product, catalog, size }) => {
    const s = catalog.size[size];
    const g = product.specs[size];
    if (!s || !g) return null;
    const ease = g.chest - s.body.chest_cm[1];
    return (
        <div className="border border-line bg-parchment-100/60 p-5 max-w-md animate-fade-in" aria-live="polite">
            <p className="label-strong">Talla {size} &middot; {s.label}</p>
            <p className="label text-ink-500 mt-1">MX {s.mx} &middot; EU {s.eu} &middot; US {s.us}</p>
            <div className="grid grid-cols-2 gap-6 mt-5 text-[15px]">
                <dl className="space-y-1.5">
                    <dt className="label text-gold">Te queda si mides</dt>
                    <dd>Pecho {range(s.body.chest_cm, 'cm')}</dd>
                    <dd>Cintura {range(s.body.waist_cm, 'cm')}</dd>
                    <dd>Estatura {range(s.body.height_cm, 'cm')}</dd>
                    <dd>Peso {range(s.body.weight_kg, 'kg')}</dd>
                    <dd>Cuello de camisa {range(s.body.neck_cm, 'cm')}</dd>
                </dl>
                <dl className="space-y-1.5">
                    <dt className="label text-gold">El saco mide</dt>
                    {GARMENT_ROWS.map(([k, label]) => <dd key={k}>{label.replace(' de la prenda', '')} {cm(g[k])}</dd>)}
                </dl>
            </div>
            <p className="note text-ink-500 text-[15px] mt-5">Holgura en pecho: {ease} cm sobre el máximo de la talla (corte {product.cut.toLowerCase()}, drop {g.drop}).</p>
            <p className={`label mt-3 ${inStock(product, size) ? 'text-ink-500' : 'text-rust'}`}>{stockText(product, size, catalog.rules)}</p>
        </div>
    );
};

// Full comparative table for one jacket: body sizes and garment measurements for CH · M · G · XG.
const SpecTable = ({ product, catalog, selected }) => {
    const cols = product.sizes.map(id => catalog.size[id]).filter(Boolean);
    const td = (id, content) => <td key={id} className={selected === id ? 'is-sel' : ''}>{content}</td>;
    return (
        <div className="overflow-x-auto -mx-1 px-1">
            <table className="spec">
                <thead><tr><th scope="col"><span className="sr-only">Medida</span></th>{cols.map(s => <th key={s.id} scope="col" className={selected === s.id ? 'is-sel' : ''}>{s.id}<span className="block font-normal normal-case tracking-normal font-serif text-[12px]">{s.label}</span></th>)}</tr></thead>
                <tbody>
                    <tr className="group"><td colSpan={cols.length + 1}>Equivalencias</td></tr>
                    <tr><td>México</td>{cols.map(s => td(s.id, s.mx))}</tr>
                    <tr><td>Europa</td>{cols.map(s => td(s.id, s.eu))}</tr>
                    <tr><td>EE. UU.</td>{cols.map(s => td(s.id, s.us))}</tr>
                    <tr className="group"><td colSpan={cols.length + 1}>Tu cuerpo</td></tr>
                    <tr><td>Pecho (cm)</td>{cols.map(s => td(s.id, s.body.chest_cm.join('–')))}</tr>
                    <tr><td>Cintura (cm)</td>{cols.map(s => td(s.id, s.body.waist_cm.join('–')))}</tr>
                    <tr><td>Estatura (cm)</td>{cols.map(s => td(s.id, s.body.height_cm.join('–')))}</tr>
                    <tr><td>Peso (kg)</td>{cols.map(s => td(s.id, s.body.weight_kg.join('–')))}</tr>
                    <tr className="group"><td colSpan={cols.length + 1}>El saco (cm)</td></tr>
                    {GARMENT_ROWS.map(([k, label]) => <tr key={k}><td>{label}</td>{cols.map(s => td(s.id, String(product.specs[s.id][k]).replace('.', ',')))}</tr>)}
                    <tr><td>Drop (pecho − cintura del pantalón)</td>{cols.map(s => td(s.id, product.specs[s.id].drop))}</tr>
                    <tr className="group"><td colSpan={cols.length + 1}>Disponibilidad</td></tr>
                    <tr><td>Existencia</td>{cols.map(s => td(s.id, inStock(product, s.id) ? product.stock[s.id] : 'Pedido'))}</tr>
                </tbody>
            </table>
        </div>
    );
};

const Disclosure = ({ title, children, open = false }) => (
    <details className="border-t border-line group/d" open={open}>
        <summary className="label-strong py-4 cursor-pointer list-none flex justify-between">{title}<span className="group-open/d:rotate-45 transition-transform">+</span></summary>
        <div className="pb-6 text-ink-700 text-[16px] leading-relaxed">{children}</div>
    </details>
);

// --- PRODUCT PAGE ---
// Each tienda/<slug>/index.html calls renderProduct(); the slug comes from the URL.
const ProductPage = () => {
    const catalog = useCatalog();
    const slug = window.location.pathname.split('/').filter(Boolean).pop();
    const product = catalog.bySlug[slug];
    const [size, setSize] = useState(null);
    const [qty, setQty] = useState(1);
    const [withMono, setWithMono] = useState(false);
    const [mono, setMono] = useState('');
    const [needSize, setNeedSize] = useState(false);
    useReveal([catalog.status]);

    useEffect(() => { if (product) document.title = `${product.name} · Tienda Justo · Synodé`; }, [product]);

    if (catalog.status === 'loading') return <div className="max-w-[1400px] mx-auto px-4 md:px-10 py-16"><Skeleton n={2} /></div>;
    if (catalog.status === 'error') return <LoadError />;
    if (!product) return (
        <PageHero kicker="Tienda" title="Este saco ya no está disponible.">
            <a href={`${SHOP}/`} className="btn btn-rust mt-10">Ver los sacos</a>
        </PageHero>
    );

    const { rules, tolerances } = catalog;
    const related = catalog.products.filter(p => p.id !== product.id);
    const monoOk = !withMono || /^[A-ZÁÉÍÓÚÑ]{1,3}$/.test(mono);
    const add = () => {
        if (!size) { setNeedSize(true); return; }
        bag.add({ productId: product.id, size, monogram: withMono ? mono : '', qty });
        setQty(1);
    };

    return (
        <>
            <section className="max-w-[1400px] mx-auto md:px-10 md:pt-8 grid md:grid-cols-12 gap-6 md:gap-12 items-start">
                <div className="md:col-span-7 grid gap-1">
                    <Photo product={product} className="aspect-[3/4] animate-fade-in" eager />
                    {product.detail_image && (
                        <figure className="relative">
                            <Photo product={product} src={product.detail_image} className="aspect-[4/3]" alt={`Detalle de la tela y el forro: ${product.name}`} />
                            <figcaption className="absolute left-4 bottom-4 label text-parchment">Tela, forro y botón</figcaption>
                        </figure>
                    )}
                </div>

                <div className="md:col-span-5 md:sticky md:top-28 px-4 md:px-0 pb-10 animate-fade-in">
                    <nav className="label text-ink-500 mb-6" aria-label="Ruta">
                        <ol className="flex flex-wrap gap-1.5">
                            <li><a href={`${ROOT}brands/justo/`} className="link">Justo</a></li>
                            <li aria-hidden="true">/</li>
                            <li><a href={`${SHOP}/`} className="link">Sacos</a></li>
                        </ol>
                    </nav>
                    <h1 className="text-3xl md:text-5xl">{product.name}</h1>
                    <p className="label text-ink-500 mt-3">Corte {product.cut.toLowerCase()} &middot; {product.sku}</p>
                    <p className="text-2xl mt-6">{formatPrice(product.price_mxn)} <span className="label text-ink-500">IVA incluido</span></p>
                    <p className="text-ink-700 mt-6 max-w-md">{product.description}</p>

                    <div className="mt-10">
                        <div className="flex justify-between items-baseline mb-3 max-w-md">
                            <p className={`label-strong ${needSize && !size ? 'text-rust' : ''}`}>{needSize && !size ? 'Elige una talla' : 'Talla'}</p>
                            <a href={`${SHOP}/guia-de-tallas/`} className="label link text-ink-500">Guía de tallas</a>
                        </div>
                        <SizeChips product={product} catalog={catalog} value={size} onChange={(s) => { setSize(s); setNeedSize(false); }} />
                    </div>

                    {size && <div className="mt-5"><SizeSpecs product={product} catalog={catalog} size={size} /></div>}

                    {product.monogram && (
                        <div className="mt-8 max-w-md">
                            <label className="flex gap-3 items-center cursor-pointer">
                                <input type="checkbox" checked={withMono} onChange={e => setWithMono(e.target.checked)} className="accent-[#A34828] w-4 h-4" />
                                <span>Monograma bordado en el forro &middot; +{formatPrice(rules.monogram_mxn)}</span>
                            </label>
                            {withMono && <input className="field mt-3" placeholder={`Iniciales (máx. ${rules.monogram_max} letras)`} maxLength={rules.monogram_max}
                                value={mono} onChange={e => setMono(e.target.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ]/g, ''))} aria-label="Iniciales del monograma" />}
                        </div>
                    )}

                    <div className="flex gap-1 mt-8 max-w-md">
                        <div className="flex items-center border border-ink">
                            <button className="w-11 h-11" onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Uno menos">−</button>
                            <span className="w-6 text-center" aria-live="polite">{qty}</span>
                            <button className="w-11 h-11" onClick={() => setQty(q => Math.min(20, q + 1))} aria-label="Uno más">+</button>
                        </div>
                        <button className="btn btn-rust flex-1" onClick={add} disabled={!monoOk}>Añadir a la bolsa</button>
                    </div>
                    <p className="note text-ink-500 mt-3 max-w-md">Incluye ajuste de mangas (±{tolerances.sleeve_cm} cm) y cintura (±{tolerances.waist_cm} cm) en el taller. {rules.volume[0].label}.</p>

                    <div className="mt-10 max-w-md border-b border-line">
                        <Disclosure title="Especificaciones del saco" open>
                            <dl className="grid grid-cols-[7.5rem_1fr] gap-x-4 gap-y-2">
                                <dt className="label text-ink-500 pt-1">Tela</dt><dd>{product.fabric}</dd>
                                <dt className="label text-ink-500 pt-1">Forro</dt><dd>{product.lining}</dd>
                                <dt className="label text-ink-500 pt-1">Construcción</dt><dd>{product.construction}</dd>
                                <dt className="label text-ink-500 pt-1">Botones</dt><dd>{product.buttons}</dd>
                                <dt className="label text-ink-500 pt-1">Bolsillos</dt><dd>{product.pockets}</dd>
                                <dt className="label text-ink-500 pt-1">Aberturas</dt><dd>{product.vents}</dd>
                                <dt className="label text-ink-500 pt-1">Corte</dt><dd>{product.cut}</dd>
                            </dl>
                            <ul className="mt-4 space-y-1">{product.features.map(f => <li key={f}>— {f}</li>)}</ul>
                        </Disclosure>
                        <Disclosure title="Medidas por talla: CH · M · G · XG">
                            <SpecTable product={product} catalog={catalog} selected={size} />
                            <p className="note text-ink-500 text-[15px] mt-3">Medidas de la prenda en plano, en centímetros (pecho, cintura y bajo: contorno completo). Tolerancia de confección ±1 cm.</p>
                        </Disclosure>
                        <Disclosure title="Ajustes incluidos"><p>{tolerances.note}</p></Disclosure>
                        <Disclosure title="Cuidados"><p>{product.care}</p></Disclosure>
                        <Disclosure title="Entrega y pago">
                            {rules.shipping.map(s => <p key={s.id} className="mb-2"><strong className="font-semibold text-ink">{s.label}.</strong> {s.detail} {s.cost_mxn ? `${formatPrice(s.cost_mxn)}, gratis desde ${formatPrice(s.free_from_mxn)}.` : 'Sin costo.'}</p>)}
                            <p>{rules.payments.map(p => p.label).join(' · ')}.</p>
                        </Disclosure>
                    </div>
                </div>
            </section>

            {related.length > 0 && (
                <section className="max-w-[1400px] mx-auto px-4 md:px-10 pt-20">
                    <h2 className="label text-gold mb-6">Los otros sacos de la casa</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{related.map(p => <ProductCard key={p.id} product={p} catalog={catalog} />)}</div>
                </section>
            )}
        </>
    );
};

const renderProduct = () => renderPage(ProductPage);

// --- BAG DRAWER ---
// Opens when something is added to the bag (event 'sy-bolsa-abrir' from bag.add).
const BagDrawer = () => {
    const catalog = useCatalog();
    const lines = useBagLines(catalog);
    const [openKey, setOpenKey] = useState(null);
    useEffect(() => {
        const onOpen = (e) => setOpenKey(e.detail);
        const onKey = (e) => { if (e.key === 'Escape') setOpenKey(null); };
        window.addEventListener('sy-bolsa-abrir', onOpen);
        window.addEventListener('keydown', onKey);
        return () => { window.removeEventListener('sy-bolsa-abrir', onOpen); window.removeEventListener('keydown', onKey); };
    }, []);
    if (!openKey || !catalog.rules) return null;
    const added = lines.find(l => l.key === openKey);
    const priced = priceBag(lines, catalog.rules);
    return (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Añadido a tu bolsa">
            <div className="absolute inset-0 bg-ink/30 animate-fade-in" onClick={() => setOpenKey(null)} />
            <aside className="absolute right-0 inset-y-0 w-full max-w-sm bg-parchment animate-slide-in flex flex-col">
                <div className="flex justify-between items-center px-6 h-20 border-b border-line">
                    <p className="label-strong">Añadido a tu bolsa</p>
                    <button onClick={() => setOpenKey(null)} aria-label="Cerrar"><Icon.close className="w-5 h-5" /></button>
                </div>
                {added && (
                    <div className="p-6 flex gap-4">
                        <Photo product={added.product} className="w-28 aspect-[3/4] shrink-0" />
                        <div className="space-y-1">
                            <p className="font-section font-semibold">{added.product.name}</p>
                            <p className="text-ink-500">Talla {added.size} · {catalog.size[added.size]?.label}</p>
                            {added.monogram && <p className="text-ink-500">Monograma: {added.monogram}</p>}
                            <p className={`label ${added.madeToOrder ? 'text-rust' : 'text-ink-500'}`}>{stockText(added.product, added.size, catalog.rules)}</p>
                            <p>{added.qty} × {formatPrice(added.product.price_mxn)}</p>
                        </div>
                    </div>
                )}
                <div className="mt-auto p-6 border-t border-line grid gap-2">
                    <p className="label flex justify-between mb-3"><span>{priced.pieces} {priced.pieces === 1 ? 'saco' : 'sacos'}</span><span>{formatPrice(priced.subtotal - priced.discount + priced.monogram)}</span></p>
                    <a href={`${SHOP}/bolsa/`} className="btn btn-rust">Ver bolsa</a>
                    <button className="btn btn-line" onClick={() => setOpenKey(null)}>Seguir comprando</button>
                </div>
            </aside>
        </div>
    );
};

// --- SIZE FINDER ---
// Chest decides the size (it can't be altered); height only warns when the jacket length may be short or long.
const recommendSize = (sizes, chest, height) => {
    if (!chest) return null;
    const fit = sizes.find(s => chest >= s.body.chest_cm[0] && chest <= s.body.chest_cm[1])
        || (chest < sizes[0].body.chest_cm[0] ? sizes[0] : chest > sizes[sizes.length - 1].body.chest_cm[1] ? null : sizes.find(s => chest < s.body.chest_cm[0]));
    if (!fit) return { size: null, note: 'Tu medida de pecho supera la talla XG: te hacemos el saco a medida en la Casa.' };
    const notes = [];
    if (chest < sizes[0].body.chest_cm[0]) notes.push('Estás por debajo de la talla CH: el taller entalla la cintura, pero el hombro puede quedar amplio.');
    if (height && height < fit.body.height_cm[0]) notes.push('Por tu estatura, quizá convenga acortar mangas (incluido hasta 3 cm).');
    if (height && height > fit.body.height_cm[1]) notes.push('Por tu estatura, revisa el largo de espalda: si prefieres un saco más largo, escríbenos.');
    return { size: fit, note: notes.join(' ') };
};

const SizeFinder = ({ catalog }) => {
    const [chest, setChest] = useState('');
    const [height, setHeight] = useState('');
    const r = recommendSize(catalog.sizes, Number(chest) || 0, Number(height) || 0);
    return (
        <div className="border border-ink p-6 md:p-8 max-w-xl">
            <p className="label text-gold">Calculadora</p>
            <h2 className="text-2xl md:text-3xl mt-2">¿Qué talla soy?</h2>
            <div className="grid grid-cols-2 gap-6 mt-6">
                <label className="block"><span className="label text-ink-500">Pecho (cm)</span><input className="field" type="number" inputMode="numeric" min="70" max="140" value={chest} onChange={e => setChest(e.target.value)} placeholder="p. ej. 98" /></label>
                <label className="block"><span className="label text-ink-500">Estatura (cm)</span><input className="field" type="number" inputMode="numeric" min="140" max="210" value={height} onChange={e => setHeight(e.target.value)} placeholder="opcional" /></label>
            </div>
            <div className="mt-6 min-h-[4rem]" aria-live="polite">
                {r && r.size && <p className="text-xl">Tu talla: <strong className="font-section">{r.size.id} · {r.size.label}</strong> <span className="label text-ink-500">MX {r.size.mx} · EU {r.size.eu}</span></p>}
                {r && r.note && <p className="note text-ink-700 mt-2">{r.note}</p>}
                {!r && <p className="note text-ink-500">Escribe tu medida de pecho para ver tu talla.</p>}
            </div>
        </div>
    );
};

// --- PAGE SHELL ---
const renderPage = (Page, { current } = {}) => {
    const App = () => (
        <>
            <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-ink text-parchment px-3 py-2 z-[90]">Saltar al contenido</a>
            <Header current={current} />
            <main id="contenido"><Page /></main>
            <Footer />
            <BagDrawer />
        </>
    );
    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
};
