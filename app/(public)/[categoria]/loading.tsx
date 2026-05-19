import { ProductCardSkeleton } from "@/components/public/ProductCardSkeleton";

export default function CategoryLoading() {
  return (
    <>
      {/* Breadcrumbs placeholder */}
      <nav aria-hidden className="border-b border-zs-border bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3">
          <span className="skeleton-shimmer h-3 w-12 rounded-md" />
          <span className="text-zs-muted">/</span>
          <span className="skeleton-shimmer h-3 w-20 rounded-md" />
        </div>
      </nav>

      {/* Hero placeholder */}
      <section className="bg-zs-gradient">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div className="h-10 w-2/3 rounded-md bg-white/10 sm:h-12 sm:w-1/2" />
          <div className="mt-4 h-4 w-1/2 rounded-md bg-white/10" />
          <div className="mt-5 h-3 w-32 rounded-md bg-white/10" />
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-7xl px-4 py-10 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Filters placeholder (desktop) */}
          <aside className="hidden lg:block">
            <div className="rounded-2xl border border-zs-border bg-white p-5">
              <div className="skeleton-shimmer mb-4 h-5 w-20 rounded-md" />
              <div className="space-y-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="skeleton-shimmer h-3.5 w-24 rounded-md" />
                    <div className="skeleton-shimmer h-3 w-32 rounded-md" />
                    <div className="skeleton-shimmer h-3 w-28 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
              <ProductCardSkeleton count={8} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
