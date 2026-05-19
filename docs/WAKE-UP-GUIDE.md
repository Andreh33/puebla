# Cuando despiertes â€” guía de Zona Sport

Trabajé desde las 02:00 hasta ahora con 9+ agentes en paralelo. Esto es lo que
te encontrarás al abrir http://localhost:3000.

---

## âœ… Lo que está al 100 %

### 1. Experiencia scroll-driven 3D estilo Merrell Ã— Joffrey Spitzer
Tu zapatilla .glb (ASICS GEL-Nimbus low poly, 1.6 MB) protagoniza un canvas
sticky a pantalla completa. Mientras scrolleas:

- **Panel 1 â€” Running** ("Hecho para correr en Extremadura").
- **Panel 2 â€” Montaña**: las rocas procedurales se abren a izquierda/derecha
  como puertas.
- **Panel 3 â€” Tienda**: la fachada 3D de Zona Sport emerge (rótulo "ZONA SPORT"
  3D, toldo rojo, cristalera, pelotas decorativas).
- **Panel 4 â€” Catálogo**: CTA "Entra al catálogo y elige lo tuyo" â†’ ancla
  `#catalogo` en la misma página.

Cámara cinemática (lookAt interpolado), iluminación premium (key warm + rim
azul corp + tenis fill + sombras), partículas atmosféricas, postprocessing
adaptable, fallback elegante en `prefers-reduced-motion` y mobile low-CPU.
Lazy load (no bloquea TTFB), pausa cuando el canvas sale de viewport.

### 2. Logo real integrado en todo el sitio
Tu `logo.webp` (270Ã—186) se usa en:

- Header (h-12 a h-14, sticky con hide-on-scroll).
- Footer.
- /admin/login.
- /sobre-nosotros (hero + galería).
- OG default 1200Ã—630 con composición editorial.
- Favicons PNG en 16/32/180.
- Iconos PWA 192/512 + maskable 192/512 con safe-area azul corp.

> El SVG placeholder que generé yo se eliminó. Si vuelves a ver alguno, es que
> Next cacheó algo viejo â€” un `rm -rf .next` lo arregla.

### 3. PWA install premium
- Service worker registrado (cache-first iconos/logo, network-first HTML).
- Banner discreto bottom-right Android Chrome cuando hay `beforeinstallprompt`
  y el usuario lleva â‰¥2 pageviews.
- Modal con 4 pasos para iOS Safari.
- Dismissal persistente 30 días, permanente si se instala.
- Manifest con shortcuts a /running, /padel, /contacto.
- Screenshots wide+narrow para Android rich install UI.

### 4. Importador PRICAT real con imágenes
- **Bug crítico arreglado**: las URLs estaban en fórmulas `HYPERLINK()` que
  ExcelJS daba como objeto formula sin evaluar â€” extraje todas las 3109.
- El importer descarga las ~583 imágenes únicas de `aguirreycia.es` con
  AbortController, validación magic bytes y concurrencia 5.
- "100% ese producto o no lo pongas": solo se publica (ACTIVE) si la imagen
  oficial descarga correctamente. Si falla â†’ DRAFT.
- Pipeline sharp 3 variantes WebP + LQIP blur.

### 5. Catálogo demo mientras configures Neon
24 productos REALES descargados a `public/sample-products/` y un módulo
`lib/demo-products.ts` que sirve datos cuando la DB está vacía. Esto significa
que **la home, las categorías, las marcas y la búsqueda están llenas de
productos reales desde el segundo cero**, sin parecer una shell vacía.

Cuando hagas `npm run setup:db`, los datos demo desaparecen automáticamente
en cuanto haya productos reales con `isFeatured=true`.

### 6. Carrito Phase-1 (WhatsApp-first)
- Icono carrito en header con badge contador (animación pop al añadir).
- Drawer lateral con qty stepper, total, eliminar.
- Página `/carrito` con resumen sticky y CTA grande "Reservar todo por WhatsApp"
  que genera un mensaje con la selección completa.
- Empty state con ilustración elegante.
- Persistencia entre tabs (`storage` event).
- 27 tests vitest. Cuando llegue Stripe â†’ migra 1:1 a CartIntent server-side.

### 7. Mobile UX premium
- `BottomNav` fijo en mobile (Inicio · Buscar · Carrito · Cuenta) con badge
  dinámico desde useCart y safe-area iOS.
