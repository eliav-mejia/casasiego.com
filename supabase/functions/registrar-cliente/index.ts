// Casa Siego · registrar-cliente (v1.3.1)
// Un representante con sesión llena /registro/ → esta función:
//   1. verifica el JWT y que quien llama sea personal (public.soy_personal: representante o admin_cliente vigente);
//   2. invita al cliente por correo (auth.admin.inviteUserByEmail): no hay registro público, el cliente solo elige contraseña
//      en /acceso/contrasena/ y entra desde el avatar de la barra superior;
//   3. guarda perfil + contacto + medidas + consentimientos en UNA transacción (public.registrar_cliente);
//   4. si el paso 3 falla, borra al usuario invitado (no quedan cuentas a medias).
// Correo ya registrado → 409 (quien llama es personal: no es enumeración pública).
import { cors, comoUsuario, json, ORIGEN, servicio } from '../_compartido/http.ts';

const CORREO = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;

const mensajeBD = (code?: string) =>
    code === '23514' ? 'Revisa los datos: alguna medida o campo está fuera de rango, o falta el aviso de privacidad.'
    : code === '22P02' || code === '22007' || code === '22008' ? 'Revisa los datos: hay un número o una fecha con formato no válido.'
    : code === '42501' ? 'Tu cuenta no tiene permiso para registrar clientes.'
    : 'No se pudo guardar el registro.';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
    if (req.method !== 'POST') return json(req, 405, { error: 'Método no permitido.' });

    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return json(req, 401, { error: 'Inicia sesión.' });

    const admin = servicio();
    const { data: quien, error: errUsuario } = await admin.auth.getUser(token);
    if (errUsuario || !quien?.user) return json(req, 401, { error: 'Tu sesión expiró: vuelve a iniciar sesión.' });

    const { data: esPersonal, error: errRol } = await comoUsuario(token).rpc('soy_personal');
    if (errRol || esPersonal !== true) return json(req, 403, { error: mensajeBD('42501') });

    let p: Record<string, any>;
    try { p = await req.json(); } catch { return json(req, 400, { error: 'Formulario no válido.' }); }

    const email = String(p.email ?? '').trim().toLowerCase();
    if (!CORREO.test(email)) return json(req, 400, { error: 'Escribe un correo válido.' });
    if (!String(p.nombre ?? '').trim()) return json(req, 400, { error: 'Escribe el nombre del cliente.' });
    const m = p.medidas ?? {};
    if (!(Number(m.cuello) > 0 && Number(m.pecho) > 0 && Number(m.largo_manga) > 0))
        return json(req, 400, { error: 'Cuello, pecho y largo de manga son obligatorios.' });
    if (p.consentimientos?.privacidad !== true)
        return json(req, 400, { error: 'El cliente debe aceptar el aviso de privacidad.' });
    delete p.email;                                            // el correo vive solo en auth.users

    const { data: inv, error: errInv } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${ORIGEN}/acceso/contrasena/`,
        data: { nombre: String(p.nombre).slice(0, 120) },
    });
    if (errInv || !inv?.user) {
        const ya = /already|registered|exists/i.test(errInv?.message ?? '');
        console.error('[registrar-cliente] invitación:', errInv?.message);
        return json(req, ya ? 409 : 502, { error: ya ? 'Ya existe una cuenta con ese correo.' : 'No se pudo enviar la invitación.' });
    }

    const { error: errBD } = await admin.rpc('registrar_cliente', {
        p_cliente: inv.user.id, p_representante: quien.user.id, p,
    });
    if (errBD) {
        console.error('[registrar-cliente] registrar_cliente:', errBD.code, errBD.message);
        await admin.auth.admin.deleteUser(inv.user.id);        // deshace la invitación
        return json(req, 422, { error: mensajeBD(errBD.code) });
    }
    return json(req, 201, { ok: true });
});
