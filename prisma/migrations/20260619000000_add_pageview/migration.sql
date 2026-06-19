-- ============================================================================
-- Migración ADITIVA — add_pageview
-- ============================================================================
-- Analítica propia: tabla PageView (contador de visitas agregado por ruta y
-- día). La alimenta POST /api/track desde el cliente (solo con consentimiento
-- de cookies "analytics"). 1 fila por (path, day) → no crece sin control.
--
-- 100% aditiva. Sin DROPs. No toca ninguna tabla existente.
-- Reversible con: DROP TABLE "PageView";
-- ============================================================================

-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PageView_path_day_key" ON "PageView"("path", "day");

-- CreateIndex
CREATE INDEX "PageView_day_idx" ON "PageView"("day");
