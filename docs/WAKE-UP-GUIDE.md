# Cuando despiertes â€” guÃ­a de Zona Sport

TrabajÃ© desde las 02:00 hasta ahora con 9+ agentes en paralelo. Esto es lo que
te encontrarÃ¡s al abrir http://localhost:3000.

---

## âœ… Lo que estÃ¡ al 100 %

### 1. Experiencia scroll-driven 3D estilo Merrell Ã— Joffrey Spitzer
Tu zapatilla .glb (ASICS GEL-Nimbus low poly, 1.6 MB) protagoniza un canvas
sticky a pantalla completa. Mientras scrolleas:

- **Panel 1 â€” Running** ("Hecho para correr en Extremadura").
- **Panel 2 â€” MontaÃ±a**: las rocas procedurales se abren a izquierda/derecha
  como puertas.
- **Panel 3 â€” Tienda**: la fachada 3D de Zona Sport emerge (rÃ³tulo "ZONA SPORT"
  3D, toldo rojo, cristalera, pelotas decorativas).
- **Panel 4 â€” CatÃ¡logo**: CTA "Entra al catÃ¡logo y elige lo tuyo" â†’ ancla
  `#catalogo` en la misma pÃ¡gina.

CÃ¡mara cinemÃ¡tica (lookAt interpolado), iluminaciÃ³n premium (key warm + rim
azul corp + tenis fill + sombras), partÃ­culas atmosfÃ©ricas, postprocessing
adaptable, fallback elegante en `prefers-reduced-motion` y mobile low-CPU.
Lazy load (no bloquea TTFB), pausa cuando el canvas sale de viewport.

### 2. Logo real integrado en todo el sitio
Tu `logo.webp` (270Ã—186) se usa en:

- Header (h-12 a h-14, sticky con hide-on-scroll).
- Footer.
- /admin/login.
- /sobre-nosotros (hero + galerÃ­a).
- OG default 1200Ã—630 con composiciÃ³n editorial.
- Favicons PNG en 16/32/180.
- Iconos PWA 192/512 + maskable 192/512 con safe-area azul corp.

> El SVG placeholder que generÃ© yo se eliminÃ³. Si vuelves a ver alguno, es que
> Next cacheÃ³ algo viejo â€” un `rm -rf .next` lo arregla.

### 3. PWA install premium
- Service worker registrado (cache-first iconos/logo, network-first HTML).
- Banner discreto bottom-right Android Chrome cuando hay `beforeinstallprompt`
  y el usuario lleva â‰¥2 pageviews.
- Modal con 4 pasos para iOS Safari.
- Dismissal persistente 30 dÃ­as, permanente si se instala.
- Manifest con shortcuts a /running, /padel, /contacto.
- Screenshots wide+narrow para Android rich install UI.

### 4. Importador PRICAT real con imÃ¡genes
- **Bug crÃ­tico arreglado**: las URLs estaban en fÃ³rmulas `HYPERLINK()` que
  ExcelJS daba como objeto formula sin evaluar â€” extraje todas las 3109.
- El importer descarga las ~583 imÃ¡genes Ãºnicas de `aguirreycia.es` con
  AbortController, validaciÃ³n magic bytes y concurrencia 5.
- "100% ese producto o no lo pongas": solo se publica (ACTIVE) si la imagen
  oficial descarga correctamente. Si falla â†’ DRAFT.
- Pipeline sharp 3 variantes WebP + LQIP blur.

### 5. CatÃ¡logo demo mientras configures Neon
24 productos REALES descargados a `public/sample-products/` y un mÃ³dulo
`lib/demo-products.ts` que sirve datos cuando la DB estÃ¡ vacÃ­a. Esto significa
que **la home, las categorÃ­as, las marcas y la bÃºsqueda estÃ¡n llenas de
productos reales desde el segundo cero**, sin parecer una shell vacÃ­a.

Cuando hagas `npm run setup:db`, los datos demo desaparecen automÃ¡ticamente
en cuanto haya productos reales con `isFeatured=true`.

### 6. Carrito Phase-1 (WhatsApp-first)
- Icono carrito en header con badge contador (animaciÃ³n pop al aÃ±adir).
- Drawer lateral con qty stepper, total, eliminar.
- PÃ¡gina `/carrito` con resumen sticky y CTA grande "Reservar todo por WhatsApp"
  que genera un mensaje con la selecciÃ³n completa.
- Empty state con ilustraciÃ³n elegante.
- Persistencia entre tabs (`storage` event).
- 27 tests vitest. Cuando llegue Stripe â†’ migra 1:1 a CartIntent server-side.

### 7. Mobile UX premium
- `BottomNav` fijo en mobile (Inicio Â· Buscar Â· Carrito Â· Cuenta) con badge
  dinÃ¡mico desde useCart y safe-area iOS.
