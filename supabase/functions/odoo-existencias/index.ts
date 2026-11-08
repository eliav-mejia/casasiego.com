// Casa Siego · odoo-existencias (v1.3.1) · Odoo Inventario → PostgreSQL (inventario.existencias_odoo → catalogo_publico)
// Regla unicanal de la firma: Odoo manda. Esta función NUNCA confía en la cantidad que llega en el aviso:
// con el SKU (o el registro de Odoo) relee qty_available por almacén con la API de Odoo y sobrescribe el espejo.
//
// Quién la llama (verify_jwt = false; exige el secreto compartido ODOO_WEBHOOK_SECRET):
//   · Odoo, acción automatizada «Enviar notificación de webhook» sobre stock.quant o stock.move (estado Hecho):
//       POST …/functions/v1/odoo-existencias?secreto=<ODOO_WEBHOOK_SECRET>   cuerpo de Odoo: { _model, _id, … }
//     (el webhook de Odoo no admite cabeceras propias: por eso el secreto también se acepta en la URL)
//   · La conciliación cada 15 min (pg_cron + pg_net, migración 0003):  { "todos": true }  con cabecera x-odoo-secreto
//   · A mano para un SKU:  { "skus": ["JUS-CAM-01-37-CR-MR"] }
import { cors, igual, json, servicio } from '../_compartido/http.ts';

const SKU = /^[A-Z]{3}-[A-Z]{3}-[0-9]{2}(-[A-Z0-9]{1,3})*$/;
const env = (k: string) => Deno.env.get(k) ?? '';

let uid: number | null = null;
const rpc = async (service: string, method: string, args: unknown[]) => {
    const r = await fetch(`${env('ODOO_URL')}/jsonrpc`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: { service, method, args } }),
        signal: AbortSignal.timeout(15000),
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error.data?.message ?? j.error.message);
    return j.result;
};
const odoo = async (model: string, method: string, args: unknown[], kw: Record<string, unknown> = {}) => {
    uid ??= await rpc('common', 'authenticate', [env('ODOO_DB'), env('ODOO_USER'), env('ODOO_API_KEY'), {}]);
    if (!uid) throw new Error('Odoo rechazó el usuario o la clave de API');
    return rpc('object', 'execute_kw', [env('ODOO_DB'), uid, env('ODOO_API_KEY'), model, method, args, kw]);
};

// Odoo guarda write_date en UTC sin zona: "2026-11-08 17:04:11"
const utc = (d?: string | false) => (d ? `${d.replace(' ', 'T')}Z` : null);

// Del aviso de Odoo (stock.quant / stock.move / product.product) al product_id
const productoDelAviso = async (b: Record<string, any>): Promise<number | null> => {
    if (b._model === 'product.product') return Number(b._id) || null;
    if (b._model === 'stock.quant' || b._model === 'stock.move') {
        const [r] = await odoo(b._model, 'read', [[Number(b._id)]], { fields: ['product_id'] });
        return r?.product_id ? r.product_id[0] : null;
    }
    return null;
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
    if (req.method !== 'POST') return json(req, 405, { error: 'Método no permitido.' });

    const secreto = env('ODOO_WEBHOOK_SECRET');
    const dado = req.headers.get('x-odoo-secreto') ?? new URL(req.url).searchParams.get('secreto') ?? '';
    if (!secreto || !igual(dado, secreto)) return json(req, 401, { error: 'No autorizado.' });

    let b: Record<string, any> = {};
    try { b = await req.json(); } catch { /* cuerpo vacío = nada que hacer */ }

    try {
        let dominio: unknown[];
        if (b.todos === true) dominio = [['default_code', '=like', 'JUS-%']];
        else if (Array.isArray(b.skus)) {
            const skus = b.skus.filter((s: unknown) => typeof s === 'string' && SKU.test(s)).slice(0, 500);
            if (!skus.length) return json(req, 400, { error: 'Sin SKU válidos.' });
            dominio = [['default_code', 'in', skus]];
        } else {
            const id = await productoDelAviso(b);
            if (!id) return json(req, 202, { ok: true, filas: 0, nota: 'aviso sin producto' });
            dominio = [['id', '=', id]];
        }

        const almacenes = [['MX', env('ODOO_ALMACEN_MX')], ['ES', env('ODOO_ALMACEN_ES')]].filter(([, w]) => w);
        const filas: Record<string, unknown>[] = [];
        for (const [almacen, warehouse] of almacenes) {
            // qty_available con contexto de almacén = existencias en sus ubicaciones internas (Odoo ya suma las ubicaciones)
            const productos = await odoo('product.product', 'search_read', [dominio], {
                fields: ['default_code', 'qty_available', 'write_date'],
                context: { warehouse: Number(warehouse), active_test: false },
            });
            for (const p of productos) {
                if (typeof p.default_code !== 'string' || !SKU.test(p.default_code)) continue;
                filas.push({ sku: p.default_code, almacen, cantidad: p.qty_available, odoo_product_id: p.id, odoo_write_date: utc(p.write_date) });
            }
        }

        const db = servicio();
        let total = 0;
        for (let i = 0; i < filas.length; i += 500) {
            const { data, error } = await db.rpc('cargar_existencias_odoo', { p_filas: filas.slice(i, i + 500) });
            if (error) throw new Error(`PostgreSQL: ${error.code} ${error.message}`);
            total += Number(data) || 0;
        }
        return json(req, 200, { ok: true, filas: total });
    } catch (e) {
        console.error('[odoo-existencias]', (e as Error).message);
        return json(req, 502, { error: 'No se pudo leer Odoo.' });
    }
});
