// Casa Siego · prueba de las migraciones de supabase/ en PostgreSQL real (PGlite, WebAssembly), sin proyecto ni Docker.
// Uso (desde la raíz del sitio):  npm install   y luego   node tools/probar-migraciones.mjs supabase
// Aplica 0001 → 0007 + seed.sql sobre un stub de Supabase (roles anon/authenticated/service_role, auth.users, auth.uid())
// y comprueba RLS, la proyección Odoo → catalogo_publico, el registro atómico y las medidas inmutables. Sale 1 si algo falla.
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import fs from 'node:fs';
const D = process.argv[2];
const db = new PGlite({ extensions: { citext } });
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const q = async (sql, p) => (await db.query(sql, p)).rows;
// --- Supabase stub: roles, auth schema, auth.uid()/auth.jwt() from request.jwt.claims
await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create role supabase_auth_admin nologin;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_app_meta_data jsonb default '{"provider":"email"}', raw_user_meta_data jsonb default '{}');
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
grant usage on schema auth, public to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
`);
for (const f of ['0001_identidad_variante_d.sql', '0002_registro_medidas.sql', '0003_catalogo_publico.sql', '0004_panel_cliente.sql', '0005_alta_proveedores.sql', '0006_alta_correo_medidas_propias.sql', '0007_perfil_cliente.sql']) {
  try { await db.exec(fs.readFileSync(`${D}/migrations/${f}`, 'utf8')); ok(true, `migración ${f}`); }
  catch (e) { ok(false, `migración ${f}: ${e.message}`); process.exit(1); }
}
await db.exec(fs.readFileSync(`${D}/seed.sql`, 'utf8'));
const [c] = await q(`select count(*)::int n, count(*) filter (where estado='disponible')::int d from public.catalogo_publico`);
ok(c.n === 111 && c.d === 4, `seed → catalogo_publico: ${c.n} SKU, ${c.d} disponibles (esperado 111 / 4)`);
const disp = (await q(`select sku from public.catalogo_publico where estado='disponible' order by 1`)).map(r => r.sku).join(' ');
ok(disp === 'JUS-CAM-01-37-CR-MR JUS-CAM-01-40-CR-MR JUS-CAM-03-37-CR-MR JUS-CAM-03-40-CR-MR', `disponibles: ${disp}`);

// --- anon: lectura pública, sin escritura, sin espejo
const as = async (role, claims, fn) => { await db.exec(`set role ${role}; select set_config('request.jwt.claims', '${JSON.stringify(claims)}', false);`); try { return await fn(); } finally { await db.exec('reset role'); } };
const anonN = await as('anon', {}, () => q(`select count(*)::int n from public.catalogo_publico`));
ok(anonN[0].n === 111, `anon lee catalogo_publico (${anonN[0].n})`);
let err = await as('anon', {}, () => q(`update public.catalogo_publico set stock = 9`).then(() => null, e => e.message));
ok(err && /permission denied/.test(err), `anon no escribe catalogo_publico (${err})`);
err = await as('anon', {}, () => q(`select * from inventario.existencias_odoo`).then(() => null, e => e.message));
ok(err && /permission denied/.test(err), `anon no lee el espejo de Odoo`);
err = await as('anon', {}, () => q(`select public.cargar_existencias_odoo('[]')`).then(() => null, e => e.message));
ok(err && /permission denied/.test(err), `anon no ejecuta cargar_existencias_odoo`);

// --- Odoo → espejo → proyección (service_role, como la Edge Function)
const n = await as('service_role', {}, () => q(`select public.cargar_existencias_odoo($1::jsonb) n`, [JSON.stringify([
  { sku: 'JUS-CAM-01-40-CR-MR', almacen: 'MX', cantidad: 0, odoo_product_id: 7, odoo_write_date: '2026-11-08T17:04:11Z' },
  { sku: 'JUS-CAM-02-38-CL-ML', almacen: 'MX', cantidad: 2.6, odoo_product_id: 8, odoo_write_date: '2026-11-08T17:05:00Z' },
  { sku: 'JUS-CAM-02-38-CL-ML', almacen: 'ES', cantidad: -1, odoo_product_id: 8, odoo_write_date: '2026-11-08T17:05:00Z' }])]));
ok(n[0].n === 3, `cargar_existencias_odoo escribe 3 filas`);
const r = await q(`select sku, stock, stock_es, estado from public.catalogo_publico where sku in ('JUS-CAM-01-40-CR-MR','JUS-CAM-02-38-CL-ML') order by 1`);
ok(r[0].stock === 0 && r[0].estado === 'agotado', `venta en Odoo → 01-40-CR-MR agotado`);
ok(r[1].stock === 2 && r[1].stock_es === 0 && r[1].estado === 'disponible', `2,6 → 2 (piso) y −1 → 0 en España`);
await q(`update public.catalogo_publico set activo = false where sku = 'JUS-CAM-02-38-CL-ML'`);
const hid = await as('anon', {}, () => q(`select count(*)::int n from public.catalogo_publico where sku = 'JUS-CAM-02-38-CL-ML'`));
ok(hid[0].n === 0, `SKU inactivo no se ve en la API pública`);

// --- registro por representante
const [rep] = await q(`insert into auth.users (email) values ('rep@casasiego.com') returning id`);
const [cli] = await q(`insert into auth.users (email) values ('cliente@ejemplo.com') returning id`);
const [otro] = await q(`insert into auth.users (email) values ('otro@ejemplo.com') returning id`);
ok((await q(`select count(*)::int n from public.profiles`))[0].n === 3, `alta_usuario crea perfiles`);
const p = { nombre: 'Juan', apellidos: 'Pérez', telefono: '+525512345678', ciudad: 'CDMX', pais: 'MX', marca: 'justo',
  medidas: { lugar: 'oficina', cuello: 39.5, pecho: 100, largo_manga: 64, cintura: 88, cuello_preferido: 'CR', manga_preferida: 'MR' },
  consentimientos: { privacidad: true, terminos: true, marketing: false } };
err = await as('service_role', {}, () => q(`select public.registrar_cliente($1, $2, $3::jsonb)`, [cli.id, rep.id, JSON.stringify(p)]).then(() => null, e => e.message));
ok(err && /sin permiso/.test(err), `sin rol representante → rechazado`);
await q(`insert into identidad.membresias (user_id, sitio, rol) values ($1, 'casasiego.com', 'representante')`, [rep.id]);
const soy = await as('authenticated', { sub: rep.id, role: 'authenticated' }, () => q(`select public.soy_personal() s`));
const soyNo = await as('authenticated', { sub: cli.id, role: 'authenticated' }, () => q(`select public.soy_personal() s`));
ok(soy[0].s === true && soyNo[0].s === false, `soy_personal: representante sí, cliente no`);
err = await as('authenticated', { sub: rep.id, role: 'authenticated' }, () => q(`select public.registrar_cliente($1, $2, $3::jsonb)`, [cli.id, rep.id, JSON.stringify(p)]).then(() => null, e => e.message));
ok(err && /permission denied/.test(err), `registrar_cliente solo con service_role`);
const sinPriv = { ...p, consentimientos: { terminos: true } };
err = await as('service_role', {}, () => q(`select public.registrar_cliente($1, $2, $3::jsonb)`, [cli.id, rep.id, JSON.stringify(sinPriv)]).then(() => null, e => e.message));
ok(err && /privacidad/.test(err), `sin aviso de privacidad → rechazado y nada guardado`);
ok((await q(`select count(*)::int n from public.medidas`))[0].n === 0, `transacción: 0 medidas tras el rechazo`);
err = await as('service_role', {}, () => q(`select public.registrar_cliente($1, $2, $3::jsonb)`, [cli.id, rep.id, JSON.stringify(p)]).then(() => null, e => e.message));
ok(err === null, `registro completo ${err ?? ''}`);
const [pf] = await q(`select nombre, registro_completo, marca_origen from public.profiles where id = $1`, [cli.id]);
ok(pf.nombre === 'Juan' && pf.registro_completo && pf.marca_origen === 'justo', `perfil: Juan, completo, justo`);
ok((await q(`select count(*)::int n from identidad.consentimientos where user_id = $1`, [cli.id]))[0].n === 3, `3 consentimientos`);
const mine = await as('authenticated', { sub: cli.id, role: 'authenticated' }, () => q(`select cuello, pecho from public.medidas_vigentes`));
const others = await as('authenticated', { sub: otro.id, role: 'authenticated' }, () => q(`select count(*)::int n from public.medidas`));
const repSees = await as('authenticated', { sub: rep.id, role: 'authenticated' }, () => q(`select count(*)::int n from public.medidas`));
ok(mine.length === 1 && Number(mine[0].cuello) === 39.5, `el cliente ve sus medidas`);
ok(others[0].n === 0 && repSees[0].n === 1, `otro cliente no las ve; el representante sí`);
err = await q(`update public.medidas set cuello = 40`).then(() => null, e => e.message);
ok(err && /solo inserción/.test(err) && !/ocurrido_en/.test(err), `medidas inmutables (${err})`);
const malo = { ...p, medidas: { ...p.medidas, pecho: 900 } };
const [cli2] = await q(`insert into auth.users (email) values ('c2@ejemplo.com') returning id`);
err = await as('service_role', {}, () => q(`select public.registrar_cliente($1, $2, $3::jsonb)`, [cli2.id, rep.id, JSON.stringify(malo)]).then(() => null, e => e.message));
ok(err && /medida_cm/.test(err), `pecho 900 cm → rechazado (${err && err.slice(0, 80)})`);
err = await q(`delete from auth.users where id = $1`, [cli.id]).then(() => null, e => e.message);
ok(err === null, `borrar la cuenta borra medidas y contacto en cascada ${err ?? ''}`);
ok((await q(`select count(*)::int n from public.medidas`))[0].n === 0, `0 medidas tras la baja`);
err = await q(`delete from public.medidas`).then(() => null, e => e.message);
ok(true, `delete directo de medidas: ${err ? 'bloqueado' : 'sin filas'}`);

// --- 0004 · panel del miembro (mi_panel)
const [ana] = await q(`insert into auth.users (email) values ('ana@ejemplo.com') returning id`);
const [beto] = await q(`insert into auth.users (email) values ('beto@ejemplo.com') returning id`);
await q(`update public.profiles set nombre = 'Ana María' where id = $1`, [ana.id]);
await db.exec(`
insert into public.telas (codigo, nombre, composicion, peso_g_m2, imagen, llegada_estimada) values
  ('TEL-LINO-OLIVO', 'Lino olivo', '100 % lino', 220, 'images/telas/lino-olivo.jpg', current_date + 20),
  ('TEL-TWEED-GRIS', 'Tweed espiga gris', 'Lana', 340, 'images/telas/tweed-espiga-gris.jpg', current_date + 5),
  ('TEL-VIEJA', 'Tela pasada', null, null, 'images/telas/lino-olivo.jpg', current_date - 60);
