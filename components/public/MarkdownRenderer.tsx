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
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "figure",
    "figcaption",
  ],
};

type Props = {
  source: string;
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
export function MarkdownRenderer({ source }: Props) {
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
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 id={headingId(children)} className="scroll-mt-24">
            {children}
          </h3>
        ),
        a: ({ href, children, ...rest }) => {
          const isExternal = !!href && /^https?:\/\//.test(href) && !href.includes("zonasport");
          return (
            <a
              href={href}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer nofollow" : undefined}
              {...rest}
            >
              {children}
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
              className="my-6 rounded-xl border border-zs-border"
              {...rest}
            />
          );
        },
        table: ({ children }) => (
          <div className="my-6 overflow-x-auto">
            <table className="w-full border-collapse text-sm">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border-b-2 border-zs-blue-900 bg-zs-surface px-3 py-2 text-left font-semibold text-zs-blue-900">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-b border-zs-border px-3 py-2 align-top">{children}</td>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-6 rounded-r-xl border-l-4 border-zs-blue-700 bg-zs-blue-50 px-5 py-3 italic text-zs-blue-900">
            {children}
          </blockquote>
        ),
      }}
    >
      {source}
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
