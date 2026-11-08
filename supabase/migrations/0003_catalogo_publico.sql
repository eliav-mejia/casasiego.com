-- Casa Siego · 0003 · existencias de Odoo Inventario → PostgreSQL → tienda (v1.3.1).
-- Regla unicanal de la firma: Odoo es el ÚNICO lugar donde cambian existencias, precio y activo.
-- Aquí solo hay una PROYECCIÓN que se sobrescribe; nada se edita a mano ni se suma fuera de Odoo.
--
--   Odoo stock.move (Hecho) → acción automatizada → Edge Function odoo-existencias (relee qty_available por almacén)
--     → inventario.existencias_odoo (espejo: sku × almacén)  → trigger → public.catalogo_publico (una fila por SKU)
--     → la tienda (React, al abrir la página) lee catalogo_publico por la Data API con la clave publicable.
--
-- Una migración aplicada nunca se edita. Cada tabla declara sus grant (no hay permisos por defecto).

create schema if not exists inventario;
comment on schema inventario is 'Espejo de Odoo Inventario. NO añadir a "Exposed schemas" de la Data API.';
revoke all on schema inventario from public, anon, authenticated;
grant usage on schema inventario to service_role;

-- ------------------------------------------------------------------ espejo de Odoo (lo que se leyó, tal cual)
create table inventario.existencias_odoo (
    sku             text          not null check (sku ~ '^[A-Z]{3}-[A-Z]{3}-[0-9]{2}(-[A-Z0-9]{1,3})*$'),
    almacen         text          not null check (almacen in ('MX', 'ES')),        -- stock.warehouse CDMX / Madrid
    cantidad        numeric(12,3) not null,                                         -- qty_available (puede ser < 0 en Odoo)
    odoo_product_id integer,
    odoo_write_date timestamptz,
    leido_en        timestamptz   not null default now(),
    primary key (sku, almacen)
);
alter table inventario.existencias_odoo enable row level security;    -- sin políticas: solo service_role
revoke all on inventario.existencias_odoo from public, anon, authenticated;
grant select, insert, update, delete on inventario.existencias_odoo to service_role;

-- ------------------------------------------------------------------ proyección pública (lo que lee el sitio)
create table public.catalogo_publico (
    sku             text        primary key check (sku ~ '^[A-Z]{3}-[A-Z]{3}-[0-9]{2}(-[A-Z0-9]{1,3})*$'),
    modelo          text        generated always as (substring(sku from '^[A-Z]{3}-[A-Z]{3}-[0-9]{2}')) stored,
    sitio           text        not null default 'casasiego.com',
    precio_centavos integer     check (precio_centavos >= 0),                       -- lo escribe odoo-catalogo (pendiente)
    moneda          char(3)     not null default 'MXN',
    activo          boolean     not null default true,
    stock           integer     not null default 0 check (stock >= 0),              -- México
    stock_es        integer     not null default 0 check (stock_es >= 0),           -- España
    estado          text        generated always as (
                        case when not activo then 'inactivo'
                             when stock > 0 or stock_es > 0 then 'disponible'
                             else 'agotado' end) stored,
    odoo_write_date timestamptz,
    actualizado     timestamptz not null default now()
);
create index on public.catalogo_publico (modelo);
comment on table public.catalogo_publico is
    'Proyección de Odoo (regla unicanal). Solo la escriben odoo-existencias, odoo-catalogo y la conciliación.';

alter table public.catalogo_publico enable row level security;
revoke all on public.catalogo_publico from public, anon, authenticated;
grant select (sku, modelo, sitio, precio_centavos, moneda, activo, stock, stock_es, estado, actualizado)
    on public.catalogo_publico to anon, authenticated;
grant select, insert, update, delete on public.catalogo_publico to service_role;
create policy "catálogo: lectura pública de lo activo" on public.catalogo_publico
    for select to anon, authenticated using (activo);

-- ------------------------------------------------------------------ espejo → proyección (PostgreSQL organiza)
-- Suma por almacén lo que Odoo reporta (varias ubicaciones internas de un almacén ya vienen sumadas por Odoo),
-- recorta negativos a 0 y redondea hacia abajo: nunca se ofrece una pieza que no existe.
create or replace function inventario.proyectar()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
    v_sku text := coalesce(new.sku, old.sku);
begin
    insert into public.catalogo_publico as c (sku, stock, stock_es, odoo_write_date, actualizado)
    select v_sku,
           greatest(floor(coalesce(sum(e.cantidad) filter (where e.almacen = 'MX'), 0)), 0)::int,
           greatest(floor(coalesce(sum(e.cantidad) filter (where e.almacen = 'ES'), 0)), 0)::int,
           max(e.odoo_write_date), now()
      from inventario.existencias_odoo e where e.sku = v_sku
    on conflict (sku) do update set
        stock = excluded.stock, stock_es = excluded.stock_es,
        odoo_write_date = coalesce(excluded.odoo_write_date, c.odoo_write_date), actualizado = now()
    where (c.stock, c.stock_es) is distinct from (excluded.stock, excluded.stock_es)
       or c.odoo_write_date is distinct from excluded.odoo_write_date;
    return null;
end $$;
revoke all on function inventario.proyectar() from public, anon, authenticated;

create trigger proyectar_existencias after insert or update or delete on inventario.existencias_odoo
    for each row execute function inventario.proyectar();

-- La Edge Function escribe el espejo por RPC (inventario no está expuesto): una llamada = un lote atómico.
create or replace function public.cargar_existencias_odoo(p_filas jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
    v_n integer;
begin
    insert into inventario.existencias_odoo as e (sku, almacen, cantidad, odoo_product_id, odoo_write_date, leido_en)
    select f.sku, f.almacen, f.cantidad, f.odoo_product_id, f.odoo_write_date, now()
      from jsonb_to_recordset(p_filas) as f(sku text, almacen text, cantidad numeric, odoo_product_id integer, odoo_write_date timestamptz)
    on conflict (sku, almacen) do update set
        cantidad = excluded.cantidad, odoo_product_id = excluded.odoo_product_id,
        odoo_write_date = excluded.odoo_write_date, leido_en = now();
    get diagnostics v_n = row_count;
    return v_n;
end $$;
revoke all on function public.cargar_existencias_odoo(jsonb) from public, anon, authenticated;
grant execute on function public.cargar_existencias_odoo(jsonb) to service_role;

-- ------------------------------------------------------------------ conciliación cada 15 min (activar con Odoo conectado)
-- Requiere las extensiones pg_cron y pg_net y dos secretos en Vault (odoo_existencias_url, odoo_webhook_secret).
-- La función relee de Odoo TODOS los SKU del sitio y corrige el espejo (paso P5 · 4 de la regla unicanal).
-- select cron.schedule('conciliar-existencias', '*/15 * * * *', $$
--   select net.http_post(
--     url     := (select decrypted_secret from vault.decrypted_secrets where name = 'odoo_existencias_url'),
--     headers := jsonb_build_object('content-type', 'application/json',
--                  'x-odoo-secreto', (select decrypted_secret from vault.decrypted_secrets where name = 'odoo_webhook_secret')),
--     body    := '{"todos": true}'::jsonb)
-- $$);