insert into public.lotes (id, capacidad, piezas, cierre_estimado) values ('LOTE-2026-12', 100, 64, current_date + 30);
insert into public.conjuntos (id, nombre, orden) values ('diplomatico', 'Ejecutivo diplomático', 1), ('tweed', 'Tweed de oficina', 2), ('noche', 'Negro de noche', 3);
insert into public.conjunto_piezas (conjunto_id, orden, tipo, modelo, etiqueta) values
  ('diplomatico', 1, 'saco', 'JUS-SAC-01', 'Saco marino diplomático'), ('diplomatico', 2, 'camisa', 'JUS-CAM-03', 'Camisa Blanca'),
  ('diplomatico', 3, 'corbata', 'JUS-COR-02', 'Corbata Azul Índigo'), ('diplomatico', 4, 'pantalon', 'JUS-PAN-01', 'Pantalón marino'),
  ('tweed', 1, 'saco', 'JUS-SAC-02', 'Saco gris tweed'), ('tweed', 2, 'camisa', 'JUS-CAM-01', 'Camisa Azul Cielo'),
  ('noche', 1, 'saco', 'JUS-SAC-03', 'Saco negro'), ('noche', 2, 'chaleco', 'JUS-CHA-01', 'Chaleco negro'), ('noche', 3, 'camisa', 'JUS-CAM-03', 'Camisa Blanca'),
  ('noche', 4, 'corbata', 'JUS-COR-01', 'Corbata Roja');
