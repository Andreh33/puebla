# Compartir productos

Cada ficha pública ofrece Compartir (selector del dispositivo o copiar como alternativa), WhatsApp (prepara nombre y enlace, sin destinatario) y Copiar enlace. Si el portapapeles está bloqueado, se muestra el enlace seleccionable; cancelar el selector no dispara otra acción.

El enlace usa NEXT_PUBLIC_SITE_URL y la ruta canónica del producto, sin parámetros de sesión, carrito ni filtros. Mientras la migración de dominio siga pendiente, producción usa https://zonasport.vercel.app.

Los metadatos Open Graph y Twitter apuntan a /producto/[slug]/share-image, una imagen PNG 1200×630 con la fotografía, nombre y precio. Las fotos importadas WebP/AVIF se convierten antes de renderizar. Se conserva la proporción, hay límites de descarga y solo se aceptan los hosts de imágenes del catálogo. Si falta imagen principal, se usa la primera de la galería; si la fotografía no está disponible, se conserva la tarjeta con el texto. Los productos no activos no exponen una tarjeta y devuelven 404. Caché de la tarjeta: 300 segundos.

La web proporciona los datos y la imagen de la vista previa. La visualización y la actualización de un enlace compartido anteriormente dependen también de la caché y los ajustes de WhatsApp; no se envían mensajes automáticamente.

Validación: pruebas de interacción (copiar, cancelar, alternativas y URL WhatsApp), conversión real WebP→PNG→ImageResponse, ruta activa/oculta y fotografía de galería. Se conserva el flujo de compra, stock y pagos.
