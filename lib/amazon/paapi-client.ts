/**
 * Zona Sport — Cliente Amazon Product Advertising API 5.0.
 *
 * Stub funcional listo para activar:
 *   - Lanza `AmazonNotConfiguredError` si faltan credenciales.
 *   - Singleton para no recrear el cliente.
 *   - Cola interna con TPS=1 (Amazon limita PA-API a 1 request/seg por defecto).
 *   - Normaliza la respuesta a `NormalizedAmazonItem` (forma neutra para el upsert).
 *
 * Variables de entorno requeridas:
 *   - AMAZON_ACCESS_KEY
 *   - AMAZON_SECRET_KEY
 *   - AMAZON_ASSOCIATE_TAG  (ej. "zonasport-21")
 *   - AMAZON_HOST           (opcional, por defecto "webservices.amazon.es")
 *   - AMAZON_REGION         (opcional, por defecto "eu-west-1")
 *   - AMAZON_MARKETPLACE    (opcional, por defecto "www.amazon.es")
 *   - AMAZON_ENABLED="true" para habilitar las rutas del admin.
 */

import "server-only";

// El SDK oficial está escrito en JS sin tipos, lo importamos de forma defensiva.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SdkModule: any;

/**
 * Carga perezosa del SDK. Evitamos importarlo en el top-level porque algunas
 * versiones inicializan instancias globales en cuanto se requieren.
 */
async function loadSdk() {
  if (SdkModule) return SdkModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SdkModule = require("paapi5-nodejs-sdk");
    return SdkModule;
  } catch (err) {
    throw new AmazonNotConfiguredError(
      `paapi5-nodejs-sdk no se pudo cargar: ${err instanceof Error ? err.message : err}`,
    );
  }
}

export class AmazonNotConfiguredError extends Error {
  constructor(message = "Amazon PA-API no está configurado") {
    super(message);
    this.name = "AmazonNotConfiguredError";
  }
}

export class AmazonApiError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AmazonApiError";
  }
}

export interface NormalizedAmazonItem {
  asin: string;
  title: string;
  brand: string | null;
  imageUrl: string | null;
  price: number | null; // EUR
  currency: string | null;
  availability: string | null;
  category: string | null;
  affiliateUrl: string;
}

export interface AmazonConfig {
  accessKey: string;
  secretKey: string;
  associateTag: string;
  host: string;
  region: string;
  marketplace: string;
}

export function isAmazonConfigured(): boolean {
  return Boolean(
    process.env.AMAZON_ACCESS_KEY &&
      process.env.AMAZON_SECRET_KEY &&
      process.env.AMAZON_ASSOCIATE_TAG,
  );
}

function readConfig(): AmazonConfig {
  const accessKey = process.env.AMAZON_ACCESS_KEY;
  const secretKey = process.env.AMAZON_SECRET_KEY;
  const associateTag = process.env.AMAZON_ASSOCIATE_TAG;
  if (!accessKey || !secretKey || !associateTag) {
    throw new AmazonNotConfiguredError(
      "Faltan variables: AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY o AMAZON_ASSOCIATE_TAG.",
    );
  }
  return {
    accessKey,
    secretKey,
    associateTag,
    host: process.env.AMAZON_HOST || "webservices.amazon.es",
    region: process.env.AMAZON_REGION || "eu-west-1",
    marketplace: process.env.AMAZON_MARKETPLACE || "www.amazon.es",
  };
}

// ---------------------------------------------------------------------------
// Cola TPS=1 (PA-API limita a 1 request/seg por cliente)
// ---------------------------------------------------------------------------

class TpsQueue {
  private last = 0;
  private chain: Promise<unknown> = Promise.resolve();
  constructor(private readonly intervalMs: number) {}

  schedule<T>(task: () => Promise<T>): Promise<T> {
    const run = async () => {
      const elapsed = Date.now() - this.last;
      const wait = Math.max(0, this.intervalMs - elapsed);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.last = Date.now();
      return task();
    };
    const next = this.chain.then(run, run);
    this.chain = next.catch(() => undefined);
    return next as Promise<T>;
  }
}

// ---------------------------------------------------------------------------
// Singleton del cliente
// ---------------------------------------------------------------------------

interface AmazonClient {
  config: AmazonConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sdk: any;
  queue: TpsQueue;
}

let cachedClient: AmazonClient | null = null;

export async function getAmazonClient(): Promise<AmazonClient> {
  if (cachedClient) return cachedClient;
  const config = readConfig();
  const sdk = await loadSdk();

  const client = sdk.ApiClient.instance;
  client.accessKey = config.accessKey;
  client.secretKey = config.secretKey;
  client.host = config.host;
  client.region = config.region;

  const api = new sdk.DefaultApi();

  cachedClient = {
    config,
    api,
    sdk,
    queue: new TpsQueue(1100), // un pelín >1s por seguridad
  };
  return cachedClient;
}

// ---------------------------------------------------------------------------
// Helpers de parseo (defensivos: PA-API a veces devuelve estructuras incompletas)
// ---------------------------------------------------------------------------

