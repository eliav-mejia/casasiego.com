"""Builds the Centro de Ayuda (Casa Siego's help blog) at ayuda/: an index grouped by topic and one article per question.
Each article opens with its own index of sections. Edit ARTICLES below and run from the project root:
    python3 docs/src/ayuda.py
Fields left in [brackets] render as .fill and must be decided before launch (see _interno/Marketing/club-casa-siego-guia-de-oferta.pdf)."""
import html, json, os, re

from medicion import GTM_BODY, gtm_head

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'ayuda')
SITE = 'https://casasiego.com'
DATE = '28 de octubre de 2026'

# Topics of the blog menu, in order
TOPICS = [
    ('unirte', 'Unirte al Club'),
    ('citas', 'Citas y eventos'),
    ('empresas', 'Empresas y uniformes'),
    ('politicas', 'Cancelaciones y políticas'),
]

# slug, topic, question, summary, [(section title, [paragraphs or ('ul', [items])])], optional {'title', 'desc'} for search engines
ARTICLES = [
    ('clientes-priority', 'unirte', '¿Cómo me vuelvo cliente Priority?',
     'Priority distingue a quien se compromete con su imagen y con la de su gente: diseñamos contigo tu colección con los servicios de la casa a tu disposición.', [
        ('Clientes Priority', [
            'Un cliente Priority se distingue por el compromiso con su imagen y con la de su gente. Viste bien a diario, cuida cómo se presenta su equipo y entiende la imagen como parte de su palabra. Para esa persona, Casa Siego deja de ser un lugar al que se acude y se vuelve un aliado.',
            'La casa reúne dos oficios: <a href="../../brands/justo/">Justo</a>, la sastrería, y <a href="../../brands/fiel/">Fiel</a>, el estudio de retrato. Como cliente Priority, los dos trabajan juntos para tu colección.',
        ]),
        ('Valores agregados', [
            'Diseñamos tu colección con los servicios de la casa a tu disposición:',
            ('ul', [
                '<strong>Corte y confección de trajes a medida</strong> en el taller de Justo, con un patrón propio.',
                '<strong>Visita para toma de medidas</strong>: vamos a tu oficina o a donde te acomode.',
                '<strong>Acompañamiento</strong> en cada decisión: tela, corte, detalles y el momento de estrenar.',
                '<strong>Fotografía de retrato</strong> en Fiel, para ti y para tu equipo.',
                '<strong>Acceso a eventos especiales</strong> de la casa.',
            ]),
        ]),
        ('Diseña tu colección', [
            ('ul', [
                '<strong>Conversación.</strong> Nos cuentas cómo vistes, a qué te dedicas y qué quieres proyectar, tú y tu gente.',
                '<strong>Propuesta.</strong> Preparamos una colección a tu medida: piezas, telas y el orden en que conviene hacerlas.',
                '<strong>Medidas y confección.</strong> Tomamos medidas en tu visita y confeccionamos cada pieza con sus pruebas.',
                '<strong>Retrato.</strong> Estrenas tu colección frente a la cámara de Fiel.',
            ]),
        ]),
        ('Vuélvete cliente Priority', [
            'Diseña tu colección y vuélvete cliente Priority. Escríbenos a <a href="mailto:info@casasiego.com?subject=Cliente%20Priority">info@casasiego.com</a> y agendamos la primera conversación. Si buscas piezas listas para usarse, conoce las <a href="../../brands/justo/tienda/">colecciones de Justo</a>.',
        ]),
    ], {'title': 'Clientes Priority: diseña tu colección | Casa Siego®',
        'desc': 'Cómo ser cliente Priority de Casa Siego: trajes a medida, visita para toma de medidas, acompañamiento, fotografía de retrato y eventos especiales para ti y tu equipo.'}),
    ('beneficios-de-cliente-priority', 'unirte', 'Beneficios de cliente Priority',
     'Trajes a medida, visita para toma de medidas, acompañamiento, fotografía de retrato y acceso a eventos especiales de la casa.', [
        ('Los beneficios', [
            'Como cliente Priority, Justo y Fiel trabajan juntos para tu colección. Tienes a tu disposición:',
            ('ul', [
                '<strong>Corte y confección de trajes a medida</strong> en el taller de Justo, con un patrón propio.',
                '<strong>Visita para toma de medidas</strong>: vamos a tu oficina o a donde te acomode.',
                '<strong>Acompañamiento</strong> en cada decisión: tela, corte, detalles y el momento de estrenar.',
                '<strong>Fotografía de retrato</strong> en Fiel, para ti y para tu equipo.',
                '<strong>Acceso a eventos especiales</strong> de la casa.',
            ]),
        ]),
        ('Un servicio personalizado', [
            'Las telas, locaciones, eventos y horarios cambian con la temporada. El alcance de cada beneficio se acuerda contigo al diseñar tu colección y queda por escrito en tu cotización.',
        ]),
    ]),
    ('tiene-un-costo-ser-priority', 'unirte', '¿Tiene un costo ser Priority?',
     'El acceso a Priority no tiene costo. Es un servicio intransferible que puede agregarse a tu cotización.', [
        ('Sin costo de acceso', [
            'No te pueden cobrar el acceso a ser Priority. Es un servicio intransferible que puede ser agregado a tu cotización en el <a href="../clientes-priority/">diseño de tu colección</a>.',
        ]),
    ]),
    ('sesiones-de-retrato', 'citas', '¿Cómo contratar una sesión de retrato fotográfico para mascotas?',
     'Pagas el anticipo en línea y eliges tu fecha en el calendario de tu sesión, esta semana o la próxima.', [
        ('Elige tu sesión', [
            'Fiel fotografía mascotas con luz natural: Esencial, Clásica y Legado. Compáralas en <a href="../../brands/fiel/mascota/">Fiel Mascotas</a> y pulsa «Reservar» en la tuya.',
        ]),
        ('Paga el anticipo', [
            'El anticipo es el 50&nbsp;% del precio y se paga con tarjeta en la página segura de Stripe. Casa Siego no recibe ni guarda los datos de tu tarjeta. El resto se paga el día de la sesión.',
        ]),
        ('Elige tu fecha', [
            'Al terminar el pago, Stripe te lleva al calendario de tu sesión. Solo abrimos fechas para esta semana y la próxima, por la mañana a las 9:00 o por la tarde a las 16:00, algunos domingos y nunca en sábado. Elige una, completa tus datos y envía la solicitud desde tu correo; te confirmamos la cita en un día hábil.',
        ]),
        ('Prepara tu sesión', [
            'Para ideas de preparación, lee <a href="../../brands/fiel/blog/organiza-tu-sesion/">Cómo organizar bien tu sesión</a>.',
        ]),
    ]),
    ('reservar-sesion-de-retrato', 'citas', '¿Cómo agendar una sesión de retrato fotográfico?',
     'Elige el tipo de retrato y la sesión, pide tu fecha por correo y aparta tu lugar con el anticipo.', [
        ('Elige tu retrato', [
            'Fiel retrata con luz natural en tres enfoques. Cada uno tiene su página con sesiones, locaciones y extras:',
            ('ul', [
                '<strong><a href="../../brands/fiel/ejecutivo/">Perfil ejecutivo</a></strong>: tu retrato profesional para CV, LinkedIn, perfil corporativo o sitio web.',
                '<strong><a href="../../brands/fiel/familiar/">Familiar o de pareja</a></strong>: retratos para el portarretrato y el álbum.',
                '<strong><a href="../../brands/fiel/mascota/">Mascota</a></strong>: se reserva y se paga en línea; lee <a href="../sesiones-de-retrato/">¿Cómo contratar una sesión de retrato fotográfico para mascotas?</a>',
            ]),
        ]),
        ('Elige tu sesión', [
            'Hay tres sesiones, Esencial, Clásica y Legado. Son paquetes cerrados, con precios en pesos mexicanos e IVA incluido, y cambian según el enfoque.',
            '<strong><a href="../../brands/fiel/ejecutivo/#sesiones">Perfil ejecutivo</a></strong>:',
            ('ul', [
                '<strong>Esencial</strong> · $750 MXN: al aire libre en Parque México, una persona, 2 fotografías editadas.',
                '<strong>Clásica</strong> · $1,450 MXN: para LinkedIn, 30 minutos en el estudio fotográfico Casa Siego, 5 fotografías editadas estilo catálogo, mentoría previa y galería privada en línea.',
                '<strong>Legado</strong> · $3,800 MXN: 45 minutos, hasta 3 personas, cualquier locación en la Ciudad de México, 15 fotografías editadas de portafolio profesional para portada o firma corporativa, material en crudo, mentoría previa y galería privada en línea.',
            ]),
            '<strong><a href="../../brands/fiel/familiar/#sesiones">Familiar o de pareja</a></strong>:',
            ('ul', [
                '<strong>Esencial</strong> · $310 MXN: Parque México, 2 fotografías editadas.',
                '<strong>Clásica</strong> · $750 MXN: 30 minutos en Parque México, 5 fotografías editadas, mentoría previa y galería privada en línea.',
                '<strong>Legado</strong> · $1,450 MXN: 45 minutos, hasta 3 personas, cualquier locación en la Ciudad de México, 15 fotografías editadas, material en crudo, mentoría previa y galería privada en línea.',
            ]),
            'Puedes sumar extras como persona adicional, fotografías editadas adicionales, sesión en tu oficina o a domicilio y entrega exprés. Los precios están en la página de cada enfoque.',
        ]),
        ('Pide tu fecha', [
            'Pulsa «Reservar» en la sesión que elegiste: se abre un correo a <a href="mailto:info@casasiego.com?subject=Fiel%20%C2%B7%20Reservar%20un%20retrato">info@casasiego.com</a> con la sesión en el asunto. Escríbenos el día y el horario que prefieres. Fotografiamos de 8:00 a 11:00 y de 16:00 a 19:00, según la luz y el reglamento de cada parque.',
        ]),
        ('Aparta tu lugar', [
            'La cita se confirma con el anticipo del 50&nbsp;% del precio de tu sesión; el monto aparece junto a cada precio. El resto se paga el día de la sesión. Te confirmamos la cita por correo en un día hábil.',
        ]),
        ('Fotografía de estudio', [
            'La sesión Clásica de perfil ejecutivo se fotografía en el Estudio Casa Siego. Fuera de ella, el estudio es exclusivo para miembros del <a href="../beneficios-de-cliente-priority/">Club Casa Siego</a>. Para retratos de estudio de un equipo o un proyecto especial, pide una cotización personalizada a <a href="mailto:info@casasiego.com?subject=Fiel%20%C2%B7%20Proyecto%20de%20estudio">info@casasiego.com</a>.',
        ]),
        ('Antes de reservar', [
            'Lee los <a href="../../brands/fiel/terminos/">términos y condiciones de Fiel</a>. Puedes mover tu cita una vez, sin costo, con al menos 24 horas de anticipación; lee <a href="../cancelar-o-mover-una-cita/">¿Cómo cancelo o muevo una cita?</a>',
        ]),
    ]),
    ('adquirir-traje-a-la-medida', 'citas', '¿Cómo agendar una cita para toma de medidas?',
     'Tu traje a la medida forma parte del diseño de tu colección, a partir de 10 trajes.', [
        ('Diseña tu colección', [
            'Los trajes a la medida de Justo se encargan al <a href="../clientes-priority/">diseñar tu colección</a> como cliente Priority. La colección se confecciona a partir de un mínimo de 10 trajes, para ti y para tu equipo.',
        ]),
        ('El proceso', [
            ('ul', [
                '<strong>Conversación.</strong> Nos cuentas cómo vistes, a qué te dedicas y qué quieres proyectar, tú y tu gente.',
                '<strong>Propuesta.</strong> Preparamos tu colección: piezas, telas y el orden en que conviene hacerlas.',
                '<strong>Medidas y confección.</strong> Tomamos medidas en tu visita y confeccionamos cada traje con sus pruebas.',
                '<strong>Retrato.</strong> Estrenas tu colección frente a la cámara de Fiel; lee <a href="../reservar-sesion-de-retrato/">¿Cómo agendar una sesión de retrato fotográfico?</a>',
            ]),
        ]),
        ('Piezas listas para usarse', [
            'Si buscas una pieza individual, conoce los <a href="../../brands/justo/tienda/">esenciales de Justo</a>, en tallas Chico a Extra grande.',
        ]),
    ]),
    ('reserva-prioritaria', 'citas', '¿Cómo funciona la reserva prioritaria?',
     'Como miembro, apartas el estudio y tus citas de sastrería antes que el público general.', [
        ('Qué es', [
            'Los miembros reservan el estudio y las citas de sastrería con anticipación sobre el público general. Así aseguras tu horario en fechas de alta demanda.',
        ]),
        ('Cómo usarla', [
            'Escríbenos a <a href="mailto:info@casasiego.com?subject=Club%20%C2%B7%20Reserva%20prioritaria">info@casasiego.com</a> o pide tu cita en atención a clientes indicando que eres miembro del Club.',
        ]),
    ]),
    ('eventos-y-vestimenta', 'citas', 'Eventos especiales y código de vestimenta',
     'Cómo funcionan las invitaciones, el cupo, los acompañantes y el código de vestimenta.', [
        ('Invitaciones y cupo', [
            'Los miembros tienen acceso a los eventos especiales que organiza o coorganiza Casa Siego, sujeto al cupo de cada evento. Cada invitación indica si admite acompañante.',
        ]),
        ('Código de vestimenta', [
            'Cada invitación indica el tipo de ocasión, por ejemplo formal o de etiqueta. El código de vestimenta describe la ocasión y nunca se usa para excluir a nadie.',
        ]),
        ('Convivencia', [
            'Pedimos respeto a las demás personas y no fotografiar ni grabar a otros miembros o invitados sin su consentimiento. Te avisamos cuando en un evento haya fotografía o video.',
        ]),
    ]),
    ('cancelar-o-mover-una-cita', 'citas', '¿Cómo cancelo o muevo una cita?',
     'Avísanos con anticipación para no perder tu sesión o tu prueba.', [
        ('Sesiones de Fiel Mascotas', [
            'Para mover tu sesión, escríbenos con al menos 24 horas de anticipación a <a href="mailto:info@casasiego.com?subject=Fiel%20%C2%B7%20Cambio%20de%20cita">info@casasiego.com</a>: te proponemos otro horario libre del calendario y tu anticipo pasa a la nueva fecha. Las reglas de cancelación y del anticipo están en los <a href="../../brands/fiel/terminos/">términos de Fiel</a>.',
        ]),
        ('Citas del Club', [
            'Puedes cancelar o mover tu cita de sastrería avisando con al menos <span class="fill">[horas]</span> horas de anticipación a <a href="mailto:info@casasiego.com?subject=Club%20%C2%B7%20Cambio%20de%20cita">info@casasiego.com</a>.',
        ]),
        ('Si no llegas', [
            'Una cita que no se cancela a tiempo puede contarse como utilizada.',
        ]),
        ('Puntualidad', [
            'Llega unos minutos antes. Las sesiones y pruebas tienen un horario reservado para ti y para los siguientes miembros.',
        ]),
    ]),
    ('uniformes-ejecutivos-a-medida', 'empresas', '¿Cómo encargo uniformes ejecutivos a la medida?',
     'En Justo, la sastrería de Casa Siego, confeccionamos uniformes ejecutivos y trajes a la medida para caballero: un patrón por persona, pruebas en el taller y un retrato corporativo de todo el equipo.', [
        ('Uniformes ejecutivos a la medida', [
            'Un uniforme ejecutivo a la medida es el traje de tu equipo cortado sobre las medidas de cada persona, con la tela, el color y los detalles de tu empresa. Todos visten igual y a cada uno le queda como propio. En Justo lo confeccionamos de principio a fin en nuestro taller de Roma Norte, Ciudad de México.',
        ]),
        ('Casa Siego: imagen y estilo', [
            'Casa Siego redefine la indumentaria ejecutiva. Nuestra visión industrial integra un savoir faire artesanal con procesos sostenibles: la constancia de un taller que produce para equipos completos y el oficio de la sastrería que mide, corta y ajusta a mano.',
            'La casa reúne dos oficios bajo un mismo techo de madera, concreto y luz natural: <a href="../../brands/justo/">Justo</a>, la sastrería, y <a href="../../brands/fiel/">Fiel</a>, el estudio de retrato. Por eso tu equipo puede estrenar su uniforme frente a la cámara el día de la entrega. Conoce a los sastres y fotógrafos en <a href="../../membresia/equipo/">el equipo de Casa Siego</a>.',
        ]),
        ('Trajes a la medida para caballero', [
            'Un traje justo es el que te queda: cortado sobre un patrón propio, con costuras que no se ven y la compostura de quien sabe que va bien vestido. En el taller confeccionamos:',
            ('ul', [
                '<strong>Trajes completos</strong> de saco y pantalón, con chaleco si la ocasión lo pide.',
                '<strong>Sacos estructurados</strong>, la pieza que más dice de un uniforme ejecutivo.',
                '<strong>Camisería y corbatas</strong> coordinadas con la paleta de tu marca.',
                '<strong>Ajuste y mantenimiento</strong> de las prendas, para que sigan cayendo como el primer día.',
            ]),
        ]),
        ('De fábrica o a la medida', [
            'Hay dos caminos, y puedes combinarlos:',
            ('ul', [
                '<strong>A la medida.</strong> Cada persona tiene su patrón y sus pruebas. Es la opción para el equipo directivo, la atención a clientes y quienes representan a tu empresa todos los días.',
                '<strong>De fábrica, en tallas.</strong> Los sacos de la <a href="../../brands/justo/tienda/">tienda en línea de Justo</a> vienen en tallas Chico, Mediano, Grande y Extra grande, listos para usarse. Sirven para reposiciones rápidas o nuevas contrataciones; la <a href="../../brands/justo/tienda/guia-de-tallas/">guía de tallas</a> explica cómo medirse.',
            ]),
        ]),
        ('El proceso para tu empresa', [
            ('ul', [
                '<strong>Cotización.</strong> Escríbenos a <a href="mailto:info@casasiego.com?subject=Justo%20%C2%B7%20Uniformes%20ejecutivos">info@casasiego.com</a> con el número de personas, las piezas que necesitas y la fecha en que las quieres estrenar.',
                '<strong>Tela y detalles.</strong> Elegimos contigo la tela, el forro, los botones y el color de la temporada que mejor representan a tu marca.',
                '<strong>Toma de medidas.</strong> Agendamos la cita de cada persona en la sastrería Justo.',
                '<strong>Pruebas.</strong> Ajustamos cada prenda en una o más pruebas, hasta que el saco caiga como debe.',
                '<strong>Entrega y retrato.</strong> El ajuste final se hace sobre cada persona y, si lo quieres, retratamos a todo el equipo en Fiel para tu sitio web, LinkedIn o informe anual.',
            ]),
            'Encarga con tiempo: la confección a la medida requiere varias semanas y pruebas. La cotización llega por escrito, con el monto total, antes de que pagues.',
        ]),
        ('Procesos sostenibles', [
            ('ul', [
                '<strong>Sobre pedido.</strong> Cortamos lo que tu equipo va a usar, no inventario que espera en una bodega.',
                '<strong>Un patrón por persona.</strong> Una prenda que queda bien se usa más y se reemplaza menos.',
                '<strong>Mantenimiento en la casa.</strong> Ajustamos y cuidamos las prendas para alargar su vida.',
                '<strong>Reposiciones por pieza.</strong> Si una persona cambia de talla o se integra al equipo, confeccionamos solo lo que hace falta.',
            ]),
        ]),
        ('Para ti, como miembro del Club', [
            'Si buscas un traje a la medida para ti, lee <a href="../adquirir-traje-a-la-medida/">¿Cómo agendar una cita para toma de medidas?</a> Para tu retrato profesional, lee <a href="../reservar-sesion-de-retrato/">¿Cómo agendar una sesión de retrato fotográfico?</a>',
        ]),
    ], {'title': 'Uniformes ejecutivos a la medida para empresas | Casa Siego®',
        'desc': 'Uniformes ejecutivos y trajes a la medida para caballero, de fábrica a medida en Justo, la sastrería de Casa Siego en Roma Norte, CDMX. Cotiza para tu equipo.'}),
    ('cambios-de-temporada', 'politicas', '¿Por qué cambian las telas o las locaciones?',
     'Es un servicio personalizado: las opciones varían por temporada, y siempre ofrecemos una alternativa equivalente.', [
        ('Un servicio por temporada', [
            'Las telas, locaciones, eventos y horarios dependen de la temporada y de nuestros proveedores. Por eso pueden variar, incluso a mitad de tu año de membresía.',
        ]),
        ('Qué hacemos cuando algo cambia', [
            'Te ofrecemos una alternativa equivalente. Los beneficios de tu membresía se mantienen durante el periodo que ya pagaste.',
        ]),
    ]),
    ('actualizacion-de-politicas', 'politicas', '¿Cómo me entero si cambian las políticas?',
     'Publicamos los cambios en este Centro de Ayuda y te enviamos un aviso automático por correo.', [
        ('Dónde se publican', [
            'Las políticas del Club se actualizan en este Centro de Ayuda. La versión y la fecha de los <a href="../../membresia/">términos y condiciones</a> cambian con cada actualización.',
        ]),
        ('Cómo te avisamos', [
            'Cada vez que una política se actualiza, enviamos en automático un aviso por correo a todos los miembros. También te las explicamos en atención a clientes durante tus servicios y en cada cotización.',
        ]),
        ('Si no estás de acuerdo', [
            'Si un cambio te afecta durante tu periodo vigente y no estás de acuerdo, puedes cancelar con reembolso proporcional.',
        ]),
    ]),
]

