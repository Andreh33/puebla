import { ProductCard, type ProductCardProduct } from "./ProductCard";

type Props = {
  products: ProductCardProduct[];
  title?: string;
};

export function RelatedProducts({ products, title = "Productos relacionados" }: Props) {
  if (!products || products.length === 0) return null;
  return (
    <section aria-labelledby="related-heading" className="mt-16 space-y-6">
      <h2 id="related-heading" className="text-2xl font-bold tracking-tight text-zs-blue-900 sm:text-3xl">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
