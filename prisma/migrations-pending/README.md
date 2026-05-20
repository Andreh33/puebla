# Migraciones pendientes (NO aplicar todavía)

Esta carpeta contiene migraciones **escritas y revisadas** pero **diferidas** a una
fase posterior porque dependen de cambios de código que aún no están listos.
**Prisma no las ve aquí** (están fuera de `prisma/migrations/`), así que
`prisma migrate deploy` las ignora automáticamente — fix permanente del landmine.

## Cómo reactivar una migración cuando llegue su momento

1. Verificar que se cumplen los requisitos previos documentados en el `migration.sql`.
2. `git mv prisma/migrations-pending/<carpeta> prisma/migrations/<carpeta>`.
3. `npx prisma migrate status` — debería listar la migración como pendiente.
4. Aplicar con `npx prisma migrate deploy` siguiendo el runbook correspondiente
   (típicamente: backup → deploy → verificaciones).

## Contenido actual

### `20260520195203_product_categories_m2m_contract`
**Bloque 2 — fase contractiva.** Elimina `Product.categoryId` y promueve
`primaryCategoryId` a NOT NULL. Diferida hasta que el código de la app deje
de referenciar `categoryId` (los 37 archivos detectados en `docs/BLOCK-2-PLAN.md`
§10). Se reactivará en el Bloque 5 (aplicación a producción) como PR final
después de migrar el código.
