# ZonaSport: SEO internacional y descubrimiento

## Petición y resultado esperado
Andrés solicita preparar y publicar SEO técnico y comercial completo sin rediseñar la web ni empeorar su rapidez; enviar todas las URLs canónicas elegibles de productos y artículos a los canales oficiales de descubrimiento de Google y Bing y sus socios, y facilitar el rastreo por ChatGPT. Los recibos de envío se distinguirán de la indexación real.

## Alcance acordado y decisiones de implementación
- Dominio principal https://zonasportpuebla.com. El webhook existente de Stripe ya usa /api/stripe/webhook en ese dominio. Conservar los eventos y la firma. .vercel.app redirige 308 preservando rutas y parámetros. Corregir el antiguo .es cuando esté disponible el acceso a su DNS/hosting externo.
- Español sin prefijo; versiones /pt (pt-PT), /it (it-IT), /fr (fr-FR) y /de (de-DE). Alemania es el cuarto mercado elegido por el implementador con la libertad dada por Andrés. No cambiar slugs estables de productos en esta primera entrega.
- Traducir contenido visible y metadatos de los 1521 productos actualmente publicados y 54 artículos existentes, además de navegación, filtros, tarjetas, formularios, carrito, información comercial y textos de compra. Marcas, modelos, SKU y cifras se conservan.
- Alcance editorial ampliado expresamente: diez artículos nuevos por país/idioma, cinco guías de ciudades relevantes para compra deportiva y cinco guías generales de compra/SEO, cincuenta artículos nuevos en total. Cada cuerpo tendrá al menos 3400 palabras útiles. En España se incluyen las tres guías iniciales (guantes de portero, gafas de natación y balón de fútbol), dos temas adicionales y las ciudades Zamora/Madrid/Barcelona/Alicante/Sevilla. Las ciudades extranjeras se eligen con fuentes locales y necesidades diferenciadas.
- Matriz vigente:54 artículos existentes en español y sus216traducciones, más50artículos originales distribuidos10poridioma:320varianteseditoriales, sujetas al inventario real y validación. Los artículos originales de ciudades/mercados no se etiquetan como equivalentes si no lo son.
- Existe una sola tienda física en Puebla de la Calzada. Toda captación de otras ciudades se presenta como compra online; nunca se inventan sucursales, stock local, reseñas, acuerdos ni resultados de ventas.
- Andrés confirma envíos a España, Portugal, Francia, Italia y Alemania. Envíos fuera de España: 9,80 EUR. Conservar la política española existente mientras se aclaran sus incoherencias. No inventar plazos internacionales.

## Arquitectura propuesta
Un único árbol de páginas públicas localizado por parámetro de idioma, manteniendo los identificadores comerciales y la lógica de stock y pagos. Español mantiene todas sus URLs actuales mediante una reescritura interna; /es visible se redirige a la URL española sin prefijo. Admin, API, recursos, rutas de imágenes, robots y sitemaps quedan excluidos de la reescritura. El html lang se deriva de parámetros estáticos, sin volver dinámica toda la web mediante headers/cookies globales.

Las traducciones se generan fuera de las peticiones públicas y se guardan como contenido versionado separado de precios, stock y variantes. Las claves son ID/slug estable, idioma y hash de los campos textuales de origen. Solo traducciones completas y vigentes se publican y aparecen en hreflang/sitemaps; no se etiqueta texto español como francés ni se publican miles de URLs vacías. Se parte de instantáneas de contenido sin migración de tablas y se documenta cómo regenerarlas para nuevos productos/artículos. La generación inicial se reparte entre agentes; cualquier proveedor de pago adicional requeriría condiciones concretas antes de contratarse.

Metadatos: canonical propia, hreflang recíproco para las variantes realmente publicadas y x-default español, OpenGraph/Twitter por idioma y schema con referencias estables a una sola Organization/tienda. Las guías de ciudades son Article/CollectionPage, no tiendas locales ficticias. Los sitemaps incluyen solo páginas existentes/publicadas, rechazan fechas futuras, y describen las variantes por idioma. Search y filtros no destinados a indexación permanecen excluidos.

