-- ============================================================================
-- Migración complementaria: Full Text Search + pg_trgm + RedirectRule SQL extras
-- ============================================================================
-- Esta migración se aplica DESPUÉS del migrate inicial generado por Prisma.
--
-- Aplicar en local:
--   npx prisma db execute --file prisma/migrations/0001_init_fts/migration.sql --schema prisma/schema.prisma
--
-- Aplicar en producción (Neon/Vercel):
--   - Asegúrate de que `prisma migrate deploy` ya ejecutó las migraciones declaradas.
--   - Después: `npx prisma db execute --file prisma/migrations/0001_init_fts/migration.sql`.
--
-- Estrategia:
--   - `searchVector` combina la configuración `spanish` (stemming + stopwords) y
--     `simple` (tokens crudos) para que un modelo "M24205" o un EAN sean
--     búsqueda exacta sin perder el matching semántico de "zapatilla running".
--   - Se mantienen los índices GIN sobre `searchVector` (FTS) y trigram (fuzzy).
-- ============================================================================

-- Extensiones requeridas (idempotentes)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ----------------------------------------------------------------------------
-- Product.searchVector
-- ----------------------------------------------------------------------------

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

-- Generador: combina spanish (con stemming) + simple (literal) y le aplica
-- unaccent en todos los campos textuales para tolerar acentos.
CREATE OR REPLACE FUNCTION product_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
       setweight(to_tsvector('pg_catalog.spanish', unaccent(coalesce(NEW."name", ''))), 'A')
    || setweight(to_tsvector('pg_catalog.simple',  unaccent(coalesce(NEW."name", ''))), 'A')
    || setweight(to_tsvector('pg_catalog.simple',  unaccent(coalesce(NEW."modelCode", ''))), 'A')
    || setweight(to_tsvector('pg_catalog.spanish', unaccent(coalesce(NEW."shortName", ''))), 'B')
    || setweight(to_tsvector('pg_catalog.simple',  unaccent(coalesce(NEW."colorName", ''))), 'B')
    || setweight(to_tsvector('pg_catalog.simple',  unaccent(coalesce(array_to_string(NEW."tags", ' '), ''))), 'C')
    || setweight(to_tsvector('pg_catalog.spanish', unaccent(coalesce(array_to_string(NEW."tags", ' '), ''))), 'C')
    || setweight(to_tsvector('pg_catalog.spanish', unaccent(coalesce(NEW."description", ''))), 'D');
  RETURN NEW;
END
$$ LANGUAGE plpgsql IMMUTABLE;

DROP TRIGGER IF EXISTS product_search_vector_trigger ON "Product";
CREATE TRIGGER product_search_vector_trigger
  BEFORE INSERT OR UPDATE OF "name", "shortName", "colorName", "modelCode", "tags", "description"
  ON "Product"
  FOR EACH ROW
  EXECUTE FUNCTION product_search_vector_update();

-- Backfill seguro para filas preexistentes.
UPDATE "Product" SET "name" = "name" WHERE "searchVector" IS NULL;

-- Índices
CREATE INDEX IF NOT EXISTS product_search_vector_idx
  ON "Product" USING GIN ("searchVector");
CREATE INDEX IF NOT EXISTS product_name_trgm_idx
  ON "Product" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS product_model_trgm_idx
  ON "Product" USING GIN ("modelCode" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS product_size_ean_trgm_idx
  ON "ProductSize" USING GIN ("ean" gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- BlogPost.searchVector
-- ----------------------------------------------------------------------------

ALTER TABLE "BlogPost"
  ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

CREATE OR REPLACE FUNCTION blogpost_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
       setweight(to_tsvector('pg_catalog.spanish', unaccent(coalesce(NEW."title", ''))), 'A')
    || setweight(to_tsvector('pg_catalog.simple',  unaccent(coalesce(NEW."title", ''))), 'A')
    || setweight(to_tsvector('pg_catalog.spanish', unaccent(coalesce(NEW."excerpt", ''))), 'B')
    || setweight(to_tsvector('pg_catalog.simple',  unaccent(coalesce(array_to_string(NEW."tags", ' '), ''))), 'C')
    || setweight(to_tsvector('pg_catalog.spanish', unaccent(coalesce(NEW."contentMd", ''))), 'D');
  RETURN NEW;
END
$$ LANGUAGE plpgsql IMMUTABLE;

DROP TRIGGER IF EXISTS blogpost_search_vector_trigger ON "BlogPost";
CREATE TRIGGER blogpost_search_vector_trigger
  BEFORE INSERT OR UPDATE OF "title", "excerpt", "tags", "contentMd"
  ON "BlogPost"
  FOR EACH ROW
  EXECUTE FUNCTION blogpost_search_vector_update();

UPDATE "BlogPost" SET "title" = "title" WHERE "searchVector" IS NULL;

CREATE INDEX IF NOT EXISTS blogpost_search_vector_idx
  ON "BlogPost" USING GIN ("searchVector");
CREATE INDEX IF NOT EXISTS blogpost_title_trgm_idx
  ON "BlogPost" USING GIN ("title" gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- RedirectRule: índice para lookups rápidos por `from` activo
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS redirectrule_active_idx
  ON "RedirectRule" ("isActive", "from");
