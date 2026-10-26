import { displayTags } from "@/lib/i18n/content";
import { getRequestLocale } from "@/lib/i18n/request";
import { translateValue as tx, translateTemplate as tf } from "@/lib/i18n/dictionaries";
import { t } from "@/lib/i18n/dictionaries";
import { LocalizedLink as Link } from "@/components/public/LocalizedLink";
import Image from "next/image";
import { CalendarDays, Clock, User2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateES } from "@/lib/utils";
import { readingTimeMinutes } from "@/lib/blog/reading-time";

export type PostCardData = {
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  author: string;
  publishedAt: Date | string | null;
  tags: string[];
  translatedTags?:string[];
  contentMd?: string;
};

export function PostCard({
  post,
  priority = false,
}: {
  post: PostCardData;
  priority?: boolean;
}) {
  const minutes = post.contentMd ? readingTimeMinutes(post.contentMd) : null;
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-zs-border bg-white shadow-sm transition hover:shadow-md">
      <Link href={`/blog/${post.slug}`} className="relative block aspect-[16/9] overflow-hidden bg-zs-surface">
        {tx(post.coverImageUrl ? (
          <Image
            src={post.coverImageUrl}
            alt={tf("Portada de {0}", [post.title])}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority={priority}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zs-muted">
            <span className="text-sm">{t("Sin portada")}</span>
          </div>
        ))}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        {post.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {displayTags(post).slice(0, 3).map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px] uppercase tracking-wide">
                {tx(t)}
              </Badge>
            ))}
          </div>
        )}
        <h3 className="text-lg font-bold leading-snug text-zs-blue-900">
          <Link href={`/blog/${post.slug}`} className="hover:text-zs-red-600">
            {tx(post.title)}
          </Link>
        </h3>
        {post.excerpt && (
          <p className="mt-2 line-clamp-3 text-sm text-zs-muted">{tx(post.excerpt)}</p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-xs text-zs-muted">
          <span className="inline-flex items-center gap-1">
            <User2 className="h-3.5 w-3.5" /> {tx(post.author)}
          </span>
          {post.publishedAt && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {formatDateES(post.publishedAt, getRequestLocale())}
            </span>
          )}
          {minutes != null && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {tx(minutes)} {t("min lectura")}</span>
          )}
        </div>
      </div>
    </article>
  );
}