`);
await q(`insert into public.pedidos_cliente (odoo_ref, user_id, estado, lote_id, piezas, entrega_estimada) values
  ('S00041', $1, 'en_lote', 'LOTE-2026-12', 3, current_date + 45), ('S00012', $1, 'entregado', null, 2, current_date - 90)`, [ana.id]);
await q(`insert into public.prendas_cliente (user_id, tipo, modelo, estado) values
  ($1, 'saco', 'JUS-SAC-01', 'adquirida'), ($1, 'camisa', 'JUS-CAM-03', 'adquirida'), ($1, 'corbata', 'JUS-COR-02', 'en_pedido'),
  ($1, 'camisa', 'JUS-CAM-01', 'adquirida')`, [ana.id]);
await q(`insert into public.recomendaciones (user_id, titulo, prioridad) values ($1, 'Lino olivo para verano', 5), ($1, 'Vencida', 9)`, [ana.id]);
await q(`update public.recomendaciones set vigente_hasta = current_date - 1 where titulo = 'Vencida'`);
const panel = (await as('authenticated', { sub: ana.id, role: 'authenticated' }, () => q(`select public.mi_panel() p`)))[0].p;
ok(panel.nombre === 'Ana María', `panel: «Hola, ${panel.nombre}»`);
ok(panel.entrega && panel.entrega.pedido === 'S00041', `entrega: el pedido sin entregar más cercano (${panel.entrega && panel.entrega.pedido})`);
ok(panel.lote && panel.lote.piezas === 64 && panel.lote.capacidad === 100 && panel.lote.mis_piezas === 3, `lote: 64/100, mis piezas 3`);
ok(panel.telas.map(t => t.codigo).join(',') === 'TEL-TWEED-GRIS,TEL-LINO-OLIVO', `telas próximas por fecha, sin la pasada (${panel.telas.map(t => t.codigo)})`);
ok(panel.conjuntos.map(c => c.id).join(',') === 'diplomatico,tweed', `conjuntos ≥ 50 %: diplomático 3/4, tweed 1/2; noche 1/4 fuera (${panel.conjuntos.map(c => c.id + ' ' + c.tengo + '/' + c.total)})`);
const dip = panel.conjuntos[0].piezas;
ok(dip.map(x => (x.tiene ? '✓' : '✗')).join('') === '✓✓✓✗', `diplomático: ✓ saco, ✓ camisa, ✓ corbata (en camino), ✗ pantalón`);
ok(dip[2].en_camino === true && dip[0].en_camino === false, `corbata marcada «en camino»`);
const titulos = panel.recomendaciones.map(r => r.titulo);
ok(titulos.includes('Lino olivo para verano') && !titulos.includes('Vencida'), `recomendación de la Casa vigente; la vencida no`);
ok(titulos.includes('Pantalón marino') && titulos.includes('Saco gris tweed'), `recomendaciones «completa tu conjunto»: ${titulos.join(' · ')}`);
const pb = (await as('authenticated', { sub: beto.id, role: 'authenticated' }, () => q(`select public.mi_panel() p`)))[0].p;
ok(pb.entrega === null && pb.conjuntos.length === 0 && pb.recomendaciones.length === 0 && pb.telas.length === 2, `otro miembro: nada de Ana; sí ve las telas`);
err = await as('anon', {}, () => q(`select public.mi_panel()`).then(() => null, e => e.message));
ok(err && /permission denied/.test(err), `anon no ejecuta mi_panel`);
err = await as('anon', {}, () => q(`select * from public.telas`).then(() => null, e => e.message));
ok(err && /permission denied/.test(err), `anon no ve las telas próximas`);
err = await as('authenticated', { sub: beto.id, role: 'authenticated' }, () => q(`insert into public.recomendaciones (user_id, titulo) values ($1, 'x')`, [beto.id]).then(() => null, e => e.message));
ok(err && /permission denied/.test(err), `un miembro no escribe recomendaciones`);

// --- 0005 · crear cuenta en registro.html con Google / Microsoft / LinkedIn / Facebook
const hook = async (prov) => (await q(`select public.antes_de_crear_usuario($1::jsonb) r`, [JSON.stringify({ user: { app_metadata: { provider: prov, providers: [prov] } } })]))[0].r;
const pasan = [];
for (const pv of ['google', 'azure', 'linkedin_oidc', 'facebook', 'email']) if (JSON.stringify(await hook(pv)) === '{}') pasan.push(pv);
ok(pasan.length === 5, `hook deja pasar ${pasan.join(', ')}`);
const rech = await hook('phone'), rechA = await hook('apple'), rechN = await hook('anonymous');
ok(rech.error && rech.error.http_code === 403 && rechA.error && rechN.error, `hook rechaza phone, apple y anónimo (403)`);
err = await as('authenticated', { sub: ana.id, role: 'authenticated' }, () => q(`select public.antes_de_crear_usuario('{}'::jsonb)`).then(() => null, e => e.message));
ok(err && /permission denied/.test(err), `el navegador no ejecuta el hook`);
const [li] = await q(`insert into auth.users (email, raw_app_meta_data) values ('li@ejemplo.com', '{"provider":"linkedin_oidc","providers":["linkedin_oidc"]}') returning id`);
ok((await q(`select proveedor_alta from public.profiles where id = $1`, [li.id]))[0].proveedor_alta === 'linkedin_oidc', `alta con LinkedIn: perfil con proveedor linkedin_oidc`);
ok((await q(`select count(*)::int n from identidad.membresias where user_id = $1 and rol = 'cliente'`, [li.id]))[0].n === 1, `alta con LinkedIn: membresía cliente`);
const cons = [{ tipo: 'privacidad', version: '2026-10', otorgado: true }, { tipo: 'terminos', version: '2026-10', otorgado: true }, { tipo: 'marketing', version: '2026-10', otorgado: false }];
const jwtLi = { sub: li.id, role: 'authenticated', app_metadata: { provider: 'linkedin_oidc' } };
err = await as('authenticated', jwtLi, () => q(`select public.completar_registro('Luis Ibarra', 'es', 'MX', 'justo', '', '{}'::jsonb, $1::jsonb)`, [JSON.stringify(cons.slice(1))]).then(() => null, e => e.message));
ok(err && /privacidad/.test(err), `sin aviso de privacidad → no se completa`);
err = await as('authenticated', jwtLi, () => q(`select public.completar_registro('Luis Ibarra', 'es', 'MX', 'justo', '', '{}'::jsonb, $1::jsonb)`, [JSON.stringify(cons)]).then(() => null, e => e.message));
ok(err === null, `completar_registro con LinkedIn ${err ?? ''}`);
const [pl] = await q(`select nombre, registro_completo, marca_origen from public.profiles where id = $1`, [li.id]);
ok(pl.nombre === 'Luis Ibarra' && pl.registro_completo && pl.marca_origen === 'justo', `perfil completo (Luis Ibarra, justo)`);
const provs = (await q(`select distinct proveedor from identidad.consentimientos where user_id = $1`, [li.id])).map(r => r.proveedor).join();
ok(provs === 'linkedin_oidc', `consentimientos con proveedor linkedin_oidc (${provs})`);
ok((await q(`select count(*)::int n from identidad.eventos_acceso where user_id = $1 and evento = 'registro_ok' and proveedor = 'linkedin_oidc'`, [li.id]))[0].n === 1, `evento registro_ok con linkedin_oidc`);
err = await as('authenticated', jwtLi, () => q(`select public.completar_registro('Luis', 'es', 'MX', 'justo', '', '{}'::jsonb, $1::jsonb)`, [JSON.stringify(cons)]).then(() => null, e => e.message));
ok(err && /ya completado/.test(err), `no se completa dos veces`);
const [fb] = await q(`insert into auth.users (email, raw_app_meta_data) values ('fb@ejemplo.com', '{"provider":"facebook"}') returning id`);
ok((await q(`select count(*)::int n from public.medidas where user_id = $1`, [fb.id]))[0].n === 0, `cuenta propia sin medidas: las toma un representante`);
const nofb = await as('authenticated', { sub: fb.id, role: 'authenticated' }, () => q(`select public.soy_personal() s`));
ok(nofb[0].s === false, `cuenta propia no es personal`);

// --- 0006 · alta con correo y contraseña + medidas que declara el propio cliente (pop-up de la portada)
const [em] = await q(`insert into auth.users (email, raw_app_meta_data) values ('correo@ejemplo.com', '{"provider":"email","providers":["email"]}') returning id`);
const jwtEm = { sub: em.id, role: 'authenticated', app_metadata: { provider: 'email' } };
const mm = (a) => as('authenticated', jwtEm, () => q(
  `select public.registrar_mis_medidas(p_cuello => $1, p_pecho => $2, p_largo_manga => $3, p_cintura => $4, p_ajuste => $5, p_cuello_preferido => $6) id`,
  [a.cuello ?? null, a.pecho ?? null, a.manga ?? null, a.cintura ?? null, a.ajuste ?? null, a.cp ?? null]).then(() => null, e => e.message));
err = await mm({ cuello: 39, pecho: 100, manga: 64 });
ok(err && /registro incompleto/.test(err), `medidas antes de completar el registro → rechazado`);
err = await as('authenticated', jwtEm, () => q(`select public.completar_registro('Elena Correa', 'es', '', 'casa', '', '{}'::jsonb, $1::jsonb)`, [JSON.stringify(cons)]).then(() => null, e => e.message));
ok(err === null, `completar_registro con correo ${err ?? ''}`);
ok((await q(`select proveedor_alta from public.profiles where id = $1`, [em.id]))[0].proveedor_alta === 'email', `alta con correo: proveedor email`);
err = await mm({ cuello: 39.5, pecho: 101, manga: 64.5, cintura: 88, ajuste: 'regular', cp: 'CL' });
ok(err === null, `el cliente guarda sus medidas ${err ?? ''}`);
const [mv] = await as('authenticated', jwtEm, () => q(`select cuello, pecho, largo_manga, lugar, tomadas_por = user_id propio from public.medidas_vigentes`));
ok(Number(mv.cuello) === 39.5 && mv.lugar === 'remota' && mv.propio, `medidas vigentes: 39.5 · remota · tomadas por el propio cliente`);
err = await mm({ pecho: 100, manga: 64 });
ok(err && /cuello/.test(err), `falta cuello → rechazado`);
err = await mm({ cuello: 39, pecho: 900, manga: 64 });
ok(err && /rango: pecho/.test(err), `pecho 900 → fuera de rango`);
err = await mm({ cuello: 39, pecho: 100, manga: 64, ajuste: 'x' });
ok(err && /opción inválida: ajuste/.test(err), `opción fuera de lista → rechazada`);
// Inyección SQL: los valores llegan como parámetros tipados, nunca como texto SQL.
err = await mm({ cuello: 39, pecho: 100, manga: 64, ajuste: "regular'); delete from public.medidas; --" });
ok(err && /opción inválida/.test(err), `inyección en una opción → tratada como texto y rechazada`);
err = await mm({ cuello: "39; drop table public.medidas", pecho: 100, manga: 64 });
ok(err && /invalid input syntax/.test(err), `inyección en un número → error de tipo numeric, nada se ejecuta`);
err = await mm({ cuello: 39, pecho: 100, manga: 64, cp: "CR' or '1'='1" });
ok(err && /opción inválida/.test(err), `«' or '1'='1» → rechazado`);
ok((await q(`select count(*)::int n from public.medidas where user_id = $1`, [em.id]))[0].n === 1 &&
   (await q(`select to_regclass('public.medidas') t`))[0].t === 'medidas', `tras los intentos: la tabla sigue y hay 1 toma`);
// Nadie guarda medidas a nombre de otro: la función no recibe user_id; el insert directo no está permitido.
err = await as('authenticated', jwtEm, () => q(`insert into public.medidas (user_id, lugar, cuello, pecho, largo_manga) values ($1, 'remota', 40, 100, 64)`, [fb.id]).then(() => null, e => e.message));
ok(err && /permission denied/.test(err), `insert directo en medidas → permission denied`);
ok((await q(`select count(*)::int n from public.medidas where user_id = $1`, [fb.id]))[0].n === 0, `la otra cuenta sigue sin medidas`);
const ajenas = await as('authenticated', { sub: fb.id, role: 'authenticated' }, () => q(`select count(*)::int n from public.medidas_vigentes`));
ok(ajenas[0].n === 0, `otro cliente no ve las medidas de Elena (RLS)`);
err = await as('anon', {}, () => q(`select public.registrar_mis_medidas(39, 100, 64)`).then(() => null, e => e.message));
ok(err && /permission denied/.test(err), `anon no ejecuta registrar_mis_medidas`);
for (let i = 0; i < 4; i++) await mm({ cuello: 39, pecho: 100, manga: 64 });
err = await mm({ cuello: 39, pecho: 100, manga: 64 });
ok(err && /demasiadas/.test(err), `sexta toma en un día → rechazada`);

// --- 0007 · perfil del cliente en /cuenta/: medidas, dirección, correo, teléfono y últimas transacciones
const jwtEmC = { ...jwtEm, email: 'correo@ejemplo.com' };
const contacto = (a) => as('authenticated', jwtEmC, () => q(
  `select public.actualizar_mi_contacto($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
  [a.tel ?? null, a.calle ?? null, a.interior ?? null, a.colonia ?? null, a.cp ?? null, a.ciudad ?? null, a.estado ?? null, a.pais ?? null, a.pref ?? 'correo']
).then(() => null, e => e.message));
let perfil = (await as('authenticated', jwtEmC, () => q(`select public.mi_perfil() p`)))[0].p;
ok(perfil.correo === 'correo@ejemplo.com' && perfil.nombre === 'Elena Correa' && perfil.contacto === null &&
   Number(perfil.medidas.cuello) === 39 && !('user_id' in perfil.medidas) && perfil.transacciones.length === 0,
   `mi_perfil sin contacto: correo, nombre, medidas vigentes, 0 transacciones`);
