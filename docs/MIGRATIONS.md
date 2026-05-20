# Migraciones de base de datos — Zona Sport

## Resumen

Hasta ahora el deploy aplicaba el esquema con:

```
prisma db push --skip-generate --accept-data-loss && …
```

Eso es **peligroso en producción**: `db push --accept-data-loss` fuerza el
esquema a coincidir con `schema.prisma` **aceptando pérdida de datos**, y lo
hace **durante el build**, antes de cualquier script de datos. Un cambio de
modelo (p.ej. convertir `categoryId` en relación m2m) habría borrado columnas
y datos sin migración de transición.

Lo hemos cambiado por el flujo profesional con historial de migraciones:

```
prisma migrate deploy && prisma generate && next build
```

`migrate deploy` **solo aplica migraciones ya commiteadas y pendientes**; nunca
sincroniza destructivamente. Lo mismo en **production y en preview**.

## Estructura de migraciones

```
prisma/migrations/
  migration_lock.toml            # provider = postgresql
  00000000000000_init/           # BASELINE: todas las tablas/enums actuales
    migration.sql                # generado con `migrate diff --from-empty --to-schema-datamodel`
  0001_init_fts/                 # Full Text Search (pg_trgm, tsvector, triggers, searchVector)
    migration.sql
```

Orden de aplicación (lexicográfico): `00000000000000_init` → `0001_init_fts`.
El baseline crea las tablas; FTS añade después `searchVector` + índices GIN.

> ⚠️ El baseline se generó **desde `schema.prisma`** (offline, sin BD). Es un
> borrador fiel a la intención del modelo, pero la BD de producción se construyó
> con `db push` repetidos y **puede tener drift**. Hay que validarlo contra un
> clon de producción ANTES de marcarlo como aplicado en prod (ver abajo).

## 🚦 Gate de despliegue (LEER ANTES DE MERGEAR A `master`)

El cambio de `buildCommand` y el baseline **no deben llegar a producción** hasta
completar el baselining contra prod. Si se mergea antes, el primer
`migrate deploy` en prod intentará crear tablas que ya existen y **romperá el
deploy** (no pierde datos, pero bloquea despliegues).

### Pasos a ejecutar UNA vez, con acceso a producción

1. **Crear una rama Neon clonada de producción** (datos reales) y obtener su
   `DATABASE_URL`. Esta es además la rama de desarrollo desechable.

2. **Detectar drift** entre el clon (= prod) y `schema.prisma`:
   ```bash
   npx prisma migrate diff \
     --from-url "$NEON_CLONE_URL" \
     --to-schema-datamodel prisma/schema.prisma \
     --script
   ```
   - Si el resultado está **vacío** → el baseline coincide con prod. 
   - Si hay SQL → hay drift; ajustar el baseline (o crear una migración de
     corrección) hasta que el diff sea vacío.

3. **Validar el flujo en una rama Neon NUEVA y vacía** (no clonada):
   ```bash
   DATABASE_URL="$NEON_EMPTY_URL" npx prisma migrate deploy
   ```
   Debe aplicar `00000000000000_init` + `0001_init_fts` sin errores y dejar el
   esquema completo (con FTS).

4. **Marcar baseline + FTS como YA aplicados en PRODUCCIÓN** (prod ya tiene esos
   objetos creados por los `db push` previos):
   ```bash
   # Con DATABASE_URL apuntando a PRODUCCIÓN:
   npx prisma migrate resolve --applied 00000000000000_init
   npx prisma migrate resolve --applied 0001_init_fts
   ```

5. **Recién entonces mergear a `master`.** El auto-deploy correrá
   `migrate deploy`, verá las dos migraciones como aplicadas, no hará nada, y el
   build continuará. A partir de aquí cada nueva migración se aplica sola y de
   forma segura.

## Bloque 2 — estrategia expand/contract (categorías m2m)

La conversión de `Product.categoryId` (FK única) a relación many-to-many se hace
en **dos migraciones separadas, sin downtime ni pérdida**:

1. **Migración aditiva** (no destructiva):
   - `CREATE TABLE ProductCategory` (pivote).
   - `Product.primaryCategoryId` **nullable** → `Category`.
   - **Se mantiene** `Product.categoryId` intacto.
   - Deploy.
2. **Script de datos** `scripts/migrate-categories.ts` (idempotente, NO corre en
   build): rellena `primaryCategoryId` con el `categoryId` actual y popula la
   tabla pivote. Se ejecuta a mano contra prod cuando los datos estén listos.
3. **Migración de contracción** (segundo deploy, tras verificar datos):
   - `primaryCategoryId` → `NOT NULL`.
   - Se retira `Product.categoryId`.

## Comandos útiles

- Crear migración nueva (en local, contra la rama Neon de desarrollo):
  ```bash
  npx prisma migrate dev --name <nombre>
  ```
- Aplicar pendientes (lo que hace el build):
  ```bash
  npx prisma migrate deploy
  ```
- Ver estado:
  ```bash
  npx prisma migrate status
  ```

## Reglas

- **Nunca** volver a `db push --accept-data-loss` en el build.
- Toda migración pasa por `prisma/migrations/` y se prueba en la rama Neon antes
  de mergear.
- Los scripts de datos (`scripts/*.ts`) **no** corren en build: se ejecutan a
  mano contra la BD cuando toca.
