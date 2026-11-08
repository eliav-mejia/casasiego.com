-- Casa Siego · 0002 · registro de clientes por representante + medidas completas (v1.3.1).
-- No hay registro público (config.toml: enable_signup = false). Un representante de Casa Siego, con sesión y rol
-- «representante» (o admin_cliente), llena /registro/ con el cliente; la Edge Function registrar-cliente invita al
-- cliente por correo (auth.admin) y llama a public.registrar_cliente(), que guarda todo en una transacción.
-- Una migración aplicada nunca se edita: se corrige con otra nueva. Cada tabla declara sus grant (regla de Lameyer v1.1.0 §9.4).

-- ------------------------------------------------------------------ roles y procedencia
alter table identidad.membresias drop constraint if exists membresias_rol_check;
alter table identidad.membresias add constraint membresias_rol_check
    check (rol in ('cliente', 'admin_cliente', 'soporte', 'representante'));

alter table identidad.consentimientos drop constraint if exists consentimientos_proveedor_check;
alter table identidad.consentimientos add constraint consentimientos_proveedor_check
    check (proveedor in ('email', 'google', 'facebook', 'apple', 'azure', 'perfil', 'representante'));

-- Personal de la Casa: representante o admin_cliente vigente en cualquier sitio del proyecto.
create or replace function identidad.es_personal(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
    select exists (select 1 from identidad.membresias m
                    where m.user_id = p_user and m.activa and m.rol in ('representante', 'admin_cliente')
                      and (m.caduca_en is null or m.caduca_en > now()))
$$;
revoke all on function identidad.es_personal(uuid) from public, anon;
grant execute on function identidad.es_personal(uuid) to authenticated, service_role;

-- Para el navegador y la Edge Function: ¿quien llama es personal? (no revela nada de otros usuarios)
create or replace function public.soy_personal()
returns boolean language sql stable security definer set search_path = '' as $$
    select identidad.es_personal(auth.uid())
$$;
revoke all on function public.soy_personal() from public, anon;
grant execute on function public.soy_personal() to authenticated;

-- ------------------------------------------------------------------ datos de contacto (columnas: identifican)
create table public.clientes (
    id                 uuid        primary key references auth.users (id) on delete cascade,
    apellidos          text        not null default '' check (char_length(apellidos) <= 120),
    telefono           text        check (telefono ~ '^\+[1-9][0-9]{7,14}$'),            -- E.164
    fecha_nacimiento   date        check (fecha_nacimiento between date '1900-01-01' and current_date),
    ciudad             text        check (char_length(ciudad) <= 80),
    contacto_preferido text        not null default 'correo' check (contacto_preferido in ('correo', 'telefono', 'whatsapp')),
    registrado_por     uuid        references auth.users (id) on delete set null,
    registrado_en      timestamptz not null default now(),
    notas              text        check (char_length(notas) <= 2000)
);
comment on table public.clientes is 'Contacto del cliente. Lo escribe solo public.registrar_cliente (service_role).';

-- ------------------------------------------------------------------ medidas (una fila por toma; historial inmutable)
create domain public.medida_cm as numeric(5,1) check (value > 0 and value < 250);

create table public.medidas (
    id               bigint      generated always as identity primary key,
    user_id          uuid        not null references auth.users (id) on delete cascade,
    tomadas_en       timestamptz not null default now(),
    tomadas_por      uuid        references auth.users (id) on delete set null,
    lugar            text        not null check (lugar in ('domicilio', 'oficina', 'casa_siego', 'remota')),
    -- cuerpo
    estatura_cm      public.medida_cm,
    peso_kg          numeric(5,1) check (peso_kg between 30 and 250),
    -- camisa (lo que Justo hace a medida: cuello, talla larga, puño)
    cuello           public.medida_cm,
    pecho            public.medida_cm,
    cintura          public.medida_cm,
    cadera           public.medida_cm,
    hombros          public.medida_cm,          -- ancho de espalda, costura a costura
    largo_manga      public.medida_cm,
    biceps           public.medida_cm,
    muneca           public.medida_cm,
    largo_camisa     public.medida_cm,
    -- saco y pantalón (referencia para elegir talla de la colección)
    largo_saco       public.medida_cm,
    cintura_pantalon public.medida_cm,
    tiro             public.medida_cm,
    entrepierna      public.medida_cm,
    muslo            public.medida_cm,
    bajo_pantalon    public.medida_cm,
    -- forma y preferencias
    hombros_forma    text check (hombros_forma in ('normales', 'caidos', 'altos', 'asimetricos')),
    postura          text check (postura in ('erguida', 'normal', 'encorvada')),
    abdomen          text check (abdomen in ('plano', 'normal', 'prominente')),
    ajuste           text check (ajuste in ('entallado', 'regular', 'holgado')),
    cuello_preferido text check (cuello_preferido in ('CR', 'CL')),             -- mismos códigos que el catálogo
    manga_preferida  text check (manga_preferida in ('MC', 'MR', 'ML')),
    puno             text check (puno in ('sencillo', 'doble', 'mancuernas')),
    notas            text check (char_length(notas) <= 2000),
    check (cuello is not null and pecho is not null and largo_manga is not null)  -- mínimo para cortar una camisa
);
create index on public.medidas (user_id, tomadas_en desc);
-- Historial: una toma nueva corrige a la anterior; nunca se edita. El borrado solo llega en cascada al eliminar la cuenta
-- (acción referencial = pg_trigger_depth() > 0). identidad.solo_insercion() de 0001 no sirve aquí: lee old.ocurrido_en.
create or replace function identidad.medidas_inmutables()
returns trigger language plpgsql set search_path = '' as $$
begin
    raise exception 'public.medidas es de solo inserción (% no permitido): registra una toma nueva', tg_op;
end $$;
create trigger medidas_solo_insercion before update or delete on public.medidas
    for each row when (pg_trigger_depth() = 0) execute function identidad.medidas_inmutables();

-- Últimas medidas de cada cliente (lo que lee el taller y, más adelante, el cliente).
create view public.medidas_vigentes with (security_invoker = true) as
    select distinct on (user_id) * from public.medidas order by user_id, tomadas_en desc;

-- ------------------------------------------------------------------ RLS y privilegios
alter table public.clientes enable row level security;
alter table public.medidas  enable row level security;

revoke all on public.clientes, public.medidas, public.medidas_vigentes from public, anon, authenticated;
grant select on public.clientes, public.medidas, public.medidas_vigentes to authenticated;
grant select, insert, update, delete on public.clientes, public.medidas to service_role;
grant select on public.medidas_vigentes to service_role;

create policy "clientes: el propio o personal" on public.clientes
    for select to authenticated using (id = auth.uid() or identidad.es_personal(auth.uid()));
create policy "medidas: las propias o personal" on public.medidas
    for select to authenticated using (user_id = auth.uid() or identidad.es_personal(auth.uid()));
-- Sin políticas de insert/update/delete: solo service_role (Edge Function) escribe.

-- ------------------------------------------------------------------ alta atómica (la llama registrar-cliente)
-- En public para que PostgREST la exponga como RPC; execute SOLO para service_role (la Edge Function).
create or replace function public.registrar_cliente(p_cliente uuid, p_representante uuid, p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
    v_m jsonb := p -> 'medidas';
    v_aviso record;
begin
    if not identidad.es_personal(p_representante) then
        raise exception 'sin permiso' using errcode = '42501';
    end if;

    update public.profiles set
        nombre = left(coalesce(p ->> 'nombre', ''), 120),
        pais = nullif(p ->> 'pais', ''),
        marca_origen = coalesce(nullif(p ->> 'marca', ''), 'justo'),
        proveedor_alta = 'email',
        registro_completo = true,
        actualizado_por = p_representante
    where id = p_cliente;

    insert into public.clientes (id, apellidos, telefono, fecha_nacimiento, ciudad, contacto_preferido, registrado_por, notas)
    values (p_cliente, left(coalesce(p ->> 'apellidos', ''), 120), nullif(p ->> 'telefono', ''),
            nullif(p ->> 'fecha_nacimiento', '')::date, nullif(p ->> 'ciudad', ''),
            coalesce(nullif(p ->> 'contacto_preferido', ''), 'correo'), p_representante, nullif(p ->> 'notas', ''));

    insert into public.medidas (user_id, tomadas_por, lugar, estatura_cm, peso_kg, cuello, pecho, cintura, cadera, hombros,
        largo_manga, biceps, muneca, largo_camisa, largo_saco, cintura_pantalon, tiro, entrepierna, muslo, bajo_pantalon,
        hombros_forma, postura, abdomen, ajuste, cuello_preferido, manga_preferida, puno, notas)
    values (p_cliente, p_representante, coalesce(nullif(v_m ->> 'lugar', ''), 'domicilio'),
        (v_m ->> 'estatura_cm')::numeric, (v_m ->> 'peso_kg')::numeric, (v_m ->> 'cuello')::numeric, (v_m ->> 'pecho')::numeric,
        (v_m ->> 'cintura')::numeric, (v_m ->> 'cadera')::numeric, (v_m ->> 'hombros')::numeric, (v_m ->> 'largo_manga')::numeric,
        (v_m ->> 'biceps')::numeric, (v_m ->> 'muneca')::numeric, (v_m ->> 'largo_camisa')::numeric, (v_m ->> 'largo_saco')::numeric,
        (v_m ->> 'cintura_pantalon')::numeric, (v_m ->> 'tiro')::numeric, (v_m ->> 'entrepierna')::numeric, (v_m ->> 'muslo')::numeric,
        (v_m ->> 'bajo_pantalon')::numeric, nullif(v_m ->> 'hombros_forma', ''), nullif(v_m ->> 'postura', ''),
        nullif(v_m ->> 'abdomen', ''), nullif(v_m ->> 'ajuste', ''), nullif(v_m ->> 'cuello_preferido', ''),
        nullif(v_m ->> 'manga_preferida', ''), nullif(v_m ->> 'puno', ''), nullif(v_m ->> 'notas', ''));

    -- Consentimientos contra la versión VIGENTE; los obligatorios se exigen.
    for v_aviso in select a.tipo, a.version, a.obligatorio from identidad.avisos a where a.vigente_hasta is null loop
        if v_aviso.obligatorio and coalesce((p -> 'consentimientos' ->> v_aviso.tipo)::boolean, false) is not true then
            raise exception 'falta el consentimiento obligatorio: %', v_aviso.tipo using errcode = '23514';
        end if;
        if p -> 'consentimientos' ? v_aviso.tipo then
            insert into identidad.consentimientos (user_id, tipo, version, otorgado, proveedor, marca)
            values (p_cliente, v_aviso.tipo, v_aviso.version, (p -> 'consentimientos' ->> v_aviso.tipo)::boolean,
                    'representante', coalesce(nullif(p ->> 'marca', ''), 'justo'));
        end if;
    end loop;
end $$;
revoke all on function public.registrar_cliente(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.registrar_cliente(uuid, uuid, jsonb) to service_role;

-- Primer representante (a mano, en el SQL Editor, tras invitarlo desde el panel):
-- insert into identidad.membresias (user_id, sitio, rol) select id, 'casasiego.com', 'representante'
--   from auth.users where email = '<correo del representante>';