err = await contacto({ tel: '55 1234 5678' });
ok(err && /telefono/.test(err), `teléfono sin +lada → rechazado`);
err = await contacto({ cp: '0670' });
ok(err && /codigo_postal/.test(err), `código postal de 4 dígitos → rechazado`);
err = await contacto({ pref: 'whatsapp' });
ok(err && /telefono requerido/.test(err), `WhatsApp sin teléfono → rechazado`);
err = await contacto({ pais: "MX' or '1'='1" });
ok(err && /pais/.test(err), `inyección en país → rechazada`);
err = await contacto({ tel: '+52 55 1234-5678', calle: 'Colima 124', interior: 'Depto 3', colonia: 'Roma Norte', cp: '06700', ciudad: 'Ciudad de México', estado: 'CDMX', pais: 'MX', pref: 'whatsapp' });
ok(err === null, `el cliente guarda teléfono y dirección ${err ?? ''}`);
err = await contacto({ tel: '+525512345678' });
ok(err && /demasiados/.test(err), `segundo cambio en el mismo minuto → rechazado`);
await q(`update public.clientes set contacto_actualizado_en = now() - interval '2 minutes' where id = $1`, [em.id]);
await q(`insert into public.pedidos_cliente (odoo_ref, user_id, estado, piezas, confirmado_en, entrega_estimada) values
  ('S07031', $1, 'entregado', 2, '2026-09-01', '2026-10-01'), ('S07057', $1, 'confeccion', 3, '2026-10-20', '2026-11-30'),
  ('S07058', $2, 'confirmado', 1, '2026-10-21', null)`, [em.id, fb.id]);
