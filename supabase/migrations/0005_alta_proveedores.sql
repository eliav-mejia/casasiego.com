-- Casa Siego · 0005 · crear cuenta con Google, Microsoft, LinkedIn o Facebook (v1.3.3).
-- La página de alta es https://casasiego.com/registro.html (URL propia; el pop-up de la portada solo inicia sesión).
-- config.toml pasa a enable_signup = true SOLO para proveedores OAuth; el alta por correo sigue cerrada y la cuida
-- el hook «before user created» de abajo. Las cuentas que crea un representante (invitación, 0002) no cambian.
-- Una migración aplicada nunca se edita: se corrige con otra nueva.

-- ------------------------------------------------------------------ proveedores admitidos
-- LinkedIn en Supabase es «linkedin_oidc». Apple sale de la página pero se conserva en los checks: hay filas
-- históricas posibles y quitarlo de un check no aporta seguridad (el hook decide quién entra).
create or replace function identidad.proveedor_valido(p text)
returns boolean language sql immutable set search_path = '' as $$
    select p in ('email', 'google', 'azure', 'linkedin_oidc', 'facebook', 'apple')
$$;
revoke all on function identidad.proveedor_valido(text) from public, anon;
grant execute on function identidad.proveedor_valido(text) to authenticated, service_role, supabase_auth_admin;

alter table public.profiles drop constraint if exists profiles_proveedor_alta_check;
alter table public.profiles add constraint profiles_proveedor_alta_check
    check (proveedor_alta in ('email', 'google', 'azure', 'linkedin_oidc', 'facebook', 'apple'));

alter table identidad.consentimientos drop constraint if exists consentimientos_proveedor_check;
alter table identidad.consentimientos add constraint consentimientos_proveedor_check
    check (proveedor in ('email', 'google', 'azure', 'linkedin_oidc', 'facebook', 'apple', 'perfil', 'representante'));

alter table identidad.eventos_acceso drop constraint if exists eventos_acceso_proveedor_check;
alter table identidad.eventos_acceso add constraint eventos_acceso_proveedor_check
    check (proveedor in ('email', 'google', 'azure', 'linkedin_oidc', 'facebook', 'apple'));

-- ------------------------------------------------------------------ alta de usuario (trigger de 0001, ahora con LinkedIn)
create or replace function identidad.alta_usuario()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
    v_prov text := new.raw_app_meta_data ->> 'provider';
begin
    insert into public.profiles (id, proveedor_alta)
    values (new.id, case when identidad.proveedor_valido(v_prov) then v_prov end)
    on conflict (id) do nothing;

    insert into identidad.membresias (user_id, sitio, rol)
    select new.id, s.sitio, 'cliente' from identidad.sitios s where s.principal
    on conflict do nothing;
    return new;
end $$;

-- ------------------------------------------------------------------ completar_registro (0001, ahora con LinkedIn)
create or replace function public.completar_registro(
    p_nombre text, p_idioma text, p_pais text, p_marca text, p_campana text,
    p_atributos jsonb, p_consentimientos jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
    v_uid  uuid := auth.uid();
    v_prov text := coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', 'email');
    v_ok   text;
    v_camp text := nullif(lower(coalesce(p_campana, '')), '');
    c      jsonb;
    a      record;
begin
    if v_uid is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
    v_ok := case when identidad.proveedor_valido(v_prov) then v_prov end;
    if exists (select 1 from public.profiles where id = v_uid and registro_completo) then
        raise exception 'registro ya completado' using errcode = '23505';
    end if;
    if char_length(btrim(coalesce(p_nombre, ''))) not between 2 and 120 then
        raise exception 'nombre inválido' using errcode = '22023';
    end if;
    if jsonb_typeof(coalesce(p_consentimientos, '[]')) <> 'array' then
        raise exception 'consentimientos inválidos' using errcode = '22023';
    end if;

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
           proveedor_alta = coalesce(proveedor_alta, v_ok)
     where id = v_uid;

    for c in select * from jsonb_array_elements(p_consentimientos) loop
        if not exists (select 1 from identidad.avisos av where av.tipo = c ->> 'tipo' and av.version = c ->> 'version'
                                                          and av.vigente_hasta is null) then
            raise exception 'aviso no vigente: % %', c ->> 'tipo', c ->> 'version' using errcode = '23514';
        end if;
        insert into identidad.consentimientos (user_id, tipo, version, otorgado, proveedor, marca, campana)
        values (v_uid, c ->> 'tipo', c ->> 'version', coalesce((c ->> 'otorgado')::boolean, false),
                coalesce(v_ok, 'email'), coalesce(p_marca, 'casa'), v_camp);
    end loop;

    insert into identidad.eventos_acceso (user_id, evento, proveedor, aal, detalle)
    values (v_uid, 'registro_ok', v_ok, coalesce(auth.jwt() ->> 'aal', 'aal1'),
            jsonb_build_object('marca', coalesce(p_marca, 'casa'), 'campana', v_camp));
end $$;

revoke all on function public.completar_registro(text, text, text, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.completar_registro(text, text, text, text, text, jsonb, jsonb) to authenticated;

-- ------------------------------------------------------------------ hook «before user created»
-- Auth lo llama antes de crear cualquier usuario. Deja pasar los cuatro proveedores de registro.html y el correo
-- (las invitaciones de registrar-cliente llegan como 'email'). Rechaza teléfono, anónimo, Apple y cualquier otro.
-- PENDIENTE (rama de vista previa): comprobar si auth.admin.inviteUserByEmail dispara este hook. Si NO lo dispara,
-- cambiar a rechazar también 'email' y así cerrar el alta pública por correo (hoy solo la frena enable_confirmations).
create or replace function public.antes_de_crear_usuario(event jsonb)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
    v_prov text := event -> 'user' -> 'app_metadata' ->> 'provider';
begin
    if v_prov in ('google', 'azure', 'linkedin_oidc', 'facebook', 'email') then
        return '{}'::jsonb;
    end if;
    return jsonb_build_object('error', jsonb_build_object(
        'http_code', 403,
        'message', 'Casa Siego crea cuentas solo con Google, Microsoft, LinkedIn o Facebook.'));
end $$;
grant execute on function public.antes_de_crear_usuario(jsonb) to supabase_auth_admin;
revoke execute on function public.antes_de_crear_usuario(jsonb) from public, anon, authenticated;
