// Justo by Casa Siego · lógica del selector de tallas por pasos (sin React, sin DOM: se prueba con node, ver test-variantes.mjs).
// Pasos = ejes del producto, en orden: camisas pecho → cuello → manga; sacos y corbatas: un solo paso (talla).
// Reglas:
//   · Siempre se muestran TODAS las opciones configuradas de cada paso; las que no tienen existencias van marcadas «sin stock».
//   · Un paso solo aparece si lo elegido antes tiene existencias (pecho disponible → se muestra cuello, etc.).
//   · Elegir algo sin existencias bloquea el botón principal y explica por qué; cambiar un paso borra los siguientes.
//   · Con todo elegido y en existencia: resumen del pedido y botón de pago activo.
// Datos: productos.json → axes[] + variants[] (los escribe builds/Odoo/Odoo_catalogues/exportar_tienda.py).
// Producto sin axes (sacos): se arma un único paso «Talla» con sizes, stock, prices_mxn y stripe por talla.
(function (root) {
    'use strict';

    // product → { axes: [{id, label, step, options: [{id, label, sub}]}], variants: [{sku, o, stock, price_mxn, stripe}] }
    function model(product, sizeLabel) {
        if (product.axes && product.variants) {
            return {
                axes: product.axes.map(function (a) {
                    return { id: a.id, label: a.label, step: a.step || a.label.toLowerCase(), options: a.options.map(function (o) { return { id: o.id, label: o.label, sub: o.sub || '' }; }) };
                }),
                variants: product.variants,
            };
        }
        var sizes = product.sizes || [];
        return {
            axes: [{ id: 'talla', label: 'Talla', step: 'tu talla', options: sizes.map(function (s) { return { id: s, label: s, sub: sizeLabel ? sizeLabel(s) : '' }; }) }],
            variants: sizes.map(function (s) {
                return {
                    sku: product.sku + '-' + s, o: [s], stock: (product.stock && product.stock[s]) || 0,
                    price_mxn: (product.prices_mxn && product.prices_mxn[s]) || product.price_mxn,
                    stripe: (product.stripe && product.stripe[s]) || null,
                };
            }),
        };
    }

    function matches(v, picks) {
        for (var i = 0; i < picks.length; i++) if (v.o[i] !== picks[i]) return false;
        return true;
    }

    // Units in stock among the variants that start with these picks.
    function stockOf(m, picks) {
        return m.variants.reduce(function (n, v) { return n + (matches(v, picks) ? (v.stock > 0 ? v.stock : 0) : 0); }, 0);
    }

    // Is option `id` of step `k` available, given what was picked before it?
    function available(m, picks, k, id) {
        return stockOf(m, picks.slice(0, k).concat([id])) > 0;
    }

    // Steps to render: every step up to the first one not chosen yet, and none after a choice without stock.
    function visibleSteps(m, picks) {
        var n = 1;
        for (var k = 0; k < m.axes.length - 1; k++) {
            if (picks[k] == null || stockOf(m, picks.slice(0, k + 1)) === 0) break;
            n = k + 2;
        }
        return n;
    }

    // Choose option `id` at step `k`: keeps earlier picks, drops later ones (they may not exist for the new choice).
    function pick(picks, k, id) {
        return picks.slice(0, k).concat([id]);
    }

    // One-option steps (ties: talla única) are chosen automatically, as long as the earlier ones are.
    function autoPicks(m, picks) {
        var out = picks.slice();
        for (var k = 0; k < m.axes.length; k++) {
            if (out[k] != null) continue;
            if (m.axes[k].options.length === 1) out[k] = m.axes[k].options[0].id; else break;
        }
        return out;
    }

    // Everything the bottom area needs: which state, the button text, the legend under it, the chosen variant.
    //   state: 'choose' (falta elegir; botón «Continuar» activo) · 'blocked' (lo elegido no tiene stock; botón inhabilitado)
    //          · 'pay' (completo y con stock; liga de Stripe) · 'mail' (completo y con stock, sin liga: comprar por correo)
    function status(m, picks) {
        var n = m.axes.length;
        for (var k = 0; k < n; k++) {
            if (picks[k] == null) {
                return { state: 'choose', step: k, button: 'Continuar · elige ' + m.axes[k].step, legend: k === 0 ? '' : 'Siguiente paso: ' + m.axes[k].label.toLowerCase() + '.' };
            }
            if (stockOf(m, picks.slice(0, k + 1)) === 0) {
                var what = k === 0 ? (n === 1 ? 'Talla' : m.axes[0].label) : k === n - 1 ? 'Combinación' : m.axes[k].label;
                var label = what === 'Talla' || what === m.axes[0].label ? 'Talla sin stock disponible' : what + ' sin stock disponible';
                return {
                    state: 'blocked', step: k, button: label,
                    legend: 'La opción elegida no tiene existencias. ' + (k === 0 ? 'Elige otra ' + m.axes[0].label.toLowerCase() + ' para continuar.' : 'Cambia ' + m.axes[k].step + ' o un paso anterior para continuar.'),
                };
            }
        }
        var variant = m.variants.filter(function (v) { return matches(v, picks); })[0] || null;
        if (!variant) return { state: 'blocked', step: n - 1, button: 'Combinación sin stock disponible', legend: 'Esta combinación no existe en el catálogo.' };
        return { state: variant.stripe ? 'pay' : 'mail', step: n, variant: variant, button: '', legend: '' };
    }

    // ?sku=JUS-CAM-01-37 (o completo) → picks iniciales. Ignora lo que no coincida con las opciones.
    function picksFromSku(m, productSku, sku) {
        if (!sku || sku.indexOf(productSku + '-') !== 0) return [];
        var codes = sku.slice(productSku.length + 1).split('-'), out = [];
        for (var k = 0; k < Math.min(codes.length, m.axes.length); k++) {
            if (!m.axes[k].options.some(function (o) { return o.id === codes[k]; })) break;
            out.push(codes[k]);
        }
        return out;
    }

    var api = { model: model, stockOf: stockOf, available: available, visibleSteps: visibleSteps, pick: pick, autoPicks: autoPicks, status: status, picksFromSku: picksFromSku };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.JustoVariantes = api;
})(typeof window !== 'undefined' ? window : this);