FONTS = 'https://fonts.googleapis.com/css2?family=Ledger&family=Bodoni+Moda:opsz,wght@6..96,600&family=Cinzel+Decorative:wght@700&family=Cinzel:wght@400;700;900&family=EB+Garamond:ital,wght@0,400;1,400&family=Spectral:ital@1&display=swap'


def slugify(s):
    s = s.lower()
    for a, b in zip('áéíóúñü¿?', 'aeiounu  '):
        s = s.replace(a, b)
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def plain(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s))


def head(title, desc, url, up, kind, ld):
    return f'''<!doctype html>
<html lang="es-MX">
<head>
  <meta charset="utf-8">
{gtm_head(up)}  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{html.escape(desc)}">
  <link rel="canonical" href="{url}">
  <meta property="og:site_name" content="Casa Siego">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{html.escape(desc)}">
  <meta property="og:url" content="{url}">
  <meta property="og:type" content="{kind}">
  <meta property="og:locale" content="es_MX">
  <meta property="og:image" content="{SITE}/images/casa/share.jpg?v=1.0.6">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
  <meta name="theme-color" content="#4A1621">
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" type="image/png" href="/favicon-32.png" sizes="32x32">
  <link rel="icon" type="image/png" href="/favicon-512.png" sizes="512x512">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta name="copyright" content="© 2026 Casa Siego®. Todos los derechos reservados.">
  <meta name="robots" content="noai, noimageai">
  <meta name="tdm-reservation" content="1">
  <meta name="tdm-policy" content="{SITE}/terms.html">
  <link rel="license" href="{up}terms.html">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="{FONTS}">
  <link rel="stylesheet" href="{up}css/site.css?v=1.1.1">
  <link rel="stylesheet" href="{up}css/layout.css?v=1.1.3">
  <script src="{up}js/region.js?v=1.2.0" defer></script>
  <script src="{up}js/casa.js?v=1.1.9" defer></script>
</head>
<body>
{GTM_BODY}'''