function affiliateUrlFor(asin: string, config: AmazonConfig): string {
  return `https://${config.marketplace}/dp/${asin}?tag=${encodeURIComponent(
    config.associateTag,
  )}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeItem(raw: any, config: AmazonConfig): NormalizedAmazonItem | null {
  if (!raw || typeof raw !== "object") return null;
  const asin: string | undefined = raw.ASIN;
  if (!asin) return null;

  const title = raw?.ItemInfo?.Title?.DisplayValue ?? "Producto Amazon";
  const brand = raw?.ItemInfo?.ByLineInfo?.Brand?.DisplayValue ?? null;
  const imageUrl =
    raw?.Images?.Primary?.Large?.URL ??
    raw?.Images?.Primary?.Medium?.URL ??
    raw?.Images?.Primary?.Small?.URL ??
    null;
  const listing = raw?.Offers?.Listings?.[0];
  const price = typeof listing?.Price?.Amount === "number" ? listing.Price.Amount : null;
  const currency = listing?.Price?.Currency ?? null;
  const availability = listing?.Availability?.Message ?? null;
  const category = raw?.BrowseNodeInfo?.BrowseNodes?.[0]?.DisplayName ?? null;
  // PA-API ya devuelve DetailPageURL con tag, pero re-generamos para asegurar el nuestro.
  const affiliateUrl = affiliateUrlFor(asin, config);

  return {
    asin,
    title,
    brand,
    imageUrl,
    price,
    currency,
    availability,
    category,
    affiliateUrl,
  };
}

// ---------------------------------------------------------------------------
// Resources que pedimos a PA-API
// ---------------------------------------------------------------------------

const DEFAULT_RESOURCES = [
  "ItemInfo.Title",
  "ItemInfo.ByLineInfo",
  "ItemInfo.Classifications",
  "Images.Primary.Large",
  "Images.Primary.Medium",
  "Offers.Listings.Price",
  "Offers.Listings.Availability.Message",
  "BrowseNodeInfo.BrowseNodes",
];

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Obtiene info de productos por ASIN. PA-API permite hasta 10 ASINs por batch.
 * Si pasas más de 10, los partimos en bloques internamente.
 */
export async function getItems(asins: string[]): Promise<NormalizedAmazonItem[]> {
  if (asins.length === 0) return [];
  const client = await getAmazonClient();
  const { sdk, api, config, queue } = client;

  const batches: string[][] = [];
  for (let i = 0; i < asins.length; i += 10) {
    batches.push(asins.slice(i, i + 10));
  }

  const results: NormalizedAmazonItem[] = [];
  for (const batch of batches) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req: any = new sdk.GetItemsRequest();
    req.PartnerTag = config.associateTag;
    req.PartnerType = "Associates";
    req.Marketplace = config.marketplace;
    req.ItemIds = batch;
    req.Resources = DEFAULT_RESOURCES;

    const data = await queue.schedule(
      () =>
        new Promise<unknown>((resolve, reject) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          api.getItems(req, (err: any, ok: any) => {
            if (err) reject(new AmazonApiError("getItems falló", err));
            else resolve(ok);
          });
        }),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = (data as any)?.ItemsResult?.Items ?? [];
    for (const it of items) {
      const norm = normalizeItem(it, config);
      if (norm) results.push(norm);
    }
  }

  return results;
}

/**
 * Búsqueda de productos por keyword.
 */
export async function searchItems(
  query: string,
  opts: { itemCount?: number; searchIndex?: string } = {},
): Promise<NormalizedAmazonItem[]> {
  const client = await getAmazonClient();
  const { sdk, api, config, queue } = client;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const req: any = new sdk.SearchItemsRequest();
  req.PartnerTag = config.associateTag;
  req.PartnerType = "Associates";
  req.Marketplace = config.marketplace;
  req.Keywords = query;
  req.SearchIndex = opts.searchIndex || "SportsAndOutdoors";
  req.ItemCount = Math.min(opts.itemCount ?? 10, 10);
  req.Resources = DEFAULT_RESOURCES;

  const data = await queue.schedule(
    () =>
      new Promise<unknown>((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        api.searchItems(req, (err: any, ok: any) => {
          if (err) reject(new AmazonApiError("searchItems falló", err));
          else resolve(ok);
        });
      }),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = (data as any)?.SearchResult?.Items ?? [];
  const out: NormalizedAmazonItem[] = [];
  for (const it of items) {
    const norm = normalizeItem(it, config);
    if (norm) out.push(norm);
  }
  return out;
}

/**
 * Devuelve datos frescos de un ASIN (alias semántico de getItems para el cron).
 */
export async function refreshProductFromAmazon(
  asin: string,
): Promise<NormalizedAmazonItem | null> {
  const [item] = await getItems([asin]);
  return item ?? null;
}

// ---------------------------------------------------------------------------
// Helpers públicos de URL/ASIN (re-export desde utils para retro-compat)
// ---------------------------------------------------------------------------

export { extractAsin, buildAffiliateUrl } from "./utils";
