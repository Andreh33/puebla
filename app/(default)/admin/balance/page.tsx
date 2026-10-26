import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { getBalance, type Period } from "@/lib/admin/balance-queries";
import { BalanceClient } from "./BalanceClient";

export const dynamic = "force-dynamic";

const VALID_PERIODS: Period[] = ["mes", "ano", "todo"];

export default async function BalancePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const period: Period = VALID_PERIODS.includes(sp.period as Period)
    ? (sp.period as Period)
    : "mes";

  const data = await getBalance(period);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Balance"
        description="Coste, stock, ventas y beneficio por familia y género · datos en vivo de la tienda"
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Balance" }]}
      />
      <BalanceClient data={data} />
    </div>
  );
}