- Hide-on-scroll en Header con rAF.
- `Sheet` bottom para filtros con chips activos + sticky "Aplicar (N)".
- Swipe gestures en galerÃ­as y blog post.
- ToC colapsable en mobile, expandible en desktop.
- PageLoader cometa (gradient marca + glow doble).
- Empty states ilustrados (5 variantes con SVGs propios: lupa+pelota tenis,
  bolsa+corazÃ³n, balÃ³n+tenis, etc.).
- Skeletons "shaped" (silueta de tarjeta real).
- ProductCardLuxe con hover depth, ripple, segunda imagen en hover, quick view.

### 8. CRM admin
Dashboard con KPIs reales, login con rate-limit + lockout BD + mensajes
localizados (incluye hora de desbloqueo). CRUD productos (TanStack Table +
editor 6 pestaÃ±as + bulk actions). CRUD marcas y categorÃ­as con drag&drop.
Blog con editor markdown + 4 plantillas. GalerÃ­a Blob con filtros (huÃ©rfanas).
Leads, redirecciones, ajustes, usuarios OWNER-only.

### 9. 6 landings locales reales
Puebla, Montijo, LobÃ³n, Talavera la Real, MÃ©rida, Badajoz. Cada una con
contenido especÃ­fico (clubs, eventos, distancias, FAQ por municipio incluyendo
la de Badajoz en espaÃ±ol/portuguÃ©s por proximidad a Portugal).

### 10. PÃ¡ginas legales completas RGPD/LSSI-CE
Aviso legal, polÃ­tica privacidad, cookies con tabla, condiciones de venta con
derecho desistimiento 14 dÃ­as TRLGDCU + garantÃ­a 3 aÃ±os + plataforma ODR UE.

### 11. SEO tÃ©cnico
Sitemaps dinÃ¡micos con sub-sitemaps fallback, robots.txt con control bots IA
desde Setting, schemas (LocalBusiness, Product, BlogPosting, FAQPage, Brand,
BreadcrumbList, Organization), OG dinÃ¡mica por producto/post, FTS Postgres
con tsquery espaÃ±ol + pg_trgm fallback, middleware edge-safe para redirects
con cache 60s.

---

## ðŸŽ¯ VerificaciÃ³n

- `npx tsc --noEmit` â†’ **0 errores**.
- `npx vitest run` â†’ **186/186 tests pasando** (16 archivos).
- `npm run build` â†’ **Ã©xito en producciÃ³n** (todas las rutas estÃ¡ticas / SSG / dynamic compilan).
- `npm run audit:visual` â†’ **0 issues HIGH + 0 issues MEDIUM** en las 12 rutas crÃ­ticas Ã— desktop/mobile (24 screenshots).
- Routes smoke (24): todas devuelven 200.

---

## ðŸŸ¡ Ãšnico TODO bloqueante (necesita tu mano)

**Provisionar Neon Postgres (30 segundos en el dashboard de Vercel).**

```
1. Abrir: https://vercel.com/latech767-8157s-projects/zonasport/storage
2. Pulsar "Create Database" â†’ Neon Postgres â†’ regiÃ³n fra1 (Frankfurt)
3. Asegurar que "Connect to Project: zonasport" estÃ¡ marcado (Production +
   Preview + Development).
4. Vuelves a la terminal:

   vercel env pull .env.local
   npm run setup:db
```

`setup:db` corre: prisma migrate deploy + FTS (pg_trgm + tsvector triggers) +
seed (admin OWNER + marcas + categorÃ­as + post bienvenida) + import:pricat
(descarga las ~583 imÃ¡genes oficiales y publica los productos con imagen
verificada). Tarda 10â€“25 minutos segÃºn velocidad de aguirreycia.es.

Opcional pero recomendado: aÃ±ade tambiÃ©n **Vercel Blob** (Storage â†’ Create â†’
Blob â†’ Connect Project) para que las imÃ¡genes se sirvan desde CDN propio.
Sin Blob, el importer no puede subir y los productos se quedan en DRAFT
(la web sigue funcionando con los demo).

### Credenciales del seed (cÃ¡mbialas antes de prod)

```
SEED_OWNER_EMAIL=admin@zonasport.es
SEED_OWNER_PASSWORD=ChangeMe2026!
```

---

## ðŸ“Œ Datos pendientes que solo tÃº puedes dar (no bloquean)

- **CIF/NIF real** de Zona Sport â€” ahora aparece como "Disponible a peticiÃ³n
  justificada en hola@zonasport.es" en aviso, privacidad y condiciones. Cuando
  lo tengas, cambia las 3 lÃ­neas.
