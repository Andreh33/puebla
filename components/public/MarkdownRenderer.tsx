import { localizedContentHref } from "@/lib/i18n/routing";
import { getRequestLocale } from "@/lib/i18n/request";
import type { Locale } from "@/lib/i18n/config";
import { translateValue as tx, translateTemplate as tf } from "@/lib/i18n/dictionaries";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { slugifyHeading } from "@/lib/blog/reading-time";

// Esquema de sanitización extendido: permitimos clases en code/pre para Shiki
// y atributos básicos en imágenes y enlaces.
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ["className"]],
    pre: [...(defaultSchema.attributes?.pre ?? []), ["className"], ["style"]],
    span: [...(defaultSchema.attributes?.span ?? []), ["className"], ["style"]],
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      ["alt"],
      ["src"],
      ["title"],
      ["loading"],
      ["decoding"],
      ["width"],
      ["height"],
    ],
    a: [...(defaultSchema.attributes?.a ?? []), ["target"], ["rel"], ["href"], ["title"]],
    h2: [["id"]],
    h3: [["id"]],
    h4: [["id"]],
  },
  tagNames: [...(defaultSchema.tagNames ?? []), "figure", "figcaption"],
};

type Props = {
  source: string;
  locale?: Locale;
};

/**
 * Renderiza markdown para los posts del blog público.
 *
 * - GFM (tablas, listas de tareas, strikethrough)
 * - rehype-sanitize con esquema extendido (permite código resaltado, imágenes y links seguros)
 * - Añade `id` a los headings H2/H3 (para anchors y TOC) usando el slug del texto.
 *
 * Nota: dejamos el resaltado de código a CSS básico para evitar el coste de
 * inicializar Shiki en runtime (la mayor parte de posts no contendrán código).
 * Si se necesita Shiki, se puede activar con `rehype-pretty-code` en una
 * iteración posterior.
 */
export function MarkdownRenderer({ source, locale = getRequestLocale() }: Props) {
  // Calculamos ids reproducibles del lado servidor.
  const seen = new Map<string, number>();
  const headingId = (children: React.ReactNode): string => {
    const text = flatten(children);
    const base = slugifyHeading(text);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}-${n + 1}`;
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
      components={{
        h2: ({ children }) => (
          <h2 id={headingId(children)} className="scroll-mt-24">
            {tx(children)}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 id={headingId(children)} className="scroll-mt-24">
            {tx(children)}
          </h3>
        ),
        a: ({ href, children, node: _node, ...rest }) => {
          const target = localizedContentHref(locale, href);
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://zonasportpuebla.com";
          let isExternal = false;
          try {
            if (target && /^https?:\/\//.test(target))
              isExternal = new URL(target).origin !== new URL(siteUrl).origin;
          } catch {
            isExternal = false;
          }
          return (
            <a
              href={target}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer nofollow" : undefined}
              {...rest}
            >
              {tx(children)}
            </a>
          );
        },
        img: ({ src, alt, ...rest }) => {
          // eslint-disable-next-line @next/next/no-img-element
          return (
            <img
              src={typeof src === "string" ? src : ""}
              alt={alt ?? ""}
              loading="lazy"
              decoding="async"
              className="border-zs-border my-6 rounded-xl border"
              {...rest}
            />
          );
        },
        table: ({ children }) => (
          <div className="my-6 overflow-x-auto">
            <table className="w-full border-collapse text-sm">{tx(children)}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border-zs-blue-900 bg-zs-surface text-zs-blue-900 border-b-2 px-3 py-2 text-left font-semibold">
            {tx(children)}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-zs-border border-b px-3 py-2 align-top">{tx(children)}</td>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-zs-blue-700 bg-zs-blue-50 text-zs-blue-900 my-6 rounded-r-xl border-l-4 px-5 py-3 italic">
            {tx(children)}
          </blockquote>
        ),
      }}
    >
      {tx(source)}
    </ReactMarkdown>
  );
}

function flatten(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flatten).join("");
  if (typeof node === "object" && node !== null && "props" in node) {
    // @ts-expect-error -- ReactElement props
    return flatten(node.props.children);
  }
  return "";
}
