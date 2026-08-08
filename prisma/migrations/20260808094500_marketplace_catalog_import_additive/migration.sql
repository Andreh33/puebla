-- Importación auditada de los listados Amazon y Miravia descargados el 2026-08-08.
-- Miravia SHA-256: f12d9b5184ce8b155fa17dacd27731876c314c6814179114cb7da36d17374beb
-- Amazon  SHA-256: dbcb04b0c0efb59598a9626cbfb6303c5931397f5dc1aaebeb48043ee8f8b2c9
--
-- Solo activa indicadores de marketplace y registra su auditoría. No desactiva,
-- elimina ni modifica stock, tallas, precios, pedidos o notificaciones existentes.

BEGIN;

CREATE TEMP TABLE "_MarketplaceImportMiravia" (
    "sku" TEXT PRIMARY KEY
) ON COMMIT DROP;

INSERT INTO "_MarketplaceImportMiravia" ("sku")
SELECT unnest(ARRAY[
    '1244', '2091', '2650', '4024', '4025', '4151', '4354', '4376', '4521',
    '4531', '4744', '4745', '4746', '4747', '4748', '4749', '4765', '4875',
    '4878', '4915', '4993', '5024', '5108', '5164', '5290', '5425', '5444',
    '5482', '5491', '5548', '5555', '5615', '5616', '5635', '5638', '5982',
    '6039', '6186', '6260', '6266', '6268', '6295', '6300', '6342', '6412',
    '6418', '6466', '6472', '6498', '6499', '6500', '6527', '6529', '6531',
    '6562', '6600', '6601', '6605', '6606', '6642', '6700', '6710', '6737',
    '6738', '6739', '6763', '6786', '6788', '6830', '6869', '6870', '6873',
    '6876', '6885', '6940', '6945', '6948', '6949', '6976', '6997', '7003',
    '7004', '7008', '7018', '7019', '7091', '7094', '7152', '7171', '7276',
    '7283', '7292', '7293', '7314', '7360', '7361', '7426', '7427', '7492',
    '7495', '7496', '7502', '7506', '7507', '7508', '7523', '7524', '7530',
    '7552', '7553', '7564', '7675', '7720', '7745', '7748', '7760', '7774',
    '7775', '7793', '7825', '7828-azul-marino', '7833', '7833-naranja', '7834',
    '7834-rojo', '7835-azul', '7835-celeste', '7899', '7901', '7918', '7919',
    '7921', '7933', '7949', '7950', '7965', '7966', '7967', '7970', '7971',
    '7981', '7982', '8008', '8020', '8024', '8027', '8036', '8039', '8040',
    '8041', '8042', '8052', '8055', '8056', '8063', '8064', '8066', '8067',
    '8072', '8076', '8077', '8078', '8079', '8080', '8084', '8086', '8087',
    '8088', '8090', '8094', '8097', '8099', '8116', '8118', '8119', '8138',
    '8139', '8152', '8157', '8167', '8185', '8189', '8192', '8193', '8198',
    '8200', '8207', '8208', '8209', '8218', '8219', '8233', '8257', '8280',
    '8283', '8284', '8287', '8289', '8290', '8293', '8296', '8310', '8311',
    '8313', '8320', '8322', '8347', '8363', '8364', '8365', '8389', '8395',
    '8401', '8403', '8404', '8407', '8408', '8409', '8410', '8411', '8420',
    '8432', '8434', '8435', '8438', '8448', '8449', '8462', '8464', '8474',
    '8475', '8480', '8481', '8486', '8487', '8488', '8489', '8531', '8578',
    '9000', '9049', '9073', '9082', '9083', '9086', '9096'
]::TEXT[]);

-- La ficha Miravia RSPEES2512 no expone SKU interno. Esta condición estricta
-- solo la alcanza si el producto exacto existe en producción como borrador.
WITH "MiraviaProducts" AS (
    SELECT p."id"
    FROM "Product" p
    LEFT JOIN "_MarketplaceImportMiravia" i ON i."sku" = p."sku"
    WHERE p."isOnMiravia" = false
      AND (
          i."sku" IS NOT NULL
          OR regexp_replace(upper(p."name"), '[^A-Z0-9]', '', 'g') LIKE '%RSPEES2512%'
          OR regexp_replace(upper(p."name"), '[^A-Z0-9]', '', 'g') LIKE '%RSPEEDMEN2512%'
      )
)
INSERT INTO "ProductAudit" ("id", "productId", "userId", "action", "changes", "createdAt")
SELECT
    'mpimp-20260808-m-' || substr(md5(p."id"), 1, 24),
    p."id",
    NULL,
    'marketplace_imported_miravia',
    jsonb_build_object('isOnMiravia', jsonb_build_object('from', false, 'to', true)),
    CURRENT_TIMESTAMP