def crumbs(*items):
    return {'@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': u} for i, (n, u) in enumerate(items)]}


def body_html(blocks):
    out = []
    for b in blocks:
        if isinstance(b, tuple):
            out.append('      <ul>\n' + ''.join(f'        <li>{li}</li>\n' for li in b[1]) + '      </ul>')
        else:
            out.append(f'      <p>{b}</p>')
    return '\n'.join(out)


def article(i, a):
    slug, topic, q, summary, sections = a[:5]
    seo = a[5] if len(a) > 5 else {}
    url = f'{SITE}/ayuda/{slug}/'
    topic_name = dict(TOPICS)[topic]
    answer = ' '.join(plain(b) for b in sections[0][1] if isinstance(b, str))
    ld = {'@context': 'https://schema.org', '@graph': [
        crumbs(('Casa Siego', SITE + '/'), ('Centro de Ayuda', SITE + '/ayuda/'), (q, url)),
        {'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q,
                                             'acceptedAnswer': {'@type': 'Answer', 'text': plain(summary) + ' ' + answer}}]}]}
    toc = ''.join(f'        <li><a href="#{slugify(t)}">{t}</a></li>\n' for t, _ in sections)
    secs = '\n\n'.join(f'      <h2 class="section-title" id="{slugify(t)}">{t}</h2>\n{body_html(b)}' for t, b in sections)
    prev_a, next_a = ARTICLES[i - 1] if i else None, ARTICLES[i + 1] if i + 1 < len(ARTICLES) else None
    pager = ' &middot; '.join(x for x in [
        f'<a href="../{prev_a[0]}/">&larr; {prev_a[2]}</a>' if prev_a else '',
        '<a href="../">Centro de Ayuda</a>',
        f'<a href="../{next_a[0]}/">{next_a[2]} &rarr;</a>' if next_a else ''] if x)
    return head(seo.get('title', f'{q} — Centro de Ayuda · Casa Siego®'), seo.get('desc', plain(summary)), url, '../../', 'article', ld) + f'''
  <header class="terms-head">
    <p class="eyebrow eyebrow--gold">Centro de Ayuda &middot; {topic_name}</p>
    <h1 class="display">{q}</h1>
    <p class="meta meta--gold">Club Casa Siego &middot; Actualizado el {DATE}</p>
  </header>

  <main class="folio terms">
    <nav class="folio__margin ayuda-toc" aria-label="Índice del artículo">
      <p class="meta">Índice</p>
      <ol>
{toc}      </ol>
      <p class="meta"><a href="../#{topic}">Más sobre {topic_name.lower()}</a></p>
    </nav>

    <article class="folio__text">
      <p class="ayuda-lede">{summary}</p>

{secs}

      <hr class="rule">
      <p class="meta">¿No encontraste tu respuesta? Escríbenos a <a href="mailto:info@casasiego.com?subject=Centro%20de%20Ayuda">info@casasiego.com</a>. Consulta también los <a href="../../membresia/">términos y condiciones de la membresía</a>.</p>
      <p class="meta ayuda-pager">{pager}</p>
    </article>
  </main>

</body>
</html>
'''


