-- Casa Siego · 0004 · panel del miembro en la portada (v1.3.2).
-- La portada (index.html), con sesión, pide UNA vez public.mi_panel() y React pinta:
--   «Hola, nombre» · próximas telas con su closeup · cuenta regresiva de entrega · carga acumulada del próximo pedido a fábrica ·
--   recomendaciones · conjuntos al 50 % o más con cada pieza adquirida (palomita vino) o pendiente (tache gris oscuro).
-- Regla unicanal: pedidos, prendas y telas son PROYECCIONES de Odoo (ventas, entregas, compras); solo service_role escribe.
-- Lotes, conjuntos y recomendaciones los define la Casa (representante / admin_cliente) con service_role.
-- Una migración aplicada nunca se edita. Cada tabla declara sus grant.

-- ------------------------------------------------------------------ catálogo de la Casa (lectura de miembros)
create table public.telas (
    codigo           text        primary key check (codigo ~ '^TEL-[A-Z0-9-]{2,30}$'),
    nombre           text        not null check (char_length(nombre) <= 80),
    composicion      text        check (char_length(composicion) <= 120),
    peso_g_m2        integer     check (peso_g_m2 between 50 and 800),
    temporada        text        check (char_length(temporada) <= 40),
    imagen           text        not null check (imagen ~ '^images/telas/[a-z0-9-]+\.(jpg|webp)$'),   -- closeup, ruta del sitio
    llegada_estimada date,                                               -- recepción de compra en Odoo
    activa           boolean     not null default true,
    odoo_product_id  integer,
    actualizado      timestamptz not null default now()
);

create table public.lotes (                                              -- pedido consolidado a fábrica (< 10 piezas por cliente)
    id               text        primary key check (id ~ '^LOTE-[0-9]{4}-[0-9A-Z-]{1,12}$'),
    capacidad        integer     not null check (capacidad > 0),          -- piezas para que el lote salga a fábrica
    piezas           integer     not null default 0 check (piezas >= 0),  -- acumuladas de todos los clientes
    cierre_estimado  date,
    estado           text        not null default 'abierto' check (estado in ('abierto', 'en_fabrica', 'cerrado')),
    actualizado      timestamptz not null default now()
);

create table public.conjuntos (
    id          text    primary key check (id ~ '^[a-z0-9-]{2,40}$'),
    nombre      text    not null check (char_length(nombre) <= 80),
    descripcion text    check (char_length(descripcion) <= 240),
    imagen      text    check (imagen ~ '^images/[a-z0-9._/-]+\.(jpg|webp)$'),
    activo      boolean not null default true,
    orden       integer not null default 0
);

create table public.conjunto_piezas (
    conjunto_id text    not null references public.conjuntos (id) on delete cascade,
    orden       integer not null,
    tipo        text    not null check (tipo in ('saco', 'pantalon', 'chaleco', 'camisa', 'corbata')),
    modelo      text    not null check (modelo ~ '^[A-Z]{3}-[A-Z]{3}-[0-9]{2}$'),   -- modelo del catálogo de Odoo (sin talla)
    etiqueta    text    not null check (char_length(etiqueta) <= 80),
    enlace      text    check (enlace ~ '^brands/[a-z0-9/-]+/$'),                  -- ficha de la tienda, si existe
    primary key (conjunto_id, orden)
);

-- ------------------------------------------------------------------ datos del miembro (solo los propios)
create table public.pedidos_cliente (
    odoo_ref           text        primary key check (odoo_ref ~ '^[A-Z0-9/-]{3,30}$'),   -- sale.order.name
    user_id            uuid        not null references auth.users (id) on delete cascade,
    estado             text        not null check (estado in ('confirmado', 'en_lote', 'en_fabrica', 'confeccion', 'listo', 'entregado')),
    lote_id            text        references public.lotes (id),
    piezas             integer     not null check (piezas > 0),
    confirmado_en      date,
    entrega_estimada   date,
    actualizado        timestamptz not null default now()
);
create index on public.pedidos_cliente (user_id, entrega_estimada);

create table public.prendas_cliente (
    id           bigint      generated always as identity primary key,
    user_id      uuid        not null references auth.users (id) on delete cascade,
    tipo         text        not null check (tipo in ('saco', 'pantalon', 'chaleco', 'camisa', 'corbata')),
    modelo       text        not null check (modelo ~ '^[A-Z]{3}-[A-Z]{3}-[0-9]{2}$'),
    sku          text        check (sku ~ '^[A-Z]{3}-[A-Z]{3}-[0-9]{2}(-[A-Z0-9]{1,3})*$'),
    tela_codigo  text        references public.telas (codigo),
    odoo_ref     text,                                                  -- pedido de origen
    estado       text        not null default 'adquirida' check (estado in ('adquirida', 'en_pedido')),
    adquirida_en date
);
create index on public.prendas_cliente (user_id, modelo);

