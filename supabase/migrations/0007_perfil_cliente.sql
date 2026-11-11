-- Casa Siego · 0007 · perfil del cliente en /cuenta/ (v1.4.2): medidas, dirección, correo, teléfono y últimas transacciones.
-- Una migración aplicada nunca se edita: se corrige con otra nueva. Cada función declara sus grant.
--
--   - public.clientes gana la dirección de entrega (columnas: identifican; nunca en profiles.atributos).
--   - public.mi_perfil(): todo el perfil en una llamada, security invoker → RLS decide (solo lo propio).
--   - public.actualizar_mi_contacto(): el cliente corrige su teléfono y su dirección. Tipada, sin SQL dinámico,
--     auth.uid() como único dueño, registro completo obligatorio. El correo no se toca aquí: lo cambia Supabase Auth.

-- ------------------------------------------------------------------ dirección de entrega
alter table public.clientes
    add column calle          text    check (char_length(calle) <= 160),          -- calle y número exterior
    add column interior       text    check (char_length(interior) <= 60),        -- número interior, piso, oficina
    add column colonia        text    check (char_length(colonia) <= 80),
    add column codigo_postal  text    check (codigo_postal ~ '^[0-9]{5}$'),        -- MX y ES: 5 dígitos
    add column estado_region  text    check (char_length(estado_region) <= 80),   -- estado (MX) o provincia (ES)
    add column pais           char(2) check (pais in ('MX', 'ES')),
    add column contacto_actualizado_en timestamptz;

-- ------------------------------------------------------------------ el perfil en una sola llamada
create or replace function public.mi_perfil()
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
    v_uid uuid := auth.uid();
    v_out jsonb;
begin
    if v_uid is null then return null; end if;
    select jsonb_build_object(
        'nombre',   (select nullif(pr.nombre, '') from public.profiles pr where pr.id = v_uid),
        'correo',   nullif(auth.jwt() ->> 'email', ''),
        'contacto', (select jsonb_build_object(
                        'telefono', c.telefono, 'contacto_preferido', c.contacto_preferido,
                        'calle', c.calle, 'interior', c.interior, 'colonia', c.colonia, 'codigo_postal', c.codigo_postal,
                        'ciudad', c.ciudad, 'estado_region', c.estado_region, 'pais', c.pais)
                       from public.clientes c where c.id = v_uid),
        'medidas',  (select to_jsonb(m) - 'user_id' - 'tomadas_por' - 'notas' - 'id'
                       from public.medidas_vigentes m where m.user_id = v_uid),
        'transacciones', coalesce((select jsonb_agg(jsonb_build_object(
                        'pedido', p.odoo_ref, 'estado', p.estado, 'piezas', p.piezas,
                        'fecha', p.confirmado_en, 'entrega', p.entrega_estimada) order by p.fecha desc)
                       from (select pc.*, coalesce(pc.confirmado_en, pc.actualizado::date) as fecha
                               from public.pedidos_cliente pc where pc.user_id = v_uid
                              order by coalesce(pc.confirmado_en, pc.actualizado::date) desc limit 5) p), '[]'::jsonb)
    ) into v_out;
    return v_out;
end $$;
revoke all on function public.mi_perfil() from public, anon;
grant execute on function public.mi_perfil() to authenticated;

-- ------------------------------------------------------------------ el cliente corrige su contacto
create or replace function public.actualizar_mi_contacto(
    p_telefono           text,
    p_calle              text,
    p_interior           text,
    p_colonia            text,
    p_codigo_postal      text,
    p_ciudad             text,
    p_estado_region      text,
    p_pais               text,
    p_contacto_preferido text default 'correo')
returns void language plpgsql security definer set search_path = '' as $$
declare
    v_uid uuid := auth.uid();
    v_tel text := nullif(regexp_replace(coalesce(p_telefono, ''), '[\s().-]', '', 'g'), '');
begin
    if v_uid is null then
        raise exception 'sesión requerida' using errcode = '42501';
    end if;
    if not exists (select 1 from public.profiles where id = v_uid and registro_completo) then
        raise exception 'registro incompleto' using errcode = '42501';
    end if;
    -- Freno contra abuso: un cambio por minuto.
    if exists (select 1 from public.clientes where id = v_uid and contacto_actualizado_en > now() - interval '1 minute') then
        raise exception 'demasiados cambios' using errcode = '54000';
    end if;

    if v_tel is not null and v_tel !~ '^\+[1-9][0-9]{7,14}$' then
        raise exception 'dato inválido: telefono' using errcode = '22023';
    end if;
    if nullif(trim(p_codigo_postal), '') is not null and trim(p_codigo_postal) !~ '^[0-9]{5}$' then
        raise exception 'dato inválido: codigo_postal' using errcode = '22023';
    end if;
    if nullif(p_pais, '') is not null and p_pais not in ('MX', 'ES') then
        raise exception 'dato inválido: pais' using errcode = '22023';
    end if;
    if coalesce(p_contacto_preferido, 'correo') not in ('correo', 'telefono', 'whatsapp') then
        raise exception 'dato inválido: contacto_preferido' using errcode = '22023';
    end if;
    if coalesce(p_contacto_preferido, 'correo') <> 'correo' and v_tel is null then
        raise exception 'dato inválido: telefono requerido' using errcode = '22023';
    end if;
    if char_length(coalesce(p_calle, '')) > 160 or char_length(coalesce(p_interior, '')) > 60
       or char_length(coalesce(p_colonia, '')) > 80 or char_length(coalesce(p_ciudad, '')) > 80
       or char_length(coalesce(p_estado_region, '')) > 80 then
        raise exception 'dato inválido: demasiado largo' using errcode = '22023';
    end if;

    insert into public.clientes as c (id, telefono, calle, interior, colonia, codigo_postal, ciudad, estado_region, pais,
                                      contacto_preferido, contacto_actualizado_en)
    values (v_uid, v_tel, nullif(trim(p_calle), ''), nullif(trim(p_interior), ''), nullif(trim(p_colonia), ''),
            nullif(trim(p_codigo_postal), ''), nullif(trim(p_ciudad), ''), nullif(trim(p_estado_region), ''),
            nullif(p_pais, ''), coalesce(p_contacto_preferido, 'correo'), now())
    on conflict (id) do update set
        telefono = excluded.telefono, calle = excluded.calle, interior = excluded.interior, colonia = excluded.colonia,
        codigo_postal = excluded.codigo_postal, ciudad = excluded.ciudad, estado_region = excluded.estado_region,
        pais = excluded.pais, contacto_preferido = excluded.contacto_preferido, contacto_actualizado_en = now();
end $$;
revoke all on function public.actualizar_mi_contacto(text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.actualizar_mi_contacto(text, text, text, text, text, text, text, text, text) to authenticated;

comment on function public.actualizar_mi_contacto is
    'El cliente con sesión y registro completo corrige su teléfono (E.164) y su dirección de entrega. /cuenta/, v1.4.2.';
