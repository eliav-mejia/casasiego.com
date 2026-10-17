-- Justo by Casa Siego · tienda de sacos · esquema Etapa 2 (Supabase / PostgreSQL). NO se ejecuta en la Etapa 1.
-- Mismo contrato que db/*.json: al migrar, db.catalog() lee estas tablas y db.createOrder() llama a una Edge Function
-- que vuelve a calcular precios aquí (nunca se confía en el total del navegador).

create table tallas (
  id          text primary key check (id in ('CH', 'M', 'G', 'XG')),
  etiqueta    text not null,                -- Chico, Mediano, Grande, Extra grande
  mx text, eu text, us text,
  pecho_cm    int4range not null,           -- medidas del cuerpo
  cintura_cm  int4range not null,
  estatura_cm int4range not null,
  peso_kg     int4range not null,
  cuello_cm   int4range not null,
  orden       smallint not null
);

create table productos (
  id            text primary key,           -- ju-001
  slug          text unique not null,
  sku           text unique not null,
  nombre        text not null,
  descripcion   text not null,
  corte         text not null,
  precio_mxn    integer not null check (precio_mxn > 0),   -- IVA incluido
  ficha         jsonb not null,             -- tela, forro, construcción, botones, bolsillos, aberturas, cuidados, rasgos
  imagen        text not null,
  activo        boolean not null default true
);

-- Una fila por saco × talla: medidas de la prenda y existencia (la "variante").
create table variantes (
  producto_id   text references productos(id) on delete cascade,
  talla_id      text references tallas(id),
  pecho numeric(4,1), cintura numeric(4,1), hombro numeric(4,1), manga numeric(4,1),
  largo numeric(4,1), bajo numeric(4,1), solapa numeric(3,1), drop smallint,
  existencia    integer not null default 0 check (existencia >= 0),   -- 0 = sobre pedido
  primary key (producto_id, talla_id)
);

create table pedidos (
  id            text primary key,           -- JU-XXXX
  creado        timestamptz not null default now(),
  estado        text not null default 'por-pagar' check (estado in ('por-pagar', 'pagado', 'en-taller', 'listo', 'entregado', 'cancelado')),
  cliente       jsonb not null,             -- nombre, email, teléfono, medidas, dirección
  entrega_id    text not null,
  pago_id       text not null,
  descuento     integer not null default 0,
  monograma     integer not null default 0,
  envio         integer not null default 0,
  total         integer not null
);

create table pedido_lineas (
  pedido_id     text references pedidos(id) on delete cascade,
  producto_id   text references productos(id),
  talla_id      text references tallas(id),
  monograma     text check (monograma ~ '^[A-ZÁÉÍÓÚÑ]{1,3}$'),
  cantidad      smallint not null check (cantidad between 1 and 20),
  precio_mxn    integer not null,
  sobre_pedido  boolean not null default false
);

-- RLS: catálogo de solo lectura para el público; pedidos solo por la Edge Function (service_role).
alter table tallas        enable row level security;
alter table productos     enable row level security;
alter table variantes     enable row level security;
alter table pedidos       enable row level security;
alter table pedido_lineas enable row level security;

create policy "catalogo publico" on tallas    for select using (true);
create policy "catalogo publico" on productos for select using (activo);
create policy "catalogo publico" on variantes for select using (true);
-- pedidos y pedido_lineas: sin políticas para anon/authenticated → solo service_role.
