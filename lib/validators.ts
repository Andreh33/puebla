import { z } from "zod";
import { FOOTWEAR_TYPES } from "@/lib/categories/footwear";
import { GARMENT_TYPES, GARMENT_VARIANTS } from "@/lib/categories/garment";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const LoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ---------------------------------------------------------------------------
// Lead (formulario de contacto)
// ---------------------------------------------------------------------------

export const LeadSchema = z.object({
  name: z.string().min(2, "Nombre requerido").max(100),
  email: z.string().email("Email inválido"),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[\d\s+()-]{7,20}$/.test(v), "Teléfono inválido"),
  message: z.string().min(10, "Mensaje demasiado breve").max(2000),
  sourcePage: z.string().optional(),
  productId: z.string().optional(),
  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: "Debes aceptar la política de privacidad" }),
  }),
  // Honeypot anti-spam
  website: z.string().max(0, "Spam detectado").optional(),
});

export type LeadInput = z.infer<typeof LeadSchema>;

// ---------------------------------------------------------------------------
// Newsletter
// ---------------------------------------------------------------------------

export const NewsletterSchema = z.object({
  email: z.string().email("Email inválido"),
  source: z.string().optional(),
  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: "Debes aceptar la política de privacidad" }),
  }),
});

export type NewsletterInput = z.infer<typeof NewsletterSchema>;

// ---------------------------------------------------------------------------
// Producto (form admin)
// ---------------------------------------------------------------------------

export const ProductSchema = z.object({
  name: z.string().min(3).max(200),
  slug: z
    .string()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  shortName: z.string().max(120).optional().nullable(),
  description: z.string().max(20000).optional().nullable(),
  brandId: z.string().cuid(),
  categoryId: z.string().cuid(),
  source: z.enum(["LOCAL", "MIRAVIA", "AMAZON"]).default("LOCAL"),
  externalId: z.string().optional().nullable(),
  externalUrl: z.string().url().optional().nullable().or(z.literal("")),
  modelCode: z.string().max(60).optional().nullable(),
  sku: z.string().max(64).optional().nullable(),
  colorName: z.string().min(1).max(60),
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color hex inválido")
    .optional()
    .nullable()
    .or(z.literal("")),
  gender: z.enum(["HOMBRE", "MUJER", "UNISEX", "NINO", "NINA", "BEBE", "NO_ESPECIFICADO"]),
  sportUse: z.string().max(120).optional().nullable(),
  // Bloque 3: tipo de calzado (solo familia calzado). optional() → compatible con
  // create/duplicate/importers que no envíen el campo (undefined = Prisma no lo toca);
  // nullable() → el editor envía null para "(sin asignar)".
  footwearType: z.enum(FOOTWEAR_TYPES).nullable().optional(),
  // Bloque 6: tipo de prenda (solo familia textil). Mismo patrón que footwearType.
  garmentType: z.enum(GARMENT_TYPES).nullable().optional(),
  // Bloque 6 §18 Fase 3.5: variante fina (solo camiseta/pantalon/mallas).
  garmentVariant: z.enum(GARMENT_VARIANTS).nullable().optional(),
  composition: z.string().max(500).optional().nullable(),
  costPrice: z.number().min(0).optional().nullable(),
  retailPrice: z.number().min(0),
  salePrice: z.number().min(0).optional().nullable(),
  taxRate: z.number().min(0).max(50).default(21),
  tags: z.array(z.string().max(50)).max(20).default([]),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "OUT_OF_STOCK"]).default("DRAFT"),
  stock: z.number().int().min(0).default(0),
  weight: z.number().min(0).optional().nullable(),
  isFeatured: z.boolean().default(false),
  isCustomized: z.boolean().default(false),
  metaTitle: z.string().max(70).optional().nullable(),
  metaDescription: z.string().max(170).optional().nullable(),
});

export type ProductInput = z.infer<typeof ProductSchema>;

export const ProductSizeSchema = z.object({
  size: z.string().min(1).max(20),
  ean: z
    .string()
    .regex(/^\d{8,14}$/, "EAN inválido (8-14 dígitos)")
    .optional()
    .nullable()
    .or(z.literal("")),
  stock: z.number().int().min(0).default(0),
  costPrice: z.number().min(0).optional().nullable(),
  retailPrice: z.number().min(0).optional().nullable(),
});

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

export const BlogPostSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z
    .string()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  excerpt: z.string().max(500).optional().nullable(),
  contentMd: z.string().min(50, "Contenido demasiado breve").max(100000),
  coverImageUrl: z.string().url().optional().nullable().or(z.literal("")),
  ogImageUrl: z.string().url().optional().nullable().or(z.literal("")),
  author: z.string().max(120).default("Equipo Zona Sport"),
  tags: z.array(z.string().max(40)).max(15).default([]),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  metaTitle: z.string().max(70).optional().nullable(),
  metaDescription: z.string().max(170).optional().nullable(),
  publishedAt: z.date().optional().nullable(),
});

export type BlogPostInput = z.infer<typeof BlogPostSchema>;

// ---------------------------------------------------------------------------
// Brand / Category
// ---------------------------------------------------------------------------

export const BrandSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  logoUrl: z.string().url().optional().nullable().or(z.literal("")),
  description: z.string().max(2000).optional().nullable(),
  metaTitle: z.string().max(70).optional().nullable(),
  metaDescription: z.string().max(170).optional().nullable(),
  isFeatured: z.boolean().default(false),
  position: z.number().int().min(0).default(0),
});

export const CategorySchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  parentId: z.string().cuid().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
  metaTitle: z.string().max(70).optional().nullable(),
  metaDescription: z.string().max(170).optional().nullable(),
  position: z.number().int().min(0).default(0),
  isFeatured: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Importer
// ---------------------------------------------------------------------------

export const ImportOptionsSchema = z.object({
  mode: z.enum(["create_update", "create_only", "update_only"]).default("create_update"),
  defaultStatus: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]).default("DRAFT"),
  defaultCategorySlug: z.string().optional(),
});

export type ImportOptionsInput = z.infer<typeof ImportOptionsSchema>;
