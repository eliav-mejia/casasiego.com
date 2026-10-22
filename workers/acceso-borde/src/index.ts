// Casa Siego · Variante D · Worker «acceso-borde» (Cloudflare Workers + D1).
// Ruta: casasiego.com/api/acceso/*  (requiere el dominio detrás de Cloudflare; ver _interno/acceso-casasiego.md §4).
//
//   POST /api/acceso/evento   el navegador avisa de un intento de acceso (OAuth, OTP, login, logout).
//                             El Worker añade lo que el navegador no puede falsear: hash de IP y UA, país, hora,
//                             y user_id/aal SOLO si trae un JWT de Supabase válido (JWKS). Límite de tasa por IP.
//   cron (cada minuto)        envía los eventos pendientes de D1 a Supabase (public.recibir_eventos_borde) y purga.
//
// D1 no tiene RLS: toda la autorización vive aquí. Ninguna ruta devuelve filas de D1.
// Verificación de JWT: misma regla que _plataforma/etapas/etapa-8-inicio-de-sesion/microservicios/verificar-identidad.ts.

import { createRemoteJWKSet, jwtVerify } from "jose";

export interface Env {
  DB: D1Database;
  SUPABASE_URL: string;          // https://<ref>.supabase.co
  SB_SECRET: string;             // sb_secret_… propia de este Worker (secreto; solo para recibir_eventos_borde)
  HASH_PEPPER: string;           // secreto; sal de los hash de IP y UA
  ORIGEN: string;                // https://casasiego.com
}

const EVENTOS = new Set(["oauth_iniciado", "oauth_ok", "oauth_fallido", "otp_enviado", "otp_fallido",
                         "login_ok", "login_fallido", "logout"]);
const CON_SESION = new Set(["oauth_ok", "login_ok", "logout"]);   // solo se aceptan con JWT válido
const PROVEEDORES = new Set(["email", "google", "facebook", "apple", "azure"]);
const LIMITE_POR_IP = 30;          // eventos por huella de IP en 15 min
const LOTE = 500;

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

async function sha256(texto: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function usuario(req: Request, env: Env): Promise<{ id: string; aal: "aal1" | "aal2" } | null> {
  const token = req.headers.get("Authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return null;
  jwks ??= createRemoteJWKSet(new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
                              { cooldownDuration: 30_000, cacheMaxAge: 600_000 });
  try {
    const { payload: p } = await jwtVerify(token, jwks, {
      issuer: `${env.SUPABASE_URL}/auth/v1`, audience: "authenticated",
      algorithms: ["ES256", "RS256"], clockTolerance: 30,
    });
    if (p.role !== "authenticated" || typeof p.sub !== "string") return null;
    return { id: p.sub, aal: p.aal === "aal2" ? "aal2" : "aal1" };
  } catch {
    return null;
  }
}

function json(cuerpo: unknown, estado = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function registrarEvento(req: Request, env: Env): Promise<Response> {
  // Mismo origen: el formulario vive en casasiego.com; nada de CORS abierto.
  if (req.headers.get("Origin") !== env.ORIGEN) return json({ error: "origen" }, 403);
  if (!(req.headers.get("Content-Type") ?? "").startsWith("application/json")) return json({ error: "tipo" }, 415);
  if (Number(req.headers.get("Content-Length") ?? 0) > 2048) return json({ error: "tamaño" }, 413);

  let b: { evento?: unknown; proveedor?: unknown; resultado?: unknown; motivo?: unknown };
  try { b = await req.json(); } catch { return json({ error: "json" }, 400); }

  const evento = String(b.evento ?? "");
  const proveedor = b.proveedor == null ? null : String(b.proveedor);
  if (!EVENTOS.has(evento) || (proveedor !== null && !PROVEEDORES.has(proveedor))) return json({ error: "evento" }, 422);

  const ip = req.headers.get("CF-Connecting-IP") ?? "";
  const ipHash = await sha256(`${env.HASH_PEPPER}|ip|${ip}`);
  const uaHash = await sha256(`${env.HASH_PEPPER}|ua|${req.headers.get("User-Agent") ?? ""}`);

  const desde = new Date(Date.now() - 15 * 60_000).toISOString();
  const n = await env.DB.prepare("SELECT count(*) AS n FROM eventos WHERE ip_hash = ? AND ocurrido_en > ?")
    .bind(ipHash, desde).first<{ n: number }>();
  if ((n?.n ?? 0) >= LIMITE_POR_IP) return json({ error: "límite" }, 429);

  const u = await usuario(req, env);
  // Un «éxito» sin JWT válido no se cree: se guarda como denegado, sin usuario.
  const resultado = CON_SESION.has(evento) && !u ? "denegado"
    : ["ok", "denegado", "error"].includes(String(b.resultado)) ? String(b.resultado) : "ok";
  const motivo = typeof b.motivo === "string" ? b.motivo.slice(0, 60).replace(/[^a-z0-9_ -]/gi, "") : undefined;

  await env.DB.prepare(
    `INSERT INTO eventos (id, user_id, evento, proveedor, aal, resultado, ip_hash, ua_hash, pais, detalle, ocurrido_en)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(), u?.id ?? null, evento, proveedor, u?.aal ?? null, resultado, ipHash, uaHash,
    (req as Request & { cf?: { country?: string } }).cf?.country ?? null,
    JSON.stringify(motivo ? { motivo } : {}), new Date().toISOString(),
  ).run();

  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

async function enviarPendientes(env: Env): Promise<void> {
  const { results } = await env.DB.prepare(
    "SELECT * FROM eventos WHERE enviado_en IS NULL ORDER BY ocurrido_en LIMIT ?",
  ).bind(LOTE).all<Record<string, string | null>>();
  if (!results.length) return;

  const lote = results.map((r) => ({ ...r, detalle: JSON.parse(r.detalle ?? "{}"), enviado_en: undefined }));
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/recibir_eventos_borde`, {
    method: "POST",
    headers: { apikey: env.SB_SECRET, "Content-Type": "application/json" },
    body: JSON.stringify({ p_eventos: lote }),
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);   // se reintenta en el siguiente minuto; id_borde evita duplicados

  const ahora = new Date().toISOString();
  await env.DB.batch(results.map((r) =>
    env.DB.prepare("UPDATE eventos SET enviado_en = ? WHERE id = ?").bind(ahora, r.id)));
  await env.DB.prepare("DELETE FROM eventos WHERE enviado_en IS NOT NULL AND enviado_en < ?")
    .bind(new Date(Date.now() - 31 * 86_400_000).toISOString()).run();
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/api/acceso/evento" && req.method === "POST") return registrarEvento(req, env);
    return json({ error: "no encontrado" }, 404);
  },
  async scheduled(_c: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(enviarPendientes(env));
  },
} satisfies ExportedHandler<Env>;