create table public.recomendaciones (
    id            bigint      generated always as identity primary key,
    user_id       uuid        not null references auth.users (id) on delete cascade,
    titulo        text        not null check (char_length(titulo) <= 80),
    motivo        text        check (char_length(motivo) <= 240),
    enlace        text        check (enlace ~ '^(brands|ayuda)/[a-z0-9/-]+/$'),
    imagen        text        check (imagen ~ '^images/[a-z0-9._/-]+\.(jpg|webp)$'),
    prioridad     integer     not null default 0,
    vigente_hasta date,
    creada_por    uuid        references auth.users (id) on delete set null,
    creada_en     timestamptz not null default now()
);
create index on public.recomendaciones (user_id, prioridad desc);

-- ------------------------------------------------------------------ RLS y privilegios
alter table public.telas            enable row level security;
alter table public.lotes            enable row level security;
alter table public.conjuntos        enable row level security;
alter table public.conjunto_piezas  enable row level security;
alter table public.pedidos_cliente  enable row level security;
alter table public.prendas_cliente  enable row level security;
alter table public.recomendaciones  enable row level security;

revoke all on public.telas, public.lotes, public.conjuntos, public.conjunto_piezas,
              public.pedidos_cliente, public.prendas_cliente, public.recomendaciones from public, anon, authenticated;
grant select on public.telas, public.lotes, public.conjuntos, public.conjunto_piezas,
                public.pedidos_cliente, public.prendas_cliente, public.recomendaciones to authenticated;
grant select, insert, update, delete on public.telas, public.lotes, public.conjuntos, public.conjunto_piezas,
                public.pedidos_cliente, public.prendas_cliente, public.recomendaciones to service_role;

-- Catálogo de la Casa: cualquier miembro con sesión (no anon: las telas próximas no son públicas).
create policy "telas: miembros"           on public.telas           for select to authenticated using (activa);
create policy "lotes: miembros"           on public.lotes           for select to authenticated using (estado <> 'cerrado');
create policy "conjuntos: miembros"       on public.conjuntos       for select to authenticated using (activo);
create policy "conjunto_piezas: miembros" on public.conjunto_piezas for select to authenticated using (true);
-- Lo personal: solo lo propio, o el personal de la Casa.
create policy "pedidos: los propios" on public.pedidos_cliente for select to authenticated
    using (user_id = auth.uid() or identidad.es_personal(auth.uid()));
create policy "prendas: las propias" on public.prendas_cliente for select to authenticated
    using (user_id = auth.uid() or identidad.es_personal(auth.uid()));
create policy "recomendaciones: las propias" on public.recomendaciones for select to authenticated
    using (user_id = auth.uid() or identidad.es_personal(auth.uid()));

-- ------------------------------------------------------------------ el panel en una sola llamada
-- security invoker: corre con la sesión del miembro, así que RLS decide qué ve. Sin sesión → null.
create or replace function public.mi_panel()
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
    v_uid    uuid := auth.uid();
    v_pedido record;
    v_lote   record;
    v_out    jsonb;
