-- Casa Siego · Variante D · identidad, registro social y bitácora de accesos y consentimientos.
-- Aplicar con:  supabase db push   (o en el SQL Editor), primero en el proyecto de PRUEBA.
-- Base: _plataforma/etapas/etapa-8-inicio-de-sesion/base-de-datos-usuarios/0006_identidad_zero_trust.sql, adaptada a un
-- proyecto nuevo (Casa Siego no tiene 0001 – 0005) y al modelo híbrido de _docs-src/usuarios_bd.py (BDU · 3).
--
-- Modelo híbrido:
--   · Lo que IDENTIFICA, AUTORIZA o tiene CONSECUENCIAS LEGALES va en columnas con tipo y restricción:
--     usuario, correo (en auth.users), proveedor, sitio, rol, aviso, versión, otorgado, fechas.
--   · Lo que CAMBIA POR MARCA O CAMPAÑA va en profiles.atributos (jsonb), validado contra identidad.campos_perfil
--     y versionado con profiles.version_atributos. Nada de jsonb se usa en una política RLS.
--   · El correo vive solo en auth.users (citext único lo garantiza Supabase Auth); no se copia a profiles.
--
-- Proveedores: correo con código de 6 dígitos (OTP), Google, Facebook, Apple y Microsoft (azure).
-- El borde (Cloudflare D1 + Worker, workers/acceso-borde/) guarda IP/UA con hash y envía sus eventos a
-- public.recibir_eventos_borde(); Supabase es la fuente de verdad.
-- Una migración aplicada nunca se edita: se corrige con otra nueva.

create extension if not exists citext;

create schema if not exists identidad;
comment on schema identidad is 'Identidad y acceso. NO añadir a "Exposed schemas" de la Data API.';
revoke all on schema identidad from public, anon;
grant usage on schema identidad to authenticated, service_role;

-- ------------------------------------------------------------------ catálogos (columnas: autorizan o son legales)

-- Sitios del proyecto. Casa Siego es el principal; Fiel y Justo son marcas de la misma casa.
create table identidad.sitios (
    sitio     text    primary key check (sitio ~ '^[a-z0-9.-]+$'),
    marca     text    not null unique check (marca ~ '^[a-z_]+$'),
    principal boolean not null default false
);
create unique index sitios_un_principal on identidad.sitios (principal) where principal;

insert into identidad.sitios (sitio, marca, principal) values
    ('casasiego.com',             'casa',  true),
    ('casasiego.com/brands/fiel', 'fiel',  false),
    ('casasiego.com/brands/justo','justo', false);

-- Avisos legales vigentes. Un consentimiento solo es válido contra una versión publicada aquí.
create table identidad.avisos (
    tipo          text        not null check (tipo in ('privacidad', 'terminos', 'marketing', 'cookies_analitica')),
    version       text        not null check (version ~ '^\d{4}-\d{2}(-[a-z0-9]+)?$'),
    url           text        not null check (url ~ '^https://casasiego\.com/'),
    sha256        text        not null check (sha256 ~ '^[0-9a-f]{64}$'),  -- huella del texto exacto aceptado
    obligatorio   boolean     not null,
    vigente_desde timestamptz not null default now(),
    vigente_hasta timestamptz,
    primary key (tipo, version)
);
create unique index avisos_un_vigente on identidad.avisos (tipo) where vigente_hasta is null;

-- Esquema de lo variable: qué claves admite profiles.atributos, por marca y (opcional) campaña.
create table identidad.campos_perfil (
    marca        text        not null references identidad.sitios (marca),
    campana      text        not null default '' check (campana ~ '^[a-z0-9-]*$'),  -- '' = toda la marca
    clave        text        not null check (clave ~ '^[a-z][a-z0-9_]{1,39}$'),
    tipo         text        not null check (tipo in ('texto', 'numero', 'booleano', 'fecha', 'opcion')),
    opciones     text[],                                            -- solo para tipo 'opcion'
    max_largo    int         not null default 80 check (max_largo between 1 and 500),
    obligatorio  boolean     not null default false,
    activo       boolean     not null default true,
    version      int         not null default 1 check (version > 0),
    etiqueta     text        not null,                              -- texto de la carta, p. ej. «el nombre de tu mascota»
    orden        int         not null default 0,
    primary key (marca, campana, clave),
    check ((tipo = 'opcion') = (opciones is not null))
);

-- ------------------------------------------------------------------ perfil (híbrido)