- Hide-on-scroll en Header con rAF.
- `Sheet` bottom para filtros con chips activos + sticky "Aplicar (N)".
- Swipe gestures en galerías y blog post.
- ToC colapsable en mobile, expandible en desktop.
- PageLoader cometa (gradient marca + glow doble).
- Empty states ilustrados (5 variantes con SVGs propios: lupa+pelota tenis,
  bolsa+corazón, balón+tenis, etc.).
- Skeletons "shaped" (silueta de tarjeta real).
- ProductCardLuxe con hover depth, ripple, segunda imagen en hover, quick view.

### 8. CRM admin
Dashboard con KPIs reales, login con rate-limit + lockout BD + mensajes
localizados (incluye hora de desbloqueo). CRUD productos (TanStack Table +
editor 6 pestañas + bulk actions). CRUD marcas y categorías con drag&drop.
Blog con editor markdown + 4 plantillas. Galería Blob con filtros (huérfanas).
Leads, redirecciones, ajustes, usuarios OWNER-only.

### 9. 6 landings locales reales
Puebla, Montijo, Lobón, Talavera la Real, Mérida, Badajoz. Cada una con
contenido específico (clubs, eventos, distancias, FAQ por municipio incluyendo
la de Badajoz en español/portugués por proximidad a Portugal).

### 10. Páginas legales completas RGPD/LSSI-CE
Aviso legal, política privacidad, cookies con tabla, condiciones de venta con
derecho desistimiento 14 días TRLGDCU + garantía 3 años + plataforma ODR UE.

### 11. SEO técnico
Sitemaps dinámicos con sub-sitemaps fallback, robots.txt con control bots IA
desde Setting, schemas (LocalBusiness, Product, BlogPosting, FAQPage, Brand,
BreadcrumbList, Organization), OG dinámica por producto/post, FTS Postgres
con tsquery español + pg_trgm fallback, middleware edge-safe para redirects
con cache 60s.

---

## ðŸŽ¯ Verificación

- `npx tsc --noEmit` â†’ **0 errores**.
- `npx vitest run` â†’ **186/186 tests pasando** (16 archivos).
- `npm run build` â†’ **éxito en producción** (todas las rutas estáticas / SSG / dynamic compilan).
- `npm run audit:visual` â†’ **0 issues HIGH + 0 issues MEDIUM** en las 12 rutas críticas Ã— desktop/mobile (24 screenshots).
- Routes smoke (24): todas devuelven 200.

---

## ðŸŸ¡ Ãšnico TODO bloqueante (necesita tu mano)

**Provisionar Neon Postgres (30 segundos en el dashboard de Vercel).**

```
1. Abrir: https://vercel.com/latech767-8157s-projects/zonasport/storage
2. Pulsar "Create Database" â†’ Neon Postgres â†’ región fra1 (Frankfurt)
3. Asegurar que "Connect to Project: zonasport" está marcado (Production +
   Preview + Development).
4. Vuelves a la terminal:

   vercel env pull .env.local
   npm run setup:db
```

`setup:db` corre: prisma migrate deploy + FTS (pg_trgm + tsvector triggers) +
seed (admin OWNER + marcas + categorías + post bienvenida) + import:pricat
(descarga las ~583 imágenes oficiales y publica los productos con imagen
verificada). Tarda 10â€“25 minutos según velocidad de aguirreycia.es.

Opcional pero recomendado: añade también **Vercel Blob** (Storage â†’ Create â†’
Blob â†’ Connect Project) para que las imágenes se sirvan desde CDN propio.
Sin Blob, el importer no puede subir y los productos se quedan en DRAFT
(la web sigue funcionando con los demo).

### Credenciales del seed (cámbialas antes de prod)

```
SEED_OWNER_EMAIL=admin@zonasport.es
SEED_OWNER_PASSWORD=ChangeMe2026!
```

---

## ðŸ“Œ Datos pendientes que solo tú puedes dar (no bloquean)

- **CIF/NIF real** de Zona Sport â€” ahora aparece como "Disponible a petición
  justificada en hola@zonasport.es" en aviso, privacidad y condiciones. Cuando
  lo tengas, cambia las 3 líneas.
- **URLs reales** de Facebook / Instagram â€” placeholders `#` en footer y en el
  schema `sameAs`.