def index():
    url = f'{SITE}/ayuda/'
    ld = {'@context': 'https://schema.org', '@graph': [
        crumbs(('Casa Siego', SITE + '/'), ('Centro de Ayuda', url)),
        {'@type': 'Blog', 'name': 'Centro de Ayuda de Casa Siego', 'url': url,
         'blogPost': [{'@type': 'BlogPosting', 'headline': a[2], 'url': f'{url}{a[0]}/'} for a in ARTICLES]}]}
    menu = ''.join(f'        <li><a href="#{t}">{n}</a></li>\n' for t, n in TOPICS)
    groups, n = [], 0
    for t, name in TOPICS:
        items = []
        for a in ARTICLES:
            if a[1] != t:
                continue
            n += 1
            sub = ''.join(f'<li><a href="{a[0]}/#{slugify(s)}">{s}</a></li>' for s, _ in a[4])
            items.append(f'''        <li class="ayuda-entry">
          <span class="ayuda-entry__no">{n:02d}</span>
          <div>
            <h3 class="ayuda-entry__q"><a href="{a[0]}/">{a[2]}</a></h3>
            <p>{a[3]}</p>
            <ul class="ayuda-entry__toc">{sub}</ul>
          </div>
        </li>''')
        groups.append(f'      <h2 class="section-title" id="{t}">{name}</h2>\n      <ol class="ayuda-list">\n' + '\n'.join(items) + '\n      </ol>')
    return head('Centro de Ayuda — Casa Siego®', 'Preguntas frecuentes de Casa Siego: el Club, tus beneficios, retratos Fiel, uniformes ejecutivos y trajes a la medida de Justo, cancelaciones y políticas.', url, '../', 'website', ld) + f'''
  <header class="terms-head">
    <p class="wordmark wordmark--colophon"><span class="wordmark__casa">CASA</span> <span class="wordmark__siego">Siego</span><sup class="wordmark__r">&reg;</sup></p>
    <p class="eyebrow eyebrow--gold">Blog</p>
    <h1 class="display">Centro de Ayuda</h1>
    <p class="meta meta--gold">Artículos que te guían para usar la plataforma y los servicios de la casa</p>
  </header>

  <main class="folio terms">
    <nav class="folio__margin ayuda-toc" aria-label="Temas del Centro de Ayuda">
      <p class="meta">Temas</p>
      <ol>
{menu}      </ol>
      <p class="meta"><a href="../membresia/">Términos de la membresía</a></p>
    </nav>

    <div class="folio__text">
      <p class="ayuda-lede">Respuestas a las preguntas más comunes sobre el Club Casa Siego. Cada artículo tiene su propio índice; aquí se actualizan las políticas del Club.</p>

''' + '\n\n'.join(groups) + '''

      <hr class="rule">
      <p class="meta">¿Tienes otra pregunta? Escríbenos a <a href="mailto:info@casasiego.com?subject=Centro%20de%20Ayuda">info@casasiego.com</a> o pregunta en atención a clientes durante tu próximo servicio.</p>
    </div>
  </main>

</body>
</html>
'''


os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(index())
for i, a in enumerate(ARTICLES):
    os.makedirs(os.path.join(OUT, a[0]), exist_ok=True)
    with open(os.path.join(OUT, a[0], 'index.html'), 'w', encoding='utf-8') as f:
        f.write(article(i, a))
print(f'Wrote ayuda/index.html and {len(ARTICLES)} articles')