begin
    if v_uid is null then return null; end if;

    -- Próxima entrega: el pedido sin entregar con la fecha más cercana.
    select p.odoo_ref, p.estado, p.piezas, p.entrega_estimada, p.lote_id into v_pedido
      from public.pedidos_cliente p
     where p.user_id = v_uid and p.estado <> 'entregado'
     order by p.entrega_estimada nulls last limit 1;

    -- Carga acumulada: el lote de ese pedido o, si no tiene, el próximo lote abierto.
    select l.id, l.capacidad, l.piezas, l.cierre_estimado, l.estado into v_lote
      from public.lotes l
     where l.id = v_pedido.lote_id
        or (v_pedido.lote_id is null and l.estado = 'abierto')
     order by (l.id = v_pedido.lote_id) desc nulls last, l.cierre_estimado nulls last limit 1;

    with mias as (
        select distinct pc.modelo, pc.estado from public.prendas_cliente pc where pc.user_id = v_uid
    ), piezas as (
        select cp.conjunto_id, cp.orden, cp.tipo, cp.modelo, cp.etiqueta, cp.enlace,
               exists (select 1 from mias m where m.modelo = cp.modelo) as tiene,
               exists (select 1 from mias m where m.modelo = cp.modelo and m.estado = 'en_pedido')
                   and not exists (select 1 from mias m where m.modelo = cp.modelo and m.estado = 'adquirida') as en_camino
          from public.conjunto_piezas cp
    ), avance as (
        select c.id, c.nombre, c.descripcion, c.imagen, c.orden,
               count(*)::int as total, count(*) filter (where p.tiene)::int as tengo,
               jsonb_agg(jsonb_build_object('tipo', p.tipo, 'modelo', p.modelo, 'etiqueta', p.etiqueta, 'enlace', p.enlace,
                                            'tiene', p.tiene, 'en_camino', p.en_camino) order by p.orden) as piezas
          from public.conjuntos c join piezas p on p.conjunto_id = c.id
         where c.activo
         group by c.id
    ), conjuntos as (                       -- al 50 % o más; completos al final
        select * from avance where tengo * 2 >= total
         order by (tengo = total), tengo::numeric / total desc, orden
    ), faltantes as (                       -- «completa tu conjunto»: lo que falta de los conjuntos incompletos
        select distinct on (x.modelo) x.etiqueta, x.enlace, c.nombre as conjunto, c.imagen, c.tengo::numeric / c.total as avance
          from conjuntos c, jsonb_to_recordset(c.piezas) as x(etiqueta text, enlace text, modelo text, tiene boolean)
         where not x.tiene and c.tengo < c.total
         order by x.modelo, c.tengo::numeric / c.total desc
    )
    select jsonb_build_object(
        'nombre', (select nullif(pr.nombre, '') from public.profiles pr where pr.id = v_uid),
        'entrega', case when v_pedido.odoo_ref is null then null else jsonb_build_object(
            'pedido', v_pedido.odoo_ref, 'estado', v_pedido.estado, 'piezas', v_pedido.piezas,
            'fecha', v_pedido.entrega_estimada) end,
        'lote', case when v_lote.id is null then null else jsonb_build_object(
            'id', v_lote.id, 'capacidad', v_lote.capacidad, 'piezas', least(v_lote.piezas, v_lote.capacidad),
            'mis_piezas', coalesce((select sum(p.piezas) from public.pedidos_cliente p
                                     where p.user_id = v_uid and p.lote_id = v_lote.id), 0),
            'cierre', v_lote.cierre_estimado, 'estado', v_lote.estado) end,
        'telas', coalesce((select jsonb_agg(jsonb_build_object('codigo', t.codigo, 'nombre', t.nombre, 'composicion', t.composicion,
                    'peso', t.peso_g_m2, 'temporada', t.temporada, 'imagen', t.imagen, 'llegada', t.llegada_estimada)
                    order by t.llegada_estimada nulls last)
              from (select * from public.telas t where t.activa and (t.llegada_estimada is null or t.llegada_estimada >= current_date - 14)
                     order by t.llegada_estimada nulls last limit 8) t), '[]'::jsonb),
        'conjuntos', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'nombre', c.nombre, 'descripcion', c.descripcion,
                    'imagen', c.imagen, 'total', c.total, 'tengo', c.tengo, 'piezas', c.piezas)
                    order by (c.tengo = c.total), c.tengo::numeric / c.total desc, c.orden) from conjuntos c), '[]'::jsonb),
        'recomendaciones', coalesce((select jsonb_agg(r) from (
                select jsonb_build_object('titulo', rc.titulo, 'motivo', rc.motivo, 'enlace', rc.enlace, 'imagen', rc.imagen, 'origen', 'casa') as r
                  from public.recomendaciones rc
                 where rc.user_id = v_uid and (rc.vigente_hasta is null or rc.vigente_hasta >= current_date)
                 order by rc.prioridad desc, rc.creada_en desc limit 4) s), '[]'::jsonb)
          || coalesce((select jsonb_agg(jsonb_build_object('titulo', f.etiqueta, 'motivo', 'Completa tu conjunto ' || f.conjunto || '.',
                    'enlace', f.enlace, 'imagen', f.imagen, 'origen', 'conjunto') order by f.avance desc)
              from (select * from faltantes order by avance desc limit 4) f), '[]'::jsonb)
    ) into v_out;
    return v_out;
end $$;
revoke all on function public.mi_panel() from public, anon;
grant execute on function public.mi_panel() to authenticated;
