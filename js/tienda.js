/* Casa Siego — tienda.js 2.2.0 (v1.4.1) · catálogo de las tiendas de marca (Justo, Atemporal). Plain JS: no build, no React, no Babel.
   One engine for every brands/<marca>/tienda/index.html. Each tienda folder is only its page + db/productos.json.

   1. Data: db/productos.json next to the page = { marca, marcaNombre, kinds{id: label}, filtros{id: plural label}, products[] }. No prices, sizes, stock or Stripe:
      every active product is shown, and every one is available («todo en existencia», v1.4.1).
      2.1.0: destacados[] (slugs, in order) fill the «Destacado» grid (#destacados: every destacado, 2 columns on phones,
      3 from 1024 px); the full catalogue (filtered by the chips) runs in a horizontal snap carousel
      (#rejilla: 3 columns on phones, 5 from 1024 px) with ‹ › buttons and a progress line.
      2.2.0: the carousel loops endlessly both ways: the list is laid out COPIAS times (copies aria-hidden, out of
      the tab order) and, once a scroll settles, it jumps by whole copies back into the middle one (same frame, no flash).
      A list that fits in one screen is shown once, without loop or arrows.
   2. One «Cotizar» per product (card and sheet):
        · visitor (no session) → registro.html (create the account first);
        · signed-in member     → WhatsApp with the product already written (WHATSAPP below);
                                 while WHATSAPP is empty, a pre-filled e-mail instead.
      Session = the Supabase session saved by acceso.js / registro.js (localStorage sb-<ref>-auth-token), confirmed with
      Supabase (auth.getUser) when js/supabase-config.js is filled in. Without Supabase configured nobody is signed in.
   3. Tracking (Google Tag Manager, through js/medicion.js → window.casaMedir; dataLayer directly if it isn't loaded yet).
      No personal data, only the product:
        casa_tienda_ver       a product sheet opens: sku, producto, tipo, origen (destacado | tarjeta | enlace)
        casa_tienda_cotizar   click on «Cotizar»: sku, producto, tipo, canal (registro | whatsapp | correo), sesion, origen (destacado | tarjeta | ficha)
        casa_tienda_filtro    a filter chip: tipo (todo | saco | traje …)
      Documented in _interno/deployed/Marketing/Campaigns/tienda-cotizar-registro-v1.4.1.pdf and README «Medición». */
