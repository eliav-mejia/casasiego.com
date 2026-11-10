// Fijo by Casa Siego · tienda v1.0.0 (plain JS, no build, no React).
// Data: ../db/productos.json. Paths start from <body data-root> (relative to the site root), as in the rest of Casa Siego.
// No prices or Stripe links yet: price_mxn null = «Precio por confirmar»; ordering is a pre-filled e-mail.
// When there are Stripe links, add stripe{size} to each product and point the button at it (see the Justo shop).
(() => {
    'use strict';
    const ROOT = document.body.dataset.root || './';
    const EMAIL = 'info@casasiego.com';
    const KIND = { saco: 'Saco', traje: 'Traje', conjunto: 'Saco con chaleco' };
    const SIZE = { CH: 'Chico', M: 'Mediano', G: 'Grande', XG: 'Extra grande' };
    const $ = (id) => document.getElementById(id);
    const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
    const price = (p) => p.price_mxn == null ? 'Precio por confirmar'
        : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(p.price_mxn);

    let products = [];
    let current = null;
    let size = null;

    // --- Grid ---
    const card = (p) => {
        const img = el('img', { src: ROOT + p.image, alt: `${p.name}, Fijo by Casa Siego`, loading: 'lazy', decoding: 'async', draggable: false });
        return el('button', { type: 'button', className: 'card group', onclick: () => open(p) },
            el('div', { className: 'crop' }, img),
            el('p', { className: 'label text-gold mt-4', textContent: KIND[p.kind] }),
            el('h3', { className: 'text-lg md:text-xl mt-1 leading-snug', textContent: p.name }),
            el('p', { className: 'text-ink-500 text-sm mt-1', textContent: p.short }),
            el('p', { className: 'label mt-2', textContent: price(p) }));
    };
    const render = (kind) => {
        const shown = products.filter(p => !kind || p.kind === kind);
        $('rejilla').replaceChildren(...shown.map(card));
        $('estado').textContent = `${shown.length} ${shown.length === 1 ? 'pieza' : 'piezas'}`;
    };
    $('filtros').addEventListener('click', (e) => {
        const b = e.target.closest('[data-kind]');
        if (!b) return;
        $('filtros').querySelectorAll('[data-kind]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
        render(b.dataset.kind);
    });

    // --- Product sheet ---
    const order = () => {
        const a = $('ficha-pedir');
        if (!size) { a.classList.add('btn-off'); a.setAttribute('aria-disabled', 'true'); a.textContent = 'Elige tu talla'; a.href = '#'; return; }
        const subject = `Fijo · Pedido ${current.sku} · talla ${size}`;
        const body = `Hola, me interesa esta pieza de Fijo:\n\n${current.name} (${current.sku})\nTalla: ${size} · ${SIZE[size]}\n\n${location.origin}${location.pathname}#${current.slug}\n\nMi nombre:\nMi teléfono:\nCiudad de entrega:\n`;
        a.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        a.classList.remove('btn-off'); a.removeAttribute('aria-disabled');
        a.textContent = `Pedir talla ${size} por correo`;
    };
    const open = (p, push = true) => {
        current = p; size = null;
        $('ficha-img').src = ROOT + p.image;
        $('ficha-img').alt = `${p.name} sobre maniquí, frente a un muro de concreto`;
        $('ficha-tipo').textContent = KIND[p.kind];
        $('ficha-nombre').textContent = p.name;
        $('ficha-sku').textContent = p.sku;
        $('ficha-precio').textContent = price(p);
        $('ficha-desc').textContent = p.description;
        $('ficha-tallas').replaceChildren(...p.sizes.map(s => {
            const b = el('button', { type: 'button', className: 'chip', role: 'radio' },
                el('span', { className: 'label-strong', textContent: s }),
                el('span', { className: 'note text-xs', textContent: SIZE[s] }));
            b.setAttribute('aria-checked', 'false');
            b.onclick = () => {
                size = s;
                $('ficha-tallas').querySelectorAll('.chip').forEach(x => x.setAttribute('aria-checked', String(x === b)));
                order();
            };
            return b;
        }));
        order();
        if (push && location.hash !== `#${p.slug}`) history.replaceState(null, '', `#${p.slug}`);
        if (!$('ficha').open) $('ficha').showModal();
    };
    const close = () => $('ficha').close();
    $('ficha-cerrar').onclick = close;
    $('ficha').addEventListener('click', (e) => { if (e.target === $('ficha')) close(); });   // click on the backdrop
    $('ficha').addEventListener('close', () => { if (location.hash.length > 1) history.replaceState(null, '', location.pathname + location.search); });
    $('ficha-pedir').addEventListener('click', (e) => { if (!size) e.preventDefault(); });

    const fromHash = () => {
        const p = products.find(x => `#${x.slug}` === location.hash);
        if (p) open(p, false);
    };
    window.addEventListener('hashchange', fromHash);

    // --- Load ---
    fetch('db/productos.json', { cache: 'no-cache' })
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(data => { products = data.products.filter(p => p.active !== false); render(''); fromHash(); })
        .catch(err => {
            console.warn('[fijo] productos.json:', err);
            $('estado').innerHTML = `No pudimos cargar la colección. Escríbenos a <a class="link" href="mailto:${EMAIL}">${EMAIL}</a>.`;
        });
})();
