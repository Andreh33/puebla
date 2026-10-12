# Publicación editorial del 12 de octubre de 2026

Cinco guías originales en `data/editorial/2026-10-12.mjs`, con fuentes de fabricantes,
enlaces a filtros reales del catálogo y consultas por WhatsApp. No se prometen precios,
stock, resultados médicos ni experiencias de producto no verificadas.

`scripts/publish-seo-20261012.mjs` crea únicamente esos cinco slugs en BlogPost dentro
de una transacción. Solo permite VERCEL_ENV=production, conserva artículos existentes,
verifica su hash antes/después y rechaza colisiones de contenido. Una segunda lectura
verifica que otra ejecución no crearía artículos nuevos. Nunca actualiza artículos.

La publicación se ejecuta una vez en el build remoto de producción, después de generar
Prisma y antes de Next.js, mediante una configuración de despliegue temporal. El
buildCommand habitual del repositorio y los settings del proyecto no cambian. No se
utiliza el seed general ni se modifican pedidos, clientes, ERP o configuración SEO.

Las rutas existentes del blog generan canonical, meta description, Open Graph,
BlogPosting, breadcrumbs, listado y sitemaps a partir de estos registros. Portadas SVG
editoriales locales, sin fotografías de productos o experiencias inventadas.
