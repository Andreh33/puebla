import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { PosTerminal } from "./PosTerminal";
import { getPosFilters, searchPosCatalog } from "./tpv-actions";

export const metadata: Metadata = { title: "TPV — Venta en tienda" };
export const dynamic = "force-dynamic";

export default async function TpvPage() {
  const session = await auth().catch(() => null);
  const user = {
    name: session?.user?.name ?? null,
    email: session?.user?.email ?? null,
    role: (session?.user?.role as string | undefined) ?? "EDITOR",
  };

  const [filters, initialProducts] = await Promise.all([
    getPosFilters().catch(() => ({ brands: [], categories: [], tags: [] })),
    searchPosCatalog({ inStock: true, take: 24 }).catch(() => []),
  ]);

  return <PosTerminal user={user} filters={filters} initialProducts={initialProducts} />;
}
