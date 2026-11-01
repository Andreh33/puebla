import OpengraphImage from "../opengraph-image";

export const runtime = "nodejs";
export const revalidate = 600;

export async function GET(_request: Request, context: { params: Promise<{ slug: string; locale?: string }> }) {
  return OpengraphImage(context);
}
