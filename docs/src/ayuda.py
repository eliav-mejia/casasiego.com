"""Builds the Centro de Ayuda (Casa Siego's help blog) at ayuda/: an index grouped by topic and one article per question.
Each article opens with its own index of sections. Edit ARTICLES below and run from the project root:
    python3 docs/src/ayuda.py
Fields left in [brackets] render as .fill and must be decided before launch (see _interno/club-casa-siego-guia-de-oferta.pdf)."""
import html, json, os, re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'ayuda')
SITE = 'https://casasiego.com'
DATE = '25 de octubre de 2026'

# Topics of the blog menu, in order
TOPICS = [
    ('unirte', 'Unirte al Club'),
    ('beneficios', 'Tus beneficios'),
    ('citas', 'Citas y eventos'),
    ('politicas', 'Cancelaciones y políticas'),
]

# slug, topic, question, summary, [(section title, [paragraphs or ('ul', [items])])]
ARTICLES = [
    ('que-incluye-la-membresia', 'unirte', '¿Qué incluye la membresía?',
     'Eventos especiales, sesiones mensuales de retrato, un traje a la medida, reserva prioritaria y, desde la etapa 2, un café diario.', [
        ('Los beneficios', [
            'El Club Casa Siego es una cuota anual con los servicios de la casa, fotografía y sastrería a tu disposición. Durante doce meses a partir de la fecha en que adquieres la membresía, incluye:',
            ('ul', [
                '<strong>Acceso a eventos especiales</strong> de la casa, sujeto al cupo de cada evento.',
                '<strong>Fotografía de retrato</strong>: sesiones mensuales en el estudio Fiel.',
                '<strong>Traje a la medida</strong> de Justo, que puedes reclamar durante un año.',
                '<strong>Reserva prioritaria</strong> del estudio y de las citas de sastrería.',
                '<strong>Cafetería</strong>: un café diario, no acumulable, a partir de la etapa 2.',
            ]),
        ]),
        ('Un servicio personalizado', [
            'Las telas, locaciones, eventos y horarios cambian con la temporada. El alcance exacto de cada beneficio se acuerda contigo en una reunión por Zoom y queda por escrito en tu cotización.',
        ]),
        ('Lo que no incluye', [
            'Los beneficios son personales e intransferibles, no se canjean por dinero y vencen al terminar tu año de membresía. Las telas fuera de la selección del Club y las piezas adicionales se cotizan aparte.',
        ]),
    ]),
    ('como-unirte-al-club', 'unirte', '¿Cómo me uno al Club?',
     'Envía tu solicitud, revisamos los requisitos, conversamos por Zoom y recibes tu cotización.', [
        ('Paso a paso', [
            ('ul', [
                '<strong>Solicitud.</strong> Escríbenos a <a href="mailto:info@casasiego.com?subject=Membres%C3%ADa%20Club%20Casa%20Siego">info@casasiego.com</a> con tu nombre y un teléfono de contacto.',
                '<strong>Revisión.</strong> Confirmamos que cumples los requisitos de admisión.',
                '<strong>Reunión por Zoom.</strong> Te presentamos la casa, los beneficios y la selección de la temporada.',
                '<strong>Cotización.</strong> Te enviamos por correo la cotización explícita con la cuota y las formas de pago.',
                '<strong>Bienvenida.</strong> Al recibir tu pago te enviamos por correo el detalle de tu membresía.',
            ]),
        ]),
        ('Requisitos de admisión', [
            'Aplicamos los mismos requisitos a todas las solicitudes:',
            ('ul', [
                'Tener 18 años o más.',
                'Entregar la solicitud con datos verídicos e identificación oficial vigente.',
                'Cubrir la cuota anual en los términos de tu cotización.',
                'No tener adeudos con Casa Siego ni una baja previa del Club por incumplimiento.',
                'Que haya lugar disponible en el Club.',
            ]),
            'Si una solicitud no se admite, te decimos por escrito qué requisito no se cumplió y te reembolsamos cualquier cantidad pagada.',
        ]),
        ('Cupo y lista de espera', [
            'El Club admite un número limitado de miembros para cuidar la calidad del servicio. Cuando el cupo está completo, tu solicitud entra a una lista de espera y se atiende en el orden en que llegó.',
        ]),
    ]),
    ('cuanto-cuesta-la-membresia', 'unirte', '¿Cuánto cuesta la membresía?',
     'La cuota se presenta en una reunión por Zoom con una cotización explícita, antes de que pagues.', [
        ('Por qué no publicamos un precio', [
            'Cada membresía se ajusta a quien la adquiere: telas, sesiones y temporada. Por eso la cuota anual y las formas de pago se presentan en una reunión por Zoom con una cotización explícita.',
        ]),
        ('Antes de pagar', [
            'Siempre conoces el monto total antes de pagar. La cotización llega por correo y forma parte del acuerdo entre tú y Casa Siego.',
        ]),
        ('Después de pagar', [
            'Recibes por correo la confirmación con el detalle de tu oferta, tu comprobante y las fechas de vigencia de tu membresía.',
        ]),
    ]),
    ('sesiones-de-retrato', 'beneficios', '¿Cómo agendo mis sesiones de retrato?',
     'Tu membresía incluye sesiones mensuales en el estudio Fiel; agéndalas con reserva prioritaria.', [
        ('Una sesión cada mes', [
            'Durante tu año de membresía tienes sesiones mensuales de retrato en el estudio Fiel: retrato de negocios, perfil corporativo o retrato personal, con luz de estudio, dirección y edición.',
        ]),
        ('Cómo agendar', [
            'Escríbenos a <a href="mailto:info@casasiego.com?subject=Club%20%C2%B7%20Sesi%C3%B3n%20de%20retrato">info@casasiego.com</a> o pídela en atención a clientes durante tu siguiente visita. Como miembro, tienes reserva prioritaria del estudio.',
        ]),
        ('Prepara tu sesión', [
            'Puedes combinarla con la sastrería: ajusta tu saco antes de la sesión o estrena tu traje frente a la cámara. Para ideas de preparación, lee <a href="../../brands/fiel/blog/organiza-tu-sesion/">Cómo organizar bien tu sesión</a>.',
        ]),
    ]),
    ('reclamar-tu-traje', 'beneficios', '¿Cómo reclamo mi traje a la medida?',
     'Tienes un año desde que adquieres la membresía para reclamar tu traje de Justo.', [
        ('El plazo', [
            'Cuentas con un año a partir de la fecha en que adquieres la membresía para reclamar tu traje a la medida. La fecha límite aparece en tu correo de bienvenida.',
        ]),
        ('El proceso', [
            ('ul', [
                '<strong>Cita de medidas.</strong> Agenda tu prueba en la sastrería Justo.',
                '<strong>Tela y detalles.</strong> Eliges entre la selección vigente del Club.',
                '<strong>Pruebas.</strong> Ajustamos el traje en una o más pruebas.',
                '<strong>Entrega.</strong> Lo estrenas, si quieres, con un retrato en el estudio.',
            ]),
            'Reclámalo con tiempo: la confección requiere varias semanas y pruebas antes de que termine tu plazo.',
        ]),
        ('Telas y opciones', [
            'La selección de telas cambia por temporada. Las telas fuera de la selección del Club, las piezas adicionales y los acabados especiales se cotizan aparte.',
        ]),
    ]),
    ('reserva-prioritaria', 'beneficios', '¿Cómo funciona la reserva prioritaria?',
     'Como miembro, apartas el estudio y tus citas de sastrería antes que el público general.', [
        ('Qué es', [
            'Los miembros reservan el estudio y las citas de sastrería con anticipación sobre el público general. Así aseguras tu horario en fechas de alta demanda.',
        ]),
        ('Cómo usarla', [
            'Escríbenos a <a href="mailto:info@casasiego.com?subject=Club%20%C2%B7%20Reserva%20prioritaria">info@casasiego.com</a> o pide tu cita en atención a clientes indicando que eres miembro del Club.',
        ]),
    ]),
    ('cafeteria-del-club', 'beneficios', '¿La membresía incluye café?',
     'En la etapa 1 no hay cafetería. Desde la etapa 2, un café diario no acumulable.', [
        ('Etapa 1', [
            'En la etapa actual de la casa no existe servicio de cafetería.',
        ]),
        ('Etapa 2', [
            'Cuando abra la etapa 2, tu membresía incluye un café al día. El café no es acumulable: si un día no lo tomas, no se suma al siguiente.',
        ]),
        ('Cómo te avisamos', [
            'Te avisaremos por correo cuando abra la cafetería, y publicaremos aquí los detalles.',
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
        ('Con anticipación', [
            'Puedes cancelar o mover tu sesión de retrato o tu cita de sastrería avisando con al menos <span class="fill">[horas]</span> horas de anticipación a <a href="mailto:info@casasiego.com?subject=Club%20%C2%B7%20Cambio%20de%20cita">info@casasiego.com</a>.',
        ]),
        ('Si no llegas', [
            'Una cita que no se cancela a tiempo puede contarse como utilizada.',
        ]),
        ('Puntualidad', [
            'Llega unos minutos antes. Las sesiones y pruebas tienen un horario reservado para ti y para los siguientes miembros.',
        ]),
    ]),
    ('cancelar-la-membresia', 'politicas', '¿Puedo cancelar mi membresía?',
     'Cinco días hábiles para arrepentirte si contrataste a distancia; después, reembolso proporcional.', [
        ('Los primeros cinco días hábiles', [
            'Si contrataste a distancia (en línea, por videollamada, por teléfono o por correo), puedes cancelar sin responsabilidad dentro de los cinco días hábiles siguientes y recibes el reembolso total si no has usado ningún beneficio.',
        ]),
        ('Después de ese plazo', [
            'Puedes cancelar en cualquier momento escribiendo a <a href="mailto:info@casasiego.com?subject=Club%20%C2%B7%20Cancelaci%C3%B3n">info@casasiego.com</a>. Te reembolsamos la parte proporcional de los meses completos restantes, menos el valor de los beneficios que ya usaste según tu cotización.',
        ]),
        ('Si tu traje ya se cortó', [
            'Te lo entregamos y su valor se descuenta del reembolso.',
        ]),
    ]),
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
            'Las políticas del Club se actualizan en este Centro de Ayuda. La versión y la fecha de los <a href="../../membresia.html">términos y condiciones</a> cambian con cada actualización.',
        ]),
        ('Cómo te avisamos', [
            'Cada vez que una política se actualiza, enviamos en automático un aviso por correo a todos los miembros. También te las explicamos en atención a clientes durante tus servicios y en cada cotización.',
        ]),
        ('Si no estás de acuerdo', [
            'Si un cambio te afecta durante tu periodo vigente y no estás de acuerdo, puedes cancelar con reembolso proporcional. Lee <a href="../cancelar-la-membresia/">¿Puedo cancelar mi membresía?</a>',
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
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{html.escape(desc)}">
  <link rel="canonical" href="{url}">
  <meta property="og:site_name" content="Casa Siego">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{html.escape(desc)}">
  <meta property="og:url" content="{url}">
  <meta property="og:type" content="{kind}">
  <meta property="og:locale" content="es_MX">
  <meta property="og:image" content="{SITE}/images/og/share.jpg?v=1.0.6">
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
  <link rel="stylesheet" href="{up}css/site.css?v=1.1.0">
  <link rel="stylesheet" href="{up}css/layout.css?v=1.1.3">
  <script src="{up}js/region.js?v=1.1.1" defer></script>
  <script src="{up}js/casa.js?v=1.1.2" defer></script>
</head>
<body>
'''


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
    slug, topic, q, summary, sections = a
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
    return head(f'{q} — Centro de Ayuda · Casa Siego®', plain(summary), url, '../../', 'article', ld) + f'''
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
      <p class="meta">¿No encontraste tu respuesta? Escríbenos a <a href="mailto:info@casasiego.com?subject=Centro%20de%20Ayuda">info@casasiego.com</a>. Consulta también los <a href="../../membresia.html">términos y condiciones de la membresía</a>.</p>
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
    return head('Centro de Ayuda — Casa Siego®', 'Preguntas frecuentes sobre el Club Casa Siego: cómo unirte, tus beneficios, citas, eventos, cancelaciones y políticas.', url, '../', 'website', ld) + f'''
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
      <p class="meta"><a href="../membresia.html">Términos de la membresía</a></p>
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
