/**
 * Subida local de imágenes WooCommerce (sortea Cloudflare del WP cliente).
 *
 * El WP del cliente (zonasportpuebla.es) tiene Cloudflare que bloquea
 * IPs de AWS Lambda, por lo que Vercel Functions no pueden descargar las
 * imágenes directamente (HTTP 403). Workaround: este script corre en
 * local (IP residencial que pasa CF), descarga cada imagen y la sube al
 * endpoint /api/admin/woo-image-upload que la persiste en Vercel Blob.
 *
 * Run:
 *   npx tsx scripts/upload-woo-images-local.ts
 *
 * Requiere:
 *   - .setup-token.tmp con SETUP_TOKEN (regenerar con vercel env si hace falta).
 *   - wp/wc-product-export-19-5-2026-1779208641288.csv accesible.
 *   - Conexión a internet directa (no proxy corporativo).
 */
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

const BASE_URL = "https://zonasport.vercel.app";
const CSV_PATH = "wp/wc-product-export-16-6-2026-1781596350587.csv";
const TOKEN = fs.readFileSync(".setup-token.tmp", "utf8").trim();
const CONCURRENCY = 4;
const PAGE_SIZE = 60;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

interface PendingItem {
  id: string;
  sku: string;
  name: string;
  status: string;
}

function loadSkuToImageMap(): Map<string, string> {
  const csv = fs.readFileSync(CSV_PATH, "utf8");
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });
  const map = new Map<string, string>();
  for (const row of parsed.data) {
    const sku = (row.SKU ?? "").trim();
    const imagesCol = (row["Imágenes"] ?? "").trim();
    const tipo = (row.Tipo ?? "").trim();
    if (!sku || !imagesCol || tipo === "variation") continue;
    const firstUrl = imagesCol.split(",")[0]?.trim();
    if (!firstUrl || !firstUrl.startsWith("http")) continue;
    map.set(sku, firstUrl);
  }
  return map;
}

async function getPending(): Promise<{ items: PendingItem[]; remaining: number }> {
  const res = await fetch(`${BASE_URL}/api/admin/woo-image-upload?limit=${PAGE_SIZE}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) throw new Error(`GET pending: HTTP ${res.status}`);
  return res.json() as Promise<{ items: PendingItem[]; remaining: number }>;
}

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        Referer: "https://zonasportpuebla.es/",
      },
    });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

async function uploadOne(
  sku: string,
  imageUrl: string,
  buffer: Buffer,
): Promise<{ ok: boolean; error?: string }> {
  const form = new FormData();
  // Inferir tipo MIME mínimo: si la URL acaba en .webp/.jpg/.png ya marca,
  // si no, image/jpeg como genérico (sharp del lado servidor lo reconoce).
  const ext = imageUrl.toLowerCase().match(/\.(webp|jpe?g|png|avif|gif)$/)?.[1] ?? "jpg";
  const mime =
    ext === "webp"
      ? "image/webp"
      : ext === "png"
        ? "image/png"
        : ext === "avif"
          ? "image/avif"
          : ext === "gif"
            ? "image/gif"
            : "image/jpeg";

  // Blob expects ArrayBuffer (not Buffer/Uint8Array por TS lib mismatches).
  // ArrayBuffer.prototype.slice copia bytes a un ArrayBuffer independiente.
  const ab = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
  const blob = new Blob([ab], { type: mime });
  const filename = path.basename(new URL(imageUrl).pathname);
  form.append("sku", sku);
  form.append("originalUrl", imageUrl);
  form.append("file", blob, filename);

  const res = await fetch(`${BASE_URL}/api/admin/woo-image-upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: form,
  });
  if (!res.ok) {
    const txt = await res.text();
    return { ok: false, error: txt.slice(0, 200) };
  }
  return { ok: true };
}

async function processItem(
  item: PendingItem,
  skuMap: Map<string, string>,
): Promise<"ok" | "no-url" | "download-fail" | "upload-fail"> {
  const url = skuMap.get(item.sku);
  if (!url) return "no-url";
  const buf = await downloadImage(url);
  if (!buf) return "download-fail";
  const r = await uploadOne(item.sku, url, buf);
  return r.ok ? "ok" : "upload-fail";
}

async function main() {
  console.log("📷 Subida local de imágenes WooCommerce → Vercel Blob");
  console.log(`   Endpoint: ${BASE_URL}/api/admin/woo-image-upload`);

  const skuMap = loadSkuToImageMap();
  console.log(`   SKUs con URL en CSV: ${skuMap.size}`);

  const t0 = Date.now();
  let totalOk = 0;
  let totalSkipNoUrl = 0;
  let totalDownloadFail = 0;
  let totalUploadFail = 0;
  const errorSamples: Array<{ sku: string; reason: string }> = [];

  let prevRemaining = Infinity;
  while (true) {
    const { items, remaining } = await getPending();
    if (items.length === 0 || remaining === 0) {
      console.log(`✅ Sin pendientes. remaining=${remaining}`);
      break;
    }
    // Guarda anti-bucle-infinito: si un lote de pendientes no tiene URL en el CSV,
    // getPending() los devuelve siempre y remaining no baja. Cortamos al estancarse.
    if (remaining >= prevRemaining) {
      console.log(`\n⚠️  ${remaining} pendientes sin URL en el CSV — no progresan, corto el bucle.`);
      break;
    }
    prevRemaining = remaining;
    console.log(
      `\n📦 Lote de ${items.length} · pendientes totales: ${remaining} · elapsed ${((Date.now() - t0) / 1000).toFixed(0)}s`,
    );

    // Concurrencia controlada
    const queue = [...items];
    const workers = Array.from({ length: CONCURRENCY }, async (_, workerIdx) => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        const result = await processItem(item, skuMap);
        if (result === "ok") {
          totalOk++;
          if (totalOk % 10 === 0) {
            process.stdout.write(
              `   ok=${totalOk} fail=${totalDownloadFail + totalUploadFail} skip=${totalSkipNoUrl}\r`,
            );
          }
        } else {
          if (result === "no-url") {
            totalSkipNoUrl++;
            errorSamples.push({ sku: item.sku, reason: "no url in CSV" });
          } else if (result === "download-fail") {
            totalDownloadFail++;
            errorSamples.push({ sku: item.sku, reason: "download fail" });
          } else {
            totalUploadFail++;
            errorSamples.push({ sku: item.sku, reason: "upload fail" });
          }
        }
        void workerIdx;
      }
    });
    await Promise.all(workers);

    if (remaining === 0) break;
  }

  console.log(`\n\n✅ Done en ${((Date.now() - t0) / 1000 / 60).toFixed(1)} min`);
  console.log(`   ok=${totalOk}`);
  console.log(`   skip-no-url=${totalSkipNoUrl}`);
  console.log(`   download-fail=${totalDownloadFail}`);
  console.log(`   upload-fail=${totalUploadFail}`);
  if (errorSamples.length > 0) {
    console.log("   primeros errores:");
    for (const e of errorSamples.slice(0, 10)) {
      console.log(`     ${e.sku}: ${e.reason}`);
    }
  }
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
