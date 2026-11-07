// Pruebas de js/variantes.js con los datos reales de db/productos.json:  node brands/justo/tienda/js/test-variantes.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const V = require('./variantes.js');
const db = JSON.parse(readFileSync(new URL('../db/productos.json', import.meta.url), 'utf8'));
const bySlug = Object.fromEntries(db.products.map(p => [p.slug, p]));
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };

const cielo = V.model(bySlug['camisa-azul-cielo']);
const indigo = V.model(bySlug['camisa-azul-indigo']);
const tie = V.model(bySlug['corbata-roja']);
const jacket = V.model(db.products.find(p => !p.kind));

t('camisa: 3 pasos pecho → cuello → manga, 36 variantes', () => {
    assert.deepEqual(cielo.axes.map(a => a.id), ['talla', 'cuello', 'manga']);
    assert.equal(cielo.variants.length, 36);
});
t('todas las tallas se muestran; 42 sin stock', () => {
    assert.equal(cielo.axes[0].options.length, 6);
    assert.equal(V.available(cielo, [], 0, '42'), false);
    assert.equal(V.available(cielo, [], 0, '37'), true);
});
t('al inicio solo el paso 1 y botón Continuar', () => {
    assert.equal(V.visibleSteps(cielo, []), 1);
    const s = V.status(cielo, []);
    assert.equal(s.state, 'choose'); assert.match(s.button, /pecho/);
});
t('pecho con stock → aparece cuello; luego manga', () => {
    assert.equal(V.visibleSteps(cielo, ['37']), 2);
    assert.equal(V.status(cielo, ['37']).state, 'choose');
    assert.equal(V.visibleSteps(cielo, ['37', 'CR']), 3);
});
t('pecho sin stock → no hay paso siguiente y el botón se bloquea', () => {
    assert.equal(V.visibleSteps(cielo, ['42']), 1);
    const s = V.status(cielo, ['42']);
    assert.equal(s.state, 'blocked'); assert.equal(s.button, 'Talla sin stock disponible'); assert.ok(s.legend);
});
t('completo con liga → pay con client_reference_id', () => {
    const s = V.status(cielo, ['37', 'CL', 'ML']);
    assert.equal(s.state, 'pay'); assert.equal(s.variant.sku, 'JUS-CAM-01-37-CL-ML');
    assert.match(s.variant.stripe, /client_reference_id=JUS-CAM-01-37-CL-ML$/);
});
t('completo con stock pero sin liga (40) → comprar por correo', () => {
    assert.equal(V.status(cielo, ['40', 'CR', 'MR']).state, 'mail');
    assert.equal(V.status(cielo, ['39']).state, 'blocked');   // 39 tiene liga pero sin stock
});
t('índigo agotado: tallas visibles, todas bloquean', () => {
    assert.equal(indigo.axes[0].options.length, 6);
    assert.equal(V.status(indigo, ['39']).state, 'blocked');
});
t('cambiar un paso borra los siguientes', () => {
    assert.deepEqual(V.pick(['37', 'CR', 'MC'], 0, '39'), ['39']);
});
t('corbata: talla única se elige sola', () => {
    assert.deepEqual(V.autoPicks(tie, []), ['U']);
    assert.equal(V.status(tie, V.autoPicks(tie, [])).state, 'blocked');
});
t('saco sin axes: un paso «Talla»', () => {
    assert.equal(jacket.axes.length, 1); assert.equal(jacket.axes[0].id, 'talla');
});
t('?sku= preselecciona pasos válidos', () => {
    assert.deepEqual(V.picksFromSku(cielo, 'JUS-CAM-01', 'JUS-CAM-01-40-CL-MC'), ['40', 'CL', 'MC']);
    assert.deepEqual(V.picksFromSku(cielo, 'JUS-CAM-01', 'JUS-CAM-01-40-XX'), ['40']);
    assert.deepEqual(V.picksFromSku(cielo, 'JUS-CAM-01', 'JUS-CAM-02-39'), []);
});
console.log(`${n} pruebas OK`);
