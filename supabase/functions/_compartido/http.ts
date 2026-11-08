// Casa Siego · utilidades compartidas de las Edge Functions (CORS fijo, respuestas JSON, cliente de servicio).
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export const ORIGEN = 'https://casasiego.com';

export const cors = (req: Request): Record<string, string> => {
    const o = req.headers.get('Origin') ?? '';
    // Producción y servidor local de pruebas; nada más.
    const permitido = o === ORIGEN || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(o) ? o : ORIGEN;
    return {
        'Access-Control-Allow-Origin': permitido,
        'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-odoo-secreto',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        Vary: 'Origin',
    };
};

export const json = (req: Request, status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json; charset=utf-8' } });

// service_role: salta RLS. Solo dentro de la función; la plataforma inyecta las variables.
export const servicio = (): SupabaseClient =>
    createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

// Cliente con la sesión de quien llama: RLS y auth.uid() aplican como en el navegador.
export const comoUsuario = (token: string): SupabaseClient =>
    createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
    });

// Comparación en tiempo constante (secretos compartidos).
export const igual = (a: string, b: string) => {
    const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
    let d = x.length ^ y.length;
    for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] ?? 0) ^ (y[i] ?? 0);
    return d === 0;
};
