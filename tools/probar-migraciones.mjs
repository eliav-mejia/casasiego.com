// Casa Siego · prueba de las migraciones de supabase/ en PostgreSQL real (PGlite, WebAssembly), sin proyecto ni Docker.
// Uso (desde la raíz del sitio):  npm install   y luego   node tools/probar-migraciones.mjs supabase
// Aplica 0001 → 0003 + seed.sql sobre un stub de Supabase (roles anon/authenticated/service_role, auth.users, auth.uid())
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
for (const f of ['0001_identidad_variante_d.sql', '0002_registro_medidas.sql', '0003_catalogo_publico.sql']) {
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