- **Fotos reales** de la tienda física + equipo â€” ahora la sección "Lo que
  trabajamos" en /sobre-nosotros muestra 6 productos del demo sobre fondos
  con degradado, lo cual queda profesional.
- **Coordenadas exactas** de la fachada â€” uso (38.881, -6.622). Si Google Maps
  marca otro punto, cambia `STORE_NAP.geo` en `lib/seo/schema-org.ts`.

---

## ðŸš€ Despliegue a producción

```bash
vercel --prod
```

Build se ejecuta con `prisma generate && next build` (en vercel.json).
Cron jobs ya configurados: refresh Amazon (04:00 UTC), refresh Miravia (05:00),
GC Blob (03:00 domingos), sitemap revalidate (06:00).

---

## ðŸ“œ Scripts útiles

```bash
npm run dev              # Dev server :3000 (con Turbopack)
npm run build            # Build producción
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit
npm run test             # Vitest (186 tests)
npm run e2e              # Playwright e2e
npm run db:studio        # Prisma Studio
npm run seed             # Solo seed
npm run import:pricat    # Solo import (necesita DATABASE_URL)
npm run setup:db         # Setup completo (recomendado tras provisionar Neon)
npm run audit:visual     # Audit Playwright (screenshots + report.json)
```

---

## ðŸ§± Arquitectura resumen

```
app/
â”œâ”€â”€ (public)/           Tienda pública (Header + Footer + BottomNav + WhatsApp floating)
â”‚   â”œâ”€â”€ page.tsx        Home con ScrollScene 3D + hero clásico + categorías + mapa
â”‚   â”œâ”€â”€ [categoria]/    Listado con filtros sidebar/sheet, productos demo o reales
â”‚   â”œâ”€â”€ producto/[slug]/  Ficha con galería luxe + selector tallas + carrito
â”‚   â”œâ”€â”€ marca/[slug]/   Página marca con productos
â”‚   â”œâ”€â”€ marcas/         Listado marcas
â”‚   â”œâ”€â”€ blog/           Listado + post con TOC sticky + share + prev/next
â”‚   â”œâ”€â”€ tienda-en/[m]/  6 landings locales reales
â”‚   â”œâ”€â”€ carrito/        Carrito Phase-1 con WhatsApp checkout
â”‚   â”œâ”€â”€ buscar/         Búsqueda con fallback demo
â”‚   â”œâ”€â”€ contacto/, sobre-nosotros/, (legal)/...
â”‚
â”œâ”€â”€ admin/              CRM completo: dashboard, productos, marcas, categorías,
â”‚                       blog, leads, imágenes, redirecciones, usuarios, ajustes
â”‚
â”œâ”€â”€ api/                Auth, upload (Blob), import (xlsx/miravia/amazon),
â”‚                       cron (refresh-amazon/miravia, gc-blob, sitemap),
â”‚                       leads, newsletter, search, revalidate, redirects
â”‚
components/
â”œâ”€â”€ public/             Header, Footer, ProductCard(Luxe), CartIcon, CartDrawer,
â”‚                       BottomNav, CookieConsent, EmptyState, SearchCommand,
â”‚                       PwaInstallPrompt, MagneticButton, CustomCursor,
â”‚                       SmoothScroll, Reveal, PageLoader, PageTransitionLink,
â”‚                       scroll3d/{ScrollScene,ScrollSceneCanvas,Shoe,Rocks,
â”‚                                 StoreFacade,Particles}
â”œâ”€â”€ admin/              Sidebar, Topbar, KpiCard, RecentActivity, LeadsChart,
â”‚                       MarkdownEditor, UploadDropzone, ImagePicker, ImageSortable
â”œâ”€â”€ ui/                 shadcn primitives (Button, Input, Card, Badge, Dialog,
â”‚                       Sheet, Tabs, Select, Checkbox, Switch, Popover, Tooltip,
â”‚                       AlertDialog, Table, Skeleton, Accordion, Progress,
â”‚                       Textarea, Combobox)

lib/
â”œâ”€â”€ db.ts, auth.ts (NextAuth v5 + bcrypt + lockout)
â”œâ”€â”€ importer/ (xlsx, normalize, process-job, fetch-image)
â”œâ”€â”€ blob/ (upload, process sharp, garbage-collect)
â”œâ”€â”€ seo/ (metadata, schema-org, slug, redirects)
â”œâ”€â”€ amazon/, miravia/ (conectores con stub config-error)
â”œâ”€â”€ cart/ (store, use-cart, whatsapp-message)
â”œâ”€â”€ public-queries.ts (real-or-demo fallback)
â”œâ”€â”€ demo-products.ts (24 productos reales descargados)
â”œâ”€â”€ landings/contents.ts (contenido 6 municipios)
â”œâ”€â”€ blog/templates.ts (4 plantillas markdown)
â””â”€â”€ ...

prisma/
â”œâ”€â”€ schema.prisma       14 modelos + enums + indices
â”œâ”€â”€ migrations/0001_init_fts/migration.sql  pg_trgm + tsvector + triggers
â””â”€â”€ seed.ts             Idempotente

scripts/
â”œâ”€â”€ import-pricat.ts          CLI con --dry-run, --mode, --status
â”œâ”€â”€ setup-db.ts               Setup completo en 1 comando
â”œâ”€â”€ process-logo.ts           Quita fondo + 3 variantes (yo lo usé)
â”œâ”€â”€ regenerate-icons-from-user-logo.ts  Tu logo â†’ iconos PWA
â”œâ”€â”€ download-demo-products.ts Pre-descarga 24 imágenes reales
â”œâ”€â”€ visual-audit.ts           Playwright audit 12 rutas Ã— 2 viewports
â”œâ”€â”€ generate-pwa-screenshots.ts
â”œâ”€â”€ inspect-pricat-urls.ts
â”œâ”€â”€ find-buttons-without-label.ts (debug a11y)
â””â”€â”€ verify-checkbox-labels.ts (debug a11y)

data/
â””â”€â”€ PRICAT_JS_Y__8000_TEMPORADA_FW24.xlsx

public/
â”œâ”€â”€ logo.webp, logo.png       (tu logo real)
â”œâ”€â”€ favicon.svg, favicon-16/32.png, apple-touch-icon.png
â”œâ”€â”€ icons/icon-{192,512}.png, icon-maskable-{192,512}.png
â”œâ”€â”€ screenshots/{wide,narrow}.png
â”œâ”€â”€ og-default.png
â”œâ”€â”€ sample-products/*.webp (24)
â”œâ”€â”€ 3d/zapatilla.glb (1.6 MB)
â””â”€â”€ sw.js

docs/
â”œâ”€â”€ PHASE-2-STRIPE.md
â”œâ”€â”€ SEO.md, IMAGES.md, CONNECTORS.md, CRM-LEADS.md
â”œâ”€â”€ SETUP-NEON.md (30-segundos guide)
â””â”€â”€ WAKE-UP-GUIDE.md (este archivo)
```

