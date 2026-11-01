import renderProductOgCard from "@/lib/seo/product-og-card";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; locale?: string }> },
) {
  return renderProductOgCard(context);
}