create table public.profiles (
    id                uuid        primary key references auth.users (id) on delete cascade,
    nombre            text        not null default '' check (char_length(nombre) <= 120),
    idioma            text        not null default 'es' check (idioma in ('es', 'en')),
    pais              char(2)     check (pais ~ '^[A-Z]{2}$'),                 -- ISO 3166-1
    marca_origen      text        references identidad.sitios (marca),
    campana_origen    text        check (campana_origen ~ '^[a-z0-9-]{1,40}$'),
    proveedor_alta    text        check (proveedor_alta in ('email', 'google', 'facebook', 'apple', 'azure')),
    registro_completo boolean     not null default false,
    atributos         jsonb       not null default '{}'::jsonb check (jsonb_typeof(atributos) = 'object'),
    version_atributos int         not null default 0,
    creado_en         timestamptz not null default now(),
    actualizado_en    timestamptz not null default now(),
    actualizado_por   uuid,
    eliminado_en      timestamptz                                             -- baja lógica / cancelación ARCO
);
comment on column public.profiles.atributos is
    'Solo datos por marca o campaña, validados contra identidad.campos_perfil. Nunca correo, teléfono, rol ni datos fiscales.';

-- Índice GIN solo sobre claves que se filtran (BDU · 3): hoy ninguna. Crear al «ascender» la primera.

-- ------------------------------------------------------------------ roles y legal (columnas)

create table identidad.membresias (
    user_id      uuid        not null references auth.users (id) on delete cascade,
    sitio        text        not null references identidad.sitios (sitio),
    rol          text        not null check (rol in ('cliente', 'admin_cliente', 'soporte')),
    activa       boolean     not null default true,
    otorgada_por uuid        references auth.users (id),
    otorgada_en  timestamptz not null default now(),
    caduca_en    timestamptz,
    primary key (user_id, sitio, rol)
);

-- Consentimientos: solo se agregan filas. Revocar = fila nueva con otorgado = false.
create table identidad.consentimientos (
    id            bigint generated always as identity primary key,
    user_id       uuid        not null references auth.users (id) on delete cascade,
    tipo          text        not null,
    version       text        not null,
    otorgado      boolean     not null,
    proveedor     text        not null check (proveedor in ('email', 'google', 'facebook', 'apple', 'azure', 'perfil')),
    marca         text        references identidad.sitios (marca),
    campana       text,
    registrado_en timestamptz not null default now(),
    foreign key (tipo, version) references identidad.avisos (tipo, version)
);
create index on identidad.consentimientos (user_id, tipo, registrado_en desc);

-- Bitácora de accesos: sin correo, IP ni user-agent en claro (hash con HASH_PEPPER en el Worker).
create table identidad.eventos_acceso (
    id          bigint generated always as identity primary key,
    user_id     uuid,
    evento      text        not null check (evento in (
                    'registro_ok', 'registro_incompleto', 'login_ok', 'login_fallido', 'otp_enviado', 'otp_fallido',
                    'oauth_iniciado', 'oauth_ok', 'oauth_fallido', 'identidad_vinculada',
                    'mfa_inscrito', 'mfa_retirado', 'mfa_ok', 'mfa_fallido', 'logout', 'sesion_revocada',
                    'reuso_refresh', 'correo_cambiado', 'consentimiento', 'atributos_cambiados',
                    'rol_otorgado', 'rol_retirado', 'cuenta_bloqueada', 'cuenta_eliminada')),
    proveedor   text        check (proveedor in ('email', 'google', 'facebook', 'apple', 'azure')),
    aal         text        check (aal in ('aal1', 'aal2')),
    resultado   text        not null default 'ok' check (resultado in ('ok', 'denegado', 'error')),
    origen      text        not null default 'base' check (origen in ('base', 'borde')),
    id_borde    text        unique,                                      -- idempotencia del envío desde D1
    ip_hash     text        check (ip_hash ~ '^[0-9a-f]{64}$'),
    ua_hash     text        check (ua_hash ~ '^[0-9a-f]{64}$'),
    pais        char(2),
    detalle     jsonb       not null default '{}'::jsonb check (jsonb_typeof(detalle) = 'object'),
    ocurrido_en timestamptz not null default now()
);
create index on identidad.eventos_acceso (user_id, ocurrido_en desc);
create index on identidad.eventos_acceso (evento, ocurrido_en desc);

-- ------------------------------------------------------------------ RLS y privilegios

