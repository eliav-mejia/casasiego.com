-- Casa Siego · 0006 · alta simplificada con correo y contraseña + medidas que declara el propio cliente (v1.4.0).
-- registro.html (v1.4.0): crear cuenta con correo + contraseña, o con Google, Microsoft, LinkedIn o Facebook.
-- Al terminar, el cliente llega a la portada (index.html) y un pop-up le pide sus medidas actuales.
-- Una migración aplicada nunca se edita: se corrige con otra nueva. Cada función declara sus grant.
--
-- Capas de seguridad de este flujo (de fuera hacia dentro):
--   1. Supabase Auth: contraseña ≥ 12 con mayúsculas, minúsculas y números (config.toml), confirmación por correo,
--      límite por IP de altas e inicios (rate_limit.sign_in_sign_ups), Turnstile cuando se active auth.captcha.
--   2. Hook «before user created» (0005): solo correo y los cuatro proveedores.
--   3. PostgREST: el navegador nunca escribe SQL. supabase-js manda JSON y PostgREST lo pasa como parámetros
--      tipados; esta función no usa SQL dinámico (sin EXECUTE ni format), así que no hay inyección posible.
--   4. Esta función: auth.uid() como único dueño (el cliente no elige el user_id), rangos plausibles por medida,
--      registro completo obligatorio y un máximo de tomas propias por día.
--   5. Tabla: dominio medida_cm, checks de cada opción, historial de solo inserción (0002) y RLS de lectura propia.

-- ------------------------------------------------------------------ medidas declaradas por el cliente
create or replace function public.registrar_mis_medidas(
    p_cuello           numeric,
    p_pecho            numeric,
    p_largo_manga      numeric,
    p_cintura          numeric default null,
    p_hombros          numeric default null,
    p_muneca           numeric default null,
    p_largo_camisa     numeric default null,
    p_estatura_cm      numeric default null,
    p_peso_kg          numeric default null,
    p_ajuste           text    default null,
    p_cuello_preferido text    default null,
    p_puno             text    default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
    v_uid uuid := auth.uid();
    v_id  bigint;
begin
    if v_uid is null then
        raise exception 'sesión requerida' using errcode = '42501';
    end if;
    if not exists (select 1 from public.profiles where id = v_uid and registro_completo) then
        raise exception 'registro incompleto' using errcode = '42501';
    end if;
    -- Freno contra abuso: 5 tomas propias por día (las del taller no cuentan).
    if (select count(*) from public.medidas
         where user_id = v_uid and tomadas_por = v_uid and tomadas_en > now() - interval '1 day') >= 5 then
        raise exception 'demasiadas tomas hoy' using errcode = '54000';
    end if;

    -- Rangos plausibles para un adulto (más estrechos que el dominio medida_cm). Obligatorias: cuello, pecho, manga.
    if p_cuello      is null or p_cuello      not between 30  and 60  then raise exception 'medida fuera de rango: cuello'      using errcode = '22023'; end if;
    if p_pecho       is null or p_pecho       not between 70  and 170 then raise exception 'medida fuera de rango: pecho'       using errcode = '22023'; end if;
    if p_largo_manga is null or p_largo_manga not between 45  and 80  then raise exception 'medida fuera de rango: largo_manga' using errcode = '22023'; end if;
    if p_cintura      is not null and p_cintura      not between 55  and 170 then raise exception 'medida fuera de rango: cintura'      using errcode = '22023'; end if;
    if p_hombros      is not null and p_hombros      not between 35  and 65  then raise exception 'medida fuera de rango: hombros'      using errcode = '22023'; end if;
    if p_muneca       is not null and p_muneca       not between 13  and 25  then raise exception 'medida fuera de rango: muneca'       using errcode = '22023'; end if;
    if p_largo_camisa is not null and p_largo_camisa not between 60  and 100 then raise exception 'medida fuera de rango: largo_camisa' using errcode = '22023'; end if;
    if p_estatura_cm  is not null and p_estatura_cm  not between 140 and 220 then raise exception 'medida fuera de rango: estatura_cm'  using errcode = '22023'; end if;
    if p_peso_kg      is not null and p_peso_kg      not between 40  and 200 then raise exception 'medida fuera de rango: peso_kg'      using errcode = '22023'; end if;

    -- Las opciones las vuelve a comprobar el check de la tabla; aquí se rechazan antes con un mensaje claro.
    if p_ajuste is not null and p_ajuste not in ('entallado', 'regular', 'holgado') then
        raise exception 'opción inválida: ajuste' using errcode = '22023';
    end if;
    if p_cuello_preferido is not null and p_cuello_preferido not in ('CR', 'CL') then
        raise exception 'opción inválida: cuello_preferido' using errcode = '22023';
    end if;
    if p_puno is not null and p_puno not in ('sencillo', 'doble', 'mancuernas') then
        raise exception 'opción inválida: puno' using errcode = '22023';
    end if;

    insert into public.medidas (user_id, tomadas_por, lugar, cuello, pecho, largo_manga, cintura, hombros, muneca,
                                largo_camisa, estatura_cm, peso_kg, ajuste, cuello_preferido, puno)
    values (v_uid, v_uid, 'remota', round(p_cuello, 1), round(p_pecho, 1), round(p_largo_manga, 1),
            round(p_cintura, 1), round(p_hombros, 1), round(p_muneca, 1), round(p_largo_camisa, 1),
            round(p_estatura_cm, 1), round(p_peso_kg, 1), p_ajuste, p_cuello_preferido, p_puno)
    returning id into v_id;
    return v_id;
end $$;

revoke all on function public.registrar_mis_medidas(numeric, numeric, numeric, numeric, numeric, numeric, numeric,
                                                    numeric, numeric, text, text, text) from public, anon;
grant execute on function public.registrar_mis_medidas(numeric, numeric, numeric, numeric, numeric, numeric, numeric,
                                                       numeric, numeric, text, text, text) to authenticated;

comment on function public.registrar_mis_medidas is
    'El cliente con sesión y registro completo guarda sus medidas actuales (lugar = remota). Pop-up de la portada, v1.4.0.';