Checkout: elegir país antes de iniciar la sesión Stripe, validar el país en servidor y restringir la dirección de entrega de la sesión al país seleccionado. La tarifa internacional se crea en servidor en EUR por 980 céntimos y debe mostrarse antes de pagar; no confiar en importes enviados por el cliente. Mantener los métodos de pago actuales y localizar el checkout y las rutas de retorno. No ejecutar cobros reales para las pruebas.

## Reparaciones verificadas
- Retirar cuatro municipios inexistentes de sitemap y usar el listado real de seis páginas.
- Corregir las imágenes Open Graph rotas de los 54 artículos con una ruta PNG estable y comprobar sus dimensiones.
- Emitir el Organization ya definido para resolver las referencias de WebSite/BlogPosting.
- Evitar artículos con fecha de publicación futura en sitemaps.

## Estética y rendimiento
Mantener estilos, fuentes, fotos de productos, estructura visual y assets actuales salvo las excepciones expresas: eliminar GLB de zapatilla y su precarga; eliminar por completo popup de cookies; mantener aviso de instalación PWA; reducir peso del vídeo hero y aplicar negro al30%. Conservar la analítica opcional desactivada por defecto sin consentimiento previo. Aplazar JavaScript no crítico sin romper compra ni navegación. Medir tres pruebas móviles homogéneas antes/después, con objetivo90+sin prometer puntuación fija. Funciones y base de datos de producción verificadas ambas en fra1; no requieren traslado. Solo añadir un selector de idioma discreto con las clases existentes cuando sea necesario para navegar entre versiones. Ninguna llamada de traducción ni bundle con el catálogo completo en el navegador. Mantener ISR300s de producto/home y600s de blog; limitar prerender de productos y generar el resto bajo demanda. Medir antes/después en las mismas rutas/dispositivo y revisar navegación, carrito y checkout.

## Verificación y buscadores
Pruebas unitarias de rutas/idiomas/hreflang/disponibilidad de traducciones, costes de envío por país y firmas de webhook; typecheck y build real. Auditoría HTTP completa de sitemaps, relaciones hreflang, canonical, schema, imágenes y redirecciones; navegador móvil/escritorio y comparación visual/rendimiento. Conservar el checkout F con sus cambios locales; el trabajo se realiza en la copia limpia H en rama codex/zonasport-seo-internacional.

Google: verificar propiedad mediante DNS y enviar sitemaps; inspeccionar muestras y registrar resultados/cuotas. Bing: verificar propiedad, publicar clave IndexNow válida, enviar todos los productos/artículos elegibles en lotes y registrar recibos; Yahoo y otros socios se cubren por los canales documentados de Bing. ChatGPT: robots permite OAI-SearchBot/ChatGPT-User y se verifica acceso, idiomas y sitemaps. No prometer inclusión en todos los buscadores, posiciones ni ventas.

## Información aún no disponible
Los plazos internacionales y la disponibilidad de atención al cliente en cada idioma no se inventarán. El acceso para corregir el DNS/nginx del antiguo .es debe comprobarse. La traducción de todo el inventario se validará con recuentos y muestras antes de declararla completa.

## Ampliación: reseñas reales de Google
Andrés solicita reseñas oficiales con comentarios y fotos de autor disponibles, traducción por idioma y botón para dejar reseña; portada más visible e interiores compactos con carga diferida. Verificar ficha correcta y fuente legítima actual; conservar atribución y etiquetar traducciones. No inventar testimonios, puntuaciones ni fotos. No incorporar aggregateRating de reseñas propias a la tienda como si tuviera derecho a estrellas de review snippet. Evitar llamadas costosas de terceros en cada petición pública.
# Additional approved catalog scope, 2026-10-26

The user requested descriptions shorter than70words be expanded with useful product-specific content. Authoritative production audit:1502of1521 descriptions are below70visible prose words; none are empty. The queue is saved outside the repository in `H:/Proyectos/seo-20261012/evidence/zonasport-international-20261026/product-descriptions-under-70.json`. Preserve the19already sufficient descriptions. Use verified catalog facts and manufacturer information where necessary; word count alone is not a ranking guarantee. Do not invent composition, waterproofing, suitability, medical benefits, accessories or shipping dates. Apply reviewed product source overlays before source hashes, then translate the reviewed source consistently. No bulk production database writes are necessary.