alter table public.profiles             enable row level security;
alter table identidad.sitios            enable row level security;
alter table identidad.avisos            enable row level security;
alter table identidad.campos_perfil     enable row level security;
alter table identidad.membresias        enable row level security;
alter table identidad.consentimientos   enable row level security;
alter table identidad.eventos_acceso    enable row level security;

revoke all on all tables in schema identidad from public, anon, authenticated;
alter default privileges in schema identidad revoke all on tables from public, anon, authenticated;
grant all on all tables in schema identidad to service_role;

-- El usuario lee su perfil; solo puede escribir nombre e idioma directamente. Lo demás pasa por RPC validadas.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (nombre, idioma) on public.profiles to authenticated;
create policy "perfil: leer el propio" on public.profiles
    for select to authenticated using (id = auth.uid() and eliminado_en is null);
create policy "perfil: editar el propio" on public.profiles
    for update to authenticated using (id = auth.uid() and eliminado_en is null) with check (id = auth.uid());

-- ------------------------------------------------------------------ validación de atributos (lo dinámico)

create or replace function identidad.validar_atributos()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
    c   record;
    v   jsonb;
    k   text;
begin
    if tg_op = 'UPDATE' and (new.atributos, new.marca_origen, new.campana_origen)
                            is not distinct from (old.atributos, old.marca_origen, old.campana_origen) then
        return new;
    end if;

    -- 1. Ninguna clave desconocida o inactiva para la marca/campaña del perfil.
    for k in select jsonb_object_keys(new.atributos) loop
        if not exists (select 1 from identidad.campos_perfil f
                        where f.marca = new.marca_origen and f.campana in ('', coalesce(new.campana_origen, ''))
                          and f.clave = k and f.activo) then
            raise exception 'atributo no admitido: %', k using errcode = '22023';
        end if;
    end loop;

    -- 2. Tipo, largo, opciones y obligatorios.
    for c in select f.* from identidad.campos_perfil f
              where f.marca = new.marca_origen and f.campana in ('', coalesce(new.campana_origen, '')) and f.activo loop
        v := new.atributos -> c.clave;
        if v is null or v = 'null'::jsonb then
            if c.obligatorio then raise exception 'atributo obligatorio: %', c.clave using errcode = '23502'; end if;
            continue;
        end if;
        if (c.tipo in ('texto', 'fecha', 'opcion') and jsonb_typeof(v) <> 'string')
           or (c.tipo = 'numero'   and jsonb_typeof(v) <> 'number')
           or (c.tipo = 'booleano' and jsonb_typeof(v) <> 'boolean') then
            raise exception 'tipo inválido para %', c.clave using errcode = '22023';
        end if;
        if c.tipo = 'texto' and char_length(v #>> '{}') > c.max_largo then
            raise exception 'texto demasiado largo en %', c.clave using errcode = '22001';
        end if;
        if c.tipo = 'fecha' and (v #>> '{}') !~ '^\d{4}-\d{2}-\d{2}$' then
            raise exception 'fecha inválida en %', c.clave using errcode = '22007';
        end if;
        if c.tipo = 'opcion' and not ((v #>> '{}') = any (c.opciones)) then
            raise exception 'opción inválida en %', c.clave using errcode = '22023';
        end if;
    end loop;

    new.version_atributos := coalesce(old.version_atributos, 0) + 1;
    return new;
end $$;

create or replace function identidad.sellar_perfil()
returns trigger language plpgsql set search_path = '' as $$
begin
    new.actualizado_en := now();
    new.actualizado_por := auth.uid();
    return new;
end $$;

create trigger perfiles_validar_atributos before insert or update of atributos, marca_origen, campana_origen
    on public.profiles for each row execute function identidad.validar_atributos();
create trigger perfiles_sellar before update on public.profiles
    for each row execute function identidad.sellar_perfil();

-- ------------------------------------------------------------------ bitácora inmutable

create or replace function identidad.solo_insercion()
returns trigger language plpgsql set search_path = '' as $$
begin
    if tg_table_name = 'eventos_acceso' and tg_op = 'DELETE' and current_setting('identidad.purga', true) = 'on'
       and old.ocurrido_en < now() - interval '12 months' then
        return old;
    end if;
    raise exception '%.% es de solo inserción (% no permitido)', tg_table_schema, tg_table_name, tg_op;
end $$;

create trigger eventos_inmutables before update or delete on identidad.eventos_acceso
    for each row execute function identidad.solo_insercion();
-- Los consentimientos tampoco se editan; al borrar la cuenta caen en cascada con auth.users (cancelación ARCO).
create trigger consentimientos_inmutables before update on identidad.consentimientos
    for each row execute function identidad.solo_insercion();

create or replace function identidad.purgar_eventos()
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
    perform set_config('identidad.purga', 'on', true);
    delete from identidad.eventos_acceso where ocurrido_en < now() - interval '12 months';
    get diagnostics n = row_count;
    return n;
end $$;
revoke all on function identidad.purgar_eventos() from public, anon, authenticated;

create or replace function identidad.auditar_membresia()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
    insert into identidad.eventos_acceso (user_id, evento, detalle)
    values (coalesce(new.user_id, old.user_id),
            case when tg_op = 'DELETE' or (tg_op = 'UPDATE' and not new.activa) then 'rol_retirado' else 'rol_otorgado' end,
            jsonb_build_object('sitio', coalesce(new.sitio, old.sitio), 'rol', coalesce(new.rol, old.rol), 'por', auth.uid()));
    return coalesce(new, old);
end $$;
create trigger membresias_auditadas after insert or update or delete on identidad.membresias
    for each row execute function identidad.auditar_membresia();

-- ------------------------------------------------------------------ verificación y roles

create or replace function identidad.es_aal2()
returns boolean language sql stable set search_path = '' as $$
    select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
$$;

create or replace function identidad.tiene_rol_vigente(p_rol text, p_sitio text default null)
returns boolean language sql stable security definer set search_path = '' as $$
    select exists (select 1 from identidad.membresias m
                    where m.user_id = auth.uid() and m.rol = p_rol and m.activa
                      and (m.caduca_en is null or m.caduca_en > now())
                      and (p_sitio is null or m.sitio = p_sitio))
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
    select identidad.es_aal2() and identidad.tiene_rol_vigente('admin_cliente')
$$;

revoke all on function identidad.es_aal2(), identidad.tiene_rol_vigente(text, text), public.is_admin() from public, anon;
grant execute on function identidad.es_aal2(), identidad.tiene_rol_vigente(text, text), public.is_admin() to authenticated;

-- Hook de JWT (Authentication → Hooks → Custom Access Token): app_roles y si el registro está completo.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
    claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
    roles  jsonb;
    listo  boolean;
begin
    select coalesce(jsonb_agg(jsonb_build_object('sitio', m.sitio, 'rol', m.rol)), '[]'::jsonb) into roles
      from identidad.membresias m
     where m.user_id = (event ->> 'user_id')::uuid and m.activa and (m.caduca_en is null or m.caduca_en > now());
    select p.registro_completo into listo from public.profiles p where p.id = (event ->> 'user_id')::uuid;

    claims := jsonb_set(claims, '{app_roles}', roles);
    claims := jsonb_set(claims, '{registro_completo}', to_jsonb(coalesce(listo, false)));
    return jsonb_set(event, '{claims}', claims);
end $$;

grant usage on schema public, identidad to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant select on identidad.membresias, public.profiles to supabase_auth_admin;
create policy "hook: leer membresías" on identidad.membresias for select to supabase_auth_admin using (true);
create policy "hook: leer perfiles"   on public.profiles       for select to supabase_auth_admin using (true);

-- ------------------------------------------------------------------ alta de usuario (cualquier proveedor)

-- Crea perfil vacío + membresía «cliente» del sitio principal. Nunca lee raw_user_meta_data para autorizar:
-- el proveedor se toma de raw_app_meta_data (lo fija Supabase Auth, no el usuario).
create or replace function identidad.alta_usuario()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
    v_prov text := new.raw_app_meta_data ->> 'provider';
begin
    insert into public.profiles (id, proveedor_alta)
    values (new.id, case when v_prov in ('email', 'google', 'facebook', 'apple', 'azure') then v_prov end)
    on conflict (id) do nothing;

    insert into identidad.membresias (user_id, sitio, rol)
    select new.id, s.sitio, 'cliente' from identidad.sitios s where s.principal
    on conflict do nothing;
    return new;
end $$;

create trigger alta_usuario_identidad after insert on auth.users
    for each row execute function identidad.alta_usuario();

-- ------------------------------------------------------------------ RPC para el navegador

-- Lo que la carta necesita para pintarse: avisos vigentes y campos de la marca/campaña. Lectura pública.
create or replace function public.formulario_registro(p_marca text default 'casa', p_campana text default '')
returns jsonb language sql stable security definer set search_path = '' as $$
    select jsonb_build_object(
        'avisos', (select coalesce(jsonb_agg(jsonb_build_object('tipo', a.tipo, 'version', a.version, 'url', a.url,
                                                                'obligatorio', a.obligatorio) order by a.tipo), '[]')
                     from identidad.avisos a where a.vigente_hasta is null),
        'campos', (select coalesce(jsonb_agg(jsonb_build_object('clave', f.clave, 'tipo', f.tipo, 'opciones', f.opciones,
                                                                'max_largo', f.max_largo, 'obligatorio', f.obligatorio,
                                                                'etiqueta', f.etiqueta, 'version', f.version)
                                             order by f.orden, f.clave), '[]')
                     from identidad.campos_perfil f
                    where f.marca = p_marca and f.campana in ('', coalesce(p_campana, '')) and f.activo))
$$;

-- Cierra el registro tras la primera sesión (OTP u OAuth). Atómica: perfil + consentimientos + evento.
-- p_consentimientos = [{"tipo":"privacidad","version":"2026-10","otorgado":true}, …]
create or replace function public.completar_registro(
    p_nombre text, p_idioma text, p_pais text, p_marca text, p_campana text,
    p_atributos jsonb, p_consentimientos jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
    v_uid  uuid := auth.uid();
    v_prov text := coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', 'email');
    v_camp text := nullif(lower(coalesce(p_campana, '')), '');
    c      jsonb;
    a      record;
begin
    if v_uid is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
    if exists (select 1 from public.profiles where id = v_uid and registro_completo) then
        raise exception 'registro ya completado' using errcode = '23505';
    end if;
    if char_length(btrim(coalesce(p_nombre, ''))) not between 2 and 120 then
        raise exception 'nombre inválido' using errcode = '22023';
    end if;
    if jsonb_typeof(coalesce(p_consentimientos, '[]')) <> 'array' then
        raise exception 'consentimientos inválidos' using errcode = '22023';
    end if;

    -- Todos los avisos obligatorios vigentes deben venir otorgados, en su versión vigente.
    for a in select * from identidad.avisos where vigente_hasta is null and obligatorio loop
        if not exists (select 1 from jsonb_array_elements(p_consentimientos) e
                        where e ->> 'tipo' = a.tipo and e ->> 'version' = a.version and (e ->> 'otorgado')::boolean) then
            raise exception 'falta aceptar %', a.tipo using errcode = '23514';
        end if;
    end loop;

    update public.profiles
       set nombre = btrim(p_nombre), idioma = coalesce(nullif(p_idioma, ''), 'es'), pais = nullif(upper(p_pais), ''),
           marca_origen = coalesce(p_marca, 'casa'), campana_origen = v_camp,
           atributos = coalesce(p_atributos, '{}'::jsonb), registro_completo = true,
           proveedor_alta = coalesce(proveedor_alta,
                                     case when v_prov in ('email', 'google', 'facebook', 'apple', 'azure') then v_prov end)
     where id = v_uid;

    for c in select * from jsonb_array_elements(p_consentimientos) loop
        -- La FK (tipo, version) → avisos rechaza versiones inventadas; aquí además se exige que sea la vigente.
        if not exists (select 1 from identidad.avisos av where av.tipo = c ->> 'tipo' and av.version = c ->> 'version'
                                                          and av.vigente_hasta is null) then
            raise exception 'aviso no vigente: % %', c ->> 'tipo', c ->> 'version' using errcode = '23514';
        end if;
        insert into identidad.consentimientos (user_id, tipo, version, otorgado, proveedor, marca, campana)
        values (v_uid, c ->> 'tipo', c ->> 'version', coalesce((c ->> 'otorgado')::boolean, false),
                case when v_prov in ('email', 'google', 'facebook', 'apple', 'azure') then v_prov else 'email' end,
                coalesce(p_marca, 'casa'), v_camp);
    end loop;

    insert into identidad.eventos_acceso (user_id, evento, proveedor, aal, detalle)
    values (v_uid, 'registro_ok',
            case when v_prov in ('email', 'google', 'facebook', 'apple', 'azure') then v_prov end,
            coalesce(auth.jwt() ->> 'aal', 'aal1'),
            jsonb_build_object('marca', coalesce(p_marca, 'casa'), 'campana', v_camp));
end $$;

create or replace function public.mis_consentimientos()
returns table (tipo text, version text, otorgado boolean, registrado_en timestamptz)
language sql stable security definer set search_path = '' as $$
    select distinct on (c.tipo) c.tipo, c.version, c.otorgado, c.registrado_en
      from identidad.consentimientos c where c.user_id = auth.uid()
     order by c.tipo, c.registrado_en desc
$$;

create or replace function public.registrar_consentimiento(p_tipo text, p_version text, p_otorgado boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
    if auth.uid() is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
    insert into identidad.consentimientos (user_id, tipo, version, otorgado, proveedor)
    values (auth.uid(), p_tipo, p_version, p_otorgado, 'perfil');
    insert into identidad.eventos_acceso (user_id, evento, detalle)
    values (auth.uid(), 'consentimiento', jsonb_build_object('tipo', p_tipo, 'version', p_version, 'otorgado', p_otorgado));
end $$;

-- Atributos de marca después del registro (misma validación por disparador).
create or replace function public.actualizar_atributos(p_atributos jsonb)
returns int language plpgsql security definer set search_path = '' as $$
declare v int;
begin
    if auth.uid() is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
    update public.profiles set atributos = p_atributos where id = auth.uid() and eliminado_en is null
    returning version_atributos into v;
    insert into identidad.eventos_acceso (user_id, evento, detalle)
    values (auth.uid(), 'atributos_cambiados', jsonb_build_object('version', v));
    return v;
end $$;

-- Lote de eventos del borde (D1). Solo service_role (secreto del Worker). Idempotente por id_borde.
create or replace function public.recibir_eventos_borde(p_eventos jsonb)
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
    insert into identidad.eventos_acceso
           (user_id, evento, proveedor, aal, resultado, origen, id_borde, ip_hash, ua_hash, pais, detalle, ocurrido_en)
    select (e ->> 'user_id')::uuid, e ->> 'evento', e ->> 'proveedor', e ->> 'aal', coalesce(e ->> 'resultado', 'ok'),
           'borde', e ->> 'id', e ->> 'ip_hash', e ->> 'ua_hash', e ->> 'pais', coalesce(e -> 'detalle', '{}'::jsonb),
           (e ->> 'ocurrido_en')::timestamptz
      from jsonb_array_elements(p_eventos) e
    on conflict (id_borde) do nothing;
    get diagnostics n = row_count;
    return n;
end $$;

revoke all on function public.formulario_registro(text, text), public.completar_registro(text, text, text, text, text, jsonb, jsonb),
                       public.mis_consentimientos(), public.registrar_consentimiento(text, text, boolean),
                       public.actualizar_atributos(jsonb), public.recibir_eventos_borde(jsonb) from public, anon, authenticated;
grant execute on function public.formulario_registro(text, text) to anon, authenticated;
grant execute on function public.completar_registro(text, text, text, text, text, jsonb, jsonb),
                          public.mis_consentimientos(), public.registrar_consentimiento(text, text, boolean),
                          public.actualizar_atributos(jsonb) to authenticated;
grant execute on function public.recibir_eventos_borde(jsonb) to service_role;

-- ------------------------------------------------------------------ datos iniciales (ejemplo, ajustar antes de producción)

-- sha256 = huella del HTML publicado de cada aviso:  curl -s https://casasiego.com/terms.html | sha256sum
insert into identidad.avisos (tipo, version, url, sha256, obligatorio) values
    ('privacidad', '2026-10', 'https://casasiego.com/terms.html#privacidad', repeat('0', 64), true),
    ('terminos',   '2026-10', 'https://casasiego.com/terms.html',            repeat('0', 64), true),
    ('marketing',  '2026-10', 'https://casasiego.com/terms.html#novedades',  repeat('0', 64), false);

insert into identidad.campos_perfil (marca, campana, clave, tipo, opciones, max_largo, obligatorio, etiqueta, orden) values
    ('casa',  '',           'interes',          'opcion', array['retrato', 'sastreria', 'mascotas'], 20, false,
        'lo que más me trae a la Casa', 1),
    ('fiel',  '',           'nombre_mascota',   'texto',  null, 40, false, 'el nombre de mi compañero', 1),
    ('fiel',  '',           'especie',          'opcion', array['perro', 'gato', 'otro'], 10, false, 'su especie', 2),
    ('justo', '',           'ocasion',          'opcion', array['boda', 'trabajo', 'gala', 'diario'], 10, false,
        'la ocasión de mi traje', 1),
    ('justo', 'bodas-2027', 'fecha_evento',     'fecha',  null, 10, true, 'la fecha del gran día', 2);

-- ------------------------------------------------------------------ verificación (CI)
-- select tablename from pg_tables where schemaname in ('public','identidad') and not rowsecurity;  -- vacío
-- select public.formulario_registro('fiel');                                                         -- avisos + 2 campos