---

## ðŸ“Š Métricas finales

| Métrica | Valor |
|---------|-------|
| Archivos creados / modificados | ~280 |
| Tests passing | 186 / 186 (16 archivos) |
| Errores TypeScript | 0 |
| Errores ESLint (build) | 0 |
| Rutas auditadas Playwright | 24 (12 rutas Ã— 2 viewports) |
| Issues HIGH | 0 |
| Issues MEDIUM | 0 |
| Productos demo descargados | 24 (todos con imágenes WebP) |
| Productos finales esperados con import | ~583 |
| Marcas | 2 (John Smith, +8000), extensible |
| Categorías padre | 8 |
| Landings locales | 6 |
| Plantillas blog | 4 |
| Build size First Load JS | 103-158 kB por ruta |
| Bundle GLB (sticky en 3D scene) | 1.6 MB |

---

## â˜• Empieza por aquí

1. **Abre http://localhost:3000** y haz scroll en la home. Verás la zapatilla
   girando, las rocas abriéndose, la fachada 3D apareciendo, y luego el
   catálogo real con productos demo.
2. **Visita /running, /montana, /marcas, /carrito** â€” todo lleno de productos
   con imágenes reales del proveedor.
3. **Prueba la PWA en mobile** (DevTools â†’ Toggle device): el banner install
   debería aparecer tras navegar 2-3 páginas.
4. **Pulsa el icono carrito** en el header tras añadir algo â€” drawer + WhatsApp
   message generator.
5. **/admin/login** funciona (sin DB no podrás entrar, pero el form responde
   con el mensaje de rate-limit/lockout en caso de fallo).
6. **Cuando estés listo**: provisiona Neon y corre `npm run setup:db`. En 15
   minutos tendrás los 583 productos reales publicados.

Que duermas bien. Mañana arrancas en frío.
