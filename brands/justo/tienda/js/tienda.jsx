// Justo by Casa Siego · tienda de sacos y camisas (variante C/D: React + Tailwind por CDN, sin build, datos simulados en ../db).
// Every shop page loads this file. Each page sets <body data-root="…"> = relative path to the site root (casasiego.com/),
// so the shop works on GitHub Pages and from any local server without absolute paths (same rule as the rest of Casa Siego).
//
// Contents: BRAND · data layer (db) · useCatalog · prices and Stripe links · Photo · Header/Footer ·
// ProductCard · SizeChips · SizeSpecs · SpecTable · ProductPage · SizeFinder · renderPage()
// Payment is Stripe only: each size of each jacket has its own Stripe Payment Link (db/productos.json). No bag, no cart.

const { useState, useEffect, useMemo, useRef } = React;

const ROOT = document.body.dataset.root || './';
const SHOP = `${ROOT}brands/justo/tienda`;
const asset = (path) => `${ROOT}${path}`;

// Contact details: [verificar] with the client before announcing the shop.
const BRAND = {
    name: 'Justo',
    full: 'Justo by Casa Siego®',
    email: 'info@casasiego.com',
    address: 'Casa Siego · Roma Norte, Ciudad de México [verificar dirección]',
    hours: 'Martes a sábado, 10:00–19:00 [verificar]',
};

// Prices are stored in MXN. With the España flag (js/region.js) the catalogue is converted to EUR on load,
// so every amount below is already in the visitor's currency; formatPrice only formats it.
const region = () => window.CasaSiegoRegion || null;
const currency = () => region()?.currency || 'MXN';
const formatPrice = (n) => region() ? region().format(n)
    : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
const cm = (n) => `${String(n).replace('.', ',')} cm`;
const range = ([a, b], unit) => `${a}–${b} ${unit}`;

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
        products: products.map(x => ({ ...x, price_mxn: x.price_mxn == null ? null : price(x.price_mxn),
            prices_mxn: x.prices_mxn && Object.fromEntries(Object.entries(x.prices_mxn).map(([k, v]) => [k, price(v)])) })),
        rules: {
            ...rules,
            shipping: rules.shipping.map(s => ({ ...s, cost_mxn: price(s.cost_mxn), free_from_mxn: price(s.free_from_mxn) })),
        },
    };
};

const db = {
    catalog: () => Promise.all([loadJson('productos'), loadJson('tallas'), loadJson('tienda')]).then(([p, t, rules]) => ({
        ...localPrices(p.products.filter(x => x.active !== false), rules),
        sizes: t.sizes, howToMeasure: t.how_to_measure, tolerances: t.tolerances,
    })),
};

