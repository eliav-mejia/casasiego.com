"""Google Tag Manager snippets shared by the page generators (ayuda.py, agenda-fiel.py), so regenerated pages keep
the same container code as the hand-written ones. The events themselves are pushed by js/medicion.js.
Container GTM-WHTQ77F9 · Google's standard code: the first block right after <meta charset>, the second right after <body>."""

GTM_ID = 'GTM-WHTQ77F9'


def gtm_head(up):
    """GTM loader plus js/medicion.js; up is the relative path to the site root ('../../')."""
    return ('''  <!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','%s');</script>
  <!-- End Google Tag Manager -->
  <script src="%sjs/medicion.js?v=1.0.0" defer></script>
''' % (GTM_ID, up))


GTM_BODY = '''  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=%s" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager (noscript) -->
''' % GTM_ID