- **URLs reales** de Facebook / Instagram â€” placeholders `#` en footer y en el
  schema `sameAs`.
- **Fotos reales** de la tienda fÃ­sica + equipo â€” ahora la secciÃ³n "Lo que
  trabajamos" en /sobre-nosotros muestra 6 productos del demo sobre fondos
  con degradado, lo cual queda profesional.
- **Coordenadas exactas** de la fachada â€” uso (38.881, -6.622). Si Google Maps
  marca otro punto, cambia `STORE_NAP.geo` en `lib/seo/schema-org.ts`.

---

## ðŸš€ Despliegue a producciÃ³n

```bash
vercel --prod
```

Build se ejecuta con `prisma generate && next build` (en vercel.json).
Cron jobs ya configurados: refresh Amazon (04:00 UTC), refresh Miravia (05:00),
GC Blob (03:00 domingos), sitemap revalidate (06:00).

---

## ðŸ“œ Scripts Ãºtiles

```bash
npm run dev              # Dev server :3000 (con Turbopack)
npm run build            # Build producciÃ³n
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
â”œâ”€â”€ (public)/           Tienda pÃºblica (Header + Footer + BottomNav + WhatsApp floating)
â”‚   â”œâ”€â”€ page.tsx        Home con ScrollScene 3D + hero clÃ¡sico + categorÃ­as + mapa
â”‚   â”œâ”€â”€ [categoria]/    Listado con filtros sidebar/sheet, productos demo o reales
â”‚   â”œâ”€â”€ producto/[slug]/  Ficha con galerÃ­a luxe + selector tallas + carrito
â”‚   â”œâ”€â”€ marca/[slug]/   PÃ¡gina marca con productos
â”‚   â”œâ”€â”€ marcas/         Listado marcas
â”‚   â”œâ”€â”€ blog/           Listado + post con TOC sticky + share + prev/next
â”‚   â”œâ”€â”€ tienda-en/[m]/  6 landings locales reales
â”‚   â”œâ”€â”€ carrito/        Carrito Phase-1 con WhatsApp checkout
â”‚   â”œâ”€â”€ buscar/         BÃºsqueda con fallback demo
â”‚   â”œâ”€â”€ contacto/, sobre-nosotros/, (legal)/...
â”‚
â”œâ”€â”€ admin/              CRM completo: dashboard, productos, marcas, categorÃ­as,
â”‚                       blog, leads, imÃ¡genes, redirecciones, usuarios, ajustes
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
â”œâ”€â”€ process-logo.ts           Quita fondo + 3 variantes (yo lo usÃ©)
â”œâ”€â”€ regenerate-icons-from-user-logo.ts  Tu logo â†’ iconos PWA
â”œâ”€â”€ download-demo-products.ts Pre-descarga 24 imÃ¡genes reales
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

## ðŸ“Š MÃ©tricas finales

| MÃ©trica | Valor |
|---------|-------|
| Archivos creados / modificados | ~280 |
| Tests passing | 186 / 186 (16 archivos) |
| Errores TypeScript | 0 |
| Errores ESLint (build) | 0 |
| Rutas auditadas Playwright | 24 (12 rutas Ã— 2 viewports) |
| Issues HIGH | 0 |
| Issues MEDIUM | 0 |
| Productos demo descargados | 24 (todos con imÃ¡genes WebP) |
| Productos finales esperados con import | ~583 |
| Marcas | 2 (John Smith, +8000), extensible |
| CategorÃ­as padre | 8 |
| Landings locales | 6 |
| Plantillas blog | 4 |
| Build size First Load JS | 103-158 kB por ruta |
| Bundle GLB (sticky en 3D scene) | 1.6 MB |

---

## â˜• Empieza por aquÃ­

1. **Abre http://localhost:3000** y haz scroll en la home. VerÃ¡s la zapatilla
   girando, las rocas abriÃ©ndose, la fachada 3D apareciendo, y luego el
   catÃ¡logo real con productos demo.
2. **Visita /running, /montana, /marcas, /carrito** â€” todo lleno de productos
   con imÃ¡genes reales del proveedor.
3. **Prueba la PWA en mobile** (DevTools â†’ Toggle device): el banner install
   deberÃ­a aparecer tras navegar 2-3 pÃ¡ginas.
4. **Pulsa el icono carrito** en el header tras aÃ±adir algo â€” drawer + WhatsApp
   message generator.
5. **/admin/login** funciona (sin DB no podrÃ¡s entrar, pero el form responde
   con el mensaje de rate-limit/lockout en caso de fallo).
6. **Cuando estÃ©s listo**: provisiona Neon y corre `npm run setup:db`. En 15
   minutos tendrÃ¡s los 583 productos reales publicados.

Que duermas bien. MaÃ±ana arrancas en frÃ­o.
