/* Synode — region.js (v1.0.0)
   Small flag in the bottom-left corner: México or España.
   España swaps every "Ciudad de México" / "CDMX" for "Madrid" and shows the
   elements marked data-region="es" instead of data-region="mx".

   Detection, once per browser and only when the visitor has not chosen:
   1. The visitor's own choice (click on the flag) always wins.
   2. Otherwise one request to get.geojs.io, which answers only the country
      code. We keep that two-letter code, never the IP address.
   3. If the request fails, the browser's time zone (Europe/Madrid → España).
   Anything else, or no answer, stays México. */
(function () {
  'use strict';

  var KEY = 'synode-region';            // 'mx' | 'es', chosen or detected
  var GEO = 'https://get.geojs.io/v1/ip/country';

  var FLAGS = {
    mx: '<svg viewBox="0 0 21 14" aria-hidden="true"><rect width="7" height="14" fill="#006847"/><rect x="7" width="7" height="14" fill="#fff"/><rect x="14" width="7" height="14" fill="#ce1126"/><circle cx="10.5" cy="7" r="1.6" fill="#8c6a3f"/></svg>',
    es: '<svg viewBox="0 0 21 14" aria-hidden="true"><rect width="21" height="14" fill="#aa151b"/><rect y="3.5" width="21" height="7" fill="#f1bf00"/></svg>'
  };
  var NAMES = { mx: 'México', es: 'España' };

  // Longest phrases first, so "de la Ciudad de México" reads "de Madrid".
  var SWAPS = [
    [/\b(de|en) la Ciudad de México/g, '$1 Madrid'],
    [/\bla Ciudad de México/g, 'Madrid'],
    [/Ciudad de México/g, 'Madrid'],
    [/\bcdmx\b/gi, 'Madrid']
  ];
  var TEST = /Ciudad de México|\bcdmx\b/i;
  var ATTRS = ['alt', 'title', 'aria-label', 'placeholder'];
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1, PRE: 1 };

  var region = 'mx';
  var originals = new Map();            // text node → { text: original, shown: swapped }
  var attrOriginals = new Map();        // element → { attr: original }

  function store(value) { try { localStorage.setItem(KEY, value); } catch (e) {} }
  function stored() {
    try { var v = localStorage.getItem(KEY); return v === 'mx' || v === 'es' ? v : null; }
    catch (e) { return null; }
  }

  function swap(text) {
    for (var i = 0; i < SWAPS.length; i++) text = text.replace(SWAPS[i][0], SWAPS[i][1]);
    return text;
  }

  function skipped(node) {
    for (var el = node.parentNode; el && el.nodeType === 1; el = el.parentNode) {
      if (SKIP[el.tagName] || el.isContentEditable) return true;
    }
    return false;
  }

  function textNode(node) {
    if (region === 'es') {
      if (!TEST.test(node.nodeValue) || skipped(node)) return;
      var shown = swap(node.nodeValue);
      originals.set(node, { text: node.nodeValue, shown: shown });
      node.nodeValue = shown;
    } else if (originals.has(node)) {
      node.nodeValue = originals.get(node).text;
      originals.delete(node);
    }
  }

  function attributes(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var name = ATTRS[i], value = el.getAttribute(name);
      if (value === null) continue;
      var saved = attrOriginals.get(el) || {};
      if (region === 'es' && TEST.test(value)) {
        saved[name] = value;
        attrOriginals.set(el, saved);
        el.setAttribute(name, swap(value));
      } else if (region === 'mx' && name in saved) {
        el.setAttribute(name, saved[name]);
        delete saved[name];
      }
    }
  }

  function walk(root) {
    if (root.nodeType === 3) return textNode(root);
    if (root.nodeType !== 1 || SKIP[root.tagName]) return;
    attributes(root);
    var tree = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (var n = tree.nextNode(); n; n = tree.nextNode()) {
      if (n.nodeType === 3) textNode(n); else attributes(n);
    }
  }

  function blocks() {
    var list = document.querySelectorAll('[data-region]');
    for (var i = 0; i < list.length; i++) list[i].hidden = list[i].getAttribute('data-region') !== region;
  }

  var button;
  function paint() {
    var other = region === 'mx' ? 'es' : 'mx';
    button.innerHTML = FLAGS[region];
    button.setAttribute('aria-label', 'Ubicación: ' + NAMES[region] + '. Cambiar a ' + NAMES[other]);
    button.title = NAMES[region] + ' · cambiar a ' + NAMES[other];
  }

  function apply(next) {
    region = next;
    document.documentElement.setAttribute('data-region', region);
    if (region === 'mx') {
      originals.forEach(function (o, node) { node.nodeValue = o.text; });
      originals.clear();
      attrOriginals.forEach(function (saved, el) {
        for (var name in saved) el.setAttribute(name, saved[name]);
      });
      attrOriginals.clear();
    } else {
      walk(document.body);
    }
    blocks();
    if (button) paint();
  }

  // Pages that render later (the Justo shop) get the same swap as they change.
  function observe() {
    new MutationObserver(function (records) {
      if (region !== 'es') return;
      records.forEach(function (r) {
        if (r.type === 'characterData') {
          var o = originals.get(r.target);
          if (o && r.target.nodeValue === o.shown) return;   // our own swap
          originals.delete(r.target);
          textNode(r.target);
        } else {
          r.addedNodes.forEach(walk);
        }
      });
      blocks();
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function detect() {
    var fromZone = function () {
      try { return Intl.DateTimeFormat().resolvedOptions().timeZone === 'Europe/Madrid' ? 'es' : 'mx'; }
      catch (e) { return 'mx'; }
    };
    if (!window.fetch) return Promise.resolve(fromZone());
    var timer = new Promise(function (_, reject) { setTimeout(reject, 3000); });
    return Promise.race([fetch(GEO, { credentials: 'omit', referrerPolicy: 'no-referrer' }), timer])
      .then(function (res) { return res.ok ? res.text() : Promise.reject(); })
      .then(function (code) { return code.trim().toUpperCase() === 'ES' ? 'es' : 'mx'; })
      .catch(fromZone);
  }

  function style() {
    var css = document.createElement('style');
    css.textContent =
      '[data-region][hidden]{display:none!important}' +
      '.region-flag{position:fixed;left:14px;bottom:14px;z-index:900;width:30px;height:22px;padding:4px;' +
      'border:0;border-radius:4px;background:rgba(255,255,255,.55);cursor:pointer;opacity:.5;' +
      'box-shadow:0 1px 4px rgba(0,0,0,.12);transition:opacity .3s,transform .3s,background .3s}' +
      '.region-flag:hover,.region-flag:focus-visible{opacity:1;transform:scale(1.15);background:rgba(255,255,255,.9)}' +
      '.region-flag:focus-visible{outline:2px solid currentColor;outline-offset:2px}' +
      '.region-flag svg{display:block;width:100%;height:100%;border-radius:1px}' +
      '@media print{.region-flag{display:none}}';
    document.head.appendChild(css);
  }

  function init() {
    style();
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'region-flag';
    button.addEventListener('click', function () {
      var next = region === 'mx' ? 'es' : 'mx';
      store(next);
      apply(next);
    });
    document.body.appendChild(button);
    observe();

    var saved = stored();
    apply(saved || 'mx');
    if (!saved) detect().then(function (found) {
      store(found);
      if (found !== region) apply(found);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