perfil = (await as('authenticated', jwtEmC, () => q(`select public.mi_perfil() p`)))[0].p;
ok(perfil.contacto.telefono === '+525512345678' && perfil.contacto.colonia === 'Roma Norte' && perfil.contacto.contacto_preferido === 'whatsapp',
   `mi_perfil: teléfono normalizado a E.164 y dirección`);
ok(perfil.transacciones.map(t => t.pedido).join(' ') === 'S07057 S07031', `transacciones propias, la más reciente primero (sin la de otro cliente)`);
err = await as('authenticated', jwtEmC, () => q(`update public.clientes set telefono = '+5215555555555' where id = $1`, [fb.id]).then(() => null, e => e.message));
ok(err && /permission denied/.test(err), `update directo en clientes → permission denied`);
const ajeno = (await as('authenticated', { sub: fb.id, role: 'authenticated' }, () => q(`select public.mi_perfil() p`)))[0].p;
ok(ajeno.contacto === null && ajeno.transacciones.length === 1, `otro cliente no ve el contacto ni los pedidos de Elena`);
err = await as('anon', {}, () => q(`select public.mi_perfil()`).then(() => null, e => e.message));
ok(err && /permission denied/.test(err), `anon no ejecuta mi_perfil`);
err = await as('anon', {}, () => q(`select public.actualizar_mi_contacto('+525512345678', '', '', '', '', '', '', '', 'correo')`).then(() => null, e => e.message));
ok(err && /permission denied/.test(err), `anon no ejecuta actualizar_mi_contacto`);