FROM "MiraviaProducts" p
ON CONFLICT ("id") DO NOTHING;

UPDATE "Product" p
SET "isOnMiravia" = true,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "_MarketplaceImportMiravia" i
WHERE p."sku" = i."sku"
  AND p."isOnMiravia" = false;

UPDATE "Product" p
SET "isOnMiravia" = true,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE p."isOnMiravia" = false
  AND (
      regexp_replace(upper(p."name"), '[^A-Z0-9]', '', 'g') LIKE '%RSPEES2512%'
      OR regexp_replace(upper(p."name"), '[^A-Z0-9]', '', 'g') LIKE '%RSPEEDMEN2512%'
  );

CREATE TEMP TABLE "_MarketplaceImportAmazon" (
    "sku" TEXT PRIMARY KEY
) ON COMMIT DROP;

INSERT INTO "_MarketplaceImportAmazon" ("sku")
SELECT unnest(ARRAY[
    '6029', '6043', '6186', '6342', '6523', '6710', '6769', '6788', '6810',
    '6873', '6885', '6976', '6997', '7063', '7171', '7276',
    '7277', '7349', '7360', '7361', '7426', '7427', '7492', '7496',
    '7502', '7553', '7554', '7588', '7675', '7745', '7748', '7750',
    '7751', '7774', '7775', '7793', '7794', '7899', '7918', '7925', '7949',
    '7950', '7965', '7967', '7970', '8024', '8072', '8088', '8090', '8094',
    '8100', '8157', '8202', '8233', '8289', '8395', '8404', '8486'
]::TEXT[]);

-- Los seller SKU "gala" y "7665" no corresponden a un SKU interno visible:
-- el segundo pertenece en la web a otro modelo. Se usan únicamente nombres de
-- modelo estrictos para alcanzarlos si existen ocultos en producción.
WITH "AmazonProducts" AS (
    SELECT p."id"
    FROM "Product" p
    LEFT JOIN "_MarketplaceImportAmazon" i ON i."sku" = p."sku"
    WHERE p."isOnAmazon" = false
      AND (
          i."sku" IS NOT NULL
          OR (
              regexp_replace(upper(p."name"), '[^A-Z0-9]', '', 'g') LIKE '%JOMA%'
              AND regexp_replace(upper(p."name"), '[^A-Z0-9]', '', 'g') LIKE '%GALA%'
          )
          OR regexp_replace(upper(p."name"), '[^A-Z0-9]', '', 'g') LIKE '%SPEEDJR2413%'
      )
)
INSERT INTO "ProductAudit" ("id", "productId", "userId", "action", "changes", "createdAt")
SELECT
    'mpimp-20260808-a-' || substr(md5(p."id"), 1, 24),
    p."id",
    NULL,
    'marketplace_imported_amazon',
    jsonb_build_object('isOnAmazon', jsonb_build_object('from', false, 'to', true)),
    CURRENT_TIMESTAMP
FROM "AmazonProducts" p
ON CONFLICT ("id") DO NOTHING;

UPDATE "Product" p
SET "isOnAmazon" = true,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "_MarketplaceImportAmazon" i
WHERE p."sku" = i."sku"
  AND p."isOnAmazon" = false;

UPDATE "Product" p
SET "isOnAmazon" = true,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE p."isOnAmazon" = false
  AND (
      (
          regexp_replace(upper(p."name"), '[^A-Z0-9]', '', 'g') LIKE '%JOMA%'
          AND regexp_replace(upper(p."name"), '[^A-Z0-9]', '', 'g') LIKE '%GALA%'
      )
      OR regexp_replace(upper(p."name"), '[^A-Z0-9]', '', 'g') LIKE '%SPEEDJR2413%'
  );

COMMIT;