(() => {
    'use strict';

    // WhatsApp of Casa Siego for quotes, digits only with country code (México: 52 + 10 digits, e.g. '525512345678').
    // Empty = signed-in members get a pre-filled e-mail instead of WhatsApp.
    const WHATSAPP = '';
    const EMAIL = 'info@casasiego.com';

    const ROOT = document.body.dataset.root || './';
    const REGISTRO = `${ROOT}registro.html`;
    const $ = (id) => document.getElementById(id);
    const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids.filter(k => k != null)); return n; };
    const WA_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3z"/></svg>';

    let data = { marca: '', kinds: {}, products: [] };
    let sesion = false;     // signed-in member (confirmed)
    let current = null;     // product in the open sheet

    // --- Tracking ---
    const medir = (evento, datos) => {
        if (typeof window.casaMedir === 'function') return window.casaMedir(evento, datos);
        (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: evento, marca: data.marca, seccion: 'tienda' }, datos));
    };
    const ficha = (p) => ({ sku: p.sku, producto: p.name, tipo: p.kind });

    // --- Session ---
    const savedSession = () => {
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (/^sb-[a-z0-9]+-auth-token$/.test(k) && (JSON.parse(localStorage.getItem(k)) || {}).refresh_token) return true;
            }
        } catch (e) { /* storage blocked: no session */ }
        return false;
    };
    const loadScript = (src) => new Promise((ok, ko) => document.head.append(el('script', { src, onload: ok, onerror: ko })));
    const checkSession = () => {
        const SB = window.CASASIEGO_SUPABASE || {};
        if (!SB.url || !SB.publishableKey || !savedSession()) return Promise.resolve(false);
        const ACC = window.CASASIEGO_ACCESO || {};
        const lib = window.supabase ? Promise.resolve() : loadScript(ACC.supabaseJs || 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js');
        const check = lib.then(() => window.supabase.createClient(SB.url, SB.publishableKey, {
            auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: false, detectSessionInUrl: false }
        }).auth.getUser()).then(r => !!(r && r.data && r.data.user));
        const timeout = new Promise(ok => setTimeout(() => ok(false), 6000));
        return Promise.race([check, timeout]).catch(() => false);
    };

    // --- «Cotizar» ---
    const productUrl = (p) => `${location.origin}${location.pathname}#${p.slug}`;
    const cotizar = (p, origen) => {
        let a;
        if (!sesion) {
            a = el('a', { className: 'btn btn-line', href: REGISTRO, textContent: 'Cotizar' });
            a.title = 'Crea tu cuenta para cotizar por WhatsApp';
        } else if (WHATSAPP) {
            const text = `Hola, quiero cotizar ${p.name} (${p.sku}) de ${data.marcaNombre || 'Casa Siego'}: ${productUrl(p)}`;
            a = el('a', { className: 'btn btn-wa', href: `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`, target: '_blank', rel: 'noopener' });
            a.innerHTML = `${WA_ICON}<span>Cotizar por WhatsApp</span>`;
        } else {
            const subject = `Cotización · ${p.name} (${p.sku})`;
            const body = `Hola, quiero cotizar esta pieza:\n\n${p.name} (${p.sku})\n${productUrl(p)}\n`;
            a = el('a', { className: 'btn btn-rust', href: `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, textContent: 'Cotizar por correo' });
        }
        a.addEventListener('click', () => medir('casa_tienda_cotizar', Object.assign(ficha(p), {
            canal: !sesion ? 'registro' : WHATSAPP ? 'whatsapp' : 'correo', sesion, origen
        })));
        return a;
    };

    // --- Strip above the grid ---
    const aviso = () => {
        const box = $('aviso');
        if (!box) return;
        box.dataset.sesion = String(sesion);
        box.replaceChildren(...[sesion
            ? el('p', { className: 'text-ink-700', textContent: WHATSAPP ? 'Tu sesión está abierta: cotiza cada pieza directamente por WhatsApp.' : 'Tu sesión está abierta: cotiza cada pieza y te respondemos por correo.' })
            : el('p', { className: 'text-ink-700', textContent: 'Crea tu cuenta de Casa Siego y cotiza cada pieza directamente.' }),
            sesion ? null : el('a', { className: 'btn btn-rust', href: REGISTRO, textContent: 'Crear mi cuenta' })].filter(Boolean));
    };

    // --- Grid ---
    const kindLabel = (p) => data.kinds[p.kind] || p.kind;
    const card = (p, origen = 'tarjeta') => {
        const img = el('img', { src: ROOT + p.image, alt: `${p.name}, ${data.marcaNombre || 'Casa Siego'}`, loading: 'lazy', decoding: 'async', draggable: false });
        const open = el('button', { type: 'button', className: 'card-abrir', onclick: () => abrir(p, origen) },
            el('div', { className: 'crop', style: `--focus: ${p.focus || '50% 50%'}` }, img),
            el('p', { className: 'label text-gold mt-4', textContent: kindLabel(p) }),
            el('h3', { className: 'card-nombre text-lg md:text-xl mt-1 leading-snug', textContent: p.name }),
            el('p', { className: 'card-corto text-ink-500 text-sm mt-1', textContent: p.short }));
        return el('article', { className: 'card' }, open, cotizar(p, origen));
    };
    let filtro = '';
    const destacados = () => {
        const box = $('destacados');
        if (!box) return;
        const list = (data.destacados || []).map(s => data.products.find(p => p.slug === s)).filter(Boolean);
        box.closest('[data-destacado]').hidden = !list.length;
        box.replaceChildren(...list.map(p => card(p, 'destacado')));
    };
    // Carousel (2.2.0): endless loop. ‹ › scroll one screen of cards; the gold line shows where you are in the list.
    const COPIAS = 5;
    const carrusel = () => {
        const track = $('rejilla'), prev = $('carrusel-prev'), next = $('carrusel-next'), bar = $('carrusel-barra');
        if (!track) return;
        const cols = () => parseInt(getComputedStyle(track).getPropertyValue('--cols'), 10) || 3;
        const n = () => Number(track.dataset.n || 0);
        const loops = () => track.dataset.loop === 'true';
        // Width of one full copy of the list (card + gap, n times)
        const setW = () => {
            const k = track.children;
            return loops() && k.length > n() ? k[n()].offsetLeft - k[0].offsetLeft : 0;
        };
        const centre = () => {   // jump, by whole copies, back into the middle copy
            const w = setW();
            if (!w) return;
            const mid = Math.floor(COPIAS / 2) * w;
            let x = track.scrollLeft;
            while (x < mid - w / 2) x += w;
            while (x >= mid + w / 2) x -= w;
            if (Math.abs(x - track.scrollLeft) > 1) track.scrollTo({ left: x, behavior: 'instant' });
        };
        const update = () => {
            const loop = loops(), total = n(), visible = Math.min(cols(), total || 1);
            [prev, next].forEach(b => { if (b) { b.disabled = !loop; b.hidden = !loop; } });
            if (!bar) return;
            bar.parentElement.hidden = !loop;
            if (!loop) return;
            const w = setW(), frac = w ? (((track.scrollLeft % w) + w) % w) / w : 0;
            const width = visible / total;
            bar.style.width = `${width * 100}%`;
            bar.style.transform = `translateX(${(frac / width) * 100}%)`;
        };
        let settle;
        track.addEventListener('scroll', () => {
            requestAnimationFrame(update);
            clearTimeout(settle);
            settle = setTimeout(() => { centre(); update(); }, 140);
        }, { passive: true });
        if ('onscrollend' in window) track.addEventListener('scrollend', () => { clearTimeout(settle); centre(); update(); });
        const step = (dir) => {
            centre();
            const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
            track.scrollBy({ left: dir * (track.clientWidth + gap), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        };
        if (prev) prev.onclick = () => step(-1);
        if (next) next.onclick = () => step(1);
        window.addEventListener('resize', () => { centre(); update(); });
        carrusel.update = update;
        carrusel.inicio = () => {   // first card of the middle copy at the left edge
            const w = setW();
            track.scrollTo({ left: w ? Math.floor(COPIAS / 2) * w : 0, behavior: 'instant' });
            update();
        };
    };
    // Fill the carousel: the list once, or COPIAS times when it is longer than one screen
    const llenarCarrusel = (shown) => {
        const track = $('rejilla');
        const cols = parseInt(getComputedStyle(track).getPropertyValue('--cols'), 10) || 3;
        const loop = shown.length > cols;
        track.dataset.n = String(shown.length);
        track.dataset.loop = String(loop);
        const cards = [];
        for (let c = 0; c < (loop ? COPIAS : 1); c++) {
            const copia = loop && c !== Math.floor(COPIAS / 2);
            shown.forEach(p => {
                const a = card(p);
                if (copia) {
                    a.setAttribute('aria-hidden', 'true');
                    a.querySelectorAll('a, button').forEach(x => x.tabIndex = -1);
                }
                cards.push(a);
            });
        }
        track.replaceChildren(...cards);
        if (carrusel.inicio) requestAnimationFrame(carrusel.inicio);
    };
    const render = () => {
        const shown = data.products.filter(p => !filtro || p.kind === filtro);
        destacados();
        llenarCarrusel(shown);
        $('estado').textContent = `${shown.length} ${shown.length === 1 ? 'pieza' : 'piezas'}`;
    };
    // The loop depends on how many columns fit: refill when crossing the 1024 px breakpoint
    matchMedia('(min-width: 1024px)').addEventListener('change', () => { if (data.products.length) render(); });
    const filtros = () => {
        const box = $('filtros');
        const kinds = Object.keys(data.kinds).filter(k => data.products.some(p => p.kind === k));
        if (!kinds.length) { box.hidden = true; return; }   // 2.0.2: the bar shows even with one kind (Todo · Camisas)
        const chip = (id, label) => {
            const b = el('button', { type: 'button', className: 'chip label', textContent: label });
            b.setAttribute('role', 'radio');
            b.setAttribute('aria-checked', String(id === filtro));
            b.onclick = () => {
                filtro = id;
                box.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-checked', String(x === b)));
                medir('casa_tienda_filtro', { tipo: id || 'todo' });
                render();
            };
            return b;
        };
        box.replaceChildren(chip('', 'Todo'), ...kinds.map(k => chip(k, (data.filtros || {})[k] || data.kinds[k])));
    };

    // --- Product sheet ---
    const DETAILS = [['fabric', 'Tela'], ['lining', 'Forro'], ['construction', 'Construcción'], ['collar', 'Cuello'], ['cuffs', 'Puño'], ['pattern', 'Diseño'], ['care', 'Cuidado'], ['features', 'Detalles']];
    const detalles = (p) => {
        const rows = DETAILS.filter(([k]) => p[k] && (!Array.isArray(p[k]) || p[k].length)).map(([k, label]) => el('div', {},
            el('dt', { textContent: label }),
            el('dd', {}, Array.isArray(p[k]) ? el('ul', {}, ...p[k].map(x => el('li', { textContent: x }))) : p[k])));
        return rows.length ? el('dl', { className: 'ficha-detalles' }, ...rows) : null;
    };
    const abrir = (p, origen) => {
        current = p;
        $('ficha-img').src = ROOT + p.image;
        $('ficha-img').alt = p.name;
        $('ficha-img').parentElement.style.setProperty('--focus', p.focus || '50% 50%');
        $('ficha-tipo').textContent = kindLabel(p);
        $('ficha-nombre').textContent = p.name;
        $('ficha-sku').textContent = p.sku;
        $('ficha-desc').textContent = p.description;
        $('ficha-detalles').replaceChildren(...[detalles(p)].filter(Boolean));
        $('ficha-cotizar').replaceChildren(cotizar(p, 'ficha'));
        $('ficha-nota').textContent = sesion ? 'Te respondemos con precio y entrega.' : 'Crea tu cuenta o entra con ella y cotiza por WhatsApp.';
        if (location.hash !== `#${p.slug}`) history.replaceState(null, '', `#${p.slug}`);
        if (!$('ficha').open) $('ficha').showModal();
        medir('casa_tienda_ver', Object.assign(ficha(p), { origen }));
    };
    $('ficha-cerrar').onclick = () => $('ficha').close();
    $('ficha').addEventListener('click', (e) => { if (e.target === $('ficha')) $('ficha').close(); });   // click on the backdrop
    $('ficha').addEventListener('close', () => { current = null; if (location.hash.length > 1) history.replaceState(null, '', location.pathname + location.search); });
    const fromHash = () => {
        const p = data.products.find(x => `#${x.slug}` === location.hash);
        if (p && p !== current) abrir(p, 'enlace');
    };
    window.addEventListener('hashchange', fromHash);

    // --- Load ---
    aviso();
    fetch('db/productos.json', { cache: 'no-cache' })
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(json => {
            data = json;
            data.products = (json.products || []).filter(p => p.active !== false);
            filtros(); carrusel(); render(); fromHash();
            return checkSession();
        })
        .then(ok => {
            if (!ok) return;
            sesion = true;
            aviso(); render();
            if (current) { $('ficha-cotizar').replaceChildren(cotizar(current, 'ficha')); $('ficha-nota').textContent = 'Te respondemos con precio y entrega.'; }
        })
        .catch(err => {
            console.warn('[tienda] productos.json:', err);
            $('estado').innerHTML = `No pudimos cargar la colección. Escríbenos a <a class="link" href="mailto:${EMAIL}">${EMAIL}</a>.`;
        });
})();