// Re-renders when the flag changes currency (js/region.js fires "casasiego:region").
const useCurrency = () => {
    const [code, setCode] = useState(currency);
    useEffect(() => {
        const sync = () => setCode(currency());
        window.addEventListener('casasiego:region', sync);
        return () => window.removeEventListener('casasiego:region', sync);
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
// stock[size] > 0 → ships from the workshop; 0 → sold out: the size shows «Agotado» and its Stripe button is disabled.
const inStock = (product, size) => (product.stock?.[size] ?? 0) > 0;
const soldOut = (product) => !product.sizes.some(s => inStock(product, s));
const stockText = (product, size) => inStock(product, size)
    ? `${product.stock[size]} en existencia · listo en 48 h hábiles`
    : 'Agotado';

// Small grey «Agotado» tag over the photo of a sold-out product
const SoldOutTag = () => <span className="tag-out absolute top-3 left-3 z-10">Agotado</span>;

// --- PRICING ---
// Prices include IVA. Each size has its own price (prices_mxn); price_mxn is the lowest one, shown as «desde» before a size is chosen.
const unitPrice = (product, size) => (product.prices_mxn && product.prices_mxn[size]) || product.price_mxn;
// price_mxn null (new shirts): «Precio por confirmar» until the workshop sets it.
const priceRange = (product) => {
    if (product.price_mxn == null) return 'Precio por confirmar';
    const all = Object.values(product.prices_mxn || {});
    return all.length && Math.max(...all) > Math.min(...all) ? `Desde ${formatPrice(Math.min(...all))}` : formatPrice(product.price_mxn);
};
// Stripe Payment Link of the size (one jacket, charged in MXN). null when the size has none.
const stripeLink = (product, size) => (product.stripe && product.stripe[size]) || null;


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

// --- HEADER / FOOTER ---
const Header = ({ current }) => {
    const nav = [['sacos', 'Esenciales', `${SHOP}/`], ['tallas', 'Guía de tallas', `${SHOP}/guia-de-tallas/`]];
    return (
        <header className="sticky top-0 z-50 bg-parchment/95 backdrop-blur border-b border-line">
            <div className="max-w-[1400px] mx-auto px-4 md:px-10 h-16 md:h-20 flex items-center justify-between gap-4">
                <a href={`${ROOT}brands/justo/`} className="label link hidden sm:inline text-ink-500">&larr; Justo</a>
                <a href={`${SHOP}/`} className="text-center leading-none">
                    <span className="font-display font-bold text-2xl md:text-3xl tracking-display">JUSTO</span>
                    <span className="block label text-gold mt-1">Tienda &middot; Casa Siego</span>
                </a>
                <nav aria-label="Tienda">
                    <ul className="flex items-center gap-4 md:gap-7">
                        {nav.map(([id, label, href]) => <li key={id} className="hidden md:block"><a href={href} className={`label link ${current === id ? 'text-rust' : ''}`} aria-current={current === id ? 'page' : undefined}>{label}</a></li>)}
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
                    <p className="label text-gold mt-2">Sastrería &middot; Marca nº 2 de Casa Siego</p>
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
                    <p><a className="link" href={`${SHOP}/`}>Esenciales</a></p>
                    <p><a className="link" href={`${SHOP}/guia-de-tallas/`}>Guía de tallas</a></p>
                    <p><a className="link" href={`${ROOT}terms.html`}>Términos de uso</a></p>
                    <p><a className="link" href={`${ROOT}devoluciones.html`}>Política de devoluciones</a></p>
                </div>
            </div>
            <p className="label text-parchment/50 text-center pb-8 px-4">&copy; 2026 Casa Siego&reg;. Todos los derechos reservados. Precios en {code} con IVA incluido. Fotografías protegidas: prohibido su uso para entrenar IA.</p>
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
            <div className="relative">
                <Photo product={product} className={`aspect-[3/4] ${soldOut(product) ? 'is-out' : ''}`} />
                {soldOut(product) && <SoldOutTag />}
            </div>
            <div className="pt-4 pb-8">
                <div className="flex justify-between items-baseline gap-3">
                    <h3 className="text-xl">{product.name}</h3>
                    <p className="label whitespace-nowrap">{priceRange(product)}</p>
                </div>
                <p className="text-ink-700 mt-1">{product.short}</p>
                <p className="label text-ink-500 mt-3">
                    Corte {product.cut.toLowerCase()} &middot; {product.sizes.map(s => (
                        <span key={s} className={inStock(product, s) ? '' : 'text-ink-300 line-through'} title={inStock(product, s) ? `${catalog.size[s]?.label}: en existencia` : `${catalog.size[s]?.label}: agotado`}>{s} </span>
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
    const g = product.specs?.[size];
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
            <p className={`label mt-3 ${inStock(product, size) ? 'text-ink-500' : 'text-rust'}`}>{stockText(product, size)}</p>
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
                    <tr><td>Existencia</td>{cols.map(s => td(s.id, inStock(product, s.id) ? product.stock[s.id] : 'Agotado'))}</tr>
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

// Rows of «Especificaciones»: jackets and shirts (kind: 'camisa') describe different parts.
const JACKET_ROWS = [['fabric', 'Tela'], ['lining', 'Forro'], ['construction', 'Construcción'], ['buttons', 'Botones'], ['pockets', 'Bolsillos'], ['vents', 'Aberturas'], ['cut', 'Corte']];
const SHIRT_ROWS = [['fabric', 'Tela'], ['collar', 'Cuello'], ['cuffs', 'Puños'], ['buttons', 'Botones'], ['cut', 'Corte']];

// --- PRODUCT PAGE ---
// Each tienda/<slug>/index.html calls renderProduct(); the slug comes from the URL.
const ProductPage = () => {
    const catalog = useCatalog();
    const slug = window.location.pathname.split('/').filter(Boolean).pop();
    const product = catalog.bySlug[slug];
    const [size, setSize] = useState(null);
    const [needSize, setNeedSize] = useState(false);
    useReveal([catalog.status]);

    useEffect(() => { if (product) document.title = `${product.name} · Tienda Justo · Casa Siego®`; }, [product]);

    if (catalog.status === 'loading') return <div className="max-w-[1400px] mx-auto px-4 md:px-10 py-16"><Skeleton n={2} /></div>;
    if (catalog.status === 'error') return <LoadError />;
    if (!product) return (
        <PageHero kicker="Tienda" title="Este saco ya no está disponible.">
            <a href={`${SHOP}/`} className="btn btn-rust mt-10">Ver los sacos</a>
        </PageHero>
    );

    const { rules, tolerances } = catalog;
    const isShirt = product.kind === 'camisa';
    const related = catalog.products.filter(p => p.id !== product.id);

    return (
        <>
            <section className="max-w-[1400px] mx-auto md:px-10 md:pt-8 grid md:grid-cols-12 gap-6 md:gap-12 items-start">
                <div className="md:col-span-7 grid gap-1">
                    <div className="relative">
                        <Photo product={product} className={`aspect-[3/4] animate-fade-in ${soldOut(product) ? 'is-out' : ''}`} eager />
                        {soldOut(product) && <SoldOutTag />}
                    </div>
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
                            <li><a href={`${SHOP}/`} className="link">Esenciales</a></li>
                        </ol>
                    </nav>
                    <h1 className="text-3xl md:text-5xl">{product.name}</h1>
                    <p className="label text-ink-500 mt-3">Corte {product.cut.toLowerCase()} &middot; {product.sku}</p>
                    <p className="text-2xl mt-6">{size && product.price_mxn != null ? formatPrice(unitPrice(product, size)) : priceRange(product)} {product.price_mxn != null && <span className="label text-ink-500">IVA incluido{size ? ` · talla ${size}` : ''}</span>}</p>
                    <p className="text-ink-700 mt-6 max-w-md">{product.description}</p>

                    <div className="mt-10">
                        <div className="flex justify-between items-baseline mb-3 max-w-md">
                            <p className={`label-strong ${needSize && !size ? 'text-rust' : ''}`}>{needSize && !size ? 'Elige una talla' : 'Talla'}</p>
                            <a href={`${SHOP}/guia-de-tallas/`} className="label link text-ink-500">Guía de tallas</a>
                        </div>
                        <SizeChips product={product} catalog={catalog} value={size} onChange={(s) => { setSize(s); setNeedSize(false); }} />
                    </div>

                    {size && <div className="mt-5"><SizeSpecs product={product} catalog={catalog} size={size} /></div>}

                    <div className="mt-8 max-w-md">
                        {(size ? !inStock(product, size) : soldOut(product)) ? (
                            <button className="btn btn-off w-full" type="button" disabled aria-disabled="true">Agotado{size ? ` · talla ${size}` : ''}</button>
                        ) : size && !stripeLink(product, size) ? (
                            <a className="btn btn-rust w-full" href={`mailto:${BRAND.email}?subject=${encodeURIComponent(`Justo · ${product.name} · talla ${size}`)}`}>Comprar por correo · talla {size}</a>
                        ) : stripeLink(product, size) ? (
                            <a className="btn btn-rust w-full" href={stripeLink(product, size)} rel="noopener">Pagar con Stripe · talla {size} · {formatPrice(unitPrice(product, size))}</a>
                        ) : (
                            <button className="btn btn-rust w-full" type="button" onClick={() => setNeedSize(true)}>{size ? 'Pago no disponible en esta talla: escríbenos' : 'Elige tu talla para pagar'}</button>
                        )}
                        <p className="note text-ink-500 mt-3 text-[15px]">Pago seguro en la página de Stripe, una pieza por pago, en pesos mexicanos (MXN).{!isShirt && ` Incluye ajuste de mangas (±${tolerances.sleeve_cm} cm) y cintura (±${tolerances.waist_cm} cm) en el taller.`} Antes de pagar, lee la <a href={`${ROOT}devoluciones.html`} className="link">política de devoluciones</a>.</p>
                    </div>

                    <div className="mt-10 max-w-md border-b border-line">
                        <Disclosure title={isShirt ? 'Especificaciones de la camisa' : 'Especificaciones del saco'} open>
                            <dl className="grid grid-cols-[7.5rem_1fr] gap-x-4 gap-y-2">
                                {(isShirt ? SHIRT_ROWS : JACKET_ROWS).map(([k, label]) => <React.Fragment key={k}><dt className="label text-ink-500 pt-1">{label}</dt><dd>{product[k]}</dd></React.Fragment>)}
                            </dl>
                            <ul className="mt-4 space-y-1">{product.features.map(f => <li key={f}>— {f}</li>)}</ul>
                        </Disclosure>
                        {product.specs && (
                            <Disclosure title="Medidas por talla: CH · M · G · XG">
                                <SpecTable product={product} catalog={catalog} selected={size} />
                                <p className="note text-ink-500 text-[15px] mt-3">Medidas de la prenda en plano, en centímetros (pecho, cintura y bajo: contorno completo). Tolerancia de confección ±1 cm.</p>
                            </Disclosure>
                        )}
                        {!isShirt && <Disclosure title="Ajustes incluidos"><p>{tolerances.note}</p></Disclosure>}
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
                    <h2 className="label text-gold mb-6">Más de la colección</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{related.map(p => <ProductCard key={p.id} product={p} catalog={catalog} />)}</div>
                </section>
            )}
        </>
    );
};

const renderProduct = () => renderPage(ProductPage);

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
        <div className="border border-ink bg-white p-6 md:p-8 max-w-xl">
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
        </>
    );
    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
};
