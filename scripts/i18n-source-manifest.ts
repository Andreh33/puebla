import fs from "node:fs";
import path from "node:path";
import {
  sourceContentHash,
  PRODUCT_TEXT_FIELDS,
  POST_TEXT_FIELDS,
  type SourceText,
  type ContentKind,
} from "../lib/i18n/content-contract";
const sourceFile = process.argv[2];
if (!sourceFile) throw new Error("Pass the verified production public-content JSON path");
const source = JSON.parse(fs.readFileSync(sourceFile, "utf8")) as {
  exportedAt: string;
  products: SourceText[];
  posts: SourceText[];
};
if (source.products.length !== 1521 || source.posts.length !== 54)
  throw new Error(
    "Initial release requires the verified production inventory of 1521 products and54 articles; never substitute the local database export",
  );
function entry(kind: ContentKind, item: SourceText) {
  const fields = kind === "products" ? PRODUCT_TEXT_FIELDS : POST_TEXT_FIELDS;
  return {
    id: item.id,
    slug: item.slug,
    sourceHash: sourceContentHash(kind, item),
    requiredFields: fields.filter(
      (field) => typeof item[field] === "string" && String(item[field]).trim(),
    ),
    tagCount: Array.isArray(item.tags) ? item.tags.length : 0,
    ...(kind === "products"
      ? {
          imageAltUrls: (Array.isArray(item.images)
            ? item.images
            : Array.isArray(item.imageAlts)
              ? item.imageAlts
              : []
          )
            .filter((image: { alt?: string }) => image.alt?.trim())
            .map((image: { url: string }) => image.url),
        }
      : {}),
  };
}
const manifest = {
  version: 1,
  exportedAt: source.exportedAt,
  products: source.products.map((item) => entry("products", item)),
  posts: source.posts.map((item) => entry("posts", item)),
};
fs.mkdirSync(path.join(process.cwd(), "data", "translations"), { recursive: true });
const manifestFile = path.join(process.cwd(), "data", "translations", "source-manifest.json");
const temporaryManifest = `${manifestFile}.tmp`;
fs.writeFileSync(temporaryManifest, JSON.stringify(manifest, null, 2) + "\n");
fs.renameSync(temporaryManifest, manifestFile);
console.log(
  `Source manifest: ${manifest.products.length} products, ${manifest.posts.length} articles`,
);
