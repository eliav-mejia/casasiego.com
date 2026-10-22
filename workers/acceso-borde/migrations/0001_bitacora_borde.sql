-- Casa Siego · Variante D · D1 (SQLite en el borde): bitácora de accesos antes de llegar a Supabase.
-- Aplicar:  npx wrangler d1 migrations apply casasiego-acceso --remote
-- D1 no tiene RLS: ninguna ruta del Worker lee estas tablas hacia el navegador; solo escribe y envía a Supabase.
-- Sin correo, IP ni user-agent en claro: solo hash SHA-256 con HASH_PEPPER.

CREATE TABLE eventos (
    id          TEXT    PRIMARY KEY,                                   -- UUID; id_borde en Supabase (idempotencia)
    user_id     TEXT    CHECK (user_id IS NULL OR length(user_id) = 36),
    evento      TEXT    NOT NULL CHECK (evento IN ('oauth_iniciado', 'oauth_ok', 'oauth_fallido', 'otp_enviado',
                                                   'otp_fallido', 'login_ok', 'login_fallido', 'logout')),
    proveedor   TEXT    CHECK (proveedor IN ('email', 'google', 'facebook', 'apple', 'azure')),
    aal         TEXT    CHECK (aal IN ('aal1', 'aal2')),
    resultado   TEXT    NOT NULL DEFAULT 'ok' CHECK (resultado IN ('ok', 'denegado', 'error')),
    ip_hash     TEXT    NOT NULL CHECK (length(ip_hash) = 64),
    ua_hash     TEXT    NOT NULL CHECK (length(ua_hash) = 64),
    pais        TEXT    CHECK (pais IS NULL OR length(pais) = 2),
    detalle     TEXT    NOT NULL DEFAULT '{}' CHECK (json_valid(detalle) AND json_type(detalle) = 'object'),
    ocurrido_en TEXT    NOT NULL,                                      -- ISO 8601 UTC
    enviado_en  TEXT                                                   -- NULL = pendiente de enviar a Supabase
) STRICT;

CREATE INDEX eventos_pendientes ON eventos (ocurrido_en) WHERE enviado_en IS NULL;
CREATE INDEX eventos_por_ip     ON eventos (ip_hash, ocurrido_en);

-- Solo inserción, salvo marcar el envío y la purga del cron (filas ya enviadas, > 30 días).
CREATE TRIGGER eventos_sin_editar BEFORE UPDATE ON eventos
WHEN NOT (OLD.enviado_en IS NULL AND NEW.enviado_en IS NOT NULL
          AND NEW.id = OLD.id AND NEW.evento = OLD.evento AND NEW.ocurrido_en = OLD.ocurrido_en
          AND NEW.ip_hash = OLD.ip_hash AND NEW.detalle = OLD.detalle AND NEW.user_id IS OLD.user_id)
BEGIN SELECT RAISE(ABORT, 'eventos es de solo inserción'); END;

CREATE TRIGGER eventos_sin_borrar BEFORE DELETE ON eventos
WHEN OLD.enviado_en IS NULL OR OLD.enviado_en > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days')
BEGIN SELECT RAISE(ABORT, 'solo se purgan eventos enviados hace más de 30 días'); END;
